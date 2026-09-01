import Phaser from 'phaser';
import { GameConfig } from './config/GameConfig';
import { createPlatformAdapter } from './platform';
import type { IPlatformAdapter } from './platform';
import { GameApiClient } from './api/GameApiClient';
import { SaveManager } from './game/core/SaveManager';
import './style.css';

export class GameApplication {
  private game!: Phaser.Game;
  private platform: IPlatformAdapter;

  constructor() {
    this.platform = createPlatformAdapter();
  }

  async start(): Promise<void> {
    // 1. Initialize Platform Adapter (Browser or Telegram)
    await this.platform.initialize();

    // 2. Initialize GameApiClient & Sync Server Session
    try {
      const apiClient = GameApiClient.getInstance();
      const initData = this.platform.getInitData?.();
      if (initData) {
        // Automatic authentication inside Telegram Mini App
        await apiClient.authTelegramTma(initData);
        await SaveManager.getInstance().syncWithServer();
      } else if (apiClient.isAuthenticated()) {
        // Stored verified session token in web browser
        await SaveManager.getInstance().syncWithServer();
      }
    } catch (e) {
      console.warn('[GameApplication] Auth / server sync fallback:', e);
    }

    // 2. Ensure web fonts are fully loaded for Canvas rendering
    if (typeof document !== 'undefined' && document.fonts) {
      try {
        await Promise.all([
          document.fonts.load('16px "Boingster"', 'ВЫБОР МУТАНТА'),
          document.fonts.load('16px "Gagalin"', 'ВЫБРАТЬ SELECT'),
          document.fonts.ready,
        ]);

      } catch (e) {
        console.warn('[GameApplication] Fonts load timeout or fallback:', e);
      }
    }

    // 3. Initialize Phaser Game instance (Phaser Scale.RESIZE manages viewport resizing cleanly)
    this.game = new Phaser.Game(GameConfig);

    if (typeof window !== 'undefined') {
      (window as any).__GAME_APP__ = this;
    }

    console.log(`[GameApplication] Game initialized on platform: ${this.platform.platformType}`);
  }

  getPlatform(): IPlatformAdapter {
    return this.platform;
  }

  getPhaserGame(): Phaser.Game {
    return this.game;
  }
}

// Bootstrap application on DOM ready
window.addEventListener('DOMContentLoaded', async () => {
  const app = new GameApplication();
  await app.start();
  (window as any).__GAME_APP__ = app;
});
