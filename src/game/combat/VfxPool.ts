import Phaser from 'phaser';
import { ObjectPool } from '../pools/ObjectPool';

export class VfxPool {
  private splatPool: ObjectPool<Phaser.GameObjects.Sprite>;
  private carrotSplatPool: ObjectPool<Phaser.GameObjects.Sprite>;
  private enemyDeadPool: ObjectPool<Phaser.GameObjects.Sprite>;
  private electroZapPool: ObjectPool<Phaser.GameObjects.Sprite>;
  private piezoMuzzlePool: ObjectPool<Phaser.GameObjects.Sprite>;
  private piezoHitPool: ObjectPool<Phaser.GameObjects.Sprite>;
  private toiletLidImpactPool: ObjectPool<Phaser.GameObjects.Sprite>;
  private proceduralLightningPool: ObjectPool<Phaser.GameObjects.Graphics>;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.splatPool = new ObjectPool<Phaser.GameObjects.Sprite>(scene, {
      create: () => {
        const splat = scene.add.sprite(0, 0, 'vfx_impact_splat_1').setDepth(12).setScale(0.75);
        return splat;
      },
      onRelease: (splat) => {
        splat.stop();
        splat.setScale(0.75);
        splat.setAlpha(1);
      },
      maxSize: 60,
    });
    this.splatPool.prewarm(20);

    this.carrotSplatPool = new ObjectPool<Phaser.GameObjects.Sprite>(scene, {
      create: () => {
        const splat = scene.add.sprite(0, 0, 'vfx_carrot_splat_1').setDepth(12).setScale(0.14);
        return splat;
      },
      onRelease: (splat) => {
        splat.stop();
        splat.setScale(0.14);
        splat.setAlpha(1);
      },
      maxSize: 60,
    });
    this.carrotSplatPool.prewarm(15);

    this.enemyDeadPool = new ObjectPool<Phaser.GameObjects.Sprite>(scene, {
      create: () => {
        const spr = scene.add.sprite(0, 0, 'tex_enemy_dead_1').setDepth(11).setScale(0.35);
        return spr;
      },
      onRelease: (spr) => {
        spr.stop();
        spr.setScale(0.35);
        spr.setAlpha(1);
      },
      maxSize: 80,
    });
    this.enemyDeadPool.prewarm(25);

    this.electroZapPool = new ObjectPool<Phaser.GameObjects.Sprite>(scene, {
      create: () => {
        const spr = scene.add.sprite(0, 0, 'vfx_electro_zap').setDepth(15).setBlendMode(Phaser.BlendModes.ADD);
        return spr;
      },
      onRelease: (spr) => {
        spr.stop();
        spr.setScale(1);
        spr.setAlpha(1);
      },
      maxSize: 40,
    });
    this.electroZapPool.prewarm(12);

    this.piezoMuzzlePool = new ObjectPool<Phaser.GameObjects.Sprite>(scene, {
      create: () => {
        const spr = scene.add.sprite(0, 0, 'vfx_piezo_muzzle').setDepth(15).setBlendMode(Phaser.BlendModes.ADD);
        return spr;
      },
      onRelease: (spr) => {
        spr.stop();
        spr.setScale(1);
        spr.setAlpha(1);
      },
      maxSize: 20,
    });
    this.piezoMuzzlePool.prewarm(6);

    this.piezoHitPool = new ObjectPool<Phaser.GameObjects.Sprite>(scene, {
      create: () => {
        const spr = scene.add.sprite(0, 0, 'vfx_piezo_hit')
          .setDepth(15)
          .setBlendMode(Phaser.BlendModes.ADD);
        return spr;
      },
      onRelease: (spr) => {
        spr.stop();
        spr.setScale(1);
        spr.setAlpha(1);
      },
      maxSize: 40,
    });
    this.piezoHitPool.prewarm(15);

    this.toiletLidImpactPool = new ObjectPool<Phaser.GameObjects.Sprite>(scene, {
      create: () => {
        const spr = scene.add.sprite(0, 0, 'vfx_toilet_lid_impact')
          .setDepth(15)
          .setBlendMode(Phaser.BlendModes.NORMAL);
        return spr;
      },
      onRelease: (spr) => {
        spr.stop();
        spr.setScale(1);
        spr.setAlpha(1);
      },
      maxSize: 30,
    });
    this.toiletLidImpactPool.prewarm(10);

    this.proceduralLightningPool = new ObjectPool<Phaser.GameObjects.Graphics>(scene, {
      create: () => {
        const gfx = scene.add.graphics().setDepth(15).setBlendMode(Phaser.BlendModes.ADD);
        return gfx;
      },
      onRelease: (gfx) => {
        gfx.clear();
        gfx.setAlpha(1);
      },
      maxSize: 35,
    });
    this.proceduralLightningPool.prewarm(12);
  }

  public spawnImpactSplat(x: number, y: number, scale = 0.75): void {
    const splat = this.splatPool.get();
    splat.setPosition(x, y);
    splat.setScale(scale);

    if (this.scene.anims.exists('vfx_anim_impact_splat')) {
      splat.play('vfx_anim_impact_splat').once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        this.splatPool.release(splat);
      });
    } else {
      this.scene.time.delayedCall(200, () => {
        this.splatPool.release(splat);
      });
    }
  }

  public spawnCarrotSplat(x: number, y: number, scale = 0.14): void {
    const splat = this.carrotSplatPool.get();
    splat.setPosition(x, y);
    splat.setScale(scale);

    if (this.scene.anims.exists('vfx_anim_carrot_splat')) {
      splat.play('vfx_anim_carrot_splat').once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        this.carrotSplatPool.release(splat);
      });
    } else {
      this.scene.time.delayedCall(200, () => {
        this.carrotSplatPool.release(splat);
      });
    }
  }

  public spawnEnemyDeath(x: number, y: number, scale = 0.35): void {
    const spr = this.enemyDeadPool.get();
    spr.setPosition(x, y);
    spr.setScale(scale);

    if (this.scene.anims.exists('vfx_anim_enemy_dead')) {
      spr.play('vfx_anim_enemy_dead').once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        this.enemyDeadPool.release(spr);
      });
    } else {
      this.scene.time.delayedCall(300, () => {
        this.enemyDeadPool.release(spr);
      });
    }
  }

  public spawnElectroZap(x: number, y: number, scale = 0.65): void {
    const spr = this.electroZapPool.get();
    spr.setPosition(x, y);
    spr.setScale(scale);

    if (this.scene.anims.exists('vfx_anim_electro_zap')) {
      spr.play('vfx_anim_electro_zap').once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        this.electroZapPool.release(spr);
      });
    } else {
      this.scene.time.delayedCall(350, () => {
        this.electroZapPool.release(spr);
      });
    }
  }

  public spawnPiezoMuzzle(x: number, y: number, angleDeg = 0, scale = 0.35): void {
    const spr = this.piezoMuzzlePool.get();
    spr.setPosition(x, y);
    spr.setAngle(angleDeg);
    spr.setScale(scale);

    if (this.scene.anims.exists('vfx_anim_piezo_muzzle')) {
      spr.play('vfx_anim_piezo_muzzle').once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        this.piezoMuzzlePool.release(spr);
      });
    } else {
      this.scene.time.delayedCall(120, () => {
        this.piezoMuzzlePool.release(spr);
      });
    }
  }

  public spawnPiezoHit(x: number, y: number, scale = 0.5): void {
    const spr = this.piezoHitPool.get();
    spr.setPosition(x, y);
    spr.setScale(scale);

    if (this.scene.anims.exists('vfx_anim_piezo_hit')) {
      spr.play('vfx_anim_piezo_hit').once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        this.piezoHitPool.release(spr);
      });
    } else {
      this.scene.time.delayedCall(140, () => {
        this.piezoHitPool.release(spr);
      });
    }
  }

  public spawnToiletLidImpact(x: number, y: number, scale = 0.65): void {
    const spr = this.toiletLidImpactPool.get();
    spr.setPosition(x, y);
    spr.setScale(scale);

    if (this.scene.anims.exists('vfx_anim_toilet_lid_impact')) {
      spr.play('vfx_anim_toilet_lid_impact').once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        this.toiletLidImpactPool.release(spr);
      });
    } else {
      this.scene.time.delayedCall(160, () => {
        this.toiletLidImpactPool.release(spr);
      });
    }
  }

  public spawnProceduralLightning(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    options?: {
      color?: number;
      glowColor?: number;
      durationMs?: number;
      segments?: number;
      forks?: boolean;
    }
  ): void {
    const gfx = this.proceduralLightningPool.get();
    const duration = options?.durationMs ?? 110;
    const glowColor = options?.glowColor ?? 0x22c55e; // Neon lime / toxic green
    const mainColor = options?.color ?? 0xfacc15;     // Bright electric yellow
    const forks = options?.forks ?? true;

    let elapsed = 0;
    const interval = 22; // jitter every 22ms

    const drawBolt = () => {
      gfx.clear();
      const points = this.generateLightningPoints(x1, y1, x2, y2, options?.segments ?? 6, 26);

      // Layer 1: Wide Toxic Green Glow
      gfx.lineStyle(9, glowColor, 0.45);
      this.renderPolyline(gfx, points);

      // Layer 2: Sharp Electric Yellow Beam
      gfx.lineStyle(4.5, mainColor, 0.95);
      this.renderPolyline(gfx, points);

      // Layer 3: Blinding White Inner Core
      gfx.lineStyle(2.0, 0xffffff, 1.0);
      this.renderPolyline(gfx, points);

      // Optional side forks / branches
      if (forks && points.length > 3) {
        for (let i = 1; i < points.length - 1; i += 2) {
          if (Math.random() < 0.65) {
            const p = points[i];
            const baseAngle = Phaser.Math.Angle.Between(x1, y1, x2, y2);
            const side = Math.random() < 0.5 ? 1 : -1;
            const branchAngle = baseAngle + side * (0.4 + Math.random() * 0.5);
            const branchLen = 22 + Math.random() * 32;
            const bx = p.x + Math.cos(branchAngle) * branchLen;
            const by = p.y + Math.sin(branchAngle) * branchLen;
            const branchPoints = this.generateLightningPoints(p.x, p.y, bx, by, 3, 10);

            gfx.lineStyle(5, glowColor, 0.35);
            this.renderPolyline(gfx, branchPoints);
            gfx.lineStyle(2.5, mainColor, 0.85);
            this.renderPolyline(gfx, branchPoints);
            gfx.lineStyle(1.2, 0xffffff, 0.9);
            this.renderPolyline(gfx, branchPoints);
          }
        }
      }
    };

    drawBolt();

    const timer = this.scene.time.addEvent({
      delay: interval,
      repeat: Math.floor(duration / interval),
      callback: () => {
        elapsed += interval;
        if (elapsed >= duration) {
          timer.remove();
          this.proceduralLightningPool.release(gfx);
        } else {
          drawBolt();
          gfx.setAlpha(1 - (elapsed / duration) * 0.35);
        }
      },
    });
  }

  private generateLightningPoints(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    numSegments: number,
    maxOffset: number
  ): { x: number; y: number }[] {
    const points = [{ x: x1, y: y1 }];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 4) {
      points.push({ x: x2, y: y2 });
      return points;
    }

    const normX = -dy / dist;
    const normY = dx / dist;

    const segs = Math.max(3, Math.min(numSegments, Math.floor(dist / 22)));
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const envelope = Math.sin(t * Math.PI);
      const offset = (Math.random() * 2 - 1) * maxOffset * envelope;
      points.push({
        x: x1 + dx * t + normX * offset,
        y: y1 + dy * t + normY * offset,
      });
    }
    points.push({ x: x2, y: y2 });
    return points;
  }

  private renderPolyline(gfx: Phaser.GameObjects.Graphics, points: { x: number; y: number }[]): void {
    if (points.length < 2) return;
    gfx.beginPath();
    gfx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      gfx.lineTo(points[i].x, points[i].y);
    }
    gfx.strokePath();
  }

  public clear(): void {
    this.splatPool.clear();
    this.carrotSplatPool.clear();
    this.enemyDeadPool.clear();
    this.electroZapPool.clear();
    this.piezoMuzzlePool.clear();
    this.piezoHitPool.clear();
    this.toiletLidImpactPool.clear();
    this.proceduralLightningPool.clear();
  }
}
