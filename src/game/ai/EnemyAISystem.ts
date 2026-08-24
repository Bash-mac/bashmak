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

  public reset(): void {
    this.bossDashTimer = 0;
    this.isBossDashing = false;
    this.isBossVulnerable = false;
    this.bossTelegraphGfx?.clear();
  }

  public update(delta: number, ctx: EnemyAIContext): void {
    const enemiesList = Array.from(ctx.enemiesMap.values());
    const playerX = ctx.player.x;
    const playerY = ctx.player.y;

    // --- Spatial bucket grid for O(N) separation instead of O(N²) ---
    const CELL = 48; // px, slightly larger than separationRadius=42
    const spatialGrid = new Map<number, Entity[]>();
    const cellKey = (cx: number, cy: number) => cx * 100003 + cy;
    for (const e of enemiesList) {
      if (!e.isAlive || !e.sprite) continue;
      const cx = Math.floor(e.x / CELL);
      const cy = Math.floor(e.y / CELL);
      const key = cellKey(cx, cy);
      const bucket = spatialGrid.get(key);
      if (bucket) bucket.push(e);
      else spatialGrid.set(key, [e]);
    }

    for (const enemy of enemiesList) {
      if (!enemy.isAlive || !enemy.sprite || enemy.isExploding) continue;

      enemy.updateStatusEffects(delta);
      if (enemy.knockbackTimer > 0) {
        enemy.sprite.setVelocity(enemy.knockbackVx, enemy.knockbackVy);
        continue;
      }

      const def = enemy.definition;
      const distToPlayer = Phaser.Math.Distance.Between(enemy.x, enemy.y, playerX, playerY);

      // Vampire Survivors Wrap-Around: If enemy is too far (> 850px), teleport ahead
      if (distToPlayer > 850 && def?.archetype !== 'boss' && def?.archetype !== 'miniboss') {
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

      // Flocking Separation Force — only check 3x3 neighboring cells (O(k) per enemy)
      let sepX = 0;
      let sepY = 0;
      const separationRadius = 42;
      const separationRadiusSq = separationRadius * separationRadius;
      const ecx = Math.floor(enemy.x / CELL);
      const ecy = Math.floor(enemy.y / CELL);

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const neighbors = spatialGrid.get(cellKey(ecx + dx, ecy + dy));
          if (!neighbors) continue;
          for (const other of neighbors) {
            if (other.id === enemy.id) continue;
            const ox = enemy.x - other.x;
            const oy = enemy.y - other.y;
            const distSq = ox * ox + oy * oy;
            if (distSq < separationRadiusSq && distSq > 0.01) {
              const d = Math.sqrt(distSq);
              const force = (separationRadius - d) / separationRadius;
              sepX += (ox / d) * force * 55;
              sepY += (oy / d) * force * 55;
            }
          }
        }
      }

      const maxSep = spd * 0.75;
      const sepLen = Math.sqrt(sepX * sepX + sepY * sepY);
      if (sepLen > maxSep && sepLen > 0) {
        sepX = (sepX / sepLen) * maxSep;
        sepY = (sepY / sepLen) * maxSep;
      }

      if (def?.archetype === 'boss') {
        this.handleBossAI(enemy, delta, angleToPlayer, ctx);
      } else {
        const vx = Math.cos(angleToPlayer) * spd + sepX;
        const vy = Math.sin(angleToPlayer) * spd + sepY;
        enemy.sprite.setVelocity(vx, vy);
        enemy.sprite.rotation = Math.atan2(vy, vx);
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

      if (!this.bossTelegraphGfx) {
        this.bossTelegraphGfx = ctx.scene.add.graphics().setDepth(6);
      }

      this.bossTelegraphGfx.clear();
      this.bossTelegraphGfx.lineStyle(4, 0xef4444, 0.9);
      this.bossTelegraphGfx.lineBetween(boss.x, boss.y, ctx.player.x, ctx.player.y);

      ctx.scene.time.delayedCall(600, () => {
        if (!boss.isAlive || !boss.sprite) return;
        this.bossTelegraphGfx?.clear();

        const dashAngle = Phaser.Math.Angle.Between(boss.x, boss.y, ctx.player.x, ctx.player.y);
        boss.sprite.setVelocity(Math.cos(dashAngle) * 450, Math.sin(dashAngle) * 450);

        ctx.scene.time.delayedCall(800, () => {
          if (!boss.isAlive || !boss.sprite) return;
          this.isBossDashing = false;
          this.isBossVulnerable = true;
          if (ctx.flashSprite) ctx.flashSprite(boss.sprite, 0xfacc15);

          ctx.scene.time.delayedCall(1500, () => {
            this.isBossVulnerable = false;
          });
        });
      });
      return;
    }

    if (!this.isBossDashing) {
      let spd = boss.effectiveSpeed;
      if (boss.bossPhase === 3) spd *= 0.8;
      boss.sprite?.setVelocity(Math.cos(angle) * spd, Math.sin(angle) * spd);
      boss.sprite!.rotation = angle;
    }
  }
}
