import type { StartRunRequest, FinishRunRequest, PlayerProfile } from '../types';
import { GameService } from './gameService';

export class RunService {
  constructor(
    private db: D1Database,
    private gameService: GameService
  ) {}

  public async startRun(
    telegramId: number,
    request: StartRunRequest
  ): Promise<{ status: number; body: Record<string, unknown> }> {
    const profile = await this.gameService.getProfile(telegramId);
    if (!profile) {
      return { status: 404, body: { error: 'PROFILE_NOT_FOUND' } };
    }

    const heroId = request.heroId === 'hero_worm' ? 'hero_vypolzok' : request.heroId || profile.selectedHeroId;
    if (!profile.unlockedHeroIds.includes(heroId)) {
      return { status: 400, body: { error: 'HERO_NOT_UNLOCKED' } };
    }

    const runId = crypto.randomUUID();
    const seed = Math.floor(Math.random() * 2147483647);
    const now = Date.now();

    await this.db
      .prepare(
        `INSERT INTO run_sessions (run_id, telegram_id, hero_id, seed, started_at, status)
         VALUES (?, ?, ?, ?, ?, 'active')`
      )
      .bind(runId, telegramId, heroId, seed, now)
      .run();

    return {
      status: 200,
      body: {
        success: true,
        runId,
        seed,
        startedAt: now,
      },
    };
  }

  public async finishRun(
    telegramId: number,
    request: FinishRunRequest
  ): Promise<{ status: number; body: Record<string, unknown> }> {
    const { idempotencyKey, runId, timeSurvived, kills, score, gooEarned, won } = request;

    if (!idempotencyKey) {
      return { status: 400, body: { error: 'MISSING_IDEMPOTENCY_KEY' } };
    }

    // 1. Check idempotency cache
    const existingTx = await this.db
      .prepare('SELECT response_json FROM transactions WHERE idempotency_key = ? AND telegram_id = ?')
      .bind(idempotencyKey, telegramId)
      .first<{ response_json: string }>();

    if (existingTx) {
      try {
        return { status: 200, body: JSON.parse(existingTx.response_json) };
      } catch {
        // continue
      }
    }

    // 2. Fetch run session
    const runSession = await this.db
      .prepare('SELECT * FROM run_sessions WHERE run_id = ? AND telegram_id = ?')
      .bind(runId, telegramId)
      .first<{
        run_id: string;
        telegram_id: number;
        hero_id: string;
        seed: number;
        started_at: number;
        status: string;
      }>();

    // If run session exists, validate it
    const now = Date.now();
    if (runSession) {
      if (runSession.status === 'completed') {
        // Already completed
        return { status: 400, body: { error: 'RUN_ALREADY_COMPLETED' } };
      }

      // Elapsed real time check (allow 5 seconds network/pause tolerance)
      const elapsedWallTimeSec = Math.max(1, (now - runSession.started_at) / 1000);
      if (timeSurvived > elapsedWallTimeSec + 15) {
        console.warn(`[AntiCheat] Run ${runId} timeSurvived (${timeSurvived}s) exceeds elapsed real time (${elapsedWallTimeSec}s)`);
      }
    }

    // 3. Sanity checks on rewards (maximum physical limits)
    // In Bashmak, max theoretical goo drop per second is ~50-100 even in dense waves
    const safeSurvivalTime = Math.max(1, timeSurvived);
    const maxAllowedGoo = Math.max(50, safeSurvivalTime * 60 + 500); // generous ceiling
    const sanitizedGoo = Math.min(Math.max(0, Math.round(gooEarned)), maxAllowedGoo);

    // 4. Update profile
    const profile = await this.gameService.getProfile(telegramId);
    if (!profile) {
      return { status: 404, body: { error: 'PROFILE_NOT_FOUND' } };
    }

    profile.goo += sanitizedGoo;
    profile.stats.totalRuns += 1;
    profile.stats.totalKills += Math.max(0, kills);
    profile.stats.totalGooEarned += sanitizedGoo;
    profile.stats.bestSurvivalTimeSec = Math.max(profile.stats.bestSurvivalTimeSec, timeSurvived);
    profile.stats.bestKills = Math.max(profile.stats.bestKills, kills);
    profile.stats.bestScore = Math.max(profile.stats.bestScore, score);
    profile.updatedAt = now;

    const responseBody = {
      success: true,
      runId,
      won,
      reward: {
        gooEarned: sanitizedGoo,
      },
      profile,
    };

    // 5. Atomic batch commit
    const statements = [
      this.db
        .prepare(
          `UPDATE player_profiles 
           SET goo_balance = ?, selected_hero_id = ?, unlocked_hero_ids = ?, power_ups = ?, stats = ?, updated_at = ?
           WHERE telegram_id = ?`
        )
        .bind(
          profile.goo,
          profile.selectedHeroId,
          JSON.stringify(profile.unlockedHeroIds),
          JSON.stringify(profile.powerUps),
          JSON.stringify(profile.stats),
          profile.updatedAt,
          telegramId
        ),
      this.db
        .prepare(
          'INSERT INTO transactions (idempotency_key, telegram_id, action_type, response_json, created_at) VALUES (?, ?, ?, ?, ?)'
        )
        .bind(idempotencyKey, telegramId, 'finish_run', JSON.stringify(responseBody), now),
    ];

    if (runSession) {
      statements.push(
        this.db
          .prepare('UPDATE run_sessions SET finished_at = ?, status = ? WHERE run_id = ?')
          .bind(now, 'completed', runId)
      );
    }

    await this.db.batch(statements);

    return { status: 200, body: responseBody };
  }
}
