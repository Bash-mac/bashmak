import type { IPlatformAdapter } from './PlatformAdapter';
import { BrowserPlatformAdapter } from './BrowserAdapter';
import { TelegramPlatformAdapter } from './TelegramAdapter';

export * from './PlatformAdapter';
export * from './BrowserAdapter';
export * from './TelegramAdapter';

export function createPlatformAdapter(): IPlatformAdapter {
  const hasTgData = Boolean(window.Telegram?.WebApp?.initData && window.Telegram.WebApp.initData.length > 0);
  const isTgPlatform = window.Telegram?.WebApp && window.Telegram.WebApp.platform !== 'unknown';
  const isTgUA = /Telegram/i.test(navigator.userAgent);

  if (hasTgData || (isTgPlatform && isTgUA)) {
    return new TelegramPlatformAdapter();
  }
  return new BrowserPlatformAdapter();
}
