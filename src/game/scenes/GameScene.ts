import Phaser from 'phaser';
import { GameState } from '../core/GameState';
import { EventBus } from '../core/EventBus';
import { SaveManager } from '../core/SaveManager';
import { InputManager } from '../../input/InputManager';
import { HUD } from './ui/HUD';
import { LevelUpModal } from './ui/LevelUpModal';
import { GameOverModal } from './ui/GameOverModal';
import { CombatSystem } from '../combat/CombatSystem';
import { CollisionManager } from '../combat/CollisionManager';
import { SpawnManager } from '../spawning/SpawnManager';
import { EnemyFactory } from '../spawning/EnemyFactory';
import { HeroFactory } from '../entities/HeroFactory';
import type { Entity } from '../entities/Entity';
import type { HeroDefinition } from '../data/definitions';
import { createPlatformAdapter } from '../../platform';
import { MapGenerator, type MapObjects } from '../map/MapGenerator';
import { WeaponManager } from '../combat/WeaponManager';
import { EnemyAISystem } from '../ai/EnemyAISystem';
import { LootSystem } from '../loot/LootSystem';
import { HazardSystem } from '../map/HazardSystem';
import { HeroTraitSystem } from '../traits/HeroTraitSystem';
import { AudioManager } from '../audio/AudioManager';
import { ProjectilePool } from '../combat/ProjectilePool';
import { DamageNumberPool } from '../combat/DamageNumberPool';
import { VfxPool } from '../combat/VfxPool';

export class GameScene extends Phaser.Scene {
  private inputManager!: InputManager;
  private hud!: HUD;
  private levelUpModal!: LevelUpModal;
  private gameOverModal!: GameOverModal;
  private combatSystem = new CombatSystem();
  private spawnManager!: SpawnManager;
  private weaponManager = new WeaponManager();
  private enemyAISystem = new EnemyAISystem();
  private lootSystem!: LootSystem;
  private hazardSystem = new HazardSystem();
  private heroTraitSystem = new HeroTraitSystem();
  private projectilePool!: ProjectilePool;
  private damageNumbersPool!: DamageNumberPool;
  private vfxPool!: VfxPool;
  private mapObjects!: MapObjects;

  private gameState = GameState.getInstance();
  private saveManager = SaveManager.getInstance();
  private eventBus = EventBus.getInstance();
  private platform = createPlatformAdapter();
  private audio = AudioManager.getInstance();

  private playerEntity!: Entity;
  private currentHero!: HeroDefinition;
  private enemiesMap: Map<string, Entity> = new Map();
  private enemyIdCounter = 0;
  private enemiesGroup!: Phaser.Physics.Arcade.Group;
  private playerProjectilesGroup!: Phaser.Physics.Arcade.Group;

  private isGamePaused = false;
  private playerIframeTimerMs = 0;
  private isDying = false;
  private unbindEvents: Array<() => void> = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const worldSize = 4000;
    this.physics.resume();
    this.cameras.main.resetFX();
    this.gameState.reset();
    this.weaponManager.reset();
    this.enemiesMap.clear();
    this.enemyIdCounter = 0;
    this.isGamePaused = false;
    this.playerIframeTimerMs = 0;
    this.isDying = false;

    this.mapObjects = MapGenerator.createWorld(this, worldSize);
    this.enemiesGroup = this.physics.add.group();
    this.playerProjectilesGroup = this.physics.add.group();

    this.damageNumbersPool = new DamageNumberPool(this);
    this.projectilePool = new ProjectilePool(this, this.playerProjectilesGroup);
    this.vfxPool = new VfxPool(this);
    this.lootSystem = new LootSystem(this, this.damageNumbersPool);

    const { playerEntity, currentHero } = HeroFactory.createPlayer(this, worldSize / 2, worldSize / 2, this.gameState, this.saveManager);
    this.playerEntity = playerEntity;
    this.currentHero = currentHero;

    this.inputManager = new InputManager(this);
    this.inputManager.init();
    this.hud = new HUD(this);
    this.gameOverModal = new GameOverModal(this);

    this.levelUpModal = new LevelUpModal(this, (upgrade, levelToApply) => {
      this.gameState.applyUpgrade(upgrade, this.playerEntity.stats, this.playerEntity.health, levelToApply);
      if (this.gameState.pendingLevelUps > 0) this.levelUpModal.show();
      else { this.isGamePaused = false; this.physics.resume(); this.inputManager.setEnabled(true); }
      this.hud.updateHp(this.playerEntity.health.currentHp, this.playerEntity.stats.maxHp);
    });

    this.spawnManager = new SpawnManager(
      () => ({ x: this.playerEntity.x, y: this.playerEntity.y, vx: this.playerEntity.sprite?.body?.velocity.x ?? 0, vy: this.playerEntity.sprite?.body?.velocity.y ?? 0 }),
      (def, x, y, scaling) => {
        const id = `enemy_${++this.enemyIdCounter}`;
        const enemy = EnemyFactory.createEnemy(this.enemiesGroup, def, x, y, id, scaling);
        this.enemiesMap.set(id, enemy);
        this.eventBus.emit('enemy:spawned', { id, x, y });
      },
      () => ({ halfW: this.cameras.main.width / (2 * this.cameras.main.zoom), halfH: this.cameras.main.height / (2 * this.cameras.main.zoom) })
    );

    if (this.playerEntity.sprite) {
      this.cameras.main.startFollow(this.playerEntity.sprite, true, 0.1, 0.1);
      this.cameras.main.setBounds(0, 0, worldSize, worldSize);
    }

    CollisionManager.setup({
      scene: this, player: this.playerEntity, enemiesMap: this.enemiesMap, enemiesGroup: this.enemiesGroup,
      projectilesGroup: this.playerProjectilesGroup, mapObjects: this.mapObjects, combatSystem: this.combatSystem,
      lootSystem: this.lootSystem, hazardSystem: this.hazardSystem, gameState: this.gameState, eventBus: this.eventBus,
      hud: this.hud, audio: this.audio, projectilePool: this.projectilePool, damageNumbers: this.damageNumbersPool,
      vfxPool: this.vfxPool, getPlayerIframeTimer: () => this.playerIframeTimerMs, applyDamageToPlayer: (dmg) => this.applyDamageToPlayer(dmg),
      getHazardCtx: () => this.getHazardCtx(),
    });

    this.setupEvents();
    const onResize = (gameSize: Phaser.Structs.Size) => this.hud?.resize(gameSize.width, gameSize.height);
    this.scale.on('resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', onResize);
      this.shutdown();
    });

    this.audio.init();
    this.audio.startBgm();
    this.eventBus.emit('run:started');
  }

  private setupEvents(): void {
    this.unbindEvents.push(
      this.eventBus.on('enemy:died', (data) => {
        const enemy = this.enemiesMap.get(data.id);
        if (enemy && !enemy.isExploding) {
          if (enemy.definition?.archetype === 'exploder') {
            this.hazardSystem.detonateExploder(enemy, this.getHazardCtx());
          } else {
            this.lootSystem.spawnGem(data.x, data.y, data.xpValue, this.playerEntity.x, this.playerEntity.y);
            if (enemy.definition?.archetype === 'boss') this.lootSystem.spawnGoo(data.x, data.y, 25);
            else if (enemy.type === 'boss' || (enemy.definition?.stats.maxHp ?? 0) >= 150) this.lootSystem.spawnGoo(data.x, data.y, 5);
            else if (Math.random() < 0.16) this.lootSystem.spawnGoo(data.x, data.y, 1);
            enemy.destroy();
            this.enemiesMap.delete(data.id);
            if (this.currentHero?.id === 'hero_markovka') this.heroTraitSystem.onEnemyKilledByMarkovka(this.getTraitCtx());
          }
        }
      }),
      this.eventBus.on('player:levelUp', () => {
        this.isGamePaused = true;
        this.physics.pause();
        this.inputManager.setEnabled(false);
        this.playerEntity.sprite?.setVelocity(0, 0);
        (this.enemiesGroup.getChildren() as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[]).forEach((s) => s.body?.setVelocity(0, 0));
        (this.playerProjectilesGroup.getChildren() as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[]).forEach((s) => s.body?.setVelocity(0, 0));
        this.audio.playLevelUp();
        this.levelUpModal.show();
      }),
      this.eventBus.on('player:died', () => this.triggerPlayerDeath())
    );
  }

  private getHazardCtx() {
    return {
      scene: this, player: this.playerEntity, enemiesMap: this.enemiesMap, lootSystem: this.lootSystem,
      applyDamageToPlayer: (dmg: number) => this.applyDamageToPlayer(dmg),
      applyAreaDamageToEnemies: (x: number, y: number, r: number, dmg: number) =>
        this.combatSystem.applyAreaDamage(this.playerEntity, this.enemiesMap, x, y, r, dmg, undefined, (e) => {
          if (e.sprite) this.hazardSystem.flashSprite(this, e.sprite, 0xffffff);
        }),
    };
  }

  private getTraitCtx() {
    return {
      scene: this, player: this.playerEntity, gameState: this.gameState, lootSystem: this.lootSystem,
      applyAreaDamage: (x: number, y: number, r: number, dmg: number) =>
        this.combatSystem.applyAreaDamage(this.playerEntity, this.enemiesMap, x, y, r, dmg, undefined, (e) => {
          if (e.sprite) this.hazardSystem.flashSprite(this, e.sprite, 0xffffff);
        }),
    };
  }

  private applyDamageToPlayer(dmg: number): void {
    if (!this.playerEntity.isAlive || this.playerIframeTimerMs > 0 || this.isDying) return;
    this.playerIframeTimerMs = 500;
    this.playerEntity.health.takeDamage(dmg);
    this.audio.playPlayerHurt();

    const sprite = this.playerEntity.sprite;
    if (sprite?.active && this.playerEntity.isAlive) {
      if (this.currentHero?.id === 'hero_worm' && this.anims.exists('vypolzok_anim_hurt')) sprite.play('vypolzok_anim_hurt');
      sprite.setData('isHurt', true);
      this.time.delayedCall(300, () => {
        if (sprite.active && this.playerEntity.isAlive) {
          sprite.setData('isHurt', false);
          const mv = this.inputManager.getMovementVector();
          if (this.currentHero?.id === 'hero_worm' && this.anims.exists('vypolzok_anim_run')) {
            sprite.play(mv.x !== 0 || mv.y !== 0 ? 'vypolzok_anim_run' : 'vypolzok_anim_idle', true);
          }
        }
      });
    }

    this.eventBus.emit('player:damaged', { currentHp: this.playerEntity.health.currentHp, maxHp: this.playerEntity.stats.maxHp, damage: dmg });
    if (sprite) {
      this.hazardSystem.flashSprite(this, sprite, 0xff4444);
      this.tweens.add({ targets: sprite, alpha: { from: 0.4, to: 1.0 }, duration: 70, repeat: 3, yoyo: true });
    }
    this.platform.vibrate(50);

    if (!this.playerEntity.isAlive || this.playerEntity.health.currentHp <= 0) {
      if (this.gameState.playerModifiers.cheatDeathUnlocked && !this.gameState.playerModifiers.cheatDeathUsed) {
        this.gameState.playerModifiers.cheatDeathUsed = true;
        this.playerEntity.health.currentHp = Math.round(this.playerEntity.stats.maxHp * 0.5);
        this.hud.updateHp(this.playerEntity.health.currentHp, this.playerEntity.stats.maxHp);
        this.playerIframeTimerMs = 1500;
        this.hazardSystem.triggerScreenWipeBlast(this, this.playerEntity.x, this.playerEntity.y, this.getHazardCtx());
        this.lootSystem.showFloatText(this.playerEntity.x, this.playerEntity.y - 30, '💀 SECOND CHANCE!', '#facc15');
        return;
      }
      this.triggerPlayerDeath();
    }
  }

  private triggerPlayerDeath(): void {
    if (this.isDying) return;
    this.isDying = true;
    this.inputManager?.setEnabled(false);
    this.audio.stopBgm();
    this.audio.playPlayerDeath();
    this.platform.vibrate(250);
    this.gameState.endRun(false);

    try {
      this.saveManager.recordRunResult({
        timeSurvived: Math.floor(this.gameState.runTime), kills: this.gameState.kills,
        score: this.gameState.score, gooEarned: this.gameState.gooCollected, won: false,
      });
    } catch (e) {
      console.warn('[GameScene] Error recording run result:', e);
    }

    const sprite = this.playerEntity.sprite;
    if (sprite?.active) {
      sprite.setVelocity(0, 0);
      if (this.currentHero?.id === 'hero_worm' && this.anims.exists('vypolzok_anim_dead')) sprite.play('vypolzok_anim_dead');
      else this.tweens.add({ targets: sprite, angle: 90, scaleX: sprite.scaleX * 1.3, scaleY: sprite.scaleY * 0.6, alpha: 0.5, duration: 350, ease: 'Bounce.easeOut' });
    }

    this.lootSystem.showFloatText(this.playerEntity.x, this.playerEntity.y - 30, '💀 РАЗДАВЛЕН!', '#ef4444');
    this.cameras.main.stopFollow();
    this.cameras.main.shake(350, 0.02);
    this.physics.pause();
    this.time.delayedCall(450, () => this.gameOverModal.show(false));
  }

  override update(_time: number, delta: number): void {
    if (this.isGamePaused || !this.playerEntity.isAlive || this.isDying) return;

    const deltaSeconds = delta / 1000;
    this.gameState.updateTime(deltaSeconds);
    this.hud.update(this.gameState);

    if (this.playerIframeTimerMs > 0) this.playerIframeTimerMs -= delta;
    this.playerEntity.updateStatusEffects(delta, (poisonDmg) => this.applyDamageToPlayer(poisonDmg));

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
        if (isWorm && this.anims.exists('vypolzok_anim_run')) sprite.play(isMoving ? 'vypolzok_anim_run' : 'vypolzok_anim_idle', true);
      }
    }

    this.heroTraitSystem.update(delta, isMoving, this.getTraitCtx(), this.currentHero?.id || 'hero_worm');

    this.enemyAISystem.update(delta, {
      scene: this, player: this.playerEntity, enemiesMap: this.enemiesMap, spawnManager: this.spawnManager,
      onExploderTrigger: (e) => this.hazardSystem.startExploderFuse(e, this, (ex) => this.hazardSystem.detonateExploder(ex, this.getHazardCtx())),
      flashSprite: (_s, c) => this.hazardSystem.flashSprite(this, _s, c),
    });

    this.weaponManager.update(delta, {
      scene: this, player: this.playerEntity, gameState: this.gameState, combatSystem: this.combatSystem,
      projectilesGroup: this.playerProjectilesGroup, enemiesMap: this.enemiesMap, projectilePool: this.projectilePool,
      damageNumbers: this.damageNumbersPool, vfxPool: this.vfxPool,
      flashSprite: (s, c) => this.hazardSystem.flashSprite(this, s, c), vibrate: (ms) => this.platform.vibrate(ms),
      spawnAcidPool: (x, y, r, dmg, dur, isP) => this.hazardSystem.spawnAcidPool(this, x, y, r, dmg, dur, isP),
    });

    this.lootSystem.update(deltaSeconds, this.playerEntity.x, this.playerEntity.y, this.gameState.playerModifiers, this.gameState.level);
    this.spawnManager.update(delta, this.gameState.runTime);
    this.hazardSystem.update(delta, this.getHazardCtx());
  }

  private shutdown(): void {
    this.unbindEvents.forEach((unbind) => unbind());
    this.unbindEvents = [];
    this.audio.stopBgm();
    this.hud?.destroy();
    this.gameOverModal?.clear();
    this.inputManager.destroy();
    this.lootSystem.clear();
    this.hazardSystem.clear();
    this.heroTraitSystem.clear();
    this.projectilePool?.clear();
    this.damageNumbersPool?.clear();
    this.vfxPool?.clear();
    this.weaponManager.reset();
  }
}
