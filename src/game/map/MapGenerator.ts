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

    // 1.1 Floor Decals (Sewage, Cracks, Graffiti)
    const decalKeys = ['floor_sewage', 'floor_cracked', 'floor_graffiti'];
    const totalDecals = 65; // ~65 spots across 4000x4000 map
    for (let i = 0; i < totalDecals; i++) {
      const dx = Phaser.Math.Between(150, worldSize - 150);
      const dy = Phaser.Math.Between(150, worldSize - 150);
      const key = Phaser.Utils.Array.GetRandom(decalKeys);
      const decal = scene.add.image(dx, dy, key);
      decal.setDepth(1);
      decal.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
      decal.setScale(Phaser.Math.FloatBetween(0.85, 1.25));
      decal.setAlpha(Phaser.Math.FloatBetween(0.75, 0.95));
    }

    // 1.2 Architectural Ground Details (Manholes, Grates, Valves, Slime Sources)
    const archKeys = ['prop_manhole', 'prop_grate', 'prop_valve', 'prop_slime_source'];
    const totalArchProps = 40;
    for (let i = 0; i < totalArchProps; i++) {
      const ax = Phaser.Math.Between(200, worldSize - 200);
      const ay = Phaser.Math.Between(200, worldSize - 200);
      const key = Phaser.Utils.Array.GetRandom(archKeys);
      const prop = scene.add.image(ax, ay, key);
      prop.setDepth(2);
      prop.setDisplaySize(72, 72);
      if (key !== 'prop_slime_source') {
        prop.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
      }
    }

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
      pillar.setDisplaySize(80, 80);
      pillar.setDepth(7);
      pillar.refreshBody();
      if (pillar.body) {
        pillar.body.setCircle(32, 8, 8);
      }
    }

    // 3. Breakable Barrels (60 barrels in small clusters)
    for (let b = 0; b < 20; b++) {
      const clusterX = Phaser.Math.Between(250, worldSize - 250);
      const clusterY = Phaser.Math.Between(250, worldSize - 250);

      if (Phaser.Math.Distance.Between(clusterX, clusterY, spawnCenterX, spawnCenterY) < 200) continue;

      const count = Phaser.Math.Between(2, 4);
      for (let c = 0; c < count; c++) {
        const bx = clusterX + (c % 2) * 44 + Phaser.Math.Between(-8, 8);
        const by = clusterY + Math.floor(c / 2) * 44 + Phaser.Math.Between(-8, 8);

        const barrel = barrelsGroup.create(bx, by, 'tex_prop_barrel') as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
        barrel.setDisplaySize(58, 64);
        barrel.setDepth(6);
        barrel.refreshBody();
        if (barrel.body) {
          barrel.body.setCircle(22, 7, 10);
        }
      }
    }

    // 4. Power-Up Shrines (5 shrines)
    for (let s = 0; s < 5; s++) {
      const sx = Phaser.Math.Between(300, worldSize - 300);
      const sy = Phaser.Math.Between(300, worldSize - 300);

      if (Phaser.Math.Distance.Between(sx, sy, spawnCenterX, spawnCenterY) < 300) continue;

      const shrine = shrinesGroup.create(sx, sy, 'tex_prop_shrine') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      shrine.setDisplaySize(72, 82);
      shrine.setDepth(7);
      if (shrine.body) {
        shrine.body.setCircle(28, 8, 12);
      }

      scene.tweens.add({
        targets: shrine,
        scaleX: shrine.scaleX * 1.08,
        scaleY: shrine.scaleY * 1.08,
        duration: 900,
        yoyo: true,
        repeat: -1,
      });
    }

    return { pillarsGroup, barrelsGroup, shrinesGroup };
  }
}
