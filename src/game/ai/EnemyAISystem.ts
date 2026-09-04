import Phaser from 'phaser';
import type { Entity } from '../entities/Entity';
import type { SpawnManager } from '../spawning/SpawnManager';

export interface CombatBubbleConfig {
  bubbleRadius: number;
  tailCap: number;
  tailSectorAngleRad: number;
  separationRadius: number;
  tankSeparationRadius: number;
}

export const COMBAT_BUBBLE_CONFIG: CombatBubbleConfig = {
  bubbleRadius: 750,
  tailCap: 3,
  tailSectorAngleRad: (120 * Math.PI) / 180,
  separationRadius: 32,
  tankSeparationRadius: 64,
};

export interface EnemyAIContext {
  scene: Phaser.Scene;
  player: Entity;
  enemiesMap: Map<string, Entity>;
  spawnManager: SpawnManager;
  onExploderTrigger: (enemy: Entity) => void;
  onEnemyDespawned?: (enemy: Entity) => void;
  flashSprite?: (sprite: Phaser.GameObjects.Sprite, color: number) => void;
}

export class EnemyAISystem {
  private bossDashTimer = 0;
  private isBossDashing = false;
  private isBossVulnerable = false;
  private bossTelegraphGfx?: Phaser.GameObjects.Graphics;

  private spatialGrid: Map<number, Entity[]> = new Map();
  private bucketPool: Entity[][] = [];

  private despawnQueue: Entity[] = [];
  private trailingSlots: { enemy: Entity | null; distSq: number }[] = Array.from({ length: 250 }, () => ({ enemy: null, distSq: 0 }));
  private trailingCount = 0;

  public reset(): void {
    this.bossDashTimer = 0;
    this.isBossDashing = false;
    this.isBossVulnerable = false;
    this.bossTelegraphGfx?.clear();
    this.bossTelegraphGfx?.destroy();
    this.bossTelegraphGfx = undefined;
    this.despawnQueue.length = 0;
    this.trailingCount = 0;
    for (let i = 0; i < this.trailingSlots.length; i++) {
      this.trailingSlots[i].enemy = null;
      this.trailingSlots[i].distSq = 0;
    }
    for (const bucket of this.spatialGrid.values()) {
      bucket.length = 0;
      this.bucketPool.push(bucket);
    }
    this.spatialGrid.clear();
  }

  private sortTrailingSlots(count: number): void {
    for (let i = 1; i < count; i++) {
      const curEnemy = this.trailingSlots[i].enemy;
      const curDistSq = this.trailingSlots[i].distSq;
      let j = i - 1;
      while (j >= 0 && this.trailingSlots[j].distSq > curDistSq) {
        this.trailingSlots[j + 1].enemy = this.trailingSlots[j].enemy;
        this.trailingSlots[j + 1].distSq = this.trailingSlots[j].distSq;
        j--;
      }
      this.trailingSlots[j + 1].enemy = curEnemy;
      this.trailingSlots[j + 1].distSq = curDistSq;
    }
  }

  public update(delta: number, ctx: EnemyAIContext): void {
    const playerX = ctx.player.x;
    const playerY = ctx.player.y;
    const { halfW, halfH } = ctx.spawnManager.getViewport();
    this.despawnQueue.length = 0;
    this.trailingCount = 0;

    const playerBody = ctx.player.sprite?.body as Phaser.Physics.Arcade.Body | undefined;
    const playerVx = playerBody?.velocity.x ?? 0;
    const playerVy = playerBody?.velocity.y ?? 0;
    const playerSpeed = Math.hypot(playerVx, playerVy);
    const isPlayerMoving = playerSpeed > 30;
    const playerHeading = isPlayerMoving ? Math.atan2(playerVy, playerVx) : 0;
    const behindAngle = isPlayerMoving ? Phaser.Math.Angle.Wrap(playerHeading + Math.PI) : 0;
    const halfSector = COMBAT_BUBBLE_CONFIG.tailSectorAngleRad / 2;

    // --- Spatial bucket grid for O(N) separation instead of O(N²) (Zero-Allocation) ---
    for (const bucket of this.spatialGrid.values()) {
      bucket.length = 0;
      this.bucketPool.push(bucket);
    }
    this.spatialGrid.clear();

    const CELL = 76; // px, matches tankSeparationRadius
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
      const isBoss = def?.archetype === 'boss' || def?.archetype === 'miniboss';
      const isSpecial = isBoss || enemy.isChampion;
      const isOffScreen = Math.abs(enemy.x - playerX) > halfW + 50 || Math.abs(enemy.y - playerY) > halfH + 50;

      // 1. Combat Bubble Despawn: release non-special enemies outside active bubble AND strictly off-screen
      // Must not despawn newly spawned enemies (grace period 1800ms so they can walk into view)
      if (!isSpecial && isOffScreen && enemy.lifetimeMs > 1800 && distToPlayer > COMBAT_BUBBLE_CONFIG.bubbleRadius) {
        this.despawnQueue.push(enemy);
        continue;
      }

      // 2. Tail Cap tracking: strictly for OFF-SCREEN ordinary enemies in the 120° cone behind moving player
      // Any enemy visible on-screen is NEVER despawned or culled by Tail Cap!
      if (!isSpecial && isOffScreen && isPlayerMoving && enemy.lifetimeMs > 1200) {
        const angleFromPlayer = Math.atan2(enemy.y - playerY, enemy.x - playerX);
        const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(angleFromPlayer - behindAngle));
        if (angleDiff <= halfSector) {
          if (this.trailingCount < this.trailingSlots.length) {
            const slot = this.trailingSlots[this.trailingCount++];
            slot.enemy = enemy;
            slot.distSq = distToPlayer * distToPlayer;
          }
        }
      }

      // Exploder fuse trigger at 45px
      if (def?.archetype === 'exploder' && distToPlayer <= 45) {
        ctx.onExploderTrigger(enemy);
        continue;
      }

      const angleToPlayer = Phaser.Math.Angle.Between(enemy.x, enemy.y, playerX, playerY);
      const spd = enemy.effectiveSpeed;

      // Flocking Separation Force — lighter force for swarmers to allow tight train clustering
      let sepX = 0;
      let sepY = 0;
      const isTank = def?.archetype === 'tank' || def?.archetype === 'miniboss';
      const separationRadius = isTank
        ? COMBAT_BUBBLE_CONFIG.tankSeparationRadius
        : COMBAT_BUBBLE_CONFIG.separationRadius;
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
              const pushStrength = isTank ? 140 : 60;
              sepX += (ox / d) * force * pushStrength;
              sepY += (oy / d) * force * pushStrength;
            }
          }
        }
      }

      const maxSep = spd * 0.85;
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
        } else if (def?.archetype === 'sprinter' && isPlayerMoving && distToPlayer > 80) {
          const leadTime = Math.min(0.55, distToPlayer / Math.max(1, spd));
          const leadX = playerX + playerVx * leadTime;
          const leadY = playerY + playerVy * leadTime;
          moveAngle = Phaser.Math.Angle.Between(enemy.x, enemy.y, leadX, leadY);
        } else if (isSpecial && distToPlayer > 60) {
          const blend = Math.min(1.0, (distToPlayer - 60) / 160);
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

    // 3. Tail Cap enforcement: retain closest tailCap enemies among off-screen tail, release excess distant ones
    if (this.trailingCount > COMBAT_BUBBLE_CONFIG.tailCap) {
      this.sortTrailingSlots(this.trailingCount);
      for (let i = COMBAT_BUBBLE_CONFIG.tailCap; i < this.trailingCount; i++) {
        const excess = this.trailingSlots[i].enemy;
        if (excess && !this.despawnQueue.includes(excess)) {
          const isOff = Math.abs(excess.x - playerX) > halfW + 40 || Math.abs(excess.y - playerY) > halfH + 40;
          if (isOff) {
            this.despawnQueue.push(excess);
          }
        }
      }
    }

    // 4. Despawn execution: silently release culled enemies back to EnemyPool and recycle quota into front arc
    if (this.despawnQueue.length > 0 && ctx.onEnemyDespawned) {
      let culledCount = 0;
      for (let i = 0; i < this.despawnQueue.length; i++) {
        const victim = this.despawnQueue[i];
        const isOff = Math.abs(victim.x - playerX) > halfW + 30 || Math.abs(victim.y - playerY) > halfH + 30;
        if (isOff) {
          ctx.onEnemyDespawned(victim);
          culledCount++;
        }
      }
      if (culledCount > 0) {
        ctx.spawnManager.onEnemyCulled(culledCount);
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
