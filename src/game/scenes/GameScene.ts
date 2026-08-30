import Phaser from 'phaser';
import { GameState } from '../core/GameState';
import { EventBus } from '../core/EventBus';
import { SaveManager } from '../core/SaveManager';
import { InputManager } from '../../input/InputManager';
import { HUD } from './ui/HUD';
import { LevelUpModal } from './ui/LevelUpModal';
import { GameOverModal } from './ui/GameOverModal';
import { PauseModal } from './ui/PauseModal';
import { GrimoireModal } from './ui/GrimoireModal';
import { DebugModal } from './ui/DebugModal';
import { CombatSystem } from '../combat/CombatSystem';
import { CollisionManager } from '../combat/CollisionManager';
import { SpawnManager } from '../spawning/SpawnManager';
import { EventDirector } from '../spawning/EventDirector';
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
  private inputManager!: InputManager; private hud!: HUD;
  private levelUpModal!: LevelUpModal; private gameOverModal!: GameOverModal;
  private pauseModal!: PauseModal; private grimoireModal!: GrimoireModal; private debugModal!: DebugModal;
  private combatSystem = new CombatSystem();
  private spawnManager!: SpawnManager;
  private eventDirector = new EventDirector();
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
    this.physics.resume(); this.cameras.main.resetFX(); this.gameState.reset(); this.weaponManager.reset();
    this.enemiesMap.clear(); this.enemyIdCounter = 0; this.isGamePaused = false; this.playerIframeTimerMs = 0; this.isDying = false;

    this.mapObjects = MapGenerator.createWorld(this, worldSize);
    this.enemiesGroup = this.physics.add.group();
    this.playerProjectilesGroup = this.physics.add.group();
    this.damageNumbersPool = new DamageNumberPool(this);
    this.projectilePool = new ProjectilePool(this, this.playerProjectilesGroup);
    this.vfxPool = new VfxPool(this);
    this.lootSystem = new LootSystem(this, this.damageNumbersPool);

    const { playerEntity, currentHero } = HeroFactory.createPlayer(this, worldSize / 2, worldSize / 2, this.gameState, this.saveManager);
    this.playerEntity = playerEntity; this.currentHero = currentHero;

    this.inputManager = new InputManager(this); this.inputManager.init();
    this.hud = new HUD(this); this.hud.updateHp(this.playerEntity.health.currentHp, this.playerEntity.stats.maxHp);
    this.gameOverModal = new GameOverModal(this);
    this.pauseModal = new PauseModal(this);
    this.grimoireModal = new GrimoireModal(this);
    this.debugModal = new DebugModal(this);

    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard?.on('keydown-P', () => this.togglePause());
    const onKey = (e: KeyboardEvent) => {
      const isF2 = e.key === 'F2';
      const isTilde = e.code === 'Backquote' || e.key === '`' || e.key === '~' || e.key === 'ё' || e.key === 'Ё';
      const isCombo = (e.altKey && e.shiftKey && (e.key === 'D' || e.key === 'd' || e.key === 'В' || e.key === 'в')) ||
                      (e.ctrlKey && e.altKey && (e.key === 'D' || e.key === 'd' || e.key === 'В' || e.key === 'в'));
      if (isF2 || isTilde || isCombo) {
        e.preventDefault(); e.stopPropagation(); this.debugModal.toggle(this.getDebugCtx());
      }
    };
    window.addEventListener('keydown', onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener('keydown', onKey));

    const onLvlDone = () => {
      if (this.gameState.pendingLevelUps > 0) this.levelUpModal.show();
      else { this.isGamePaused = false; this.physics.resume(); this.inputManager.setEnabled(true); this.playerIframeTimerMs = 650; }
    };
    this.levelUpModal = new LevelUpModal(this,
      (upgrade, lvl) => {
        this.gameState.applyUpgrade(upgrade, this.playerEntity.stats, this.playerEntity.health, lvl);
        onLvlDone(); this.hud.updateHp(this.playerEntity.health.currentHp, this.playerEntity.stats.maxHp);
      },
      () => { if (this.gameState.pendingLevelUps > 0) this.gameState.pendingLevelUps--; onLvlDone(); }
    );

    this.spawnManager = new SpawnManager(
      () => ({ x: this.playerEntity.x, y: this.playerEntity.y, vx: this.playerEntity.sprite?.body?.velocity.x ?? 0, vy: this.playerEntity.sprite?.body?.velocity.y ?? 0 }),
      (def, x, y, scaling, isChamp) => {
        const id = `enemy_${++this.enemyIdCounter}`;
        this.enemiesMap.set(id, EnemyFactory.createEnemy(this.enemiesGroup, def, x, y, id, scaling, isChamp));
        this.eventBus.emit('enemy:spawned', { id, x, y });
      },
      () => ({ halfW: this.cameras.main.width / (2 * this.cameras.main.zoom), halfH: this.cameras.main.height / (2 * this.cameras.main.zoom) }),
      () => this.enemiesMap.size, () => this.gameState.getPowerScore()
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
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.scale.off('resize', onResize); this.shutdown(); });
    this.audio.init(); this.audio.startBgm(); this.eventBus.emit('run:started');
  }

  private setupEvents(): void {
    this.unbindEvents.push(
      this.eventBus.on('enemy:died', (data) => this.onEnemyDied(data)),
      this.eventBus.on('ui:pause_requested', () => this.togglePause()),
      this.eventBus.on('ui:secret_debug_requested', () => this.debugModal.toggle(this.getDebugCtx())),
      this.eventBus.on('player:levelUp', () => this.onPlayerLevelUp()),
      this.eventBus.on('player:died', () => this.triggerPlayerDeath())
    );
  }

  private onEnemyDied(data: { id: string; x: number; y: number; xpValue: number }): void {
    const enemy = this.enemiesMap.get(data.id);
    if (!enemy) return;
    if (enemy.definition?.archetype === 'exploder') {
      this.hazardSystem.detonateExploder(enemy, this.getHazardCtx());
    } else {
      this.vfxPool.spawnEnemyDeath(data.x, data.y, (enemy.definition?.displayScale ?? 0.3) * (enemy.isChampion ? 1.8 : 1.2));
      this.lootSystem.spawnGem(data.x, data.y, enemy.isChampion ? data.xpValue * 3 : data.xpValue, this.playerEntity.x, this.playerEntity.y);
      if (enemy.isChampion) {
        this.lootSystem.spawnChest(data.x, data.y);
        this.lootSystem.spawnGoo(data.x, data.y, 4);
      } else if (enemy.definition?.archetype === 'boss') this.lootSystem.spawnGoo(data.x, data.y, 25);
      else if (enemy.type === 'boss' || (enemy.definition?.stats.maxHp ?? 0) >= 150) this.lootSystem.spawnGoo(data.x, data.y, 5);
      else if (Math.random() < 0.16) this.lootSystem.spawnGoo(data.x, data.y, 1);
      if (enemy.sprite) this.enemiesGroup.remove(enemy.sprite, false, false);
      enemy.destroy();
      this.enemiesMap.delete(data.id);
    }
    if (this.gameState.playerModifiers.healOnKill > 0 && this.playerEntity.isAlive && this.playerEntity.health.percent < 1 && this.gameState.playerModifiers.healOnKillTimerMs <= 0) {
      const healAmt = this.gameState.playerModifiers.healOnKill;
      this.gameState.playerModifiers.healOnKillTimerMs = this.gameState.playerModifiers.healOnKillCooldownMs || 1000;
      this.playerEntity.health.heal(healAmt);
      this.hud.updateHp(this.playerEntity.health.currentHp, this.playerEntity.stats.maxHp);
      this.eventBus.emit('player:healed', { currentHp: this.playerEntity.health.currentHp, maxHp: this.playerEntity.stats.maxHp, amount: healAmt });
    }
    if (this.currentHero?.id === 'hero_markovka') this.heroTraitSystem.onEnemyKilledByMarkovka(this.getTraitCtx());
  }

  private onPlayerLevelUp(): void {
    this.isGamePaused = true; this.physics.pause(); this.inputManager.setEnabled(false);
    this.playerEntity.sprite?.setVelocity(0, 0);
    (this.enemiesGroup.getChildren() as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[]).forEach((s) => s.body?.setVelocity(0, 0));
    (this.playerProjectilesGroup.getChildren() as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[]).forEach((s) => s.body?.setVelocity(0, 0));
    this.audio.playLevelUp(); this.levelUpModal.show();
  }

  private togglePause(): void {
    if (this.isDying || this.gameOverModal.isVisible || this.levelUpModal.isVisible) return;
    if (this.grimoireModal.isVisible) { this.grimoireModal.hide(); this.showPauseModal(); return; }
    if (this.pauseModal.isVisible) this.resumeGame();
    else this.pauseGame();
  }

  private pauseGame(): void {
    this.isGamePaused = true; this.physics.pause(); this.inputManager.setEnabled(false);
    this.playerEntity.sprite?.setVelocity(0, 0);
    (this.enemiesGroup.getChildren() as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[]).forEach((s) => s.body?.setVelocity(0, 0));
    (this.playerProjectilesGroup.getChildren() as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[]).forEach((s) => s.body?.setVelocity(0, 0));
    this.showPauseModal();
  }

  private showPauseModal(): void {
    this.pauseModal.show({
      onResume: () => this.resumeGame(), onGrimoire: () => this.grimoireModal.show(() => this.showPauseModal()),
      onRestart: () => { this.pauseModal.clear(); this.scene.restart(); }, onMenu: () => { this.pauseModal.clear(); this.scene.start('MenuScene'); },
    });
  }

  private resumeGame(): void {
    this.pauseModal.clear(); this.grimoireModal.hide(); this.isGamePaused = false; this.physics.resume(); this.inputManager.setEnabled(true);
  }

  private getDebugCtx() {
    return {
      scene: this, player: this.playerEntity, gameState: this.gameState, spawnManager: this.spawnManager,
      lootSystem: this.lootSystem, enemiesMap: this.enemiesMap, combatSystem: this.combatSystem, hud: this.hud,
      pauseGame: () => { this.isGamePaused = true; this.physics.pause(); this.inputManager.setEnabled(false); },
      resumeGame: () => { this.isGamePaused = false; this.physics.resume(); this.inputManager.setEnabled(true); },
    };
  }

  private getHazardCtx() {
    return {
      scene: this, player: this.playerEntity, enemiesMap: this.enemiesMap, lootSystem: this.lootSystem,
      applyDamageToPlayer: (dmg: number) => this.applyDamageToPlayer(dmg),
      applyAreaDamageToEnemies: (x: number, y: number, r: number, dmg: number) =>
        this.combatSystem.applyAreaDamage(this.playerEntity, this.enemiesMap, x, y, r, dmg, undefined, (e) => { if (e.sprite) this.hazardSystem.flashSprite(this, e.sprite, 0xffffff); }),
    };
  }

  private getTraitCtx() {
    return {
      scene: this, player: this.playerEntity, gameState: this.gameState, lootSystem: this.lootSystem,
      applyAreaDamage: (x: number, y: number, r: number, dmg: number) =>
        this.combatSystem.applyAreaDamage(this.playerEntity, this.enemiesMap, x, y, r, dmg, undefined, (e) => { if (e.sprite) this.hazardSystem.flashSprite(this, e.sprite, 0xffffff); }),
    };
  }

  private applyDamageToPlayer(dmg: number): void {
    if (!this.playerEntity.isAlive || this.playerIframeTimerMs > 0 || this.isDying) return;
    this.playerIframeTimerMs = 220;
    const effectiveDmg = Math.max(1, Math.round(dmg * (12 / (12 + (this.playerEntity.stats.armor || 0))) * (1 - (this.gameState.playerModifiers.damageReductionPercent || 0))));
    this.playerEntity.health.takeDamage(effectiveDmg); this.audio.playPlayerHurt();

    const sprite = this.playerEntity.sprite;
    if (sprite?.active && this.playerEntity.isAlive) {
      const heroPrefix = this.currentHero?.id === 'hero_markovka' ? 'markovka' : 'vypolzok';
      if (this.anims.exists(`${heroPrefix}_anim_hurt`)) sprite.play(`${heroPrefix}_anim_hurt`);
      sprite.setData('isHurt', true);
      this.time.delayedCall(160, () => {
        if (sprite.active && this.playerEntity.isAlive) {
          sprite.setData('isHurt', false);
          const mv = this.inputManager.getMovementVector();
          const anim = mv.x !== 0 || mv.y !== 0 ? `${heroPrefix}_anim_run` : `${heroPrefix}_anim_idle`;
          if (this.anims.exists(anim)) sprite.play(anim, true);
        }
      });
    }

    this.eventBus.emit('player:damaged', { currentHp: this.playerEntity.health.currentHp, maxHp: this.playerEntity.stats.maxHp, damage: dmg });
    if (sprite) {
      this.hazardSystem.flashSprite(this, sprite, 0xff4444);
      this.tweens.add({ targets: sprite, alpha: { from: 1.0, to: 0.4 }, duration: 55, repeat: 3, yoyo: true });
    }
    this.platform.vibrate(50);

    if (!this.playerEntity.isAlive || this.playerEntity.health.currentHp <= 0) {
      if (this.gameState.playerModifiers.cheatDeathUnlocked && !this.gameState.playerModifiers.cheatDeathUsed) {
        this.gameState.playerModifiers.cheatDeathUsed = true;
        this.playerEntity.health.currentHp = Math.round(this.playerEntity.stats.maxHp * 0.5);
        this.hud.updateHp(this.playerEntity.health.currentHp, this.playerEntity.stats.maxHp);
        this.playerIframeTimerMs = 1500;
        this.hazardSystem.triggerScreenWipeBlast(this, this.playerEntity.x, this.playerEntity.y, this.getHazardCtx());
        this.lootSystem.showFloatText(this.playerEntity.x, this.playerEntity.y - 30, 'ВТОРОЙ ШАНС!', '#facc15');
        return;
      }
      this.triggerPlayerDeath();
    }
  }

  private triggerPlayerDeath(): void {
    if (this.isDying) return;
    this.isDying = true; this.inputManager?.setEnabled(false);
    this.audio.stopBgm(); this.audio.playPlayerDeath(); this.platform.vibrate(250); this.gameState.endRun(false);

    try {
      this.saveManager.recordRunResult({
        timeSurvived: Math.floor(this.gameState.runTime), kills: this.gameState.kills,
        score: this.gameState.score, gooEarned: this.gameState.gooCollected, won: false,
      });
    } catch (e) { console.warn('[GameScene] Error recording run result:', e); }

    const sprite = this.playerEntity.sprite;
    if (sprite?.active) {
      sprite.setVelocity(0, 0);
      const heroPrefix = this.currentHero?.id === 'hero_markovka' ? 'markovka' : 'vypolzok';
      if (this.anims.exists(`${heroPrefix}_anim_dead`)) sprite.play(`${heroPrefix}_anim_dead`);
      else this.tweens.add({ targets: sprite, angle: 90, scaleX: sprite.scaleX * 1.3, scaleY: sprite.scaleY * 0.6, alpha: 0.5, duration: 350, ease: 'Bounce.easeOut' });
    }
    this.lootSystem.showFloatText(this.playerEntity.x, this.playerEntity.y - 30, 'РАЗДАВЛЕН!', '#ef4444');
    this.cameras.main.stopFollow(); this.cameras.main.shake(350, 0.02); this.physics.pause();
    this.time.delayedCall(450, () => this.gameOverModal.show(false));
  }

  override update(_time: number, delta: number): void {
    if (this.isGamePaused || !this.playerEntity.isAlive || this.isDying) return;

    const deltaSeconds = delta / 1000;
    this.gameState.updateTime(deltaSeconds);
    this.hud.update(this.gameState);

    if (this.playerIframeTimerMs > 0) this.playerIframeTimerMs -= delta;
    if (this.gameState.playerModifiers.healOnKillTimerMs > 0) this.gameState.playerModifiers.healOnKillTimerMs -= delta;
    if (this.gameState.playerModifiers.hpRegenPerSec > 0 && this.playerEntity.health.percent < 1) {
      this.playerEntity.health.heal(this.gameState.playerModifiers.hpRegenPerSec * deltaSeconds);
      this.hud.updateHp(this.playerEntity.health.currentHp, this.playerEntity.stats.maxHp);
    }
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
        const heroPrefix = this.currentHero?.id === 'hero_markovka' ? 'markovka' : 'vypolzok';
        const targetAnim = isMoving ? `${heroPrefix}_anim_run` : `${heroPrefix}_anim_idle`;
        if (this.anims.exists(targetAnim)) sprite.play(targetAnim, true);
      }
    }

    this.heroTraitSystem.update(delta, isMoving, this.getTraitCtx(), this.currentHero?.id || 'hero_vypolzok');
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

    this.lootSystem.update(deltaSeconds, this.playerEntity.x, this.playerEntity.y, this.gameState.playerModifiers, this.gameState.level, this.playerEntity.effectiveSpeed);
    if (!this.debugModal?.isSpawnPaused) {
      this.spawnManager.update(delta, this.gameState.runTime);
      this.eventDirector.update(this.gameState.runTime, { scene: this, spawnManager: this.spawnManager, lootSystem: this.lootSystem, audio: this.audio, getPlayerPos: () => ({ x: this.playerEntity.x, y: this.playerEntity.y }) });
    }
    this.hazardSystem.update(delta, this.getHazardCtx());
  }

  private shutdown(): void {
    this.unbindEvents.forEach((u) => u());
    this.unbindEvents = [];
    this.audio.stopBgm();
    this.hud?.destroy(); this.levelUpModal?.destroy(); this.gameOverModal?.clear(); this.pauseModal?.destroy();
    this.grimoireModal?.destroy(); this.debugModal?.destroy(); this.inputManager.destroy();
    this.lootSystem.clear(); this.hazardSystem.clear(); this.heroTraitSystem.clear(); this.eventDirector.reset();
    this.projectilePool?.clear(); this.damageNumbersPool?.clear(); this.vfxPool?.clear(); this.weaponManager.reset();
  }
}
