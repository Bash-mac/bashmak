import Phaser from 'phaser';
import type { Entity } from '../entities/Entity';
import type { SpawnManager } from '../spawning/SpawnManager';

export interface EnemyAIContext {
  scene: Phaser.Scene;
  player: Entity;
  enemiesMap: Map<string, Entity>;
  spawnManager: SpawnManager;
  onExploderTrigger: (enemy: Entity) => void;
  flashSprite?: (sprite: Phaser.GameObjects.Sprite, color: number) => void;
}

export class EnemyAISystem {
  private bossDashTimer = 0;
  private isBossDashing = false;
  private isBossVulnerable = false;
  private bossTelegraphGfx?: Phaser.GameObjects.Graphics;

  private spatialGrid: Map<number, Entity[]> = new Map();
  private bucketPool: Entity[][] = [];

  public reset(): void {
    this.bossDashTimer = 0;
    this.isBossDashing = false;
    this.isBossVulnerable = false;
    this.bossTelegraphGfx?.clear();
    this.bossTelegraphGfx?.destroy();
    this.bossTelegraphGfx = undefined;
    for (const bucket of this.spatialGrid.values()) {
      bucket.length = 0;
      this.bucketPool.push(bucket);
    }
    this.spatialGrid.clear();
  }

  public update(delta: number, ctx: EnemyAIContext): void {
    const playerX = ctx.player.x;
    const playerY = ctx.player.y;

    // --- Spatial bucket grid for O(N) separation instead of O(N²) (Zero-Allocation) ---
    for (const bucket of this.spatialGrid.values()) {
      bucket.length = 0;
      this.bucketPool.push(bucket);
    }
    this.spatialGrid.clear();

    const CELL = 64; // px, slightly larger than separationRadius=58
    const cellKey = (cx: number, cy: number) => cx * 100003 + cy;

    for (const e of ctx.enemiesMap.values()) {
      if (!e.isAlive || !e.sprite) continue;
      const cx = Math.floor(e.x / CELL);
      const cy = Math.floor(e.y / CELL);
      const key = cellKey(cx, cy);
      let bucket = this.spatialGrid.get(key);
      if (!bucket) {
        bucket = this.bucketPool.pop() ?? [];
        this.spatialGrid.set(key, bucket);
      }
      bucket.push(e);
    }

    for (const enemy of ctx.enemiesMap.values()) {
      if (!enemy.isAlive || !enemy.sprite || enemy.isExploding) continue;

      enemy.updateStatusEffects(delta);
      if (enemy.knockbackTimer > 0) {
        enemy.sprite.setVelocity(enemy.knockbackVx, enemy.knockbackVy);
        continue;
      }

      const def = enemy.definition;
      const distToPlayer = Phaser.Math.Distance.Between(enemy.x, enemy.y, playerX, playerY);

      // Vampire Survivors Wrap-Around: If enemy is too far (> maxViewRadius), teleport ahead
      const maxViewRadius = ctx.spawnManager.getViewport().maxRadius + 180;
      if (distToPlayer > maxViewRadius && def?.archetype !== 'boss' && def?.archetype !== 'miniboss') {
        const newPos = ctx.spawnManager.getRepositionPosition();
        enemy.sprite.setPosition(newPos.x, newPos.y);
        continue;
      }

      // Exploder fuse trigger at 45px
      if (def?.archetype === 'exploder' && distToPlayer <= 45) {
        ctx.onExploderTrigger(enemy);
        continue;
      }

      const angleToPlayer = Phaser.Math.Angle.Between(enemy.x, enemy.y, playerX, playerY);
      const spd = enemy.effectiveSpeed;

      // Flocking Separation Force — archetype-aware radius to give physical volume
      let sepX = 0;
      let sepY = 0;
      const isTank = def?.archetype === 'tank' || def?.archetype === 'miniboss';
      const separationRadius = isTank ? 72 : 46;
      const separationRadiusSq = separationRadius * separationRadius;
      const ecx = Math.floor(enemy.x / CELL);
      const ecy = Math.floor(enemy.y / CELL);

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const neighbors = this.spatialGrid.get(cellKey(ecx + dx, ecy + dy));
          if (!neighbors) continue;
          for (const other of neighbors) {
            if (other.id === enemy.id) continue;
            const ox = enemy.x - other.x;
            const oy = enemy.y - other.y;
            const distSq = ox * ox + oy * oy;
            if (distSq < separationRadiusSq && distSq > 0.01) {
              const d = Math.sqrt(distSq);
              const force = Math.pow((separationRadius - d) / separationRadius, 1.1);
              sepX += (ox / d) * force * 110;
              sepY += (oy / d) * force * 110;
            }
          }
        }
      }

      const maxSep = spd * 1.25;
      const sepLen = Math.sqrt(sepX * sepX + sepY * sepY);
      if (sepLen > maxSep && sepLen > 0) {
        sepX = (sepX / sepLen) * maxSep;
        sepY = (sepY / sepLen) * maxSep;
      }

      if (def?.archetype === 'boss') {
        this.handleBossAI(enemy, delta, angleToPlayer, ctx);
      } else if (def?.archetype === 'tank') {
        this.handleTankAI(enemy, delta, angleToPlayer, distToPlayer, spd, sepX, sepY);
      } else if (enemy.sprite.getData('stampedeDir')) {
        let stampedeTimer = (enemy.sprite.getData('stampedeTimer') as number) ?? 2600;
        stampedeTimer -= delta;
        enemy.sprite.setData('stampedeTimer', stampedeTimer);

        const bounds = ctx.scene.physics.world.bounds;
        const pad = 60;
        const hitWall = enemy.x < bounds.x + pad || enemy.x > bounds.right - pad || enemy.y < bounds.y + pad || enemy.y > bounds.bottom - pad;

        if (stampedeTimer <= 0 || hitWall) {
          // Finished charge or reached wall — transition back to regular pursuit AI
          enemy.sprite.setData('stampedeDir', undefined);
        } else {
          const dir = enemy.sprite.getData('stampedeDir') as { vx: number; vy: number };
          const speedMult = (enemy.sprite.getData('stampedeSpeedMult') as number) || 1.6;
          const marchSpeed = Math.max(130, spd * speedMult);
          enemy.sprite.setVelocity(dir.vx * marchSpeed + sepX * 0.3, dir.vy * marchSpeed + sepY * 0.3);
          enemy.sprite.setFlipX(dir.vx < 0);
          enemy.sprite.rotation = 0;
          continue;
        }
      } else {
        const isRunner = enemy.sprite.getData('isRunner') === true;
        let moveAngle = angleToPlayer;

        if (isRunner) {
          const orbitDir = (enemy.flankOffset ?? 0.5) > 0 ? 1 : -1;
          const tangentAngle = angleToPlayer + (Math.PI / 2) * orbitDir;

          if (distToPlayer < 180) {
            moveAngle = angleToPlayer + Math.PI;
          } else if (distToPlayer > 300) {
            moveAngle = angleToPlayer + (Math.PI / 4) * orbitDir;
          } else {
            moveAngle = tangentAngle;
          }

          const bounds = ctx.scene.physics.world.bounds;
          const pad = 120;
          if (enemy.x < bounds.x + pad || enemy.x > bounds.right - pad || enemy.y < bounds.y + pad || enemy.y > bounds.bottom - pad) {
            moveAngle = Phaser.Math.Angle.Between(enemy.x, enemy.y, bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
          }
        } else if (distToPlayer > 75) {
          const blend = Math.min(1.0, (distToPlayer - 75) / 220);
          moveAngle += (enemy.flankOffset ?? 0) * blend;
        }

        const runSpd = isRunner ? Math.min(170, spd * 0.95) : spd;
        const vx = Math.cos(moveAngle) * runSpd + sepX;
        const vy = Math.sin(moveAngle) * runSpd + sepY;
        enemy.sprite.setVelocity(vx, vy);
        enemy.sprite.setFlipX(vx < 0);
        enemy.sprite.rotation = 0;
      }
    }
  }

  private handleBossAI(boss: Entity, delta: number, angle: number, ctx: EnemyAIContext): void {
    const hpPercent = boss.health.percent;

    if (hpPercent <= 0.33) {
      boss.bossPhase = 3;
    } else if (hpPercent <= 0.66) {
      boss.bossPhase = 2;
    } else {
      boss.bossPhase = 1;
    }

    if (this.isBossVulnerable) {
      boss.sprite?.setVelocity(0, 0);
      return;
    }

    this.bossDashTimer += delta;

    if (this.bossDashTimer >= 4000 && !this.isBossDashing) {
      this.bossDashTimer = 0;
      this.isBossDashing = true;
      boss.sprite?.setVelocity(0, 0);

      if (!this.bossTelegraphGfx) {
        this.bossTelegraphGfx = ctx.scene.add.graphics().setDepth(6);
      }

      this.bossTelegraphGfx.clear();
      this.bossTelegraphGfx.lineStyle(4, 0xef4444, 0.9);
      this.bossTelegraphGfx.lineBetween(boss.x, boss.y, ctx.player.x, ctx.player.y);

      ctx.scene.time.delayedCall(600, () => {
        this.bossTelegraphGfx?.clear();
        if (!boss.isAlive || !boss.sprite) {
          this.isBossDashing = false;
          return;
        }

        const dashAngle = Phaser.Math.Angle.Between(boss.x, boss.y, ctx.player.x, ctx.player.y);
        const dashVx = Math.cos(dashAngle) * 450;
        boss.sprite.setVelocity(dashVx, Math.sin(dashAngle) * 450);
        boss.sprite.setFlipX(dashVx < 0);
        boss.sprite.rotation = 0;

        ctx.scene.time.delayedCall(800, () => {
          this.isBossDashing = false;
          if (!boss.isAlive || !boss.sprite) return;
          this.isBossVulnerable = true;
          boss.sprite.setVelocity(0, 0);
          if (ctx.flashSprite) ctx.flashSprite(boss.sprite, 0xfacc15);

          ctx.scene.time.delayedCall(900, () => {
            this.isBossVulnerable = false;
          });
        });
      });
      return;
    }

    if (!this.isBossDashing) {
      let spd = boss.effectiveSpeed;
      if (boss.bossPhase === 3) spd *= 0.8;
      const bvx = Math.cos(angle) * spd;
      const bvy = Math.sin(angle) * spd;
      boss.sprite?.setVelocity(bvx, bvy);
      boss.sprite?.setFlipX(bvx < 0);
      if (boss.sprite) boss.sprite.rotation = 0;
    }
  }

  private handleTankAI(
    tank: Entity,
    delta: number,
    angleToPlayer: number,
    distToPlayer: number,
    spd: number,
    sepX: number,
    sepY: number
  ): void {
    const spr = tank.sprite;
    if (!spr) return;

    // 1. Charging state (High speed ramming)
    let chargeTimer = (spr.getData('chargeTimer') as number) ?? 0;
    if (chargeTimer > 0) {
      chargeTimer -= delta;
      spr.setData('chargeTimer', chargeTimer);
      const cvx = (spr.getData('chargeVx') as number) ?? 0;
      const cvy = (spr.getData('chargeVy') as number) ?? 0;
      spr.setVelocity(cvx, cvy);
      spr.setFlipX(cvx < 0);
      spr.rotation = 0;

      if (chargeTimer <= 0) {
        spr.clearTint();
        spr.setData('chargeCooldown', 3000 + Math.random() * 1500);
      }
      return;
    }

    // 2. Telegraph state (Locked in place, pulsing angry red)
    let telegraphTimer = (spr.getData('telegraphTimer') as number) ?? 0;
    if (telegraphTimer > 0) {
      telegraphTimer -= delta;
      spr.setData('telegraphTimer', telegraphTimer);
      spr.setVelocity(0, 0);

      if (telegraphTimer <= 0) {
        // Launch Charge!
        const chargeSpeed = 260;
        const lockAngle = (spr.getData('lockedAngle') as number) ?? angleToPlayer;
        spr.setData('chargeVx', Math.cos(lockAngle) * chargeSpeed);
        spr.setData('chargeVy', Math.sin(lockAngle) * chargeSpeed);
        spr.setData('chargeTimer', 950);
        spr.setTint(0xf97316); // Orange fiery charge
      }
      return;
    }

    // 3. Cooldown check
    let cooldown = (spr.getData('chargeCooldown') as number) ?? (1000 + Math.random() * 2000);
    cooldown -= delta;
    spr.setData('chargeCooldown', cooldown);

    // Trigger charge telegraph if close enough and off cooldown
    if (cooldown <= 0 && distToPlayer >= 150 && distToPlayer <= 320) {
      spr.setData('telegraphTimer', 400);
      spr.setData('lockedAngle', angleToPlayer);
      spr.setTint(0xef4444); // Red warning telegraph
      spr.setVelocity(0, 0);
      return;
    }

    // 4. Default Tank March (heavy, unstoppable advance)
    const vx = Math.cos(angleToPlayer) * spd + sepX * 0.4;
    const vy = Math.sin(angleToPlayer) * spd + sepY * 0.4;
    spr.setVelocity(vx, vy);
    spr.setFlipX(vx < 0);
    spr.rotation = 0;
  }
}
