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

  getInitData(): string | null {
    return null;
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

  hapticImpact(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium'): void {
    const durationMap: Record<string, number> = {
      light: 25,
      medium: 50,
      heavy: 85,
      rigid: 35,
      soft: 60,
    };
    this.vibrate(durationMap[style] || 50);
  }

  hapticNotification(type: 'error' | 'success' | 'warning' = 'success'): void {
    const patternMap: Record<string, number[]> = {
      success: [40, 60, 40],
      warning: [60, 80, 60],
      error: [80, 50, 80, 50, 80],
    };
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(patternMap[type] || 50);
      } catch {
        // Ignore vibration errors
      }
    }
  }

  hapticSelection(): void {
    this.vibrate(15);
  }

  requestFullscreen(): void {
    // Only request fullscreen on mobile touch devices (to hide browser address bar)
    const isMobile =
      /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      ('ontouchstart' in window && window.innerWidth <= 1024);

    if (!isMobile) {
      return; // PC Desktop stays in normal windowed mode
    }

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

  share(text: string, url?: string): void {
    const shareUrl = url || window.location.href;
    if (navigator.share) {
      navigator.share({ title: 'Bashmak', text, url: shareUrl }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(`${text}\n${shareUrl}`).then(() => {
        console.log('[BrowserPlatformAdapter] Link copied to clipboard');
      }).catch(() => {});
    }
  }
}
