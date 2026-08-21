import Phaser from 'phaser';
import { EventBus } from '../../core/EventBus';
import type { GameState } from '../../core/GameState';

export class HUD {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private hpBarBackground: Phaser.GameObjects.Graphics;
  private hpBarFill: Phaser.GameObjects.Graphics;
  private hpText: Phaser.GameObjects.Text;

  private xpBarBackground: Phaser.GameObjects.Graphics;
  private xpBarFill: Phaser.GameObjects.Graphics;
  private levelText: Phaser.GameObjects.Text;

  private timerText: Phaser.GameObjects.Text;
  private killsText: Phaser.GameObjects.Text;

  private unbinds: Array<() => void> = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(9000);

    // HP Bar
    this.hpBarBackground = scene.add.graphics();
    this.hpBarFill = scene.add.graphics();
    this.hpText = scene.add.text(16, 38, 'HP: 100/100', {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace',
    });

    // XP Bar (across the top)
    this.xpBarBackground = scene.add.graphics();
    this.xpBarFill = scene.add.graphics();
    this.levelText = scene.add.text(16, 56, 'LVL 1', {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#4ade80',
      fontFamily: 'monospace',
    });

    // Stats (Right side)
    this.timerText = scene.add.text(scene.cameras.main.width - 16, 16, 'TIME: 00:00', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(1, 0);

    this.killsText = scene.add.text(scene.cameras.main.width - 16, 36, 'KILLS: 0', {
      fontSize: '14px',
      color: '#f87171',
      fontFamily: 'monospace',
    }).setOrigin(1, 0);

    this.container.add([
      this.hpBarBackground,
      this.hpBarFill,
      this.hpText,
      this.xpBarBackground,
      this.xpBarFill,
      this.levelText,
      this.timerText,
      this.killsText,
    ]);

    this.setupEventListeners();
    this.updateHp(100, 100);
    this.updateXp(0, 10);
  }

  private setupEventListeners(): void {
    const bus = EventBus.getInstance();

    this.unbinds.push(
      bus.on('player:damaged', (data) => {
        this.updateHp(data.currentHp, data.maxHp);
      }),
      bus.on('player:healed', (data) => {
        this.updateHp(data.currentHp, data.maxHp);
      }),
      bus.on('xp:gained', (data) => {
        this.updateXp(data.totalXp, data.nextLevelXp);
        this.levelText.setText(`LVL ${data.level}`);
      }),
      bus.on('player:levelUp', (data) => {
        this.levelText.setText(`LVL ${data.newLevel}`);
      })
    );
  }

  updateHp(current: number, max: number): void {
    const width = 160;
    const height = 14;
    const x = 16;
    const y = 18;

    this.hpBarBackground.clear();
    this.hpBarBackground.fillStyle(0x1f2937, 0.8);
    this.hpBarBackground.lineStyle(1, 0x4b5563);
    this.hpBarBackground.fillRoundedRect(x, y, width, height, 4);
    this.hpBarBackground.strokeRoundedRect(x, y, width, height, 4);

    const ratio = Math.max(0, Math.min(1, current / max));
    this.hpBarFill.clear();
    this.hpBarFill.fillStyle(0xef4444, 0.9);
    this.hpBarFill.fillRoundedRect(x, y, width * ratio, height, 4);

    this.hpText.setText(`HP: ${Math.ceil(current)}/${max}`);
  }

  updateXp(current: number, nextLevelXp: number): void {
    const width = this.scene.cameras.main.width - 32;
    const height = 6;
    const x = 16;
    const y = 6;

    this.xpBarBackground.clear();
    this.xpBarBackground.fillStyle(0x1e293b, 0.8);
    this.xpBarBackground.fillRect(x, y, width, height);

    const ratio = Math.max(0, Math.min(1, current / nextLevelXp));
    this.xpBarFill.clear();
    this.xpBarFill.fillStyle(0x3b82f6, 1);
    this.xpBarFill.fillRect(x, y, width * ratio, height);
  }

  update(state: GameState): void {
    const minutes = Math.floor(state.runTime / 60);
    const seconds = Math.floor(state.runTime % 60);
    const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    this.timerText.setText(`TIME: ${timeFormatted}`);
    this.killsText.setText(`KILLS: ${state.kills}`);
  }

  destroy(): void {
    for (const unbind of this.unbinds) {
      unbind();
    }
    this.unbinds = [];
    this.container.destroy();
  }
}
