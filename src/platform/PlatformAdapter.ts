export type PlatformType = 'browser' | 'telegram';

export interface UserInfo {
  id?: string | number;
  username?: string;
  firstName?: string;
  languageCode?: string;
}

export interface IPlatformAdapter {
  readonly platformType: PlatformType;
  readonly isTelegram: boolean;

  initialize(): Promise<void>;
  getUser(): UserInfo | null;
  vibrate(durationMs?: number): void;
}
