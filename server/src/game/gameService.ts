import type { Env, PlayerProfile, PlayerStats, GameActionRequest, BuyPowerUpPayload, SelectHeroPayload, UnlockHeroPayload } from '../types';
import {
  SERVER_META_POWERUPS,
  getPowerUpCost,
  getTotalSpentGooOnPowerUps,
  DEFAULT_UNLOCKED_HEROES,
  DEFAULT_SELECTED_HERO,
  VALID_HERO_IDS,
} from './metaConfig';

export class GameService {
  constructor(private db: D1Database) {}

  public async getOrCreateUserAndProfile(
    telegramId: number,
    userInfo?: { username?: string; first_name?: string; language_code?: string }
  ): Promise<{ profile: PlayerProfile }> {
    const now = Date.now();

    // 1. Upsert user
    const existingUser = await this.db
      .prepare('SELECT telegram_id FROM users WHERE telegram_id = ?')
      .bind(telegramId)
      .first();

    if (!existingUser) {
      await this.db
        .prepare(
          'INSERT INTO users (telegram_id, username, first_name, language_code, created_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .bind(
          telegramId,
          userInfo?.username || null,
          userInfo?.first_name || null,
          userInfo?.language_code || null,
          now,
          now
        )
        .run();
    } else {
      await this.db
        .prepare(
          'UPDATE users SET last_login_at = ?, username = COALESCE(?, username), first_name = COALESCE(?, first_name) WHERE telegram_id = ?'
        )
        .bind(now, userInfo?.username || null, userInfo?.first_name || null, telegramId)
        .run();
    }

    // 2. Fetch or create profile
    let profile = await this.getProfile(telegramId);
    if (!profile) {
      const defaultStats: PlayerStats = {
        totalRuns: 0,
        totalKills: 0,
        totalGooEarned: 0,
        bestSurvivalTimeSec: 0,
        bestKills: 0,
        bestScore: 0,
      };

      await this.db
        .prepare(
          `INSERT INTO player_profiles (telegram_id, goo_balance, selected_hero_id, unlocked_hero_ids, power_ups, stats, updated_at)
           VALUES (?, 0, ?, ?, '{}', ?, ?)`
        )
        .bind(
          telegramId,
          DEFAULT_SELECTED_HERO,
          JSON.stringify(DEFAULT_UNLOCKED_HEROES),
          JSON.stringify(defaultStats),
          now
        )
        .run();

      profile = {
        telegramId,
        goo: 0,
        selectedHeroId: DEFAULT_SELECTED_HERO,
        unlockedHeroIds: DEFAULT_UNLOCKED_HEROES,
        powerUps: {},
        stats: defaultStats,
        updatedAt: now,
      };
    }

    return { profile };
  }

  public async getProfile(telegramId: number): Promise<PlayerProfile | null> {
    const row = await this.db
      .prepare('SELECT * FROM player_profiles WHERE telegram_id = ?')
      .bind(telegramId)
      .first<{
        telegram_id: number;
        goo_balance: number;
        selected_hero_id: string;
        unlocked_hero_ids: string;
        power_ups: string;
        stats: string;
        updated_at: number;
      }>();

    if (!row) return null;

    let unlockedHeroIds: string[];
    try {
      unlockedHeroIds = JSON.parse(row.unlocked_hero_ids);
    } catch {
      unlockedHeroIds = DEFAULT_UNLOCKED_HEROES;
    }

    let powerUps: Record<string, number>;
    try {
      powerUps = JSON.parse(row.power_ups);
    } catch {
      powerUps = {};
    }

    let stats: PlayerStats;
    try {
      stats = JSON.parse(row.stats);
    } catch {
      stats = {
        totalRuns: 0,
        totalKills: 0,
        totalGooEarned: 0,
        bestSurvivalTimeSec: 0,
        bestKills: 0,
        bestScore: 0,
      };
    }

    return {
      telegramId: row.telegram_id,
      goo: row.goo_balance,
      selectedHeroId: row.selected_hero_id || DEFAULT_SELECTED_HERO,
      unlockedHeroIds,
      powerUps,
      stats,
      updatedAt: row.updated_at,
    };
  }

  public async executeAction(
    telegramId: number,
    request: GameActionRequest
  ): Promise<{ status: number; body: Record<string, unknown> }> {
    const { idempotencyKey, actionType, payload } = request;

    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      return { status: 400, body: { error: 'INVALID_IDEMPOTENCY_KEY' } };
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

    // 2. Fetch current profile
    const profile = await this.getProfile(telegramId);
    if (!profile) {
      return { status: 404, body: { error: 'PROFILE_NOT_FOUND' } };
    }

    const now = Date.now();
    let responseBody: Record<string, unknown> = {};

    switch (actionType) {
      case 'buy_powerup': {
        const { powerUpId } = (payload || {}) as BuyPowerUpPayload;
        const def = SERVER_META_POWERUPS[powerUpId];
        if (!def) {
          return { status: 400, body: { error: 'UNKNOWN_POWERUP' } };
        }

        const currentLvl = profile.powerUps[powerUpId] || 0;
        if (currentLvl >= def.maxLevel) {
          return { status: 400, body: { error: 'MAX_LEVEL_REACHED' } };
        }

        const cost = getPowerUpCost(def, currentLvl);
        if (profile.goo < cost) {
          return { status: 400, body: { error: 'INSUFFICIENT_FUNDS', required: cost, current: profile.goo } };
        }

        profile.goo -= cost;
        profile.powerUps[powerUpId] = currentLvl + 1;
        profile.updatedAt = now;

        responseBody = {
          success: true,
          actionType,
          powerUpId,
          newLevel: currentLvl + 1,
          profile,
        };
        break;
      }

      case 'refund_all': {
        const refundAmount = getTotalSpentGooOnPowerUps(profile.powerUps);
        profile.goo += refundAmount;
        profile.powerUps = {};
        profile.updatedAt = now;

        responseBody = {
          success: true,
          actionType,
          refundedGoo: refundAmount,
          profile,
        };
        break;
      }

      case 'select_hero': {
        const { heroId } = (payload || {}) as SelectHeroPayload;
        const canonical = heroId === 'hero_worm' ? 'hero_vypolzok' : heroId;
        if (!profile.unlockedHeroIds.includes(canonical)) {
          return { status: 400, body: { error: 'HERO_NOT_UNLOCKED' } };
        }

        profile.selectedHeroId = canonical;
        profile.updatedAt = now;

        responseBody = {
          success: true,
          actionType,
          selectedHeroId: canonical,
          profile,
        };
        break;
      }

      case 'unlock_hero': {
        const { heroId } = (payload || {}) as UnlockHeroPayload;
        const canonical = heroId === 'hero_worm' ? 'hero_vypolzok' : heroId;
        if (!VALID_HERO_IDS.includes(canonical)) {
          return { status: 400, body: { error: 'INVALID_HERO_ID' } };
        }

        if (!profile.unlockedHeroIds.includes(canonical)) {
          profile.unlockedHeroIds.push(canonical);
          profile.updatedAt = now;
        }

        responseBody = {
          success: true,
          actionType,
          unlockedHeroIds: profile.unlockedHeroIds,
          profile,
        };
        break;
      }

      default:
        return { status: 400, body: { error: 'UNKNOWN_ACTION_TYPE' } };
    }

    // 3. Batch atomic update to D1 (Save profile & Record transaction)
    await this.db.batch([
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
        .bind(idempotencyKey, telegramId, actionType, JSON.stringify(responseBody), now),
    ]);

    return { status: 200, body: responseBody };
  }
}
