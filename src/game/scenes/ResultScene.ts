import Phaser from 'phaser';
import { GameState } from '../core/GameState';
import { SaveManager } from '../core/SaveManager';
import { createPlatformAdapter } from '../../platform';

export class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const state = GameState.getInstance();
    const saveManager = SaveManager.getInstance();
    const platform = createPlatformAdapter();

    // Background
    this.add.rectangle(0, 0, width, height, 0x090d16, 0.95).setOrigin(0, 0);

    // Header
    this.add.text(width / 2, 80, 'RUN ENDED', {
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#ef4444',
      fontFamily: 'monospace',
      stroke: '#450a0a',
      strokeThickness: 5,
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

    this.add.text(width / 2, 175, statsInfo.join('\n'), {
      fontSize: '16px',
      align: 'center',
      color: '#e2e8f0',
      fontFamily: 'monospace',
      lineSpacing: 6,
    }).setOrigin(0.5);

    // GOO Earnings Box
    const gooBoxY = 265;
    const gooBg = this.add.rectangle(width / 2, gooBoxY, 260, 52, 0x14532d, 0.9);
    gooBg.setStrokeStyle(2, 0x4ade80);

    this.add.text(width / 2, gooBoxY - 10, `+${state.gooCollected} GOO EARNED!`, {
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#4ade80',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(width / 2, gooBoxY + 12, `Total Bank: 🧪 ${saveManager.getGoo()}`, {
      fontSize: '13px',
      color: '#86efac',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // 1. Play Again Button
    const playBtn = this.add.rectangle(width / 2, height * 0.65, 230, 46, 0x16a34a).setInteractive({ useHandCursor: true });
    playBtn.setStrokeStyle(2, 0x4ade80);

    this.add.text(width / 2, height * 0.65, 'PLAY AGAIN', {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    playBtn.on('pointerdown', () => {
      platform.vibrate(30);
      this.scene.start('GameScene');
    });

    // 2. Upgrades Button
    const upgBtn = this.add.rectangle(width / 2, height * 0.75, 230, 46, 0xb45309).setInteractive({ useHandCursor: true });
    upgBtn.setStrokeStyle(2, 0xfacc15);

    this.add.text(width / 2, height * 0.75, '🧪 UPGRADES SHOP', {
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#fef08a',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    upgBtn.on('pointerdown', () => {
      platform.vibrate(30);
      this.scene.start('UpgradesScene');
    });

    // 3. Menu Button
    const menuBtn = this.add.rectangle(width / 2, height * 0.85, 230, 42, 0x334155).setInteractive({ useHandCursor: true });
    menuBtn.setStrokeStyle(1, 0x64748b);

    this.add.text(width / 2, height * 0.85, 'MAIN MENU', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    menuBtn.on('pointerdown', () => {
      platform.vibrate(30);
      this.scene.start('MenuScene');
    });
  }
}
