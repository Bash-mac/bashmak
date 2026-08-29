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

    MapGenerator.bakeFloor(scene, worldSize, clusterPts);

    const pillarsGroup = scene.physics.add.staticGroup();
    const barrelsGroup = scene.physics.add.staticGroup();
    const shrinesGroup = scene.physics.add.group();

    // Rare full-alpha props (manhole / grate / wheel): 2-3 per arena, never at spawn
    const propCells = new Map<string, string>();
    while (propCells.size < Phaser.Math.Between(2, 3)) {
      const pgx = Phaser.Math.Between(0, gridSize - 1);
      const pgy = Phaser.Math.Between(0, gridSize - 1);
      const pDist = Phaser.Math.Distance.Between(pgx * cellSize, pgy * cellSize, spawnCenterX, spawnCenterY);
      if (pDist > spawnSafeRadius * 2 && !propCells.has(`${pgx},${pgy}`)) {
        propCells.set(`${pgx},${pgy}`, Phaser.Utils.Array.GetRandom(MapGenerator.PROP_FRAMES));
      }
    }

    // Pre-allocated sector coordinates for 6 Shrines across the map
    for (let gx = 0; gx < gridSize; gx++) {
      for (let gy = 0; gy < gridSize; gy++) {
        const cellCenterX = gx * cellSize + cellSize / 2;
        const cellCenterY = gy * cellSize + cellSize / 2;
        const distToSpawn = Phaser.Math.Distance.Between(cellCenterX, cellCenterY, spawnCenterX, spawnCenterY);

        // 2.1 Flat Ground Decals (cracks): denser around landmarks, sparse in running lanes
        const decalX = cellCenterX + Phaser.Math.Between(-180, 180);
        const decalY = cellCenterY + Phaser.Math.Between(-180, 180);
        const nearCluster = clusterPts.some((c) => Phaser.Math.Distance.Between(decalX, decalY, c.x, c.y) < c.r);
        if (Math.random() < (nearCluster ? 0.65 : 0.25)) {
          const decal = scene.add.image(decalX, decalY, 'atlas_floor_decals', Phaser.Utils.Array.GetRandom(MapGenerator.DECAL_FLAT));
          decal.setDepth(1);
          decal.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
          decal.setScale(Phaser.Math.FloatBetween(0.8, 1.2));
          decal.setAlpha(Phaser.Math.FloatBetween(0.45, 0.6));
        }

        // Loose stones half-sunk into the pavement, clustered the same way
        if (Math.random() < (nearCluster ? 0.85 : 0.3)) {
          const stone = scene.add.image(
            cellCenterX + Phaser.Math.Between(-200, 200),
            cellCenterY + Phaser.Math.Between(-200, 200),
            'atlas_floor_decals',
            Phaser.Utils.Array.GetRandom(MapGenerator.DECAL_STONES),
          );
          stone.setDepth(1);
          stone.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
          stone.setScale(Phaser.Math.FloatBetween(0.8, 1.15));
          stone.setAlpha(0.95);
        }

        // 2.2 Rare Architectural Props (manhole / grate / wheel, ~76px, full alpha)
        const propFrame = propCells.get(`${gx},${gy}`);
        if (propFrame) {
          const prop = scene.add.image(
            cellCenterX + Phaser.Math.Between(-120, 120),
            cellCenterY + Phaser.Math.Between(-120, 120),
            'atlas_floor_decals',
            propFrame,
          );
          prop.setDepth(2);
          prop.setDisplaySize(76, 76);
          prop.setAlpha(0.9);
          if (propFrame === 'decal_19') {
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

    // 3. Perimeter Rubble Ring: dense rubble hugs the arena border, signaling the boundary
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
        const rubble = scene.add.image(rx, ry, 'atlas_floor_decals', Phaser.Utils.Array.GetRandom(MapGenerator.DECAL_RUBBLE));
        rubble.setDepth(2);
        rubble.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
        rubble.setScale(Phaser.Math.FloatBetween(0.9, 1.5));
        rubble.setAlpha(0.95);
      }
    }

    return { pillarsGroup, barrelsGroup, shrinesGroup };
  }

  private static readonly plantedCells = new Set<number>();
  private static readonly PLANTED_CELL = 24;

  /**
   * Bakes the brick pavement once into a single canvas texture (one static image at runtime).
   * Structure copied from the reference: dense horizontal courses of small stones with thin
   * uniform grout, wide tonal blotches on top, then moss planted pixel-exactly into the joints
   * and clustered around the given landmark points.
   */
  private static bakeFloor(
    scene: Phaser.Scene,
    worldSize: number,
    clusters: Array<{ x: number; y: number; r: number }>,
  ): void {
    if (scene.textures.exists('baked_floor')) scene.textures.remove('baked_floor');
    const canvasTex = scene.textures.createCanvas('baked_floor', worldSize, worldSize);
    if (!canvasTex) return;
    const ctx = canvasTex.getContext();
    const grout = MapGenerator.GROUT_RGB;
    ctx.fillStyle = `rgb(${grout[0]},${grout[1]},${grout[2]})`;
    ctx.fillRect(0, 0, worldSize, worldSize);

    const bricksTex = scene.textures.get('atlas_floor_bricks');
    const decalsTex = scene.textures.get('atlas_floor_decals');
    const bricksImg = bricksTex.getSourceImage() as CanvasImageSource;
    const decalsImg = decalsTex.getSourceImage() as CanvasImageSource;

    const stampFrame = (
      img: CanvasImageSource, tex: Phaser.Textures.Texture, frame: string,
      x: number, y: number, angleDeg: number, scale: number, alpha = 1,
    ): void => {
      const f = tex.get(frame);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(Phaser.Math.DegToRad(angleDeg));
      ctx.scale(scale, scale);
      ctx.drawImage(img, f.cutX, f.cutY, f.cutWidth, f.cutHeight, -f.cutWidth / 2, -f.cutHeight / 2, f.cutWidth, f.cutHeight);
      ctx.restore();
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
        stampFrame(bricksImg, bricksTex, frameName, x + (f.width * s) / 2, y + rowH / 2, Phaser.Math.RND.pick([0, 180]), s);
        x += f.width * s;
        // frequent double-length stones: break the vertical joint rhythm of the bond
        if (Math.random() < 0.3) {
          const w2 = f.width * s - 1;
          stampFrame(bricksImg, bricksTex, frameName, x + w2 / 2 + 1, y + rowH / 2, Phaser.Math.RND.pick([0, 180]), s);
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
      const dark = Math.random() < 0.55;
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, r);
      g.addColorStop(0, dark ? 'rgba(10,12,8,0.05)' : 'rgba(190,200,170,0.04)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(bx - r, by - r, r * 2, r * 2);
    }

    // Plant moss exactly where bare grout shows through, clustered near landmarks.
    // Pass 1 fills the cluster zones densely; pass 2 dusts the remaining lanes sparsely.
    MapGenerator.plantedCells.clear();
    const gaps = MapGenerator.findGroutGaps(ctx, worldSize);
    const clusterMoss: Array<[number, number]> = [];
    const laneMoss: Array<[number, number]> = [];
    for (const [px, py] of gaps) {
      if (clusters.some((c) => (px - c.x) * (px - c.x) + (py - c.y) * (py - c.y) < c.r * c.r)) {
        clusterMoss.push([px, py]);
      } else {
        laneMoss.push([px, py]);
      }
    }
    Phaser.Utils.Array.Shuffle(clusterMoss);
    Phaser.Utils.Array.Shuffle(laneMoss);
    let planted = 0;
    for (const [px, py] of clusterMoss) {
      if (planted >= 1250) break;
      if (MapGenerator.tooCloseToPlanted(px, py, 22)) continue;
      MapGenerator.markPlanted(px, py, 22);
      stampFrame(decalsImg, decalsTex, Phaser.Utils.Array.GetRandom(MapGenerator.DECAL_MOSS),
        px, py, Phaser.Math.FloatBetween(0, 360), Phaser.Math.FloatBetween(0.5, 0.95), Phaser.Math.FloatBetween(0.85, 1));
      planted++;
    }
    for (const [px, py] of laneMoss) {
      if (planted >= 1750) break;
      if (MapGenerator.tooCloseToPlanted(px, py, 40)) continue;
      MapGenerator.markPlanted(px, py, 40);
      stampFrame(decalsImg, decalsTex, Phaser.Utils.Array.GetRandom(MapGenerator.DECAL_MOSS),
        px, py, Phaser.Math.FloatBetween(0, 360), Phaser.Math.FloatBetween(0.32, 0.5), Phaser.Math.FloatBetween(0.75, 0.9));
      planted++;
    }

    canvasTex.refresh();
    scene.add.image(0, 0, 'baked_floor').setOrigin(0, 0).setDepth(0);
  }

  /** Samples the buffer on a coarse grid and returns coordinates where bare grout is exposed. */
  private static findGroutGaps(ctx: CanvasRenderingContext2D, worldSize: number): Array<[number, number]> {
    const STEP = 7;
    const data = ctx.getImageData(0, 0, worldSize, worldSize).data;
    const [gr, gg, gb] = MapGenerator.GROUT_RGB;
    const gaps: Array<[number, number]> = [];
    for (let py = 0; py < worldSize; py += STEP) {
      for (let px = 0; px < worldSize; px += STEP) {
        const i = (py * worldSize + px) * 4;
        if (Math.abs(data[i] - gr) <= 3 && Math.abs(data[i + 1] - gg) <= 3 && Math.abs(data[i + 2] - gb) <= 3) {
          gaps.push([px, py]);
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
