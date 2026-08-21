import Phaser from 'phaser';
import { createPlatformAdapter } from '../../platform';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const platform = createPlatformAdapter();
    const user = platform.getUser();

    // Background
    this.add.tileSprite(0, 0, width, height, 'tex_floor').setOrigin(0, 0).setAlpha(0.6);

    // Title
    this.add.text(width / 2, height / 3 - 30, 'ROGUE CORE', {
      fontSize: '42px',
      fontStyle: 'bold',
      color: '#38bdf8',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Platform / User info
    const platformLabel = platform.isTelegram
      ? `Telegram Mini App (User: ${user?.firstName || 'Survivor'})`
      : 'Web Browser Mode';

    this.add.text(width / 2, height / 3 + 25, platformLabel, {
      fontSize: '14px',
      color: '#94a3b8',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Controls hint
    this.add.text(width / 2, height / 2 + 10, 'Desktop: WASD / Arrow Keys\nMobile: Touch Drag Joystick', {
      fontSize: '14px',
      align: 'center',
      color: '#64748b',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Start Button
    const btnBg = this.add.rectangle(width / 2, height * 0.72, 220, 50, 0x0284c7).setInteractive({ useHandCursor: true });
    btnBg.setStrokeStyle(2, 0x38bdf8);

    this.add.text(width / 2, height * 0.72, 'START RUN', {
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    btnBg.on('pointerover', () => btnBg.setFillStyle(0x0369a1));
    btnBg.on('pointerout', () => btnBg.setFillStyle(0x0284c7));
    btnBg.on('pointerdown', () => {
      platform.vibrate(40);
      this.scene.start('GameScene');
    });
  }
}
