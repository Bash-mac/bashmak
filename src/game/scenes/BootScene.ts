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

    // Bashmak Poses
    this.load.image('pose_idle', '/assets/sprites/poses/pose_idle.png');
    this.load.image('pose_run', '/assets/sprites/poses/pose_run.png');
    this.load.image('pose_attack', '/assets/sprites/poses/pose_attack.png');
    this.load.image('pose_ranged_spit', '/assets/sprites/poses/pose_ranged_spit.png');
    this.load.image('pose_heavy_prep', '/assets/sprites/poses/pose_heavy_prep.png');
    this.load.image('pose_ultimate', '/assets/sprites/poses/pose_ultimate.png');
    this.load.image('pose_damaged', '/assets/sprites/poses/pose_damaged.png');
    this.load.image('pose_alert', '/assets/sprites/poses/pose_alert.png');

    // Bashmak Expressions for HUD & Modals
    this.load.image('face_happy', '/assets/sprites/expressions/face_happy.png');
    this.load.image('face_bored', '/assets/sprites/expressions/face_bored.png');
    this.load.image('face_smug', '/assets/sprites/expressions/face_smug.png');
    this.load.image('face_angry', '/assets/sprites/expressions/face_angry.png');
    this.load.image('face_injured', '/assets/sprites/expressions/face_injured.png');
    this.load.image('face_terrified', '/assets/sprites/expressions/face_terrified.png');
    this.load.image('face_furious', '/assets/sprites/expressions/face_furious.png');
    this.load.image('face_victorious', '/assets/sprites/expressions/face_victorious.png');

    // Combat FX
    this.load.image('fx_slime', '/assets/sprites/poses/fx_slime.png');
    this.load.image('fx_impact', '/assets/sprites/poses/fx_impact.png');
    this.load.image('fx_poison', '/assets/sprites/poses/fx_poison.png');
  }

  create(): void {
    this.createPlaceholderTextures();
    this.scene.start('MenuScene');
  }

  private createPlaceholderTextures(): void {
    // 1. Hero: Worm (Pink with cartoon eyes and bandana)
    const wormGfx = this.make.graphics({ x: 0, y: 0 });
    wormGfx.fillStyle(0xf472b6, 1);
    wormGfx.fillCircle(18, 18, 16);
    wormGfx.lineStyle(3, 0x831843, 1);
    wormGfx.strokeCircle(18, 18, 16);
    wormGfx.fillStyle(0x0284c7, 1);
    wormGfx.fillRect(4, 4, 28, 8);
    wormGfx.fillStyle(0xffffff, 1);
    wormGfx.fillCircle(22, 14, 5);
    wormGfx.fillCircle(22, 22, 5);
    wormGfx.fillStyle(0x0f172a, 1);
    wormGfx.fillCircle(24, 14, 2.5);
    wormGfx.fillCircle(24, 22, 2.5);
    wormGfx.generateTexture('tex_worm_hero', 36, 36);
    wormGfx.destroy();

    // 2. Fodder Bat (Летучая мышь) - Small purple flying critter
    const fodderGfx = this.make.graphics({ x: 0, y: 0 });
    fodderGfx.fillStyle(0xa855f7, 1);
    fodderGfx.fillCircle(12, 12, 8);
    fodderGfx.lineStyle(2, 0x581c87, 1);
    fodderGfx.strokeCircle(12, 12, 8);
    // Wings
    fodderGfx.fillStyle(0xc084fc, 0.9);
    fodderGfx.fillTriangle(4, 12, 0, 4, 10, 8);
    fodderGfx.fillTriangle(20, 12, 24, 4, 14, 8);
    fodderGfx.fillStyle(0xfef08a, 1);
    fodderGfx.fillCircle(14, 10, 2);
    fodderGfx.fillCircle(14, 14, 2);
    fodderGfx.generateTexture('tex_fodder', 24, 24);
    fodderGfx.destroy();

    // 3. Crawler (Ползун) - Orange swarmer beetle
    const crawlerGfx = this.make.graphics({ x: 0, y: 0 });
    crawlerGfx.fillStyle(0xd97706, 1);
    crawlerGfx.fillCircle(16, 16, 14);
    crawlerGfx.lineStyle(2, 0x78350f, 1);
    crawlerGfx.strokeCircle(16, 16, 14);
    crawlerGfx.fillStyle(0xfef08a, 1);
    crawlerGfx.fillCircle(16, 16, 4);
    crawlerGfx.generateTexture('tex_crawler', 32, 32);
    crawlerGfx.destroy();

    // 4. Sprinter (Спринтер) - Bright neon lime/orange fast runner
    const sprinterGfx = this.make.graphics({ x: 0, y: 0 });
    sprinterGfx.fillStyle(0xf97316, 1);
    sprinterGfx.fillTriangle(24, 12, 4, 4, 4, 20);
    sprinterGfx.lineStyle(2, 0x7c2d12, 1);
    sprinterGfx.strokeTriangle(24, 12, 4, 4, 4, 20);
    sprinterGfx.fillStyle(0xffffff, 1);
    sprinterGfx.fillCircle(12, 12, 3);
    sprinterGfx.generateTexture('tex_sprinter', 26, 24);
    sprinterGfx.destroy();

    // 5. Armored Slug / Tank (Броневик) - Heavy metallic grey/green slug
    const tankGfx = this.make.graphics({ x: 0, y: 0 });
    tankGfx.fillStyle(0x475569, 1);
    tankGfx.fillCircle(24, 24, 22);
    tankGfx.lineStyle(4, 0x1e293b, 1);
    tankGfx.strokeCircle(24, 24, 22);
    tankGfx.fillStyle(0x64748b, 1);
    tankGfx.fillCircle(24, 24, 14);
    tankGfx.fillStyle(0xef4444, 1);
    tankGfx.fillCircle(30, 24, 4);
    tankGfx.generateTexture('tex_tank', 48, 48);
    tankGfx.destroy();

    // 6. Exploder (Разрывник) - Pulsing dark red explosive bulb
    const exploderGfx = this.make.graphics({ x: 0, y: 0 });
    exploderGfx.fillStyle(0xdc2626, 1);
    exploderGfx.fillCircle(16, 16, 14);
    exploderGfx.lineStyle(3, 0x450a0a, 1);
    exploderGfx.strokeCircle(16, 16, 14);
    exploderGfx.fillStyle(0xfbbf24, 1);
    exploderGfx.fillCircle(16, 16, 6);
    exploderGfx.generateTexture('tex_exploder', 32, 32);
    exploderGfx.destroy();

    // 7. Mini-Boss Elite (Элитный Мутант) - 60x60 glowing red mutant
    const miniBossGfx = this.make.graphics({ x: 0, y: 0 });
    miniBossGfx.fillStyle(0xb91c1c, 1);
    miniBossGfx.fillCircle(30, 30, 28);
    miniBossGfx.lineStyle(4, 0xfacc15, 1); // Gold elite border
    miniBossGfx.strokeCircle(30, 30, 28);
    miniBossGfx.fillStyle(0x7f1d1d, 1);
    miniBossGfx.fillCircle(30, 30, 14);
    miniBossGfx.fillStyle(0xfef08a, 1);
    miniBossGfx.fillCircle(38, 24, 5);
    miniBossGfx.fillCircle(38, 36, 5);
    miniBossGfx.generateTexture('tex_miniboss', 60, 60);
    miniBossGfx.destroy();

    // 8. Boss: Kurgan (Курган) - Massive 76x76 armored mound
    const bossGfx = this.make.graphics({ x: 0, y: 0 });
    bossGfx.fillStyle(0x312e81, 1);
    bossGfx.fillCircle(38, 38, 36);
    bossGfx.lineStyle(4, 0x4338ca, 1);
    bossGfx.strokeCircle(38, 38, 36);
    bossGfx.fillStyle(0xef4444, 1);
    bossGfx.fillCircle(38, 38, 16);
    bossGfx.fillStyle(0xfde047, 1);
    bossGfx.fillCircle(44, 30, 6);
    bossGfx.fillCircle(44, 46, 6);
    bossGfx.generateTexture('tex_boss_kurgan', 76, 76);
    bossGfx.destroy();

    // 9. Slime Spit Projectile (Neon lime green)
    const slimeGfx = this.make.graphics({ x: 0, y: 0 });
    slimeGfx.fillStyle(0x22c55e, 1);
    slimeGfx.fillCircle(8, 8, 7);
    slimeGfx.lineStyle(2, 0xffffff, 0.9);
    slimeGfx.strokeCircle(8, 8, 7);
    slimeGfx.generateTexture('tex_slime_spit', 16, 16);
    slimeGfx.destroy();

    // 10. Acid Pool (Toxic green puddle)
    const acidPoolGfx = this.make.graphics({ x: 0, y: 0 });
    acidPoolGfx.fillStyle(0x84cc16, 0.6);
    acidPoolGfx.fillCircle(32, 32, 30);
    acidPoolGfx.lineStyle(3, 0x4ade80, 0.9);
    acidPoolGfx.strokeCircle(32, 32, 30);
    acidPoolGfx.generateTexture('tex_acid_pool', 64, 64);
    acidPoolGfx.destroy();

    // 11. XP Gem (Electric green cartoon crystal with black stroke)
    const gemGfx = this.make.graphics({ x: 0, y: 0 });
    gemGfx.fillStyle(0x4ade80, 1);
    gemGfx.fillCircle(8, 8, 6);
    gemGfx.lineStyle(2, 0x14532d, 1);
    gemGfx.strokeCircle(8, 8, 6);
    gemGfx.fillStyle(0xffffff, 1);
    gemGfx.fillCircle(6, 6, 2);
    gemGfx.generateTexture('tex_gem', 16, 16);
    gemGfx.destroy();

    // 12. Floor Tile
    const floorGfx = this.make.graphics({ x: 0, y: 0 });
    floorGfx.fillStyle(0x0a0e1a, 1);
    floorGfx.fillRect(0, 0, 64, 64);
    floorGfx.lineStyle(1, 0x141e33, 0.8);
    floorGfx.strokeRect(0, 0, 64, 64);
    floorGfx.generateTexture('tex_floor', 64, 64);
    floorGfx.destroy();

    // 13. Breakable Barrel (Wood/Green toxic barrel)
    const barrelGfx = this.make.graphics({ x: 0, y: 0 });
    barrelGfx.fillStyle(0x78350f, 1);
    barrelGfx.fillCircle(14, 14, 12);
    barrelGfx.lineStyle(2, 0xfacc15, 1);
    barrelGfx.strokeCircle(14, 14, 12);
    barrelGfx.fillStyle(0x84cc16, 1);
    barrelGfx.fillCircle(14, 14, 4);
    barrelGfx.generateTexture('tex_prop_barrel', 28, 28);
    barrelGfx.destroy();

    // 14. Obstacle Pillar (Dark grey stone column)
    const pillarGfx = this.make.graphics({ x: 0, y: 0 });
    pillarGfx.fillStyle(0x334155, 1);
    pillarGfx.fillRect(0, 0, 36, 36);
    pillarGfx.lineStyle(3, 0x64748b, 1);
    pillarGfx.strokeRect(0, 0, 36, 36);
    pillarGfx.fillStyle(0x1e293b, 1);
    pillarGfx.fillRect(6, 6, 24, 24);
    pillarGfx.generateTexture('tex_prop_pillar', 36, 36);
    pillarGfx.destroy();

    // 15. Power-Up Shrine (Gold/Purple crystal shrine)
    const shrineGfx = this.make.graphics({ x: 0, y: 0 });
    shrineGfx.fillStyle(0xa855f7, 1);
    shrineGfx.fillTriangle(16, 0, 0, 16, 32, 16);
    shrineGfx.fillTriangle(0, 16, 32, 16, 16, 32);
    shrineGfx.lineStyle(2, 0xfacc15, 1);
    shrineGfx.strokeTriangle(16, 0, 0, 16, 32, 16);
    shrineGfx.strokeTriangle(0, 16, 32, 16, 16, 32);
    shrineGfx.generateTexture('tex_prop_shrine', 32, 32);
    shrineGfx.destroy();

    // 16. Wireless Homing Dagger (Cyan glowing sharp projectile)
    const daggerGfx = this.make.graphics({ x: 0, y: 0 });
    daggerGfx.fillStyle(0x38bdf8, 1);
    daggerGfx.fillTriangle(20, 7, 0, 0, 0, 14);
    daggerGfx.lineStyle(1.5, 0xffffff, 1);
    daggerGfx.strokeTriangle(20, 7, 0, 0, 0, 14);
    daggerGfx.fillStyle(0xffffff, 1);
    daggerGfx.fillCircle(6, 7, 3);
    daggerGfx.generateTexture('tex_homing_dagger', 22, 16);
    daggerGfx.destroy();

    // 17. Bouncing Bone (Ivory cartoon bone)
    const boneGfx = this.make.graphics({ x: 0, y: 0 });
    boneGfx.fillStyle(0xfef08a, 1);
    boneGfx.fillRect(6, 7, 16, 6);
    boneGfx.fillCircle(5, 5, 4);
    boneGfx.fillCircle(5, 15, 4);
    boneGfx.fillCircle(23, 5, 4);
    boneGfx.fillCircle(23, 15, 4);
    boneGfx.lineStyle(1.5, 0x713f12, 1);
    boneGfx.strokeRect(6, 7, 16, 6);
    boneGfx.generateTexture('tex_bouncing_bone', 28, 20);
    boneGfx.destroy();
  }
}
