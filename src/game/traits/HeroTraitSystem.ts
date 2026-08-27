import Phaser from 'phaser';
import type { Entity } from '../entities/Entity';
import type { GameState } from '../core/GameState';
import type { LootSystem } from '../loot/LootSystem';
import { ObjectPool } from '../pools/ObjectPool';

export interface TraitContext {
  scene: Phaser.Scene;
  player: Entity;
  gameState: GameState;
  lootSystem: LootSystem;
  applyAreaDamage: (x: number, y: number, radius: number, dmg: number) => void;
}

export class HeroTraitSystem {
  private slimeTrailSegments: Array<{ sprite: Phaser.GameObjects.Sprite; x: number; y: number; timeLeftMs: number }> = [];
  private slimeDropTimerMs = 0;
  private trailPool?: ObjectPool<Phaser.GameObjects.Sprite>;

  public update(delta: number, isMoving: boolean, ctx: TraitContext, heroId: string): void {
    const mods = ctx.gameState.playerModifiers;

    // 1. Vypolzok: Slime Trail
    if (mods.hasSlimeTrail) {
      this.handleSlimeTrail(delta, isMoving, ctx);
    }

    // 2. Bashmak: Stand Your Ground
    if (heroId === 'hero_bashmak') {
      if (!isMoving) {
        mods.standStillTimerMs += delta;
        if (mods.standStillTimerMs >= 1400 && !mods.standStillBonusActive) {
          mods.standStillBonusActive = true;
          ctx.lootSystem.showFloatText(ctx.player.x, ctx.player.y - 25, '️ STANDING GROUND! (+50% DMG)', '#facc15');
        }
      } else {
        if (mods.standStillBonusActive) {
          mods.standStillBonusActive = false;
          mods.standStillTimerMs = 0;
          ctx.player.applySlow(0.25, 1200);
        } else {
          mods.standStillTimerMs = 0;
        }
      }
    }

    // 3. Markovka: Speed Thirst Kill-Streak Decay
    if (heroId === 'hero_markovka') {
      if (mods.killStreakTimerMs > 0) {
        mods.killStreakTimerMs -= delta;
        if (mods.killStreakTimerMs <= 0) {
          mods.killStreakStacks = 0;
        }
      }
    }

    // 4. Baklazhan: Momentum Ram Charge
    if (heroId === 'hero_baklazhan') {
      if (isMoving) {
        mods.straightRunTimerMs += delta;
        mods.momentumSpeedBonus = Math.min(0.40, (mods.straightRunTimerMs / 2200) * 0.40);
        ctx.player.applySpeedBoost(1.0 + mods.momentumSpeedBonus, 150);

        if (mods.momentumSpeedBonus >= 0.25) {
          ctx.applyAreaDamage(ctx.player.x, ctx.player.y, 44, 18);
        }
      } else {
        mods.straightRunTimerMs = 0;
        mods.momentumSpeedBonus = 0;
      }
    }
  }

  public onEnemyKilledByMarkovka(ctx: TraitContext): void {
    const mods = ctx.gameState.playerModifiers;
    mods.killStreakStacks = Math.min(10, (mods.killStreakStacks || 0) + 1);
    mods.killStreakTimerMs = 4500;
    ctx.player.applySpeedBoost(1.0 + mods.killStreakStacks * 0.03, 4500);
    if (mods.killStreakStacks === 10) {
      ctx.lootSystem.showFloatText(ctx.player.x, ctx.player.y - 25, ' MEGA CARROT READY!', '#f97316');
    }
  }

  private getTrailPool(scene: Phaser.Scene): ObjectPool<Phaser.GameObjects.Sprite> {
    if (!this.trailPool) {
      this.trailPool = new ObjectPool<Phaser.GameObjects.Sprite>(scene, {
        create: () => {
          return scene.add.sprite(0, 0, 'vfx_slime_trail_1').setDepth(2);
        },
        onRelease: (sprite) => {
          sprite.setAlpha(0.8);
          sprite.setScale(0.85);
        },
        maxSize: 50,
      });
      this.trailPool.prewarm(20);
    }
    return this.trailPool;
  }

  private handleSlimeTrail(delta: number, isMoving: boolean, ctx: TraitContext): void {
    const pool = this.getTrailPool(ctx.scene);

    if (isMoving) {
      this.slimeDropTimerMs += delta;
      if (this.slimeDropTimerMs >= 130) {
        this.slimeDropTimerMs = 0;
        const trailKey = `vfx_slime_trail_${Phaser.Math.Between(1, 5)}`;
        const sprite = pool.get();
        sprite.setTexture(ctx.scene.textures.exists(trailKey) ? trailKey : 'vfx_slime_trail_1');
        sprite.setPosition(ctx.player.x, ctx.player.y + 12);
        sprite.setScale(0.85);
        sprite.setAlpha(0.8);
        sprite.setDepth(2);

        this.slimeTrailSegments.push({
          sprite,
          x: ctx.player.x,
          y: ctx.player.y + 12,
          timeLeftMs: 3800,
        });

        if (this.slimeTrailSegments.length > 35) {
          const oldest = this.slimeTrailSegments.shift();
          if (oldest?.sprite) {
            pool.release(oldest.sprite);
          }
        }
      }
    }

    let onTrail = false;
    const px = ctx.player.x;
    const py = ctx.player.y;

    for (let i = this.slimeTrailSegments.length - 1; i >= 0; i--) {
      const seg = this.slimeTrailSegments[i];
      seg.timeLeftMs -= delta;

      if (seg.timeLeftMs <= 0) {
        pool.release(seg.sprite);
        this.slimeTrailSegments.splice(i, 1);
        continue;
      }

      if (seg.timeLeftMs < 800) {
        seg.sprite.setAlpha((seg.timeLeftMs / 800) * 0.8);
      }

      if (!onTrail && Phaser.Math.Distance.Between(px, py, seg.x, seg.y) < 45) {
        onTrail = true;
      }
    }

    if (onTrail) {
      ctx.player.applySpeedBoost(1.2, 180);
    }
  }

  public clear(): void {
    if (this.trailPool) {
      for (const seg of this.slimeTrailSegments) {
        if (seg.sprite?.active) {
          this.trailPool.release(seg.sprite);
        }
      }
      this.trailPool.clear();
      this.trailPool = undefined;
    }
    this.slimeTrailSegments = [];
    this.slimeDropTimerMs = 0;
  }
}
