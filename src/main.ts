import Phaser from 'phaser';
import { GameConfig } from './config/GameConfig';
import { createPlatformAdapter } from './platform';
import type { IPlatformAdapter } from './platform';
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

    // 2. Initialize Phaser Game instance
    this.game = new Phaser.Game(GameConfig);

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
