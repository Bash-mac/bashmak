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

    // 5. Mutant Treasure Chest
    const chestGfx = scene.make.graphics({ x: 0, y: 0 });
    // Chest base (toxic-dark metal)
    chestGfx.fillStyle(0x1e293b, 1);
    chestGfx.fillRoundedRect(2, 6, 36, 28, 5);
    chestGfx.lineStyle(2, 0xfacc15, 1);
    chestGfx.strokeRoundedRect(2, 6, 36, 28, 5);
    // Gold trim band & lid
    chestGfx.fillStyle(0xeab308, 1);
    chestGfx.fillRect(4, 8, 32, 7);
    chestGfx.fillStyle(0xfef08a, 1);
    chestGfx.fillRect(16, 12, 8, 12);
    // Neon green glowing keyhole/core
    chestGfx.fillStyle(0x22c55e, 1);
    chestGfx.fillCircle(20, 18, 3);
    chestGfx.generateTexture('drop_chest', 40, 40);
    chestGfx.destroy();

    // 6. Piezo-Taser Icon (Junk piezo lighter with electric spark)
    const taserGfx = scene.make.graphics({ x: 0, y: 0 });
    // Dark background
    taserGfx.fillStyle(0x0f172a, 1);
    taserGfx.fillRoundedRect(4, 4, 56, 56, 10);
    taserGfx.lineStyle(2, 0xfacc15, 1);
    taserGfx.strokeRoundedRect(4, 4, 56, 56, 10);
    // Lighter body (red/orange plastic)
    taserGfx.fillStyle(0xd97706, 1);
    taserGfx.fillRoundedRect(16, 22, 20, 32, 4);
    taserGfx.fillStyle(0x475569, 1);
    taserGfx.fillRect(18, 14, 16, 10);
    // Wire & copper needle
    taserGfx.lineStyle(3, 0xf59e0b, 1);
    taserGfx.lineBetween(26, 14, 38, 10);
    taserGfx.lineBetween(38, 10, 44, 16);
    // Electric Spark / Lightning bolt
    taserGfx.fillStyle(0x22c55e, 1);
    taserGfx.fillTriangle(44, 8, 38, 20, 48, 18);
    taserGfx.fillStyle(0xfef08a, 1);
    taserGfx.fillTriangle(48, 16, 42, 28, 52, 22);
    taserGfx.generateTexture('icon_weapon_piezo_taser', 64, 64);
    taserGfx.destroy();
  }
}
