import Phaser from 'phaser';

export interface MapObjects {
  pillarsGroup: Phaser.Physics.Arcade.StaticGroup;
  barrelsGroup: Phaser.Physics.Arcade.StaticGroup;
  shrinesGroup: Phaser.Physics.Arcade.Group;
}

export class MapGenerator {
  public static createWorld(scene: Phaser.Scene, worldSize = 4000): MapObjects {
    // 1. World Bounds & Floor Tiling
    scene.physics.world.setBounds(0, 0, worldSize, worldSize);
    scene.add.tileSprite(0, 0, worldSize, worldSize, 'tex_floor').setOrigin(0, 0);

    const pillarsGroup = scene.physics.add.staticGroup();
    const barrelsGroup = scene.physics.add.staticGroup();
    const shrinesGroup = scene.physics.add.group();

    const spawnCenterX = worldSize / 2;
    const spawnCenterY = worldSize / 2;
    const spawnSafeRadius = 260;

    const decalKeys = ['floor_sewage', 'floor_cracked', 'floor_graffiti'];
    const archKeys = ['prop_manhole', 'prop_grate', 'prop_valve', 'prop_slime_source'];

    // 2. Sector-Based Grid Placement (8x8 Grid = 64 cells, 500x500px each)
    // Ensures uniform distribution without barren zones or clumping.
    const gridSize = 8;
    const cellSize = worldSize / gridSize; // 500px per cell

    // Pre-allocated sector coordinates for 6 Shrines across the map
    const shrineSectors = [
      { gx: 1, gy: 1 },
      { gx: 6, gy: 1 },
      { gx: 1, gy: 6 },
      { gx: 6, gy: 6 },
      { gx: 1, gy: 4 },
      { gx: 6, gy: 3 },
    ];

    for (let gx = 0; gx < gridSize; gx++) {
      for (let gy = 0; gy < gridSize; gy++) {
        const cellCenterX = gx * cellSize + cellSize / 2;
        const cellCenterY = gy * cellSize + cellSize / 2;
        const distToSpawn = Phaser.Math.Distance.Between(cellCenterX, cellCenterY, spawnCenterX, spawnCenterY);

        // 2.1 Floor Decal (Tier 4: Subtle background details, alpha 0.4-0.55)
        const decalX = cellCenterX + Phaser.Math.Between(-180, 180);
        const decalY = cellCenterY + Phaser.Math.Between(-180, 180);
        const decal = scene.add.image(decalX, decalY, Phaser.Utils.Array.GetRandom(decalKeys));
        decal.setDepth(1);
        decal.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
        decal.setScale(Phaser.Math.FloatBetween(0.8, 1.1));
        decal.setAlpha(Phaser.Math.FloatBetween(0.40, 0.55));

        // 2.2 Architectural Ground Detail (Tier 4: Flat grates/valves underfoot, size 52px, alpha 0.5)
        if ((gx + gy) % 2 === 0) {
          const archX = cellCenterX + Phaser.Math.Between(-160, 160);
          const archY = cellCenterY + Phaser.Math.Between(-160, 160);
          const key = Phaser.Utils.Array.GetRandom(archKeys);
          const prop = scene.add.image(archX, archY, key);
          prop.setDepth(2);
          prop.setDisplaySize(52, 52);
          prop.setAlpha(0.50);
          if (key !== 'prop_slime_source') {
            prop.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
          }
        }

        // Skip physical obstacles in player's immediate spawn zone
        if (distToSpawn < spawnSafeRadius) continue;

        // 2.3 Shrines (Tier 1: Dominant landmark, size 130x150px, glowing aura & floating beacon)
        const isShrineSector = shrineSectors.some((s) => s.gx === gx && s.gy === gy);
        if (isShrineSector) {
          const sx = cellCenterX + Phaser.Math.Between(-80, 80);
          const sy = cellCenterY + Phaser.Math.Between(-80, 80);

          // Golden-Purple magical aura on ground
          const auraGfx = scene.add.graphics().setDepth(3);
          auraGfx.setPosition(sx, sy + 30);
          auraGfx.lineStyle(3, 0xfacc15, 0.8);
          auraGfx.fillStyle(0xa855f7, 0.25);
          auraGfx.fillCircle(0, 0, 55);
          auraGfx.strokeCircle(0, 0, 55);

          scene.tweens.add({
            targets: auraGfx,
            scaleX: 1.15,
            scaleY: 1.15,
            alpha: 0.6,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });

          const shrine = shrinesGroup.create(sx, sy, 'tex_prop_shrine') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
          shrine.setDisplaySize(126, 144);
          shrine.setDepth(9);
          shrine.setImmovable(true);
          shrine.setSize(shrine.width * 0.8, shrine.height * 0.8);

          // Floating Star / Beacon above shrine
          const beacon = scene.add.text(sx, sy - 85, '', {
            fontSize: '26px',
            color: '#facc15',
            stroke: '#000000',
            strokeThickness: 4,
          }).setOrigin(0.5).setDepth(10);

          scene.tweens.add({
            targets: beacon,
            y: sy - 98,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });

          shrine.setData('beacon', beacon);
          shrine.setData('aura', auraGfx);

          // Subtle pulse on shrine body
          scene.tweens.add({
            targets: shrine,
            alpha: { from: 0.88, to: 1.0 },
            duration: 750,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
          continue; // Keep shrine cell clear of blocking pillars
        }

        // 2.4 Obstacle Pillars (Tier 2: Monumental obstacles, size 115x135px, heavy base shadow)
        if ((gx * 3 + gy * 5) % 7 < 4) {
          const px = cellCenterX + Phaser.Math.Between(-160, 160);
          const py = cellCenterY + Phaser.Math.Between(-160, 160);

          // Base shadow
          scene.add.ellipse(px, py + 48, 80, 22, 0x000000, 0.35).setDepth(3);

          const pillar = pillarsGroup.create(px, py, 'tex_prop_pillar') as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
          pillar.setDisplaySize(115, 135);
          pillar.setDepth(8);
          pillar.setSize(pillar.width * 0.75, pillar.height * 0.5);
          pillar.setOffset(pillar.width * 0.125, pillar.height * 0.45);
          pillar.refreshBody();
        }

        // 2.5 Breakable Barrels (Tier 3: Compact loot crates, size 44x50px, tight clusters)
        if ((gx * 2 + gy * 7) % 5 < 2) {
          const stashX = cellCenterX + Phaser.Math.Between(-140, 140);
          const stashY = cellCenterY + Phaser.Math.Between(-140, 140);
          const count = Phaser.Math.Between(2, 3);
          for (let c = 0; c < count; c++) {
            const bx = stashX + (c % 2) * 32 + Phaser.Math.Between(-3, 3);
            const by = stashY + Math.floor(c / 2) * 32 + Phaser.Math.Between(-3, 3);

            // Small shadow
            scene.add.ellipse(bx, by + 18, 34, 12, 0x000000, 0.30).setDepth(3);

            const barrel = barrelsGroup.create(bx, by, 'tex_prop_barrel') as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
            barrel.setDisplaySize(44, 50);
            barrel.setDepth(6);
            barrel.setSize(barrel.width * 0.8, barrel.height * 0.7);
            barrel.setOffset(barrel.width * 0.1, barrel.height * 0.2);
            barrel.refreshBody();
          }
        }
      }
    }

    return { pillarsGroup, barrelsGroup, shrinesGroup };
  }
}
