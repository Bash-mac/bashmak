import type {
  AuthResponse,
  ServerPlayerProfile,
  ServerUserInfo,
  ActionResponse,
  RunStartResponse,
  RunFinishResponse,
  ApiErrorResponse,
} from './types';

const TOKEN_KEY = 'bashmak_auth_token_v1';
const USER_KEY = 'bashmak_user_info_v1';

export class GameApiClient {
  private static instance: GameApiClient;
  private baseUrl: string;
  private token: string | null = null;
  private currentUser: ServerUserInfo | null = null;

  private constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
    this.loadToken();
    this.loadUser();
  }

  public static getInstance(baseUrl?: string): GameApiClient {
    if (!GameApiClient.instance) {
      GameApiClient.instance = new GameApiClient(baseUrl);
    }
    return GameApiClient.instance;
  }

  private loadToken(): void {
    try {
      this.token = localStorage.getItem(TOKEN_KEY);
    } catch {
      this.token = null;
    }
  }

  private loadUser(): void {
    try {
      const raw = localStorage.getItem(USER_KEY);
      this.currentUser = raw ? JSON.parse(raw) : null;
    } catch {
      this.currentUser = null;
    }
  }

  public setCurrentUser(user: ServerUserInfo | null): void {
    this.currentUser = user;
    try {
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_KEY);
      }
    } catch {
      // ignore
    }
  }

  public getCurrentUser(): ServerUserInfo | null {
    return this.currentUser;
  }

  public setToken(token: string | null): void {
    this.token = token;
    try {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      // ignore
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public isAuthenticated(): boolean {
    return Boolean(this.token);
  }

  private generateIdempotencyKey(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private async request<T>(
    path: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: unknown;
      requiresAuth?: boolean;
    } = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (options.requiresAuth !== false && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!res.ok) {
      let errorBody: ApiErrorResponse;
      try {
        errorBody = await res.json();
      } catch {
        errorBody = { error: `HTTP_${res.status}`, message: res.statusText };
      }
      throw errorBody;
    }

    return (await res.json()) as T;
  }

  // ----------------------------------------------------
  // AUTH
  // ----------------------------------------------------

  public async authTelegramTma(initData: string): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/api/auth/telegram-tma', {
      method: 'POST',
      body: { initData },
      requiresAuth: false,
    });
    if (res.token) {
      this.setToken(res.token);
    }
    if (res.user) {
      this.setCurrentUser(res.user);
    }
    return res;
  }

  public async authTelegramWeb(webData: Record<string, string | number>): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/api/auth/telegram-web', {
      method: 'POST',
      body: webData,
      requiresAuth: false,
    });
    if (res.token) {
      this.setToken(res.token);
    }
    if (res.user) {
      this.setCurrentUser(res.user);
    }
    return res;
  }

  public async authDevLogin(telegramId?: number, username?: string): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/api/auth/dev-login', {
      method: 'POST',
      body: { telegramId, username },
      requiresAuth: false,
    });
    if (res.token) {
      this.setToken(res.token);
    }
    if (res.user) {
      this.setCurrentUser(res.user);
    }
    return res;
  }

  // ----------------------------------------------------
  // PROFILE & GAME ACTIONS
  // ----------------------------------------------------

  public async fetchProfile(): Promise<ServerPlayerProfile> {
    const res = await this.request<{ success: boolean; profile: ServerPlayerProfile }>('/api/profile', {
      method: 'GET',
    });
    return res.profile;
  }

  public async sendAction<T = Record<string, unknown>>(
    actionType: 'buy_powerup' | 'refund_all' | 'unlock_hero' | 'select_hero',
    payload?: Record<string, unknown>
  ): Promise<ActionResponse<T>> {
    const idempotencyKey = this.generateIdempotencyKey();
    return await this.request<ActionResponse<T>>('/api/action', {
      method: 'POST',
      body: {
        idempotencyKey,
        actionType,
        payload,
      },
    });
  }

  public async buyPowerUp(powerUpId: string): Promise<ActionResponse> {
    return this.sendAction('buy_powerup', { powerUpId });
  }

  public async refundAllPowerUps(): Promise<ActionResponse> {
    return this.sendAction('refund_all');
  }

  public async selectHero(heroId: string): Promise<ActionResponse> {
    return this.sendAction('select_hero', { heroId });
  }

  public async unlockHero(heroId: string): Promise<ActionResponse> {
    return this.sendAction('unlock_hero', { heroId });
  }

  // ----------------------------------------------------
  // RUN SESSIONS
  // ----------------------------------------------------

  public async startRun(heroId: string): Promise<RunStartResponse> {
    return await this.request<RunStartResponse>('/api/run/start', {
      method: 'POST',
      body: { heroId },
    });
  }

  public async finishRun(params: {
    runId: string;
    timeSurvived: number;
    kills: number;
    score: number;
    gooEarned: number;
    won: boolean;
  }): Promise<RunFinishResponse> {
    const idempotencyKey = this.generateIdempotencyKey();
    return await this.request<RunFinishResponse>('/api/run/finish', {
      method: 'POST',
      body: {
        idempotencyKey,
        ...params,
      },
    });
  }
}
