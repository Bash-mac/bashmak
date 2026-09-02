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
  getInitData?(): string | null;
  vibrate(durationMs?: number): void;
  hapticImpact?(style?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
  hapticNotification?(type?: 'error' | 'success' | 'warning'): void;
  hapticSelection?(): void;
  requestFullscreen?(): void;
  share?(text: string, url?: string): void;
}
