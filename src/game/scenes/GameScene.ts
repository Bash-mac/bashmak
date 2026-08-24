import Phaser from 'phaser';
import { GameState } from '../core/GameState';
import { EventBus } from '../core/EventBus';
import { SaveManager } from '../core/SaveManager';
import { InputManager } from '../../input/InputManager';
import { HUD } from './ui/HUD';
import { LevelUpModal } from './ui/LevelUpModal';
import { CombatSystem } from '../combat/CombatSystem';
import { SpawnManager, type EnemyScaling } from '../spawning/SpawnManager';
import { Entity } from '../entities/Entity';
import { getHeroById } from '../data/heroes';
import type { EnemyDefinition, HeroDefinition } from '../data/definitions';
import { createPlatformAdapter } from '../../platform';
import { MapGenerator, type MapObjects } from '../map/MapGenerator';
import { WeaponManager } from '../combat/WeaponManager';
import { EnemyAISystem } from '../ai/EnemyAISystem';
import { LootSystem } from '../loot/LootSystem';
import { AudioManager } from '../audio/AudioManager';

interface AcidPool {
  sprite: Phaser.GameObjects.Sprite;
  x: number;
  y: number;
  radius: number;
  damage: number;
  isPlayerPool: boolean;
  timeLeftMs: number;
  tickCooldown: number;
}

export class GameScene extends Phaser.Scene {
  private inputManager!: InputManager;
  private hud!: HUD;
  private levelUpModal!: LevelUpModal;
  private combatSystem!: CombatSystem;
  private spawnManager!: SpawnManager;
  private gameState!: GameState;
  private saveManager = SaveManager.getInstance();
  private eventBus = EventBus.getInstance();
  private platform = createPlatformAdapter();
  private audio = AudioManager.getInstance();

  // Subsystems
  private weaponManager!: WeaponManager;
  private enemyAISystem!: EnemyAISystem;
  private lootSystem!: LootSystem;
  private mapObjects!: MapObjects;

  // Entities & Physics Groups
  private playerEntity!: Entity;
  private enemiesMap: Map<string, Entity> = new Map();
  private enemyIdCounter = 0;
  private enemiesGroup!: Phaser.Physics.Arcade.Group;
  private playerProjectilesGroup!: Phaser.Physics.Arcade.Group;

  // Visual Effects & Pools
  private acidPools: AcidPool[] = [];
  private slimeTrailSegments: Array<{ sprite: Phaser.GameObjects.Sprite; x: number; y: number; timeLeftMs: number }> = [];
  private slimeDropTimerMs = 0;

  // Scene state
  private isGamePaused = false;
  private playerIframeTimerMs = 0;
  private isDying = false;
  private unbindEvents: Array<() => void> = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const worldSize = 4000;
    this.gameState = GameState.getInstance();
    this.gameState.reset();
    this.enemiesMap.clear();
    this.enemyIdCounter = 0;
    this.acidPools = [];
    this.isGamePaused = false;
    this.playerIframeTimerMs = 0;
    this.isDying = false;

    // 1. World & Map Generation
    this.mapObjects = MapGenerator.createWorld(this, worldSize);

    // 2. Physics Groups & Subsystems
    this.enemiesGroup = this.physics.add.group();
    this.playerProjectilesGroup = this.physics.add.group();
    this.weaponManager = new WeaponManager();
    this.enemyAISystem = new EnemyAISystem();
    this.lootSystem = new LootSystem(this);
    this.combatSystem = new CombatSystem();

    // 3. Player Setup
    this.createPlayer(worldSize / 2, worldSize / 2);

    // 4. UI & Input
    this.inputManager = new InputManager(this);
    this.inputManager.init();
    this.hud = new HUD(this);

    this.levelUpModal = new LevelUpModal(this, (upgrade, levelToApply) => {
      this.gameState.applyUpgrade(upgrade, this.playerEntity.stats, this.playerEntity.health, levelToApply);
      if (this.gameState.pendingLevelUps > 0) {
        this.levelUpModal.show();
      } else {
        this.isGamePaused = false;
        this.physics.resume();
      }
      this.hud.updateHp(this.playerEntity.health.currentHp, this.playerEntity.stats.maxHp);
    });

    // 5. Spawning & Camera
    this.spawnManager = new SpawnManager(
      () => ({
        x: this.playerEntity.x,
        y: this.playerEntity.y,
        vx: this.playerEntity.sprite?.body ? this.playerEntity.sprite.body.velocity.x : 0,
        vy: this.playerEntity.sprite?.body ? this.playerEntity.sprite.body.velocity.y : 0,
      }),
      (def, x, y, scaling) => this.spawnEnemy(def, x, y, scaling)
    );

    if (this.playerEntity.sprite) {
      this.cameras.main.startFollow(this.playerEntity.sprite, true, 0.1, 0.1);
      this.cameras.main.setBounds(0, 0, worldSize, worldSize);
    }

    // 6. Collisions & Events
    this.setupCollisions();
    this.setupEvents();

    const onGameResize = (gameSize: Phaser.Structs.Size) => {
      this.hud?.resize(gameSize.width, gameSize.height);
    };
    this.scale.on('resize', onGameResize);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', onGameResize);
      this.shutdown();
    }, this);

    this.audio.init();
    this.audio.startBgm();

    this.eventBus.emit('run:started');
  }

  private currentHero!: HeroDefinition;

  private createPlayer(x: number, y: number): void {
    const heroId = this.saveManager.getSelectedHeroId();
    this.currentHero = getHeroById(heroId);
    this.registry.set('selectedHeroId', heroId);

    const textureKey = this.currentHero.textureKey || 'vypolzok_idle_1';
    const sprite = this.physics.add.sprite(x, y, textureKey);
    sprite.setScale(0.72);
    sprite.setCollideWorldBounds(true);
    sprite.setCircle(24, 40, 56);
    sprite.setDepth(10);

    const isWormTexture = textureKey.startsWith('vypolzok') || textureKey.startsWith('tony');
    if (isWormTexture && this.anims.exists('vypolzok_anim_idle')) {
      sprite.play('vypolzok_anim_idle');
    }

    this.playerEntity = new Entity({
      id: 'player',
      type: 'hero',
      stats: { ...this.currentHero.stats },
      sprite,
    });

    // 1. Apply Hero Starting Weapon
    this.gameState.applyStartingWeapon(this.currentHero.startingWeaponId);

    // 2. Apply Hero Unique Trait
    if (this.currentHero.trait?.apply) {
      this.currentHero.trait.apply(
        this.gameState.playerModifiers,
        this.playerEntity.stats
      );
    }

    // 3. Apply Meta-Progression Permanent PowerUps
    this.saveManager.applyToPlayerStats(
      this.playerEntity.stats,
      this.playerEntity.health,
      this.gameState.playerModifiers
    );
  }

  private spawnEnemy(definition: EnemyDefinition, x: number, y: number, scaling?: EnemyScaling): void {
    const id = `enemy_${++this.enemyIdCounter}`;
    const sprite = this.enemiesGroup.create(x, y, definition.textureKey) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    sprite.setCollideWorldBounds(true);
    sprite.setCircle(definition.size / 2);
    sprite.setData('entityId', id);
    sprite.setDepth(8);

    const hpMult = scaling?.hpMultiplier ?? 1.0;
    const dmgMult = scaling?.damageMultiplier ?? 1.0;
    const spdMult = scaling?.speedMultiplier ?? 1.0;

    const scaledMaxHp = Math.round(definition.stats.maxHp * hpMult);
    const scaledDamage = Math.round(definition.stats.damage * dmgMult);
    const scaledSpeed = Math.round(definition.stats.speed * spdMult);

    const enemyEntity = new Entity({
      id,
      type: definition.archetype === 'boss' ? 'boss' : 'enemy',
      stats: {
        ...definition.stats,
        maxHp: scaledMaxHp,
        damage: scaledDamage,
        speed: scaledSpeed,
      },
      sprite,
      definition,
    });

    this.enemiesMap.set(id, enemyEntity);
    this.eventBus.emit('enemy:spawned', { id, x, y });
  }

  public spawnAcidPool(x: number, y: number, radius: number, damage: number, durationMs: number, isPlayer: boolean): void {
    if (this.acidPools.length >= 6) {
      const old = this.acidPools.shift();
      old?.sprite.destroy();
    }

    const sprite = this.add.sprite(x, y, 'vfx_acid_pool_1');
    sprite.setDisplaySize(radius * 2, radius * 2);
    sprite.setAlpha(0.85);
    sprite.setDepth(3);

    if (this.anims.exists('vfx_anim_acid_pool')) {
      sprite.play('vfx_anim_acid_pool');
    }

    this.acidPools.push({
      sprite,
      x,
      y,
      radius,
      damage,
      isPlayerPool: isPlayer,
      timeLeftMs: durationMs,
      tickCooldown: 500,
    });
  }

  private setupCollisions(): void {
    // 1. Player Projectiles vs Enemies
    this.physics.add.overlap(
      this.playerProjectilesGroup,
      this.enemiesGroup,
      (projObj, enemyObj) => {
        const proj = projObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        const enemySprite = enemyObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        const enemyId = enemySprite.getData('entityId') as string;
        const enemy = this.enemiesMap.get(enemyId);

        if (enemy && enemy.isAlive && !enemy.isExploding && proj.active) {
          const rawDamage = (proj.getData('damage') as number) || 10;
          this.combatSystem.applyDamage(this.playerEntity, enemy, rawDamage);

          // Spawn Gross-out Impact Splat VFX
          if (this.anims.exists('vfx_anim_impact_splat')) {
            const splat = this.add.sprite(proj.x, proj.y, 'vfx_impact_splat_1').setDepth(12);
            splat.setScale(0.75);
            splat.play('vfx_anim_impact_splat');
            splat.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => splat.destroy());
          }

          const isSlimeSpit = proj.getData('isSlimeSpit') as boolean;
          if (isSlimeSpit) {
            enemy.applySlow(0.35, 1800);
            if (Math.random() < 0.60) {
              this.spawnAcidPool(proj.x, proj.y, 32, 5, 2200, true);
            }
          }

          let pierce = (proj.getData('pierce') as number) || 0;
          if (pierce > 0) {
            proj.setData('pierce', pierce - 1);
          } else {
            proj.destroy();
          }

          this.flashSprite(enemySprite, 0xffffff);
        }
      },
      undefined,
      this
    );

    // 2. Player vs Enemies (Contact damage & Knockback)
    this.physics.add.overlap(
      this.playerEntity.sprite!,
      this.enemiesGroup,
      (_playerObj, enemyObj) => {
        const enemySprite = enemyObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        const enemyId = enemySprite.getData('entityId') as string;
        const enemy = this.enemiesMap.get(enemyId);

        if (enemy && enemy.isAlive && !enemy.isExploding) {
          if (enemy.definition?.archetype === 'exploder') {
            this.startExploderFuse(enemy);
            return;
          }

          if (enemy.sprite && this.playerEntity.sprite) {
            const angle = Phaser.Math.Angle.Between(this.playerEntity.x, this.playerEntity.y, enemy.x, enemy.y);
            enemy.applyKnockback(Math.cos(angle) * 220, Math.sin(angle) * 220, 160);
          }

          if (this.playerIframeTimerMs <= 0) {
            this.applyDamageToPlayer(enemy.stats.damage);
          }
        }
      },
      undefined,
      this
    );

    // 3. Environment & Colliders
    this.physics.add.collider(this.enemiesGroup, this.enemiesGroup);
    this.physics.add.collider(this.playerEntity.sprite!, this.mapObjects.pillarsGroup);
    this.physics.add.collider(this.enemiesGroup, this.mapObjects.pillarsGroup);
    this.physics.add.collider(this.playerEntity.sprite!, this.mapObjects.barrelsGroup);
    this.physics.add.collider(this.enemiesGroup, this.mapObjects.barrelsGroup);

    // 4. Projectiles vs Barrels
    this.physics.add.overlap(
      this.playerProjectilesGroup,
      this.mapObjects.barrelsGroup,
      (_projObj, barrelObj) => {
        const barrel = barrelObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        if (!barrel.active) return;
        const bx = barrel.x;
        const by = barrel.y;
        barrel.destroy();

        const roll = Math.random();
        if (roll < 0.40) {
          this.lootSystem.spawnGem(bx, by, 6);
        } else if (roll < 0.70) {
          this.lootSystem.spawnGoo(bx, by, Phaser.Math.Between(1, 2));
        } else if (roll < 0.88) {
          this.playerEntity.health.heal(25);
          this.hud.updateHp(this.playerEntity.health.currentHp, this.playerEntity.stats.maxHp);
          this.eventBus.emit('player:healed', {
            currentHp: this.playerEntity.health.currentHp,
            maxHp: this.playerEntity.stats.maxHp,
            amount: 25,
          });
        } else {
          this.lootSystem.pullAllGemsToPlayer(this.playerEntity.x, this.playerEntity.y);
        }
      },
      undefined,
      this
    );

    // 5. Player vs Shrines
    this.physics.add.overlap(
      this.playerEntity.sprite!,
      this.mapObjects.shrinesGroup,
      (_playerObj, shrineObj) => {
        const shrine = shrineObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        if (!shrine.active) return;
        const sx = shrine.x;
        const sy = shrine.y;
        shrine.destroy();
        this.triggerScreenWipeBlast(sx, sy);
      },
      undefined,
      this
    );

    // 6. Player vs XP Gems
    this.physics.add.overlap(
      this.playerEntity.sprite!,
      this.lootSystem.gemsGroup,
      (_playerObj, gemObj) => {
        const gem = gemObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        const xp = (gem.getData('xpValue') as number) || 3;
        gem.destroy();
        this.gameState.addXp(xp);
        this.audio.playXpPickup();
      },
      undefined,
      this
    );

    // 7. Player vs GOO Drops
    this.physics.add.overlap(
      this.playerEntity.sprite!,
      this.lootSystem.gooDropsGroup,
      (_playerObj, gooObj) => {
        const drop = gooObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        const val = (drop.getData('gooValue') as number) || 1;
        const gx = drop.x;
        const gy = drop.y;
        drop.destroy();
        this.gameState.addGoo(val);
        this.lootSystem.showFloatText(gx, gy, `+${val} GOO`);
        this.audio.playGooPickup();
      },
      undefined,
      this
    );
  }

  private setupEvents(): void {
    this.unbindEvents.push(
      this.eventBus.on('enemy:died', (data) => {
        const enemy = this.enemiesMap.get(data.id);
        if (enemy && !enemy.isExploding) {
          if (enemy.definition?.archetype === 'exploder') {
            this.detonateExploder(enemy);
          } else {
            this.lootSystem.spawnGem(data.x, data.y, data.xpValue);

            if (enemy.definition?.archetype === 'boss') {
              this.lootSystem.spawnGoo(data.x, data.y, 25);
            } else if (enemy.type === 'boss' || (enemy.definition?.stats.maxHp ?? 0) >= 150) {
              this.lootSystem.spawnGoo(data.x, data.y, 5);
            } else if (Math.random() < 0.16) {
              this.lootSystem.spawnGoo(data.x, data.y, 1);
            }

            enemy.destroy();
            this.enemiesMap.delete(data.id);

            // Markovka: Kill-Streak Snowball trait
            if (this.currentHero?.id === 'hero_markovka') {
              const mods = this.gameState.playerModifiers;
              mods.killStreakStacks = Math.min(10, (mods.killStreakStacks || 0) + 1);
              mods.killStreakTimerMs = 4500;
              this.playerEntity.applySpeedBoost(1.0 + mods.killStreakStacks * 0.03, 4500);
              if (mods.killStreakStacks === 10) {
                this.lootSystem.showFloatText(this.playerEntity.x, this.playerEntity.y - 25, '🥕 MEGA CARROT READY!', '#f97316');
              }
            }
          }
        }
      }),

      this.eventBus.on('player:levelUp', () => {
        this.isGamePaused = true;
        this.physics.pause();
        this.playerEntity.sprite?.setVelocity(0, 0);
        (this.enemiesGroup.getChildren() as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[]).forEach((s) => s.body?.setVelocity(0, 0));
        (this.playerProjectilesGroup.getChildren() as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[]).forEach((s) => s.body?.setVelocity(0, 0));
        this.audio.playLevelUp();
        this.levelUpModal.show();
      })
    );
  }

  private applyDamageToPlayer(dmg: number): void {
    if (!this.playerEntity.isAlive || this.playerIframeTimerMs > 0 || this.isDying) return;

    this.playerIframeTimerMs = 500;
    this.playerEntity.health.takeDamage(dmg);
    this.audio.playPlayerHurt();

    const sprite = this.playerEntity.sprite;
    if (sprite && sprite.active && this.playerEntity.isAlive) {
      if (this.anims.exists('vypolzok_anim_hurt')) {
        sprite.play('vypolzok_anim_hurt');
      }
      sprite.setData('isHurt', true);
      this.time.delayedCall(300, () => {
        if (sprite.active && this.playerEntity.isAlive) {
          sprite.setData('isHurt', false);
          const mv = this.inputManager.getMovementVector();
          if (this.anims.exists('vypolzok_anim_run')) {
            sprite.play(mv.x !== 0 || mv.y !== 0 ? 'vypolzok_anim_run' : 'vypolzok_anim_idle', true);
          }
        }
      });
    }

    this.eventBus.emit('player:damaged', {
      currentHp: this.playerEntity.health.currentHp,
      maxHp: this.playerEntity.stats.maxHp,
      damage: dmg,
    });

    this.flashSprite(this.playerEntity.sprite!, 0xff4444);
    this.platform.vibrate(50);

    if (this.playerEntity.sprite) {
      this.tweens.add({
        targets: this.playerEntity.sprite,
        alpha: { from: 0.4, to: 1.0 },
        duration: 70,
        repeat: 3,
        yoyo: true,
      });
    }

    if (!this.playerEntity.isAlive) {
      if (this.gameState.playerModifiers.cheatDeathUnlocked && !this.gameState.playerModifiers.cheatDeathUsed) {
        this.gameState.playerModifiers.cheatDeathUsed = true;
        this.playerEntity.health.currentHp = Math.round(this.playerEntity.stats.maxHp * 0.5);
        this.hud.updateHp(this.playerEntity.health.currentHp, this.playerEntity.stats.maxHp);
        this.playerIframeTimerMs = 1500;
        this.triggerScreenWipeBlast(this.playerEntity.x, this.playerEntity.y);
        this.lootSystem.showFloatText(this.playerEntity.x, this.playerEntity.y - 30, '💀 SECOND CHANCE!', '#facc15');
        return;
      }
      this.triggerPlayerDeath();
    }
  }

  private triggerPlayerDeath(): void {
    if (this.isDying) return;
    this.isDying = true;
    this.audio.stopBgm();
    this.gameState.endRun(false);

    try {
      this.saveManager.recordRunResult({
        timeSurvived: Math.floor(this.gameState.runTime),
        kills: this.gameState.kills,
        score: this.gameState.score,
        gooEarned: this.gameState.gooCollected,
        won: false,
      });
    } catch (e) {
      console.warn('[GameScene] Error recording run result:', e);
    }

    const sprite = this.playerEntity.sprite;
    if (sprite && sprite.active) {
      sprite.setVelocity(0, 0);
      if (this.anims.exists('vypolzok_anim_dead')) {
        sprite.play('vypolzok_anim_dead');
      } else {
        sprite.setAngle(90);
        sprite.setAlpha(0.6);
      }
    }

    this.cameras.main.stopFollow();
    this.physics.pause();

    // Transition cleanly to ResultScene after death animation
    this.time.delayedCall(450, () => {
      this.cameras.main.resetFX();
      this.scene.start('ResultScene');
    });
  }

  public applyAreaDamageToEnemies(x: number, y: number, radius: number, dmg: number, excludeId?: string): void {
    const enemies = Array.from(this.enemiesMap.values());
    for (const enemy of enemies) {
      if (enemy.id !== excludeId && enemy.isAlive && !enemy.isExploding) {
        const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
        if (dist <= radius) {
          this.combatSystem.applyDamage(this.playerEntity, enemy, dmg);
          if (enemy.sprite) {
            this.flashSprite(enemy.sprite, 0xffffff);
          }
        }
      }
    }
  }

  private startExploderFuse(enemy: Entity): void {
    if (enemy.isExploding) return;
    enemy.isExploding = true;

    this.time.delayedCall(600, () => {
      this.detonateExploder(enemy);
    });

    if (enemy.sprite) {
      enemy.sprite.setVelocity(0, 0);
      this.tweens.add({
        targets: enemy.sprite,
        scaleX: 1.4,
        scaleY: 1.4,
        duration: 200,
        yoyo: true,
        repeat: 2,
        ease: 'Quad.easeInOut',
      });
      this.flashSprite(enemy.sprite, 0xff0000);
    }
  }

  private detonateExploder(enemy: Entity): void {
    if (!enemy.sprite) return;
    const x = enemy.x;
    const y = enemy.y;
    const radius = 90;
    const dmg = Math.round(enemy.stats.damage * 1.5);

    enemy.destroy();
    this.enemiesMap.delete(enemy.id);
    this.audio.playExplosion();

    const shockwave = this.add.circle(x, y, radius, 0xdc2626, 0.7).setDepth(11);
    this.tweens.add({
      targets: shockwave,
      alpha: 0,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 250,
      onComplete: () => shockwave.destroy(),
    });

    const distToPlayer = Phaser.Math.Distance.Between(x, y, this.playerEntity.x, this.playerEntity.y);
    if (distToPlayer <= radius && this.playerEntity.isAlive) {
      this.applyDamageToPlayer(dmg);
    }

    this.lootSystem.spawnGem(x, y, enemy.definition?.xpReward ?? 6);
    this.applyAreaDamageToEnemies(x, y, radius, dmg);
  }

  private triggerScreenWipeBlast(x: number, y: number): void {
    this.audio.playExplosion();
    const blastGfx = this.add.graphics().setDepth(12);
    blastGfx.lineStyle(6, 0xfacc15, 1);
    blastGfx.fillStyle(0xa855f7, 0.4);
    blastGfx.fillCircle(x, y, 380);
    blastGfx.strokeCircle(x, y, 380);

    this.tweens.add({
      targets: blastGfx,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 450,
      onComplete: () => blastGfx.destroy(),
    });

    this.applyAreaDamageToEnemies(x, y, 380, 250);
    this.platform.vibrate(60);
  }

  public flashSprite(sprite: Phaser.GameObjects.Sprite, tintColor: number): void {
    if (!sprite || !sprite.active) return;
    sprite.setTint(tintColor);
    this.time.delayedCall(80, () => {
      if (sprite && sprite.active) {
        sprite.clearTint();
      }
    });
  }

  override update(_time: number, delta: number): void {
    if (this.isGamePaused || !this.playerEntity.isAlive || this.isDying) return;

    const deltaSeconds = delta / 1000;
    this.gameState.updateTime(deltaSeconds);
    this.hud.update(this.gameState);

    if (this.playerIframeTimerMs > 0) {
      this.playerIframeTimerMs -= delta;
    }

    // 1. Player Movement & Status
    this.playerEntity.updateStatusEffects(delta);
    const moveVector = this.inputManager.getMovementVector();
    const isMoving = moveVector.x !== 0 || moveVector.y !== 0;
    const speed = this.playerEntity.effectiveSpeed;

    if (this.playerEntity.sprite?.body) {
      if (this.playerEntity.knockbackTimer > 0) {
        this.playerEntity.sprite.setVelocity(this.playerEntity.knockbackVx, this.playerEntity.knockbackVy);
      } else {
        this.playerEntity.sprite.setVelocity(moveVector.x * speed, moveVector.y * speed);
      }

      if (moveVector.x < 0) this.playerEntity.sprite.setFlipX(true);
      else if (moveVector.x > 0) this.playerEntity.sprite.setFlipX(false);

      const sprite = this.playerEntity.sprite;
      if (!sprite.getData('isHurt') && !sprite.getData('isAttacking')) {
        const isWorm = (this.currentHero?.textureKey?.startsWith('vypolzok') || this.currentHero?.textureKey?.startsWith('tony')) ?? true;
        if (isWorm && this.anims.exists('vypolzok_anim_run')) {
          sprite.play(isMoving ? 'vypolzok_anim_run' : 'vypolzok_anim_idle', true);
        }
      }
    }

    this.handleHeroTraits(delta, isMoving);

    // 2. AI & Enemies
    this.enemyAISystem.update(delta, {
      scene: this,
      player: this.playerEntity,
      enemiesMap: this.enemiesMap,
      spawnManager: this.spawnManager,
      onExploderTrigger: (e) => this.startExploderFuse(e),
      flashSprite: (s, c) => this.flashSprite(s, c),
    });

    // 3. Weapons & Combat
    this.weaponManager.update(delta, {
      scene: this,
      player: this.playerEntity,
      gameState: this.gameState,
      combatSystem: this.combatSystem,
      projectilesGroup: this.playerProjectilesGroup,
      enemiesMap: this.enemiesMap,
      flashSprite: (s, c) => this.flashSprite(s, c),
      vibrate: (ms) => this.platform.vibrate(ms),
      spawnAcidPool: (x, y, r, dmg, dur, isP) => this.spawnAcidPool(x, y, r, dmg, dur, isP),
    });

    // 4. Loot & Magnet
    this.lootSystem.update(
      deltaSeconds,
      this.playerEntity.x,
      this.playerEntity.y,
      this.gameState.playerModifiers,
      this.gameState.level
    );

    // 5. Spawning, Pools & Slime Trail
    this.spawnManager.update(delta, this.gameState.runTime);
    this.handleAcidPools(delta);
    this.handleSlimeTrail(delta, isMoving);
  }

  private handleSlimeTrail(delta: number, isMoving: boolean): void {
    const mods = this.gameState.playerModifiers;
    if (!mods.hasSlimeTrail) return;

    if (isMoving) {
      this.slimeDropTimerMs += delta;
      if (this.slimeDropTimerMs >= 130) {
        this.slimeDropTimerMs = 0;
        const trailKey = `vfx_slime_trail_${Phaser.Math.Between(1, 5)}`;
        const sprite = this.add.sprite(this.playerEntity.x, this.playerEntity.y + 12, trailKey);
        sprite.setScale(0.85);
        sprite.setAlpha(0.8);
        sprite.setDepth(2);

        this.slimeTrailSegments.push({
          sprite,
          x: this.playerEntity.x,
          y: this.playerEntity.y + 12,
          timeLeftMs: 3800,
        });

        if (this.slimeTrailSegments.length > 35) {
          const oldest = this.slimeTrailSegments.shift();
          oldest?.sprite.destroy();
        }
      }
    }

    let onTrail = false;
    const px = this.playerEntity.x;
    const py = this.playerEntity.y;

    for (let i = this.slimeTrailSegments.length - 1; i >= 0; i--) {
      const seg = this.slimeTrailSegments[i];
      seg.timeLeftMs -= delta;

      if (seg.timeLeftMs <= 0) {
        seg.sprite.destroy();
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
      this.playerEntity.applySpeedBoost(1.2, 180);
    }
  }

  private handleHeroTraits(delta: number, isMoving: boolean): void {
    const heroId = this.currentHero?.id || 'hero_worm';
    const mods = this.gameState.playerModifiers;

    // 1. Bashmak: Heavy Step (Stand Your Ground)
    if (heroId === 'hero_bashmak') {
      if (!isMoving) {
        mods.standStillTimerMs += delta;
        if (mods.standStillTimerMs >= 1400 && !mods.standStillBonusActive) {
          mods.standStillBonusActive = true;
          this.lootSystem.showFloatText(this.playerEntity.x, this.playerEntity.y - 25, '🛡️ STANDING GROUND! (+50% DMG)', '#facc15');
        }
      } else {
        if (mods.standStillBonusActive) {
          mods.standStillBonusActive = false;
          mods.standStillTimerMs = 0;
          this.playerEntity.applySlow(0.25, 1200); // Heavy start penalty
        } else {
          mods.standStillTimerMs = 0;
        }
      }
    }

    // 2. Markovka: Speed Thirst Kill-Streak Decay
    if (heroId === 'hero_markovka') {
      if (mods.killStreakTimerMs > 0) {
        mods.killStreakTimerMs -= delta;
        if (mods.killStreakTimerMs <= 0) {
          mods.killStreakStacks = 0;
        }
      }
    }

    // 3. Baklazhan: Momentum Ram Charge
    if (heroId === 'hero_baklazhan') {
      if (isMoving) {
        mods.straightRunTimerMs += delta;
        mods.momentumSpeedBonus = Math.min(0.40, (mods.straightRunTimerMs / 2200) * 0.40);
        this.playerEntity.applySpeedBoost(1.0 + mods.momentumSpeedBonus, 150);

        if (mods.momentumSpeedBonus >= 0.25) {
          this.applyAreaDamageToEnemies(this.playerEntity.x, this.playerEntity.y, 44, 18);
        }
      } else {
        mods.straightRunTimerMs = 0;
        mods.momentumSpeedBonus = 0;
      }
    }
  }

  private handleAcidPools(delta: number): void {
    for (let i = this.acidPools.length - 1; i >= 0; i--) {
      const pool = this.acidPools[i];
      pool.timeLeftMs -= delta;
      pool.tickCooldown -= delta;

      if (pool.timeLeftMs <= 0) {
        pool.sprite.destroy();
        this.acidPools.splice(i, 1);
        continue;
      }

      if (pool.tickCooldown <= 0) {
        pool.tickCooldown = 500;
        if (pool.isPlayerPool) {
          this.applyAreaDamageToEnemies(pool.x, pool.y, pool.radius, pool.damage);
        }
      }
    }
  }

  private shutdown(): void {
    this.unbindEvents.forEach((unbind) => unbind());
    this.unbindEvents = [];
    this.audio.stopBgm();
    this.inputManager.destroy();
    this.lootSystem.clear();
    this.acidPools.forEach((p) => p.sprite.destroy());
    this.acidPools = [];
    this.slimeTrailSegments.forEach((s) => s.sprite.destroy());
    this.slimeTrailSegments = [];
  }
}
