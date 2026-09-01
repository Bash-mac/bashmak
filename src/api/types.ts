export interface ServerPlayerStats {
  totalRuns: number;
  totalKills: number;
  totalGooEarned: number;
  bestSurvivalTimeSec: number;
  bestKills: number;
  bestScore: number;
}

export interface ServerPlayerProfile {
  telegramId: number;
  goo: number;
  selectedHeroId: string;
  unlockedHeroIds: string[];
  powerUps: Record<string, number>;
  stats: ServerPlayerStats;
  updatedAt: number;
}

export interface ServerUserInfo {
  telegramId: number;
  username?: string;
  firstName?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: ServerUserInfo;
  profile: ServerPlayerProfile;
}

export interface ActionResponse<T = Record<string, unknown>> {
  success: boolean;
  actionType: string;
  profile: ServerPlayerProfile;
  data?: T;
  [key: string]: unknown;
}

export interface RunStartResponse {
  success: boolean;
  runId: string;
  seed: number;
  startedAt: number;
}

export interface RunFinishResponse {
  success: boolean;
  runId: string;
  won: boolean;
  reward: {
    gooEarned: number;
  };
  profile: ServerPlayerProfile;
}

export interface ApiErrorResponse {
  error: string;
  message?: string;
  required?: number;
  current?: number;
}
