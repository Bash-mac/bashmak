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
import type { IPlatformAdapter } from '../../platform';
import { getReadyEvolution } from '../data/evolutions';

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
  platform?: IPlatformAdapter;
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
      audio,
      platform,
      projectilePool,
      damageNumbers,
      vfxPool,
    } = ctx;

    // 1. Projectiles vs Enemies
    scene.physics.add.overlap(projectilesGroup, enemiesGroup, (projObj, enemyObj) => {
      const proj = projObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      if (proj.getData('isToiletLid') || proj.getData('isEggplantBall')) {
        return;
      }
      const enemy = enemiesMap.get((enemyObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody).getData('entityId'));
      if (enemy && enemy.isAlive && proj.active) {
        const damage = (proj.getData('damage') as number) || 10;
        const isCrit = (proj.getData('isCrit') as boolean) || false;
        combatSystem.applyDamage(player, enemy, damage);

        audio.playImpactSplat(isCrit);
        if (isCrit) {
          if (platform?.hapticImpact) platform.hapticImpact('medium');
          else platform?.vibrate(35);
        }

        if (damageNumbers) {
          damageNumbers.showDamage(enemy.x, enemy.y, damage, isCrit);
        }

        if (vfxPool) {
          if (proj.getData('isCarrot')) {
            vfxPool.spawnCarrotSplat(proj.x, proj.y, 0.14);
          } else {
            vfxPool.spawnImpactSplat(proj.x, proj.y, 0.55);
          }
        } else if (scene.anims.exists('vfx_anim_impact_splat')) {
          const splat = scene.add.sprite(proj.x, proj.y, 'vfx_impact_splat_1').setDepth(12).setScale(0.55);
          splat.play('vfx_anim_impact_splat').once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => splat.destroy());
        }

        if (proj.getData('isSlimeSpit')) {
          enemy.applySlow(0.30, 1300);
          const splashRadius = 65 * (1 + (gameState.playerModifiers.attackAreaBonus || 0));
          const splashDmg = Math.max(4, Math.round(damage * 0.65));
          combatSystem.applyAreaDamage(player, enemiesMap, proj.x, proj.y, splashRadius, splashDmg, enemy.id, (splashEnemy) => {
            splashEnemy.applySlow(0.25, 1000);
            if (damageNumbers) damageNumbers.showDamage(splashEnemy.x, splashEnemy.y, splashDmg, false);
            if (splashEnemy.sprite) hazardSystem.flashSprite(scene, splashEnemy.sprite, 0x84cc16);
          });
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

    // 2. Player vs Enemies (Contact damage)
    scene.physics.add.overlap(player.sprite!, enemiesGroup, (_p, enemyObj) => {
      const enemy = enemiesMap.get((enemyObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody).getData('entityId'));
      if (enemy && enemy.isAlive && !enemy.isExploding) {
        if (enemy.definition?.archetype === 'exploder') {
          hazardSystem.startExploderFuse(enemy, scene, (e) => hazardSystem.detonateExploder(e, ctx.getHazardCtx()));
          return;
        }
        if (ctx.getPlayerIframeTimer() <= 0) {
          ctx.applyDamageToPlayer(enemy.stats.damage);
        }
      }
    });

    // 3. World Colliders (Player vs Obstacles only; enemies separation handled via spatial flocking in EnemyAISystem)
    scene.physics.add.collider(player.sprite!, mapObjects.pillarsGroup);
    scene.physics.add.collider(player.sprite!, mapObjects.barrelsGroup);

    // 4. Projectiles vs Barrels
    scene.physics.add.overlap(projectilesGroup, mapObjects.barrelsGroup, (_proj, barrelObj) => {
      const barrel = barrelObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      if (!barrel.active) return;
      const bx = barrel.x;
      const by = barrel.y;
      barrel.destroy();
      const roll = Math.random();
      if (roll < 0.35) lootSystem.spawnGem(bx, by, 8, player.x, player.y);
      else if (roll < 0.60) lootSystem.spawnGoo(bx, by, Phaser.Math.Between(1, 3));
      else lootSystem.spawnConsumable(bx, by);
    });

    // 5. Player vs Consumables (Armed pickups only)
    scene.physics.add.overlap(player.sprite!, lootSystem.consumablesGroup, (_p, itemObj) => {
      const item = itemObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      if (!item.active || !item.getData('armed')) return;
      const type = item.getData('consumableType') as 'nuke' | 'magnet' | 'freeze' | 'frenzy' | undefined;
      const ix = item.x;
      const iy = item.y;
      lootSystem.releaseConsumable(item);
      audio.playLevelUp();
      if (platform?.hapticNotification) platform.hapticNotification('success');

      if (type === 'nuke') {
        lootSystem.showFloatText(player.x, player.y - 40, 'ЯДЕРНЫЙ ВЗРЫВ!', '#ef4444');
        hazardSystem.triggerScreenWipeBlast(scene, ix, iy, ctx.getHazardCtx());
      } else if (type === 'magnet') {
        lootSystem.showFloatText(player.x, player.y - 40, 'ПЫЛЕСОС ЖИЖИ!', '#3b82f6');
        lootSystem.pullAllGemsToPlayer(player.x, player.y);
      } else if (type === 'freeze') {
        lootSystem.showFloatText(player.x, player.y - 40, 'АЗОТНАЯ ЗАМОРОЗКА!', '#06b6d4');
        for (const enemy of enemiesMap.values()) {
          if (enemy.isAlive && !enemy.isExploding && enemy.definition?.archetype !== 'boss') {
            enemy.applySlow(0.95, 4500);
            if (enemy.sprite) hazardSystem.flashSprite(scene, enemy.sprite, 0x67e8f9);
          }
        }
      } else if (type === 'frenzy') {
        lootSystem.showFloatText(player.x, player.y - 40, 'БЕРСЕРК!', '#f59e0b');
        gameState.playerModifiers.attackSpeedBonus += 0.50;
        player.stats.speed = (player.stats.speed || 170) * 1.35;
        scene.time.delayedCall(7000, () => {
          gameState.playerModifiers.attackSpeedBonus = Math.max(0, gameState.playerModifiers.attackSpeedBonus - 0.50);
          player.stats.speed = (player.stats.speed || 170) / 1.35;
        });
      }
    });

    // 6. Player vs Shrines & Loot Drops
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
      platform?.hapticSelection?.();
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
      platform?.hapticSelection?.();
    });

    scene.physics.add.overlap(player.sprite!, lootSystem.chestsGroup, (_p, chestObj) => {
      const chest = chestObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      if (!chest.active) return;
      const cx = chest.x;
      const cy = chest.y;
      lootSystem.releaseChest(chest);

      const readyEvo = getReadyEvolution(gameState);
      if (readyEvo) {
        readyEvo.apply(gameState);
        audio.playLevelUp();
        if (platform?.hapticNotification) platform.hapticNotification('success');
        lootSystem.showFloatText(cx, cy - 25, `${readyEvo.name.toUpperCase()}!`, '#facc15');
        hazardSystem.triggerScreenWipeBlast(scene, cx, cy, ctx.getHazardCtx());
      } else {
        gameState.pendingLevelUps++;
        eventBus.emit('player:levelUp', { newLevel: gameState.level });
        audio.playLevelUp();
        if (platform?.hapticNotification) platform.hapticNotification('success');
        lootSystem.showFloatText(cx, cy - 25, 'СУНДУК МУТАЦИИ!', '#facc15');
      }

      const gooCount = Phaser.Math.Between(3, 5);
      lootSystem.spawnGoo(cx, cy, gooCount);
      gameState.addXp(50);
    });
  }
}
