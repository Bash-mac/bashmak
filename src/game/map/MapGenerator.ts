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

        // 2.1 Floor Decal (1-2 per cell)
        const decalX = cellCenterX + Phaser.Math.Between(-180, 180);
        const decalY = cellCenterY + Phaser.Math.Between(-180, 180);
        const decal = scene.add.image(decalX, decalY, Phaser.Utils.Array.GetRandom(decalKeys));
        decal.setDepth(1);
        decal.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
        decal.setScale(Phaser.Math.FloatBetween(0.85, 1.2));
        decal.setAlpha(Phaser.Math.FloatBetween(0.7, 0.95));

        // 2.2 Architectural Ground Detail (1 per alternating cell)
        if ((gx + gy) % 2 === 0) {
          const archX = cellCenterX + Phaser.Math.Between(-160, 160);
          const archY = cellCenterY + Phaser.Math.Between(-160, 160);
          const key = Phaser.Utils.Array.GetRandom(archKeys);
          const prop = scene.add.image(archX, archY, key);
          prop.setDepth(2);
          prop.setDisplaySize(70, 70);
          if (key !== 'prop_slime_source') {
            prop.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
          }
        }

        // Skip physical obstacles in player's immediate spawn zone
        if (distToSpawn < spawnSafeRadius) continue;

        // 2.3 Shrines (Placed in specific landmark sectors)
        const isShrineSector = shrineSectors.some((s) => s.gx === gx && s.gy === gy);
        if (isShrineSector) {
          const sx = cellCenterX + Phaser.Math.Between(-80, 80);
          const sy = cellCenterY + Phaser.Math.Between(-80, 80);
          const shrine = shrinesGroup.create(sx, sy, 'tex_prop_shrine') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
          shrine.setDisplaySize(76, 86);
          shrine.setDepth(7);
          shrine.setImmovable(true);
          shrine.setSize(shrine.width * 0.85, shrine.height * 0.85);

          // Visual pulsing glow via alpha tween
          scene.tweens.add({
            targets: shrine,
            alpha: { from: 0.82, to: 1.0 },
            duration: 750,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
          continue; // Keep shrine cell clear of blocking pillars
        }

        // 2.4 Obstacle Pillars (Distributed in ~55% of cells)
        if ((gx * 3 + gy * 5) % 7 < 4) {
          const px = cellCenterX + Phaser.Math.Between(-160, 160);
          const py = cellCenterY + Phaser.Math.Between(-160, 160);
          const pillar = pillarsGroup.create(px, py, 'tex_prop_pillar') as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
          pillar.setDisplaySize(80, 80);
          pillar.setDepth(7);
          pillar.refreshBody();
        }

        // 2.5 Breakable Barrels (Distributed in small stashes across ~45% of cells)
        if ((gx * 2 + gy * 7) % 5 < 2) {
          const stashX = cellCenterX + Phaser.Math.Between(-140, 140);
          const stashY = cellCenterY + Phaser.Math.Between(-140, 140);
          const count = Phaser.Math.Between(2, 3);
          for (let c = 0; c < count; c++) {
            const bx = stashX + (c % 2) * 40 + Phaser.Math.Between(-4, 4);
            const by = stashY + Math.floor(c / 2) * 40 + Phaser.Math.Between(-4, 4);
            const barrel = barrelsGroup.create(bx, by, 'tex_prop_barrel') as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
            barrel.setDisplaySize(56, 62);
            barrel.setDepth(6);
            barrel.refreshBody();
          }
        }
      }
    }

    return { pillarsGroup, barrelsGroup, shrinesGroup };
  }
}
