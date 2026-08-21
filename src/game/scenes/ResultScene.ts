import Phaser from 'phaser';
import { GameState } from '../core/GameState';
import { createPlatformAdapter } from '../../platform';

export class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const state = GameState.getInstance();
    const platform = createPlatformAdapter();

    // Background
    this.add.rectangle(0, 0, width, height, 0x090d16, 0.95).setOrigin(0, 0);

    // Header
    this.add.text(width / 2, 100, 'RUN ENDED', {
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#ef4444',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Stats
    const minutes = Math.floor(state.runTime / 60);
    const seconds = Math.floor(state.runTime % 60);
    const timeSurvived = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const statsInfo = [
      `Time Survived: ${timeSurvived}`,
      `Enemies Defeated: ${state.kills}`,
      `Level Reached: ${state.level}`,
      `Final Score: ${state.score}`,
    ];

    this.add.text(width / 2, 220, statsInfo.join('\n\n'), {
      fontSize: '18px',
      align: 'center',
      color: '#e2e8f0',
      fontFamily: 'monospace',
      lineSpacing: 8,
    }).setOrigin(0.5);

    // Play Again Button
    const playBtn = this.add.rectangle(width / 2, height * 0.72, 220, 48, 0x16a34a).setInteractive({ useHandCursor: true });
    playBtn.setStrokeStyle(2, 0x4ade80);

    this.add.text(width / 2, height * 0.72, 'PLAY AGAIN', {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    playBtn.on('pointerdown', () => {
      platform.vibrate(30);
      this.scene.start('GameScene');
    });

    // Menu Button
    const menuBtn = this.add.rectangle(width / 2, height * 0.83, 220, 44, 0x334155).setInteractive({ useHandCursor: true });
    menuBtn.setStrokeStyle(1, 0x64748b);

    this.add.text(width / 2, height * 0.83, 'MAIN MENU', {
      fontSize: '15px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    menuBtn.on('pointerdown', () => {
      platform.vibrate(30);
      this.scene.start('MenuScene');
    });
  }
}
