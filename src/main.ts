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

    // Auto-adapt canvas on dynamic orientation change or window resize
    const handleResize = () => {
      if (this.game && this.game.scale) {
        this.game.scale.resize(window.innerWidth, window.innerHeight);
        this.game.scale.refresh();
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
      setTimeout(handleResize, 150);
      setTimeout(handleResize, 400);
    });

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
