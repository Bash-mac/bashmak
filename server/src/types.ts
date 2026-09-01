export interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
  BOT_TOKEN?: string;
  JWT_SECRET?: string;
  DEV_MODE?: string;
}

export interface UserRecord {
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  language_code: string | null;
  created_at: number;
  last_login_at: number;
}

export interface PlayerStats {
  totalRuns: number;
  totalKills: number;
  totalGooEarned: number;
  bestSurvivalTimeSec: number;
  bestKills: number;
  bestScore: number;
}

export interface PlayerProfile {
  telegramId: number;
  goo: number;
  selectedHeroId: string;
  unlockedHeroIds: string[];
  powerUps: Record<string, number>;
  stats: PlayerStats;
  updatedAt: number;
}

export type ActionType = 'buy_powerup' | 'refund_all' | 'unlock_hero' | 'select_hero';

export interface BuyPowerUpPayload {
  powerUpId: string;
}

export interface UnlockHeroPayload {
  heroId: string;
}

export interface SelectHeroPayload {
  heroId: string;
}

export interface GameActionRequest {
  idempotencyKey: string;
  actionType: ActionType;
  payload?: Record<string, unknown>;
}

export interface StartRunRequest {
  heroId: string;
}

export interface FinishRunRequest {
  idempotencyKey: string;
  runId: string;
  timeSurvived: number;
  kills: number;
  score: number;
  gooEarned: number;
  won: boolean;
}
