import Phaser from 'phaser';
import { createPlatformAdapter } from '../../platform';

export class MenuScene extends Phaser.Scene {
  private platform = createPlatformAdapter();

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const user = this.platform.getUser();

    // 1. Background Sewer Art (1280 x 720)
    const bg = this.add.image(width / 2, height / 2, 'menu_bg');
    bg.setDisplaySize(width, height);

    // 2. Logo (Top Left)
    const logo = this.add.image(260, 105, 'menu_logo');
    logo.setScale(0.62);

    // Logo idle animation (Breathing & subtle tilt)
    this.tweens.add({
      targets: logo,
      scaleX: 0.64,
      scaleY: 0.60,
      angle: { from: -1, to: 1 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 3. Central Characters
    // Pink Worm Lounging
    const worm = this.add.image(800, 420, 'char_worm').setInteractive({ useHandCursor: true });
    worm.setScale(1.15);

    // Worm idle breathing animation
    this.tweens.add({
      targets: worm,
      scaleY: 1.12,
      y: 426,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Tap/Click reaction on Worm (Squash & Stretch comic reaction)
    worm.on('pointerdown', () => {
      this.platform.vibrate(30);
      this.tweens.add({
        targets: worm,
        scaleX: 1.25,
        scaleY: 0.95,
        duration: 100,
        yoyo: true,
        ease: 'Back.easeOut',
      });
    });

    // Punk Rat near slime puddle on the floor
    const ratX = 485;
    const ratY = 535;

    // Grounding shadow under rat
    const ratShadow = this.add.ellipse(ratX, ratY + 70, 75, 18, 0x000000, 0.4);

    const rat = this.add.image(ratX, ratY, 'char_rat').setInteractive({ useHandCursor: true });
    rat.setScale(0.85);
    rat.setFlipX(true); // Mirrored to look into the scene

    this.tweens.add({
      targets: rat,
      angle: { from: -2, to: 2 },
      y: ratY - 3,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: ratShadow,
      scaleX: 1.08,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    rat.on('pointerdown', () => {
      this.platform.vibrate(30);
      this.tweens.add({
        targets: rat,
        scaleX: 0.95,
        scaleY: 0.70,
        duration: 90,
        yoyo: true,
      });
    });

    // 4. Vertical Button Stack (Left side)
    const buttonConfigs = [
      { key: 'btn_play', y: 235, scale: 0.62, action: () => this.startGame() },
      { key: 'btn_heroes', y: 295, scale: 0.62, action: () => this.onButtonClick('Heroes') },
      { key: 'btn_upgrades', y: 352, scale: 0.62, action: () => this.onButtonClick('Upgrades') },
      { key: 'btn_bestiary', y: 410, scale: 0.62, action: () => this.onButtonClick('Bestiary') },
      { key: 'btn_settings', y: 468, scale: 0.62, action: () => this.onButtonClick('Settings') },
      { key: 'btn_quit', y: 528, scale: 0.62, action: () => this.onButtonClick('Quit') },
    ];

    buttonConfigs.forEach((cfg, idx) => {
      const btn = this.add.image(260, cfg.y, cfg.key).setInteractive({ useHandCursor: true });
      btn.setScale(cfg.scale);

      const baseScale = cfg.scale;

      btn.on('pointerover', () => {
        this.tweens.add({
          targets: btn,
          scaleX: baseScale * 1.07,
          scaleY: baseScale * 1.07,
          angle: idx % 2 === 0 ? 1.5 : -1.5,
          duration: 120,
          ease: 'Back.easeOut',
        });
      });

      btn.on('pointerout', () => {
        this.tweens.add({
          targets: btn,
          scaleX: baseScale,
          scaleY: baseScale,
          angle: 0,
          duration: 120,
          ease: 'Quad.easeOut',
        });
      });

      btn.on('pointerdown', () => {
        this.platform.vibrate(30);
        this.tweens.add({
          targets: btn,
          scaleX: baseScale * 0.92,
          scaleY: baseScale * 0.92,
          duration: 70,
          yoyo: true,
          onComplete: () => {
            cfg.action();
          },
        });
      });
    });

    // 5. Bottom UI
    // Daily Goo
    const dailyGoo = this.add.image(80, 648, 'daily_goo').setInteractive({ useHandCursor: true });
    dailyGoo.setScale(0.62);
    this.tweens.add({
      targets: dailyGoo,
      scaleX: 0.65,
      scaleY: 0.60,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Mission Plank
    const mission = this.add.image(620, 658, 'mission_plank');
    mission.setScale(0.62);

    // Social Buttons
    const social = this.add.image(1165, 650, 'social_buttons').setInteractive({ useHandCursor: true });
    social.setScale(0.62);

    // Top Right Action Buttons (Trophy / Leaderboard and Help / Tutorial) — duplicate Settings Gear removed
    const topButtonConfigs = [
      { key: 'icon_trophy', x: 1160, action: () => this.onButtonClick('Leaderboard') },
      { key: 'icon_help', x: 1220, action: () => this.onButtonClick('Help') },
    ];

    topButtonConfigs.forEach((cfg) => {
      const icon = this.add.image(cfg.x, 50, cfg.key).setInteractive({ useHandCursor: true });
      icon.setScale(0.62);

      icon.on('pointerover', () => {
        this.tweens.add({
          targets: icon,
          scaleX: 0.68,
          scaleY: 0.68,
          duration: 100,
          ease: 'Back.easeOut',
        });
      });

      icon.on('pointerout', () => {
        this.tweens.add({
          targets: icon,
          scaleX: 0.62,
          scaleY: 0.62,
          duration: 100,
        });
      });

      icon.on('pointerdown', () => {
        this.platform.vibrate(25);
        this.tweens.add({
          targets: icon,
          scaleX: 0.55,
          scaleY: 0.55,
          duration: 70,
          yoyo: true,
          onComplete: cfg.action,
        });
      });
    });

    // 6. Platform / User Info Watermark
    const platformText = this.platform.isTelegram
      ? `TMA: ${user?.firstName || 'Survivor'}`
      : 'Web: v0.1.0';

    this.add.text(width - 16, height - 12, platformText, {
      fontSize: '11px',
      color: '#64748b',
      fontFamily: 'monospace',
    }).setOrigin(1, 1);
  }

  private startGame(): void {
    this.cameras.main.fade(300, 11, 14, 20, false, (_cam: any, progress: number) => {
      if (progress === 1) {
        this.scene.start('GameScene');
      }
    });
  }

  private onButtonClick(name: string): void {
    console.log(`[Menu] Clicked ${name}`);
  }
}
