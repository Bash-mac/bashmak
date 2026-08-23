import Phaser from 'phaser';

export interface MapObjects {
  pillarsGroup: Phaser.Physics.Arcade.StaticGroup;
  barrelsGroup: Phaser.Physics.Arcade.StaticGroup;
  shrinesGroup: Phaser.Physics.Arcade.Group;
}

export class MapGenerator {
  public static createWorld(scene: Phaser.Scene, worldSize = 4000): MapObjects {
    // 1. World Bounds & Floor
    scene.physics.world.setBounds(0, 0, worldSize, worldSize);
    scene.add.tileSprite(0, 0, worldSize, worldSize, 'tex_floor').setOrigin(0, 0);

    const pillarsGroup = scene.physics.add.staticGroup();
    const barrelsGroup = scene.physics.add.staticGroup();
    const shrinesGroup = scene.physics.add.group();

    const spawnCenterX = worldSize / 2;
    const spawnCenterY = worldSize / 2;

    // 2. Obstacle Pillars (35 pillars across the 4000x4000 map)
    for (let i = 0; i < 35; i++) {
      let px = Phaser.Math.Between(200, worldSize - 200);
      let py = Phaser.Math.Between(200, worldSize - 200);

      while (Phaser.Math.Distance.Between(px, py, spawnCenterX, spawnCenterY) < 250) {
        px = Phaser.Math.Between(200, worldSize - 200);
        py = Phaser.Math.Between(200, worldSize - 200);
      }

      const pillar = pillarsGroup.create(px, py, 'tex_prop_pillar') as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
      pillar.setDepth(7);
      pillar.refreshBody();
    }

    // 3. Breakable Barrels (60 barrels in small clusters)
    for (let b = 0; b < 20; b++) {
      const clusterX = Phaser.Math.Between(250, worldSize - 250);
      const clusterY = Phaser.Math.Between(250, worldSize - 250);

      if (Phaser.Math.Distance.Between(clusterX, clusterY, spawnCenterX, spawnCenterY) < 200) continue;

      const count = Phaser.Math.Between(2, 4);
      for (let c = 0; c < count; c++) {
        const bx = clusterX + (c % 2) * 32 + Phaser.Math.Between(-6, 6);
        const by = clusterY + Math.floor(c / 2) * 32 + Phaser.Math.Between(-6, 6);

        const barrel = barrelsGroup.create(bx, by, 'tex_prop_barrel') as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
        barrel.setDepth(6);
        barrel.refreshBody();
      }
    }

    // 4. Power-Up Shrines (5 shrines)
    for (let s = 0; s < 5; s++) {
      const sx = Phaser.Math.Between(300, worldSize - 300);
      const sy = Phaser.Math.Between(300, worldSize - 300);

      if (Phaser.Math.Distance.Between(sx, sy, spawnCenterX, spawnCenterY) < 300) continue;

      const shrine = shrinesGroup.create(sx, sy, 'tex_prop_shrine') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      shrine.setDepth(7);

      scene.tweens.add({
        targets: shrine,
        scaleX: 1.15,
        scaleY: 1.15,
        duration: 800,
        yoyo: true,
        repeat: -1,
      });
    }

    return { pillarsGroup, barrelsGroup, shrinesGroup };
  }
}
