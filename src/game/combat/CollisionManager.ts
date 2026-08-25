import Phaser from 'phaser';
import type { Entity } from '../entities/Entity';
import type { GameState } from '../core/GameState';
import type { EventBus } from '../core/EventBus';
import type { CombatSystem } from './CombatSystem';
import type { LootSystem } from '../loot/LootSystem';
import type { HazardSystem, HazardContext } from '../map/HazardSystem';
import type { MapObjects } from '../map/MapGenerator';
import type { HUD } from '../scenes/ui/HUD';
import type { AudioManager } from '../audio/AudioManager';
import type { ProjectilePool } from './ProjectilePool';
import type { DamageNumberPool } from './DamageNumberPool';
import type { VfxPool } from './VfxPool';

export interface CollisionContext {
  scene: Phaser.Scene;
  player: Entity;
  enemiesMap: Map<string, Entity>;
  enemiesGroup: Phaser.Physics.Arcade.Group;
  projectilesGroup: Phaser.Physics.Arcade.Group;
  mapObjects: MapObjects;
  combatSystem: CombatSystem;
  lootSystem: LootSystem;
  hazardSystem: HazardSystem;
  gameState: GameState;
  eventBus: EventBus;
  hud: HUD;
  audio: AudioManager;
  projectilePool?: ProjectilePool;
  damageNumbers?: DamageNumberPool;
  vfxPool?: VfxPool;
  getPlayerIframeTimer: () => number;
  applyDamageToPlayer: (dmg: number) => void;
  getHazardCtx: () => HazardContext;
}

export class CollisionManager {
  public static setup(ctx: CollisionContext): void {
    const {
      scene,
      player,
      enemiesMap,
      enemiesGroup,
      projectilesGroup,
      mapObjects,
      combatSystem,
      lootSystem,
      hazardSystem,
      gameState,
      eventBus,
      hud,
      audio,
      projectilePool,
      damageNumbers,
      vfxPool,
    } = ctx;

    // 1. Projectiles vs Enemies
    scene.physics.add.overlap(projectilesGroup, enemiesGroup, (projObj, enemyObj) => {
      const proj = projObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      const enemy = enemiesMap.get((enemyObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody).getData('entityId'));
      if (enemy && enemy.isAlive && !enemy.isExploding && proj.active) {
        const damage = (proj.getData('damage') as number) || 10;
        const isCrit = (proj.getData('isCrit') as boolean) || false;
        combatSystem.applyDamage(player, enemy, damage);

        if (damageNumbers) {
          damageNumbers.showDamage(enemy.x, enemy.y, damage, isCrit);
        }

        if (vfxPool) {
          vfxPool.spawnImpactSplat(proj.x, proj.y, 0.75);
        } else if (scene.anims.exists('vfx_anim_impact_splat')) {
          const splat = scene.add.sprite(proj.x, proj.y, 'vfx_impact_splat_1').setDepth(12).setScale(0.75);
          splat.play('vfx_anim_impact_splat').once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => splat.destroy());
        }

        if (proj.getData('isSlimeSpit')) {
          enemy.applySlow(0.35, 1800);
        }

        const pierce = (proj.getData('pierce') as number) || 0;
        if (pierce > 0) {
          proj.setData('pierce', pierce - 1);
        } else {
          if (projectilePool) {
            projectilePool.releaseProjectile(proj);
          } else {
            proj.destroy();
          }
        }

        if (enemy.sprite) {
          hazardSystem.flashSprite(scene, enemy.sprite, 0xffffff);
        }
      }
    });

    // 2. Player vs Enemies (Contact damage & Knockback)
    scene.physics.add.overlap(player.sprite!, enemiesGroup, (_p, enemyObj) => {
      const enemy = enemiesMap.get((enemyObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody).getData('entityId'));
      if (enemy && enemy.isAlive && !enemy.isExploding) {
        if (enemy.definition?.archetype === 'exploder') {
          hazardSystem.startExploderFuse(enemy, scene, (e) => hazardSystem.detonateExploder(e, ctx.getHazardCtx()));
          return;
        }
        if (enemy.sprite && player.sprite) {
          const angle = Phaser.Math.Angle.Between(player.x, player.y, enemy.x, enemy.y);
          enemy.applyKnockback(Math.cos(angle) * 220, Math.sin(angle) * 220, 160);
        }
        if (ctx.getPlayerIframeTimer() <= 0) {
          ctx.applyDamageToPlayer(enemy.stats.damage);
        }
      }
    });

    // 3. World Colliders
    scene.physics.add.collider(enemiesGroup, enemiesGroup);
    scene.physics.add.collider(player.sprite!, mapObjects.pillarsGroup);
    scene.physics.add.collider(enemiesGroup, mapObjects.pillarsGroup);
    scene.physics.add.collider(player.sprite!, mapObjects.barrelsGroup);
    scene.physics.add.collider(enemiesGroup, mapObjects.barrelsGroup);

    // 4. Projectiles vs Barrels
    scene.physics.add.overlap(projectilesGroup, mapObjects.barrelsGroup, (_proj, barrelObj) => {
      const barrel = barrelObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      if (!barrel.active) return;
      const bx = barrel.x;
      const by = barrel.y;
      barrel.destroy();
      const roll = Math.random();
      if (roll < 0.40) lootSystem.spawnGem(bx, by, 6, player.x, player.y);
      else if (roll < 0.70) lootSystem.spawnGoo(bx, by, Phaser.Math.Between(1, 2));
      else if (roll < 0.88) {
        player.health.heal(25);
        hud.updateHp(player.health.currentHp, player.stats.maxHp);
        eventBus.emit('player:healed', { currentHp: player.health.currentHp, maxHp: player.stats.maxHp, amount: 25 });
      } else lootSystem.pullAllGemsToPlayer(player.x, player.y);
    });

    // 5. Player vs Shrines & Loot Drops
    scene.physics.add.overlap(player.sprite!, mapObjects.shrinesGroup, (_p, shrineObj) => {
      const shrine = shrineObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      if (!shrine.active) return;
      const sx = shrine.x;
      const sy = shrine.y;
      const beacon = shrine.getData('beacon') as Phaser.GameObjects.GameObject | undefined;
      beacon?.destroy();
      const aura = shrine.getData('aura') as Phaser.GameObjects.GameObject | undefined;
      aura?.destroy();
      shrine.destroy();
      hazardSystem.triggerScreenWipeBlast(scene, sx, sy, ctx.getHazardCtx());
    });

    scene.physics.add.overlap(player.sprite!, lootSystem.gemsGroup, (_p, gemObj) => {
      const gem = gemObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      if (!gem.active) return;
      const xp = (gem.getData('xpValue') as number) || 3;
      lootSystem.releaseGem(gem);
      gameState.addXp(xp);
      audio.playXpPickup();
    });

    scene.physics.add.overlap(player.sprite!, lootSystem.gooDropsGroup, (_p, gooObj) => {
      const drop = gooObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      if (!drop.active) return;
      const val = (drop.getData('gooValue') as number) || 1;
      const gx = drop.x;
      const gy = drop.y;
      lootSystem.releaseGoo(drop);
      gameState.addGoo(val);
      lootSystem.showFloatText(gx, gy, `+${val} GOO`);
      audio.playGooPickup();
    });
  }
}
