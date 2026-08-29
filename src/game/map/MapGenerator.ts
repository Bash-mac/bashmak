import Phaser from 'phaser';

export interface MapObjects {
  pillarsGroup: Phaser.Physics.Arcade.StaticGroup;
  barrelsGroup: Phaser.Physics.Arcade.StaticGroup;
  shrinesGroup: Phaser.Physics.Arcade.Group;
}

export class MapGenerator {
  // Cracks only: same-tone decals that don't stain the gray pavement with foreign hues
  private static readonly DECAL_FLAT = ['decal_28', 'decal_36', 'decal_54'];
  private static readonly DECAL_STONES = [
    'decal_20', 'decal_21', 'decal_26', 'decal_28', 'decal_29', 'decal_30', 'decal_31',
    'decal_33', 'decal_38', 'decal_39', 'decal_42',
  ];
  private static readonly DECAL_MOSS = ['decal_43', 'decal_45', 'decal_58'];
  private static readonly DECAL_RUBBLE = [
    'decal_01', 'decal_02', 'decal_08', 'decal_16', 'decal_32', 'decal_37', 'decal_41', 'decal_56', 'decal_61',
  ];
  private static readonly PROP_FRAMES = ['decal_11', 'decal_12', 'decal_19'];
  private static readonly GROUT_RGB = [0x2a, 0x2a, 0x22];
  private static readonly BAKE_CHUNK = 2048; // safe max-texture size on every GPU

  public static createWorld(scene: Phaser.Scene, worldSize = 4000): MapObjects {
    // 1. World Bounds & Baked Brick Floor
    scene.physics.world.setBounds(0, 0, worldSize, worldSize);

    // 1.1 Clutter cluster centers: moss/stones gather around landmarks, corners and rubble,
    // leaving the main running lanes cleaner
    const gridSize = 8;
    const cellSize = worldSize / gridSize; // 500px per cell
    const spawnCenterX = worldSize / 2;
    const spawnCenterY = worldSize / 2;
    const spawnSafeRadius = 260;
    const shrineSectors = [
      { gx: 1, gy: 1 },
      { gx: 6, gy: 1 },
      { gx: 1, gy: 6 },
      { gx: 6, gy: 6 },
      { gx: 1, gy: 4 },
      { gx: 6, gy: 3 },
    ];
    const clusterPts: Array<{ x: number; y: number; r: number }> = [];
    const cornerOff = 270;
    for (const [kx, ky] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
      clusterPts.push({
        x: kx === 0 ? cornerOff : worldSize - cornerOff,
        y: ky === 0 ? cornerOff : worldSize - cornerOff,
        r: 300,
      });
    }
    for (let gx = 0; gx < gridSize; gx++) {
      for (let gy = 0; gy < gridSize; gy++) {
        const cx = gx * cellSize + cellSize / 2;
        const cy = gy * cellSize + cellSize / 2;
        if (Phaser.Math.Distance.Between(cx, cy, spawnCenterX, spawnCenterY) < spawnSafeRadius) continue;
        if (shrineSectors.some((s) => s.gx === gx && s.gy === gy)) {
          clusterPts.push({ x: cx, y: cy, r: 240 });
        } else if ((gx * 3 + gy * 5) % 7 < 4) {
          clusterPts.push({ x: cx + Phaser.Math.Between(-90, 90), y: cy + Phaser.Math.Between(-90, 90), r: 210 });
        }
      }
    }

    // Rare full-alpha props (manhole / grate / wheel): 2-3 per arena, never at spawn.
    // Computed up front so the bake can draw them into the floor texture.
    const propCells = new Map<string, string>();
    while (propCells.size < Phaser.Math.Between(2, 3)) {
      const pgx = Phaser.Math.Between(0, gridSize - 1);
      const pgy = Phaser.Math.Between(0, gridSize - 1);
      const pDist = Phaser.Math.Distance.Between(pgx * cellSize, pgy * cellSize, spawnCenterX, spawnCenterY);
      if (pDist > spawnSafeRadius * 2 && !propCells.has(`${pgx},${pgy}`)) {
        propCells.set(`${pgx},${pgy}`, Phaser.Utils.Array.GetRandom(MapGenerator.PROP_FRAMES));
      }
    }

    MapGenerator.bakeFloor(scene, worldSize, clusterPts, propCells);

    const pillarsGroup = scene.physics.add.staticGroup();
    const barrelsGroup = scene.physics.add.staticGroup();
    const shrinesGroup = scene.physics.add.group();

    for (let gx = 0; gx < gridSize; gx++) {
      for (let gy = 0; gy < gridSize; gy++) {
        const cellCenterX = gx * cellSize + cellSize / 2;
        const cellCenterY = gy * cellSize + cellSize / 2;
        const distToSpawn = Phaser.Math.Distance.Between(cellCenterX, cellCenterY, spawnCenterX, spawnCenterY);

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

  private static readonly plantedCells = new Set<number>();
  private static readonly PLANTED_CELL = 24;

  /**
   * Bakes the whole arena floor into 2x2 chunk textures of 2048px (safe on every GPU).
   * Bricks, tonal blotches, moss, cracks, stones, props and border rubble all end up baked
   * into the chunks: at runtime the floor is just 4 static images and zero extra objects.
   */
  private static bakeFloor(
    scene: Phaser.Scene,
    worldSize: number,
    clusters: Array<{ x: number; y: number; r: number }>,
    propCells: Map<string, string>,
  ): void {
    const chunkCount = Math.ceil(worldSize / MapGenerator.BAKE_CHUNK);
    const chunks: Array<{ ox: number; oy: number; w: number; h: number; tex: Phaser.Textures.CanvasTexture; ctx: CanvasRenderingContext2D }> = [];
    for (let iy = 0; iy < chunkCount; iy++) {
      for (let ix = 0; ix < chunkCount; ix++) {
        const key = `baked_floor_${ix}_${iy}`;
        if (scene.textures.exists(key)) scene.textures.remove(key);
        const w = Math.min(MapGenerator.BAKE_CHUNK, worldSize - ix * MapGenerator.BAKE_CHUNK);
        const h = Math.min(MapGenerator.BAKE_CHUNK, worldSize - iy * MapGenerator.BAKE_CHUNK);
        const tex = scene.textures.createCanvas(key, w, h);
        if (!tex) continue;
        const ctx = tex.getContext();
        const [gr, gg, gb] = MapGenerator.GROUT_RGB;
        ctx.fillStyle = `rgb(${gr},${gg},${gb})`;
        ctx.fillRect(0, 0, w, h);
        chunks.push({ ox: ix * MapGenerator.BAKE_CHUNK, oy: iy * MapGenerator.BAKE_CHUNK, w, h, tex, ctx });
      }
    }
    if (chunks.length === 0) return;

    const bricksTex = scene.textures.get('atlas_floor_bricks');
    const decalsTex = scene.textures.get('atlas_floor_decals');
    const bricksImg = bricksTex.getSourceImage() as CanvasImageSource;
    const decalsImg = decalsTex.getSourceImage() as CanvasImageSource;

    // Draws one frame in world coordinates into every chunk it touches (1-2 typically)
    const stampWorld = (
      img: CanvasImageSource, tex: Phaser.Textures.Texture, frame: string,
      x: number, y: number, angleDeg: number, scale: number, alpha = 1,
    ): void => {
      const f = tex.get(frame);
      const rad = Phaser.Math.DegToRad(angleDeg);
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));
      const extW = (f.cutWidth * cos + f.cutHeight * sin) * scale;
      const extH = (f.cutWidth * sin + f.cutHeight * cos) * scale;
      for (const ch of chunks) {
        if (x + extW / 2 <= ch.ox || x - extW / 2 >= ch.ox + ch.w) continue;
        if (y + extH / 2 <= ch.oy || y - extH / 2 >= ch.oy + ch.h) continue;
        ch.ctx.save();
        ch.ctx.globalAlpha = alpha;
        ch.ctx.translate(x - ch.ox, y - ch.oy);
        ch.ctx.rotate(rad);
        ch.ctx.scale(scale, scale);
        ch.ctx.drawImage(img, f.cutX, f.cutY, f.cutWidth, f.cutHeight, -f.cutWidth / 2, -f.cutHeight / 2, f.cutWidth, f.cutHeight);
        ch.ctx.restore();
      }
    };

    // Soft radial tint blotch in world coordinates
    const blotchWorld = (bx: number, by: number, r: number, inner: string): void => {
      for (const ch of chunks) {
        if (bx + r <= ch.ox || bx - r >= ch.ox + ch.w) continue;
        if (by + r <= ch.oy || by - r >= ch.oy + ch.h) continue;
        const g = ch.ctx.createRadialGradient(bx - ch.ox, by - ch.oy, 0, bx - ch.ox, by - ch.oy, r);
        g.addColorStop(0, inner);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ch.ctx.fillStyle = g;
        ch.ctx.fillRect(bx - r - ch.ox, by - r - ch.oy, r * 2, r * 2);
      }
    };

    // Brick inventory bucketed by height so each course picks stones of near-equal height
    const bands = new Map<number, string[]>();
    for (const frameName of Object.keys(bricksTex.frames)) {
      if (frameName === '__BASE') continue;
      const f = bricksTex.get(frameName);
      const band = Math.round(f.height / 6) * 6;
      if (!bands.has(band)) bands.set(band, []);
      bands.get(band)!.push(frameName);
    }
    const bandKeys = [...bands.keys()].sort((a, b) => a - b);
    // Mid-size courses only: no rows of tiny pebbles next to rows of huge slabs
    const courseBands = bandKeys.filter((b) => b >= 24 && b <= 48);

    // Dense running-bond courses, thin uniform grout. Each brick is drawn from the band's
    // neighbouring pools too, so no course inherits a single tone/width down its full length.
    let y = -10;
    while (y < worldSize) {
      const band = Phaser.Utils.Array.GetRandom(courseBands.length > 0 ? courseBands : bandKeys.slice(1));
      const rowH = band;
      const pool = [
        ...(bands.get(band - 6) ?? []),
        ...(bands.get(band) ?? []),
        ...(bands.get(band + 6) ?? []),
      ];
      let x = -Phaser.Math.Between(0, 70);
      while (x < worldSize) {
        const frameName = Phaser.Utils.Array.GetRandom(pool);
        const f = bricksTex.get(frameName);
        const s = Phaser.Math.Clamp(rowH / f.height, 0.82, 1.1);
        stampWorld(bricksImg, bricksTex, frameName, x + (f.width * s) / 2, y + rowH / 2, Phaser.Math.RND.pick([0, 180]), s);
        x += f.width * s;
        // frequent double-length stones: break the vertical joint rhythm of the bond
        if (Math.random() < 0.3) {
          const w2 = f.width * s - 1;
          stampWorld(bricksImg, bricksTex, frameName, x + w2 / 2 + 1, y + rowH / 2, Phaser.Math.RND.pick([0, 180]), s);
          x += w2 + 1;
        }
        x += Phaser.Math.Between(2, 5);
        // occasional missing stone — a damaged joint, later softened by moss/decals
        if (Math.random() < 0.04) x += Phaser.Math.Between(18, 36);
      }
      y += rowH + Phaser.Math.Between(3, 5);
    }

    // Wide tonal blotches so the field reads as weathered zones, not a flat repeat
    for (let i = 0; i < 50; i++) {
      const bx = Phaser.Math.Between(0, worldSize);
      const by = Phaser.Math.Between(0, worldSize);
      const r = Phaser.Math.Between(220, 520);
      blotchWorld(bx, by, r, Math.random() < 0.55 ? 'rgba(10,12,8,0.05)' : 'rgba(190,200,170,0.04)');
    }

    // Plant moss exactly where bare grout shows through, clustered near landmarks.
    // Pass 1 fills the cluster zones densely; pass 2 dusts the remaining lanes sparsely.
    // The grout scan runs per chunk, capping the pixel-buffer peak at ~16 MB.
    MapGenerator.plantedCells.clear();
    const clusterMoss: Array<[number, number]> = [];
    const laneMoss: Array<[number, number]> = [];
    for (const ch of chunks) {
      for (const [px, py] of MapGenerator.findGroutGaps(ch.ctx, ch.w, ch.h, ch.ox, ch.oy)) {
        if (clusters.some((c) => (px - c.x) * (px - c.x) + (py - c.y) * (py - c.y) < c.r * c.r)) {
          clusterMoss.push([px, py]);
        } else {
          laneMoss.push([px, py]);
        }
      }
    }
    Phaser.Utils.Array.Shuffle(clusterMoss);
    Phaser.Utils.Array.Shuffle(laneMoss);
    let planted = 0;
    for (const [px, py] of clusterMoss) {
      if (planted >= 1250) break;
      if (MapGenerator.tooCloseToPlanted(px, py, 22)) continue;
      MapGenerator.markPlanted(px, py, 22);
      stampWorld(decalsImg, decalsTex, Phaser.Utils.Array.GetRandom(MapGenerator.DECAL_MOSS),
        px, py, Phaser.Math.FloatBetween(0, 360), Phaser.Math.FloatBetween(0.5, 0.95), Phaser.Math.FloatBetween(0.85, 1));
      planted++;
    }
    for (const [px, py] of laneMoss) {
      if (planted >= 1750) break;
      if (MapGenerator.tooCloseToPlanted(px, py, 40)) continue;
      MapGenerator.markPlanted(px, py, 40);
      stampWorld(decalsImg, decalsTex, Phaser.Utils.Array.GetRandom(MapGenerator.DECAL_MOSS),
        px, py, Phaser.Math.FloatBetween(0, 360), Phaser.Math.FloatBetween(0.32, 0.5), Phaser.Math.FloatBetween(0.75, 0.9));
      planted++;
    }

    // Cracks and loose stones baked in, clustered around the same landmarks
    const gs = 8;
    const cs = worldSize / gs;
    for (let gx = 0; gx < gs; gx++) {
      for (let gy = 0; gy < gs; gy++) {
        const cx = gx * cs + cs / 2;
        const cy = gy * cs + cs / 2;
        const dx = cx + Phaser.Math.Between(-180, 180);
        const dy = cy + Phaser.Math.Between(-180, 180);
        const nearCluster = clusters.some((c) => Phaser.Math.Distance.Between(dx, dy, c.x, c.y) < c.r);
        if (Math.random() < (nearCluster ? 0.65 : 0.25)) {
          stampWorld(decalsImg, decalsTex, Phaser.Utils.Array.GetRandom(MapGenerator.DECAL_FLAT),
            dx, dy, Phaser.Math.FloatBetween(0, 360), Phaser.Math.FloatBetween(0.8, 1.2), Phaser.Math.FloatBetween(0.45, 0.6));
        }
        if (Math.random() < (nearCluster ? 0.85 : 0.3)) {
          stampWorld(decalsImg, decalsTex, Phaser.Utils.Array.GetRandom(MapGenerator.DECAL_STONES),
            cx + Phaser.Math.Between(-200, 200), cy + Phaser.Math.Between(-200, 200),
            Phaser.Math.FloatBetween(0, 360), Phaser.Math.FloatBetween(0.8, 1.15), 0.95);
        }
      }
    }

    // Rare architectural props (manhole / grate / wheel), ~76px, full alpha
    for (const [cellKey, propFrame] of propCells) {
      const [pgx, pgy] = cellKey.split(',').map(Number);
      const angle = propFrame === 'decal_19' ? Phaser.Math.FloatBetween(0, 360) : 0;
      const f = decalsTex.get(propFrame);
      stampWorld(decalsImg, decalsTex, propFrame,
        pgx * cs + cs / 2 + Phaser.Math.Between(-120, 120), pgy * cs + cs / 2 + Phaser.Math.Between(-120, 120),
        angle, 76 / Math.max(f.width, f.height), 0.9);
    }

    // Perimeter rubble ring hugging the arena border, baked in as well
    const step = 320;
    const inset = 110;
    for (let d = step / 2; d < worldSize; d += step) {
      const spots: Array<[number, number]> = [
        [d + Phaser.Math.Between(-90, 90), Phaser.Math.Between(30, inset)],
        [d + Phaser.Math.Between(-90, 90), worldSize - Phaser.Math.Between(30, inset)],
        [Phaser.Math.Between(30, inset), d + Phaser.Math.Between(-90, 90)],
        [worldSize - Phaser.Math.Between(30, inset), d + Phaser.Math.Between(-90, 90)],
      ];
      for (const [rx, ry] of spots) {
        stampWorld(decalsImg, decalsTex, Phaser.Utils.Array.GetRandom(MapGenerator.DECAL_RUBBLE),
          rx, ry, Phaser.Math.FloatBetween(0, 360), Phaser.Math.FloatBetween(0.9, 1.5), 0.95);
      }
    }

    for (const ch of chunks) {
      ch.tex.refresh();
      scene.add.image(ch.ox, ch.oy, ch.tex.key).setOrigin(0, 0).setDepth(0);
    }
  }

  /** Samples a chunk buffer on a coarse grid; returns world coordinates of bare grout. */
  private static findGroutGaps(ctx: CanvasRenderingContext2D, w: number, h: number, ox: number, oy: number): Array<[number, number]> {
    const STEP = 7;
    const data = ctx.getImageData(0, 0, w, h).data;
    const [gr, gg, gb] = MapGenerator.GROUT_RGB;
    const gaps: Array<[number, number]> = [];
    for (let ly = 0; ly < h; ly += STEP) {
      for (let lx = 0; lx < w; lx += STEP) {
        const i = (ly * w + lx) * 4;
        if (Math.abs(data[i] - gr) <= 3 && Math.abs(data[i + 1] - gg) <= 3 && Math.abs(data[i + 2] - gb) <= 3) {
          gaps.push([ox + lx, oy + ly]);
        }
      }
    }
    return gaps;
  }

  private static tooCloseToPlanted(x: number, y: number, dist: number): boolean {
    const r = Math.ceil(dist / MapGenerator.PLANTED_CELL);
    const cx = Math.floor(x / MapGenerator.PLANTED_CELL);
    const cy = Math.floor(y / MapGenerator.PLANTED_CELL);
    for (let oy = -r; oy <= r; oy++) {
      for (let ox = -r; ox <= r; ox++) {
        if (MapGenerator.plantedCells.has((cy + oy) * 100000 + (cx + ox))) return true;
      }
    }
    return false;
  }

  private static markPlanted(x: number, y: number, dist: number): void {
    const r = Math.ceil(dist / MapGenerator.PLANTED_CELL);
    const cx = Math.floor(x / MapGenerator.PLANTED_CELL);
    const cy = Math.floor(y / MapGenerator.PLANTED_CELL);
    for (let oy = -r; oy <= r; oy++) {
      for (let ox = -r; ox <= r; ox++) {
        MapGenerator.plantedCells.add((cy + oy) * 100000 + (cx + ox));
      }
    }
  }
}
