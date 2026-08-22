import type { IPlatformAdapter, PlatformType, UserInfo } from './PlatformAdapter';

export class BrowserPlatformAdapter implements IPlatformAdapter {
  readonly platformType: PlatformType = 'browser';
  readonly isTelegram: boolean = false;

  async initialize(): Promise<void> {
    console.log('[Platform] Initialized BrowserPlatformAdapter');
  }

  getUser(): UserInfo | null {
    return {
      id: 'guest',
      username: 'GuestPlayer',
      firstName: 'Guest',
      languageCode: navigator.language || 'en',
    };
  }

  vibrate(durationMs = 50): void {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(durationMs);
      } catch {
        // Ignore vibration errors
      }
    }
  }

  requestFullscreen(): void {
    try {
      if (!document.fullscreenElement) {
        const el = document.documentElement as any;
        const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
        rfs?.call(el);
      }
    } catch {
      // Fullscreen not permitted without direct user gesture
    }
  }
}
