import Phaser from 'phaser';

export interface MapObjects {
  pillarsGroup: Phaser.Physics.Arcade.StaticGroup;
  barrelsGroup: Phaser.Physics.Arcade.StaticGroup;
  shrinesGroup: Phaser.Physics.Arcade.Group;
  update: (playerX: number, playerY: number, cameraX?: number, cameraY?: number) => void;
  releaseBarrel: (barrel: Phaser.GameObjects.GameObject) => void;
  releaseShrine: (shrine: Phaser.GameObjects.GameObject) => void;
  destroy: () => void;
}

interface ChunkEntities {
  pillars: Phaser.Types.Physics.Arcade.SpriteWithStaticBody[];
  barrels: Phaser.Types.Physics.Arcade.SpriteWithStaticBody[];
  shrines: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[];
}

export class MapGenerator {
  private static readonly CHUNK_SIZE = 900;
  private static readonly POOL_PILLARS = 26;
  private static readonly POOL_BARRELS = 54;
  private static readonly POOL_SHRINES = 6;
  private static readonly BAKE_SIZE = 2048;

  private static readonly DECAL_FLAT = ['decal_28', 'decal_36', 'decal_54'];
  private static readonly DECAL_STONES = [
    'decal_20', 'decal_21', 'decal_26', 'decal_28', 'decal_29', 'decal_30', 'decal_31',
    'decal_33', 'decal_38', 'decal_39', 'decal_42',
  ];
  private static readonly DECAL_MOSS = ['decal_43', 'decal_45', 'decal_58'];
  private static readonly PROP_FRAMES = ['decal_11', 'decal_12', 'decal_19'];
  private static readonly GROUT_RGB = [0x2a, 0x2a, 0x22];

  public static createWorld(scene: Phaser.Scene): MapObjects {
    // 1. Unbounded physics world
    scene.physics.world.setBounds(-1000000, -1000000, 2000000, 2000000);

    // 2. Bake rich stone brick floor into reusable 2048x2048 canvas texture once
    const bakedTextureKey = 'baked_stone_floor';
    if (scene.textures.exists(bakedTextureKey)) {
      scene.textures.remove(bakedTextureKey);
    }
    MapGenerator.bakeStoneFloor(scene, bakedTextureKey);

    // 3. Infinite TileSprite background with the baked stone masonry texture
    const tileSprite = scene.add.tileSprite(
      scene.scale.width / 2,
      scene.scale.height / 2,
      scene.scale.width + 400,
      scene.scale.height + 400,
      bakedTextureKey
    ).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(0);

    const onResize = (gameSize: Phaser.Structs.Size) => {
      tileSprite.setPosition(gameSize.width / 2, gameSize.height / 2);
      tileSprite.setSize(gameSize.width + 400, gameSize.height + 400);
    };
    scene.scale.on('resize', onResize);

    // 4. Object Pools (Zero GC Allocation)
    const pillarsGroup = scene.physics.add.staticGroup();
    const pillarShadows: Phaser.GameObjects.Ellipse[] = [];
    const pillarPool: Phaser.Types.Physics.Arcade.SpriteWithStaticBody[] = [];

    for (let i = 0; i < MapGenerator.POOL_PILLARS; i++) {
      const shadow = scene.add.ellipse(0, 0, 80, 22, 0x000000, 0.35).setDepth(3).setVisible(false);
      pillarShadows.push(shadow);

      const pillar = pillarsGroup.create(-9999, -9999, 'tex_prop_pillar') as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
      pillar.setDisplaySize(115, 135);
      pillar.setDepth(8);
      pillar.setActive(false).setVisible(false);
      pillar.body.setSize(78, 54);
      pillar.body.setOffset((115 - 78) / 2, 135 - 54 - 4);
      pillar.body.enable = false;
      pillar.setData('shadowIndex', i);
      pillarPool.push(pillar);
    }

    const barrelsGroup = scene.physics.add.staticGroup();
    const barrelShadows: Phaser.GameObjects.Ellipse[] = [];
    const barrelPool: Phaser.Types.Physics.Arcade.SpriteWithStaticBody[] = [];

    for (let i = 0; i < MapGenerator.POOL_BARRELS; i++) {
      const shadow = scene.add.ellipse(0, 0, 34, 12, 0x000000, 0.30).setDepth(3).setVisible(false);
      barrelShadows.push(shadow);

      const barrel = barrelsGroup.create(-9999, -9999, 'tex_prop_barrel') as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
      barrel.setDisplaySize(44, 50);
      barrel.setDepth(6);
      barrel.setActive(false).setVisible(false);
      barrel.setSize(barrel.width * 0.8, barrel.height * 0.7);
      barrel.setOffset(barrel.width * 0.1, barrel.height * 0.2);
      barrel.body.enable = false;
      barrel.setData('shadowIndex', i);
      barrelPool.push(barrel);
    }

    const shrinesGroup = scene.physics.add.group();
    const shrineAuras: Phaser.GameObjects.Graphics[] = [];
    const shrineBeacons: Phaser.GameObjects.Text[] = [];
    const shrinePool: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[] = [];

    for (let i = 0; i < MapGenerator.POOL_SHRINES; i++) {
      const auraGfx = scene.add.graphics().setDepth(3).setVisible(false);
      auraGfx.lineStyle(3, 0xfacc15, 0.8);
      auraGfx.fillStyle(0xa855f7, 0.25);
      auraGfx.fillCircle(0, 0, 55);
      auraGfx.strokeCircle(0, 0, 55);
      shrineAuras.push(auraGfx);

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

      const beacon = scene.add.text(0, 0, '', {
        fontSize: '26px',
        color: '#facc15',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(10).setVisible(false);
      shrineBeacons.push(beacon);

      const shrine = shrinesGroup.create(-9999, -9999, 'tex_prop_shrine') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      shrine.setDisplaySize(126, 144);
      shrine.setDepth(9);
      shrine.setImmovable(true);
      shrine.setActive(false).setVisible(false);
      if (shrine.body) shrine.body.enable = false;
      shrine.setSize(shrine.width * 0.8, shrine.height * 0.8);
      shrine.setData('aura', auraGfx);
      shrine.setData('beacon', beacon);
      shrine.setData('poolIndex', i);
      shrinePool.push(shrine);
    }

    // 5. Chunk streaming state
    const destroyedIds = new Set<string>();
    const activeChunks = new Map<string, ChunkEntities>();
    const requiredKeys = new Set<string>();
    let lastChunkX = 999999;
    let lastChunkY = 999999;

    const unloadChunk = (chunkKey: string) => {
      const entities = activeChunks.get(chunkKey);
      if (!entities) return;

      for (const p of entities.pillars) {
        const sIdx = p.getData('shadowIndex') as number;
        if (sIdx !== undefined && pillarShadows[sIdx]) pillarShadows[sIdx].setVisible(false);
        p.setActive(false).setVisible(false);
        if (p.body) p.body.enable = false;
        pillarPool.push(p);
      }

      for (const b of entities.barrels) {
        if (b.active) {
          const sIdx = b.getData('shadowIndex') as number;
          if (sIdx !== undefined && barrelShadows[sIdx]) barrelShadows[sIdx].setVisible(false);
          b.setActive(false).setVisible(false);
          if (b.body) b.body.enable = false;
        }
        barrelPool.push(b);
      }

      for (const s of entities.shrines) {
        if (s.active) {
          const aura = s.getData('aura') as Phaser.GameObjects.Graphics | undefined;
          if (aura) aura.setVisible(false);
          const beacon = s.getData('beacon') as Phaser.GameObjects.Text | undefined;
          if (beacon) beacon.setVisible(false);
          s.setActive(false).setVisible(false);
          if (s.body) s.body.enable = false;
        }
        shrinePool.push(s);
      }

      activeChunks.delete(chunkKey);
    };

    const loadChunk = (cx: number, cy: number, chunkKey: string) => {
      const entities: ChunkEntities = { pillars: [], barrels: [], shrines: [] };
      activeChunks.set(chunkKey, entities);

      const spawnSafeDist = 240;

      // 1. Shrines (Rare: ~14% chance per chunk, outside spawn center)
      const hasShrine = MapGenerator.hash2D(cx, cy, 101) < 0.14;
      const shrineId = `shrine_${cx}_${cy}`;
      if (hasShrine && !destroyedIds.has(shrineId) && shrinePool.length > 0) {
        const sx = cx * MapGenerator.CHUNK_SIZE + 450 + (MapGenerator.hash2D(cx, cy, 102) - 0.5) * 300;
        const sy = cy * MapGenerator.CHUNK_SIZE + 450 + (MapGenerator.hash2D(cx, cy, 103) - 0.5) * 300;
        if (Math.hypot(sx, sy) >= spawnSafeDist) {
          const shrine = shrinePool.pop()!;
          shrine.setPosition(sx, sy);
          shrine.setActive(true).setVisible(true);
          shrine.setData('id', shrineId);
          if (shrine.body) {
            shrine.body.enable = true;
            shrine.body.reset(sx, sy);
          }

          const aura = shrine.getData('aura') as Phaser.GameObjects.Graphics | undefined;
          if (aura) aura.setPosition(sx, sy + 30).setVisible(true);

          const beacon = shrine.getData('beacon') as Phaser.GameObjects.Text | undefined;
          if (beacon) beacon.setPosition(sx, sy - 85).setVisible(true);

          entities.shrines.push(shrine);
        }
      }

      // 2. Pillars (1-2 pillars per chunk)
      const pillarCount = hasShrine
        ? (MapGenerator.hash2D(cx, cy, 201) < 0.5 ? 1 : 0)
        : (MapGenerator.hash2D(cx, cy, 201) < 0.8 ? (MapGenerator.hash2D(cx, cy, 202) < 0.45 ? 2 : 1) : 0);

      for (let p = 0; p < pillarCount; p++) {
        if (pillarPool.length === 0) break;
        const px = cx * MapGenerator.CHUNK_SIZE + 160 + MapGenerator.hash2D(cx, cy, 210 + p * 10) * (MapGenerator.CHUNK_SIZE - 320);
        const py = cy * MapGenerator.CHUNK_SIZE + 160 + MapGenerator.hash2D(cx, cy, 211 + p * 10) * (MapGenerator.CHUNK_SIZE - 320);
        if (Math.hypot(px, py) < spawnSafeDist) continue;

        const pillar = pillarPool.pop()!;
        pillar.setPosition(px, py);
        pillar.setActive(true).setVisible(true);
        if (pillar.body) {
          pillar.body.enable = true;
          pillar.refreshBody();
        }

        const sIdx = pillar.getData('shadowIndex') as number;
        if (sIdx !== undefined && pillarShadows[sIdx]) {
          pillarShadows[sIdx].setPosition(px, py + 48).setVisible(true);
        }
        entities.pillars.push(pillar);
      }

      // 3. Barrels (1-2 clusters of 2-3 barrels per chunk)
      const clusterCount = MapGenerator.hash2D(cx, cy, 301) < 0.85 ? (MapGenerator.hash2D(cx, cy, 302) < 0.45 ? 2 : 1) : 0;
      for (let c = 0; c < clusterCount; c++) {
        const bx = cx * MapGenerator.CHUNK_SIZE + 180 + MapGenerator.hash2D(cx, cy, 310 + c * 20) * (MapGenerator.CHUNK_SIZE - 360);
        const by = cy * MapGenerator.CHUNK_SIZE + 180 + MapGenerator.hash2D(cx, cy, 311 + c * 20) * (MapGenerator.CHUNK_SIZE - 360);
        if (Math.hypot(bx, by) < spawnSafeDist) continue;

        const countInCluster = 2 + (MapGenerator.hash2D(cx, cy, 312 + c * 20) < 0.5 ? 1 : 0);
        for (let b = 0; b < countInCluster; b++) {
          if (barrelPool.length === 0) break;
          const barrelId = `barrel_${cx}_${cy}_${c}_${b}`;
          if (!destroyedIds.has(barrelId)) {
            const barrel = barrelPool.pop()!;
            const barX = bx + (b % 2) * 36 + (b === 2 ? 18 : 0);
            const barY = by + Math.floor(b / 2) * 32;
            barrel.setPosition(barX, barY);
            barrel.setActive(true).setVisible(true);
            barrel.setData('id', barrelId);
            if (barrel.body) {
              barrel.body.enable = true;
              barrel.refreshBody();
            }

            const sIdx = barrel.getData('shadowIndex') as number;
            if (sIdx !== undefined && barrelShadows[sIdx]) {
              barrelShadows[sIdx].setPosition(barX, barY + 18).setVisible(true);
            }
            entities.barrels.push(barrel);
          }
        }
      }
    };

    const onPostUpdate = () => {
      const cam = scene.cameras.main;
      tileSprite.tilePositionX = Math.round(cam.scrollX);
      tileSprite.tilePositionY = Math.round(cam.scrollY);
    };
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, onPostUpdate);

    const update = (playerX: number, playerY: number) => {

      // 2. Occlusion sorting for visible pillars
      const heroY = playerY;
      for (const p of pillarsGroup.getChildren()) {
        const pillar = p as Phaser.GameObjects.Sprite;
        if (pillar.active) {
          pillar.setDepth(heroY < pillar.y + 36 ? 11 : 8);
        }
      }

      // 3. Chunk streaming check
      const currentChunkX = Math.floor(playerX / MapGenerator.CHUNK_SIZE);
      const currentChunkY = Math.floor(playerY / MapGenerator.CHUNK_SIZE);

      if (currentChunkX === lastChunkX && currentChunkY === lastChunkY) return;
      lastChunkX = currentChunkX;
      lastChunkY = currentChunkY;

      requiredKeys.clear();
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          requiredKeys.add(`${currentChunkX + dx},${currentChunkY + dy}`);
        }
      }

      for (const chunkKey of activeChunks.keys()) {
        if (!requiredKeys.has(chunkKey)) {
          unloadChunk(chunkKey);
        }
      }

      for (const chunkKey of requiredKeys) {
        if (!activeChunks.has(chunkKey)) {
          const commaIdx = chunkKey.indexOf(',');
          const cx = parseInt(chunkKey.substring(0, commaIdx), 10);
          const cy = parseInt(chunkKey.substring(commaIdx + 1), 10);
          loadChunk(cx, cy, chunkKey);
        }
      }
    };

    const releaseBarrel = (barrel: Phaser.GameObjects.GameObject) => {
      const b = barrel as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
      const id = b.getData('id') as string | undefined;
      if (id) destroyedIds.add(id);

      const sIdx = b.getData('shadowIndex') as number;
      if (sIdx !== undefined && barrelShadows[sIdx]) barrelShadows[sIdx].setVisible(false);
      b.setActive(false).setVisible(false);
      if (b.body) b.body.enable = false;
    };

    const releaseShrine = (shrine: Phaser.GameObjects.GameObject) => {
      const s = shrine as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      const id = s.getData('id') as string | undefined;
      if (id) destroyedIds.add(id);

      const aura = s.getData('aura') as Phaser.GameObjects.Graphics | undefined;
      if (aura) aura.setVisible(false);
      const beacon = s.getData('beacon') as Phaser.GameObjects.Text | undefined;
      if (beacon) beacon.setVisible(false);
      s.setActive(false).setVisible(false);
      if (s.body) s.body.enable = false;
    };

    const destroy = () => {
      scene.events.off(Phaser.Scenes.Events.POST_UPDATE, onPostUpdate);
      scene.scale.off('resize', onResize);
      pillarsGroup.clear(true, true);
      barrelsGroup.clear(true, true);
      shrinesGroup.clear(true, true);
      pillarShadows.forEach((s) => s.destroy());
      barrelShadows.forEach((s) => s.destroy());
      shrineAuras.forEach((a) => a.destroy());
      shrineBeacons.forEach((b) => b.destroy());
      tileSprite.destroy();
      activeChunks.clear();
      destroyedIds.clear();
      requiredKeys.clear();
    };

    // Initial load around spawn (0, 0)
    update(0, 0);

    return {
      pillarsGroup,
      barrelsGroup,
      shrinesGroup,
      update,
      releaseBarrel,
      releaseShrine,
      destroy,
    };
  }

  /**
   * Bakes 243 stone blocks from atlas_floor_bricks into a seamless 2048x2048 canvas texture,
   * complete with running-bond masonry, moss, cracks, loose stones, and manholes.
   */
  private static bakeStoneFloor(scene: Phaser.Scene, key: string): void {
    const size = MapGenerator.BAKE_SIZE;
    const canvasTex = scene.textures.createCanvas(key, size, size);
    if (!canvasTex) return;

    const ctx = canvasTex.getContext();
    const [gr, gg, gb] = MapGenerator.GROUT_RGB;
    ctx.fillStyle = `rgb(${gr},${gg},${gb})`;
    ctx.fillRect(0, 0, size, size);

    const bricksTex = scene.textures.get('atlas_floor_bricks');
    const decalsTex = scene.textures.get('atlas_floor_decals');
    const bricksImg = bricksTex.getSourceImage() as CanvasImageSource;
    const decalsImg = decalsTex.getSourceImage() as CanvasImageSource;

    const stamp = (
      img: CanvasImageSource, tex: Phaser.Textures.Texture, frame: string,
      x: number, y: number, angleDeg: number, scale: number, alpha = 1
    ): void => {
      const f = tex.get(frame);
      const rad = Phaser.Math.DegToRad(angleDeg);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(rad);
      ctx.scale(scale, scale);
      ctx.drawImage(img, f.cutX, f.cutY, f.cutWidth, f.cutHeight, -f.cutWidth / 2, -f.cutHeight / 2, f.cutWidth, f.cutHeight);
      ctx.restore();
    };

    const blotch = (bx: number, by: number, r: number, inner: string): void => {
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, r);
      g.addColorStop(0, inner);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(bx - r, by - r, r * 2, r * 2);
    };

    // Brick inventory bucketed by height for stone courses
    const bands = new Map<number, string[]>();
    for (const frameName of Object.keys(bricksTex.frames)) {
      if (frameName === '__BASE') continue;
      const f = bricksTex.get(frameName);
      const band = Math.round(f.height / 6) * 6;
      if (!bands.has(band)) bands.set(band, []);
      bands.get(band)!.push(frameName);
    }
    const bandKeys = [...bands.keys()].sort((a, b) => a - b);
    const courseBands = bandKeys.filter((b) => b >= 24 && b <= 48);

    // Dense running-bond courses of stone blocks
    let y = -10;
    while (y < size) {
      const band = Phaser.Utils.Array.GetRandom(courseBands.length > 0 ? courseBands : bandKeys.slice(1));
      const rowH = band;
      const pool = [
        ...(bands.get(band - 6) ?? []),
        ...(bands.get(band) ?? []),
        ...(bands.get(band + 6) ?? []),
      ];
      let x = -Phaser.Math.Between(0, 70);
      while (x < size) {
        const frameName = Phaser.Utils.Array.GetRandom(pool);
        const f = bricksTex.get(frameName);
        const s = Phaser.Math.Clamp(rowH / f.height, 0.82, 1.1);
        stamp(bricksImg, bricksTex, frameName, x + (f.width * s) / 2, y + rowH / 2, Phaser.Math.RND.pick([0, 180]), s);
        x += f.width * s;
        if (Math.random() < 0.3) {
          const w2 = f.width * s - 1;
          stamp(bricksImg, bricksTex, frameName, x + w2 / 2 + 1, y + rowH / 2, Phaser.Math.RND.pick([0, 180]), s);
          x += w2 + 1;
        }
        x += Phaser.Math.Between(2, 5);
        if (Math.random() < 0.04) x += Phaser.Math.Between(18, 36);
      }
      y += rowH + Phaser.Math.Between(3, 5);
    }

    // Weathered tonal blotches
    for (let i = 0; i < 24; i++) {
      const bx = Phaser.Math.Between(0, size);
      const by = Phaser.Math.Between(0, size);
      const r = Phaser.Math.Between(180, 420);
      blotch(bx, by, r, Math.random() < 0.55 ? 'rgba(10,12,8,0.05)' : 'rgba(190,200,170,0.04)');
    }

    // Moss clusters on stone joints
    for (let i = 0; i < 90; i++) {
      const mx = Phaser.Math.Between(40, size - 40);
      const my = Phaser.Math.Between(40, size - 40);
      stamp(decalsImg, decalsTex, Phaser.Utils.Array.GetRandom(MapGenerator.DECAL_MOSS),
        mx, my, Phaser.Math.FloatBetween(0, 360), Phaser.Math.FloatBetween(0.45, 0.9), Phaser.Math.FloatBetween(0.8, 1));
    }

    // Cracks & loose stones
    for (let i = 0; i < 60; i++) {
      const cx = Phaser.Math.Between(40, size - 40);
      const cy = Phaser.Math.Between(40, size - 40);
      stamp(decalsImg, decalsTex, Phaser.Utils.Array.GetRandom(MapGenerator.DECAL_FLAT),
        cx, cy, Phaser.Math.FloatBetween(0, 360), Phaser.Math.FloatBetween(0.8, 1.2), Phaser.Math.FloatBetween(0.45, 0.6));
      stamp(decalsImg, decalsTex, Phaser.Utils.Array.GetRandom(MapGenerator.DECAL_STONES),
        cx + Phaser.Math.Between(-30, 30), cy + Phaser.Math.Between(-30, 30),
        Phaser.Math.FloatBetween(0, 360), Phaser.Math.FloatBetween(0.8, 1.15), 0.95);
    }

    // Architectural props (manholes, grates, wheels)
    for (let i = 0; i < 8; i++) {
      const px = Phaser.Math.Between(120, size - 120);
      const py = Phaser.Math.Between(120, size - 120);
      const propFrame = Phaser.Utils.Array.GetRandom(MapGenerator.PROP_FRAMES);
      const f = decalsTex.get(propFrame);
      stamp(decalsImg, decalsTex, propFrame, px, py, Phaser.Math.FloatBetween(0, 360), 76 / Math.max(f.width, f.height), 0.9);
    }

    canvasTex.refresh();
  }

  private static hash2D(cx: number, cy: number, seed: number): number {
    let h = Math.imul(cx, 374761393) ^ Math.imul(cy, 668265263) ^ Math.imul(seed, 1442695049);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
}
