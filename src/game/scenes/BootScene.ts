import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Menu Assets
    this.load.image('menu_bg', '/assets/menu/bg_sewer.webp');
    this.load.image('menu_logo', '/assets/menu/logo.webp');
    this.load.image('btn_play', '/assets/menu/btn_play.webp');
    this.load.image('btn_heroes', '/assets/menu/btn_heroes.webp');
    this.load.image('btn_upgrades', '/assets/menu/btn_upgrades.webp');
    this.load.image('btn_bestiary', '/assets/menu/btn_bestiary.webp');
    this.load.image('btn_settings', '/assets/menu/btn_settings.webp');
    this.load.image('btn_quit', '/assets/menu/btn_quit.webp');
    this.load.image('daily_goo', '/assets/menu/daily_goo.webp');
    this.load.image('mission_plank', '/assets/menu/mission_plank.webp');
    this.load.image('icon_trophy', '/assets/menu/icon_trophy.webp');
    this.load.image('icon_help', '/assets/menu/icon_help.webp');
    this.load.image('icon_gear', '/assets/menu/icon_gear.webp');
    this.load.image('social_buttons', '/assets/menu/social_buttons.webp');
    this.load.image('char_worm', '/assets/menu/char_worm.webp');
    this.load.image('char_rat', '/assets/menu/char_rat.webp');
  }

  create(): void {
    this.createPlaceholderTextures();
    this.scene.start('MenuScene');
  }

  private createPlaceholderTextures(): void {
    // 1. Hero texture (Cyan/Blue circle with direction indicator)
    const heroGfx = this.make.graphics({ x: 0, y: 0 });
    heroGfx.fillStyle(0x38bdf8, 1);
    heroGfx.fillCircle(16, 16, 14);
    heroGfx.lineStyle(2, 0xffffff, 0.9);
    heroGfx.strokeCircle(16, 16, 14);
    heroGfx.fillStyle(0x0f172a, 1);
    heroGfx.fillCircle(20, 13, 3); // eye right
    heroGfx.fillCircle(20, 19, 3); // eye left
    heroGfx.generateTexture('tex_hero', 32, 32);
    heroGfx.destroy();

    // 2. Enemy texture (Crimson / Red drone)
    const enemyGfx = this.make.graphics({ x: 0, y: 0 });
    enemyGfx.fillStyle(0xef4444, 1);
    enemyGfx.fillCircle(14, 14, 12);
    enemyGfx.lineStyle(2, 0x7f1d1d, 1);
    enemyGfx.strokeCircle(14, 14, 12);
    enemyGfx.fillStyle(0xfef08a, 1);
    enemyGfx.fillCircle(14, 14, 4); // Glowing yellow core
    enemyGfx.generateTexture('tex_enemy', 28, 28);
    enemyGfx.destroy();

    // 3. Projectile texture (Yellow/Orange spark)
    const projGfx = this.make.graphics({ x: 0, y: 0 });
    projGfx.fillStyle(0xfacc15, 1);
    projGfx.fillCircle(6, 6, 5);
    projGfx.lineStyle(1, 0xffffff, 0.8);
    projGfx.strokeCircle(6, 6, 5);
    projGfx.generateTexture('tex_projectile', 12, 12);
    projGfx.destroy();

    // 4. Gem / XP crystal (Green diamond)
    const gemGfx = this.make.graphics({ x: 0, y: 0 });
    gemGfx.fillStyle(0x22c55e, 1);
    gemGfx.beginPath();
    gemGfx.moveTo(8, 0);
    gemGfx.lineTo(16, 8);
    gemGfx.lineTo(8, 16);
    gemGfx.lineTo(0, 8);
    gemGfx.closePath();
    gemGfx.fillPath();
    gemGfx.generateTexture('tex_gem', 16, 16);
    gemGfx.destroy();

    // 5. Floor tile
    const floorGfx = this.make.graphics({ x: 0, y: 0 });
    floorGfx.fillStyle(0x0f172a, 1);
    floorGfx.fillRect(0, 0, 64, 64);
    floorGfx.lineStyle(1, 0x1e293b, 0.8);
    floorGfx.strokeRect(0, 0, 64, 64);
    floorGfx.generateTexture('tex_floor', 64, 64);
    floorGfx.destroy();
  }
}
