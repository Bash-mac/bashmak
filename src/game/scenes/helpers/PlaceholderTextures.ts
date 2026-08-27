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

    // 2. Slime Spit Projectile
    const slimeGfx = scene.make.graphics({ x: 0, y: 0 });
    slimeGfx.fillStyle(0x22c55e, 1);
    slimeGfx.fillCircle(8, 8, 7);
    slimeGfx.lineStyle(2, 0xffffff, 0.9);
    slimeGfx.strokeCircle(8, 8, 7);
    slimeGfx.generateTexture('tex_slime_spit', 16, 16);
    slimeGfx.destroy();

    // 3. Acid Pool
    const acidPoolGfx = scene.make.graphics({ x: 0, y: 0 });
    acidPoolGfx.fillStyle(0x84cc16, 0.6);
    acidPoolGfx.fillCircle(32, 32, 30);
    acidPoolGfx.lineStyle(3, 0x4ade80, 0.9);
    acidPoolGfx.strokeCircle(32, 32, 30);
    acidPoolGfx.generateTexture('tex_acid_pool', 64, 64);
    acidPoolGfx.destroy();

    // 4. Eggplant Ball
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
