import Phaser from 'phaser';

export class PlaceholderTextures {
  public static generate(scene: Phaser.Scene): void {
    // 1. Hero: Worm
    const wormGfx = scene.make.graphics({ x: 0, y: 0 });
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

    // 2. Fodder Bat
    const fodderGfx = scene.make.graphics({ x: 0, y: 0 });
    fodderGfx.fillStyle(0xa855f7, 1);
    fodderGfx.fillCircle(12, 12, 8);
    fodderGfx.lineStyle(2, 0x581c87, 1);
    fodderGfx.strokeCircle(12, 12, 8);
    fodderGfx.fillStyle(0xc084fc, 0.9);
    fodderGfx.fillTriangle(4, 12, 0, 4, 10, 8);
    fodderGfx.fillTriangle(20, 12, 24, 4, 14, 8);
    fodderGfx.fillStyle(0xfef08a, 1);
    fodderGfx.fillCircle(14, 10, 2);
    fodderGfx.fillCircle(14, 14, 2);
    fodderGfx.generateTexture('tex_fodder', 24, 24);
    fodderGfx.destroy();

    // 3. Crawler
    const crawlerGfx = scene.make.graphics({ x: 0, y: 0 });
    crawlerGfx.fillStyle(0xd97706, 1);
    crawlerGfx.fillCircle(16, 16, 14);
    crawlerGfx.lineStyle(2, 0x78350f, 1);
    crawlerGfx.strokeCircle(16, 16, 14);
    crawlerGfx.fillStyle(0xfef08a, 1);
    crawlerGfx.fillCircle(16, 16, 4);
    crawlerGfx.generateTexture('tex_crawler', 32, 32);
    crawlerGfx.destroy();

    // 4. Sprinter
    const sprinterGfx = scene.make.graphics({ x: 0, y: 0 });
    sprinterGfx.fillStyle(0xf97316, 1);
    sprinterGfx.fillTriangle(24, 12, 4, 4, 4, 20);
    sprinterGfx.lineStyle(2, 0x7c2d12, 1);
    sprinterGfx.strokeTriangle(24, 12, 4, 4, 4, 20);
    sprinterGfx.fillStyle(0xffffff, 1);
    sprinterGfx.fillCircle(12, 12, 3);
    sprinterGfx.generateTexture('tex_sprinter', 26, 24);
    sprinterGfx.destroy();

    // 5. Armored Slug / Tank
    const tankGfx = scene.make.graphics({ x: 0, y: 0 });
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

    // 6. Exploder
    const exploderGfx = scene.make.graphics({ x: 0, y: 0 });
    exploderGfx.fillStyle(0xdc2626, 1);
    exploderGfx.fillCircle(16, 16, 14);
    exploderGfx.lineStyle(3, 0x450a0a, 1);
    exploderGfx.strokeCircle(16, 16, 14);
    exploderGfx.fillStyle(0xfbbf24, 1);
    exploderGfx.fillCircle(16, 16, 6);
    exploderGfx.generateTexture('tex_exploder', 32, 32);
    exploderGfx.destroy();

    // 7. Mini-Boss Elite
    const miniBossGfx = scene.make.graphics({ x: 0, y: 0 });
    miniBossGfx.fillStyle(0xb91c1c, 1);
    miniBossGfx.fillCircle(30, 30, 28);
    miniBossGfx.lineStyle(4, 0xfacc15, 1);
    miniBossGfx.strokeCircle(30, 30, 28);
    miniBossGfx.fillStyle(0x7f1d1d, 1);
    miniBossGfx.fillCircle(30, 30, 14);
    miniBossGfx.fillStyle(0xfef08a, 1);
    miniBossGfx.fillCircle(38, 24, 5);
    miniBossGfx.fillCircle(38, 36, 5);
    miniBossGfx.generateTexture('tex_miniboss', 60, 60);
    miniBossGfx.destroy();

    // 8. Boss: Kurgan
    const bossGfx = scene.make.graphics({ x: 0, y: 0 });
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

    // 9. Slime Spit Projectile
    const slimeGfx = scene.make.graphics({ x: 0, y: 0 });
    slimeGfx.fillStyle(0x22c55e, 1);
    slimeGfx.fillCircle(8, 8, 7);
    slimeGfx.lineStyle(2, 0xffffff, 0.9);
    slimeGfx.strokeCircle(8, 8, 7);
    slimeGfx.generateTexture('tex_slime_spit', 16, 16);
    slimeGfx.destroy();

    // 10. Acid Pool
    const acidPoolGfx = scene.make.graphics({ x: 0, y: 0 });
    acidPoolGfx.fillStyle(0x84cc16, 0.6);
    acidPoolGfx.fillCircle(32, 32, 30);
    acidPoolGfx.lineStyle(3, 0x4ade80, 0.9);
    acidPoolGfx.strokeCircle(32, 32, 30);
    acidPoolGfx.generateTexture('tex_acid_pool', 64, 64);
    acidPoolGfx.destroy();

    // 11. XP Gem
    const gemGfx = scene.make.graphics({ x: 0, y: 0 });
    gemGfx.fillStyle(0x4ade80, 1);
    gemGfx.fillCircle(8, 8, 6);
    gemGfx.lineStyle(2, 0x14532d, 1);
    gemGfx.strokeCircle(8, 8, 6);
    gemGfx.fillStyle(0xffffff, 1);
    gemGfx.fillCircle(6, 6, 2);
    gemGfx.generateTexture('tex_gem', 16, 16);
    gemGfx.destroy();

    // 12. GOO Drop
    const gooGfx = scene.make.graphics({ x: 0, y: 0 });
    gooGfx.fillStyle(0x84cc16, 1);
    gooGfx.fillCircle(10, 10, 8);
    gooGfx.lineStyle(2, 0xfacc15, 1);
    gooGfx.strokeCircle(10, 10, 8);
    gooGfx.fillStyle(0xfef08a, 1);
    gooGfx.fillCircle(7, 7, 3);
    gooGfx.fillStyle(0x22c55e, 0.8);
    gooGfx.fillCircle(11, 11, 4);
    gooGfx.generateTexture('tex_goo_drop', 20, 20);
    gooGfx.destroy();

    // 13. Eggplant Ball
    const eggGfx = scene.make.graphics({ x: 0, y: 0 });
    eggGfx.fillStyle(0x9333ea, 1);
    eggGfx.fillCircle(16, 16, 14);
    eggGfx.lineStyle(2, 0x581c87, 1);
    eggGfx.strokeCircle(16, 16, 14);
    eggGfx.fillStyle(0x22c55e, 1);
    eggGfx.fillTriangle(16, 2, 12, 8, 20, 8);
    eggGfx.generateTexture('tex_eggplant_ball', 32, 32);
    eggGfx.destroy();
  }
}
