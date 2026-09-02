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

export function isAdminUser(platform?: IPlatformAdapter): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return true;

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('admin') === 'maks' || urlParams.get('admin') === '1299608887') return true;
  if (typeof localStorage !== 'undefined' && localStorage.getItem('bashmak_admin') === 'true') return true;

  const tgUser = platform?.getUser?.();
  if (tgUser) {
    if (String(tgUser.id) === '1299608887') return true;
    if (tgUser.username && tgUser.username.toLowerCase() === 'maks87878') return true;
  }

  // Also check raw window.Telegram if adapter not yet ready
  const rawTg = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
  if (rawTg) {
    if (String(rawTg.id) === '1299608887') return true;
    if (rawTg.username && String(rawTg.username).toLowerCase() === 'maks87878') return true;
  }

  return false;
}

