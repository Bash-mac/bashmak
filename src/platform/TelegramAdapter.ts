import type { IPlatformAdapter, PlatformType, UserInfo } from './PlatformAdapter';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        initDataUnsafe?: {
          user?: {
            id?: number;
            first_name?: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        version?: string;
        platform?: string;
        colorScheme?: 'light' | 'dark';
        themeParams?: Record<string, string>;
        isExpanded?: boolean;
        isFullscreen?: boolean;
        ready: () => void;
        expand: () => void;
        close: () => void;
        requestFullscreen?: () => void;
        exitFullscreen?: () => void;
        lockOrientation?: () => void;
        unlockOrientation?: () => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        disableVerticalSwipes?: () => void;
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
      };
    };
  }
}

export class TelegramPlatformAdapter implements IPlatformAdapter {
  readonly platformType: PlatformType = 'telegram';
  readonly isTelegram: boolean = true;

  private get webApp() {
    return window.Telegram?.WebApp;
  }

  async initialize(): Promise<void> {
    const wa = this.webApp;
    if (wa) {
      wa.ready();
      wa.expand();
      if (typeof wa.disableVerticalSwipes === 'function') {
        wa.disableVerticalSwipes();
      }
      if (typeof wa.setHeaderColor === 'function') {
        wa.setHeaderColor('#0b0e14');
      }
      if (typeof wa.setBackgroundColor === 'function') {
        wa.setBackgroundColor('#0b0e14');
      }
      if (typeof wa.requestFullscreen === 'function') {
        try {
          wa.requestFullscreen();
        } catch {
          // Ignored
        }
      }
      if (typeof wa.unlockOrientation === 'function') {
        try {
          wa.unlockOrientation();
        } catch {
          // Ignored
        }
      }

      // Запрос полного экрана при первом касании экрана игроком
      const tryFullscreen = () => {
        if (typeof wa.requestFullscreen === 'function' && !wa.isFullscreen) {
          try {
            wa.requestFullscreen();
          } catch {
            // Ignored
          }
        }
      };
      window.addEventListener('pointerdown', tryFullscreen);

      console.log(`[Platform] Initialized TelegramPlatformAdapter (v${wa.version}, platform: ${wa.platform})`);
    } else {
      console.warn('[Platform] Telegram WebApp object not found, running in fallback mode');
    }
  }

  getUser(): UserInfo | null {
    const tgUser = this.webApp?.initDataUnsafe?.user;
    if (!tgUser) return null;
    return {
      id: tgUser.id,
      username: tgUser.username,
      firstName: tgUser.first_name,
      languageCode: tgUser.language_code,
    };
  }

  vibrate(_durationMs?: number): void {
    if (this.webApp?.HapticFeedback) {
      try {
        this.webApp.HapticFeedback.impactOccurred('medium');
      } catch {
        // Ignore haptic errors
      }
    }
  }
}
