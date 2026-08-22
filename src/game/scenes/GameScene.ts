import Phaser from 'phaser';
import { GameState } from '../core/GameState';
import { EventBus } from '../core/EventBus';
import { InputManager } from '../../input/InputManager';
import { HUD } from './ui/HUD';
import { LevelUpModal } from './ui/LevelUpModal';
import { CombatSystem } from '../combat/CombatSystem';
import { SpawnManager, type EnemyScaling } from '../spawning/SpawnManager';
import { Entity } from '../entities/Entity';
import { WORM_HERO } from '../data/heroes';
import type { EnemyDefinition } from '../data/definitions';
import { createPlatformAdapter } from '../../platform';

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
  private eventBus = EventBus.getInstance();
  private platform = createPlatformAdapter();

  // Entities
  private playerEntity!: Entity;
  private enemiesMap: Map<string, Entity> = new Map();
  private enemyIdCounter = 0;

  // Physics Groups
  private enemiesGroup!: Phaser.Physics.Arcade.Group;
  private playerProjectilesGroup!: Phaser.Physics.Arcade.Group;
  private gemsGroup!: Phaser.Physics.Arcade.Group;
  private barrelsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private pillarsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private shrinesGroup!: Phaser.Physics.Arcade.Group;

  // Acid Pools
  private acidPools: AcidPool[] = [];

  // Worm Passive: «Извиватель»
  private movingTimerMs = 0;
  private isWriggleCharged = false;
  private wriggleAura?: Phaser.GameObjects.Graphics;
  private wriggleDashTimer = 0;

  // Attacks & Counters (Megabonk Arsenal)
  private attackTimer = 0;
  private boneAttackTimer = 0;
  private totalPlayerAttacks = 0;
  private staticZapCurrent = 0;
  private acidTrailTimer = 0;
  private zapGraphics?: Phaser.GameObjects.Graphics;

  // Boss state
  private bossDashTimer = 0;
  private isBossDashing = false;
  private isBossVulnerable = false;
  private bossTelegraphGfx?: Phaser.GameObjects.Graphics;

  // Game state
  private isGamePaused = false;
  private playerIframeTimerMs = 0;
  private isDying = false;
  private unbindEvents: Array<() => void> = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.gameState = GameState.getInstance();
    this.gameState.reset();
    this.enemiesMap.clear();
    this.enemyIdCounter = 0;
    this.acidPools = [];
    this.movingTimerMs = 0;
    this.isWriggleCharged = false;
    this.totalPlayerAttacks = 0;
    this.isGamePaused = false;
    this.playerIframeTimerMs = 0;
    this.isDying = false;
    this.staticZapCurrent = 0;
    this.boneAttackTimer = 0;
    this.acidTrailTimer = 0;

    // 1. World & Floor
    const worldSize = 4000;
    this.physics.world.setBounds(0, 0, worldSize, worldSize);
    this.add.tileSprite(0, 0, worldSize, worldSize, 'tex_floor').setOrigin(0, 0);

    // 2. Physics Groups
    this.enemiesGroup = this.physics.add.group();
    this.playerProjectilesGroup = this.physics.add.group();
    this.gemsGroup = this.physics.add.group();
    this.barrelsGroup = this.physics.add.staticGroup();
    this.pillarsGroup = this.physics.add.staticGroup();
    this.shrinesGroup = this.physics.add.group();

    // 3. Player Setup (Worm)
    this.createPlayer(worldSize / 2, worldSize / 2);

    // 3.5 Procedural Map Objects
    this.generateMapObjects(worldSize);

    // 4. Visual effects
    this.wriggleAura = this.add.graphics().setDepth(5);
    this.bossTelegraphGfx = this.add.graphics().setDepth(6);
    this.zapGraphics = this.add.graphics().setDepth(15);

    // 5. Systems
    this.combatSystem = new CombatSystem();
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

    this.spawnManager = new SpawnManager(
      () => ({
        x: this.playerEntity.x,
        y: this.playerEntity.y,
        vx: this.playerEntity.sprite?.body ? this.playerEntity.sprite.body.velocity.x : 0,
        vy: this.playerEntity.sprite?.body ? this.playerEntity.sprite.body.velocity.y : 0,
      }),
      (def, x, y, scaling) => this.spawnEnemy(def, x, y, scaling)
    );

    // 6. Camera Follow
    if (this.playerEntity.sprite) {
      this.cameras.main.startFollow(this.playerEntity.sprite, true, 0.1, 0.1);
      this.cameras.main.setBounds(0, 0, worldSize, worldSize);
    }

    // 7. Collisions & Events
    this.setupCollisions();
    this.setupEvents();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);

    this.eventBus.emit('run:started');
  }

  private createPlayer(x: number, y: number): void {
    const sprite = this.physics.add.sprite(x, y, 'pose_idle');
    sprite.setScale(0.35);
    sprite.setCollideWorldBounds(true);
    sprite.setCircle(38, 70, 20);
    sprite.setDepth(10);

    this.playerEntity = new Entity({
      id: 'player',
      type: 'hero',
      stats: WORM_HERO.stats,
      sprite,
    });
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

  private spawnGem(x: number, y: number, value: number): void {
    const gem = this.gemsGroup.create(x, y, 'tex_gem') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    gem.setCircle(8);
    gem.setData('xpValue', value);
    gem.setData('speed', 0);
    gem.setDepth(4);
  }

  private spawnAcidPool(x: number, y: number, radius: number, damage: number, durationMs: number, isPlayer: boolean): void {
    if (this.acidPools.length >= 6) {
      const old = this.acidPools.shift();
      old?.sprite.destroy();
    }

    const sprite = this.add.sprite(x, y, 'tex_acid_pool');
    sprite.setDisplaySize(radius * 2, radius * 2);
    sprite.setAlpha(0.6);
    sprite.setDepth(3);

    this.acidPools.push({
      sprite,
      x,
      y,
      radius,
      damage,
      isPlayerPool: isPlayer,
      timeLeftMs: durationMs,
      tickCooldown: 0,
    });
  }

  private setupCollisions(): void {
    // 1. Player Projectiles vs Enemies
    this.physics.add.overlap(
      this.playerProjectilesGroup,
      this.enemiesGroup,
      (projObj, enemyObj) => {
        const projectile = projObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        const enemySprite = enemyObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        const enemyId = enemySprite.getData('entityId') as string;
        const enemy = this.enemiesMap.get(enemyId);

        if (enemy && enemy.isAlive) {
          const dmg = projectile.getData('damage') as number;
          this.combatSystem.applyDamage(this.playerEntity, enemy, dmg);
          this.flashSprite(enemySprite, 0xffffff);

          // Knockback based on enemy mass
          if (enemySprite.body) {
            const mass = enemy.definition?.mass ?? 2;
            const vx = projectile.body?.velocity.x ?? 0;
            const vy = projectile.body?.velocity.y ?? 0;
            const knockAngle = Math.atan2(vy, vx);
            const knockForce = 50 / mass;
            enemySprite.setVelocity(
              enemySprite.body.velocity.x + Math.cos(knockAngle) * knockForce,
              enemySprite.body.velocity.y + Math.sin(knockAngle) * knockForce
            );
          }

          // Splash Damage
          const mods = this.gameState.playerModifiers;
          if (mods.splashPercent > 0) {
            this.applyAreaDamageToEnemies(enemy.x, enemy.y, 45, dmg * mods.splashPercent, enemy.id);
          }

          // Bouncing Bone Ricochet
          const bounces = (projectile.getData('bounces') as number) || 0;
          if (bounces > 0) {
            projectile.setData('bounces', bounces - 1);
            const otherTarget = this.findClosestEnemyExcluding(enemy.x, enemy.y, enemy.id);
            if (otherTarget) {
              const bAngle = Phaser.Math.Angle.Between(enemy.x, enemy.y, otherTarget.x, otherTarget.y);
              projectile.setVelocity(Math.cos(bAngle) * 480, Math.sin(bAngle) * 480);
            } else {
              projectile.setVelocity(-projectile.body.velocity.x, -projectile.body.velocity.y);
            }
            return;
          }

          // Piercing
          const pierce = (projectile.getData('pierce') as number) || 0;
          if (pierce > 0) {
            projectile.setData('pierce', pierce - 1);
          } else {
            projectile.destroy();
          }
        }
      },
      undefined,
      this
    );

    // 2. Enemy Contact vs Player (Respects I-Frames!)
    this.physics.add.overlap(
      this.playerEntity.sprite!,
      this.enemiesGroup,
      (_playerObj, enemyObj) => {
        const enemySprite = enemyObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        const enemyId = enemySprite.getData('entityId') as string;
        const enemy = this.enemiesMap.get(enemyId);

        if (enemy && enemy.isAlive && this.playerEntity.isAlive) {
          // Exploder fuse start
          if (enemy.definition?.archetype === 'exploder') {
            this.startExploderFuse(enemy);
            return;
          }

          // Knockback enemy slightly
          if (enemy.sprite && this.playerEntity.sprite) {
            const angle = Phaser.Math.Angle.Between(this.playerEntity.x, this.playerEntity.y, enemy.x, enemy.y);
            enemy.sprite.setVelocity(Math.cos(angle) * 140, Math.sin(angle) * 140);
          }

          // Only damage if I-frames expired
          if (this.playerIframeTimerMs <= 0) {
            this.applyDamageToPlayer(enemy.stats.damage);
          }
        }
      },
      undefined,
      this
    );

    // 3. Enemy vs Enemy soft separation
    this.physics.add.collider(this.enemiesGroup, this.enemiesGroup);

    // 4. Obstacle Pillars (Player & Enemies collide with pillars)
    this.physics.add.collider(this.playerEntity.sprite!, this.pillarsGroup);
    this.physics.add.collider(this.enemiesGroup, this.pillarsGroup);

    // 5. Breakable Barrels (Player & Enemies collide with barrels)
    this.physics.add.collider(this.playerEntity.sprite!, this.barrelsGroup);
    this.physics.add.collider(this.enemiesGroup, this.barrelsGroup);

    // 6. Player Projectiles vs Breakable Barrels
    this.physics.add.overlap(
      this.playerProjectilesGroup,
      this.barrelsGroup,
      (_projObj, barrelObj) => {
        const barrel = barrelObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        if (!barrel.active) return;
        const bx = barrel.x;
        const by = barrel.y;
        barrel.destroy();

        // Barrel drop chance
        const roll = Math.random();
        if (roll < 0.65) {
          this.spawnGem(bx, by, 6);
        } else if (roll < 0.85) {
          this.playerEntity.health.heal(25);
          this.hud.updateHp(this.playerEntity.health.currentHp, this.playerEntity.stats.maxHp);
          this.eventBus.emit('player:healed', {
            currentHp: this.playerEntity.health.currentHp,
            maxHp: this.playerEntity.stats.maxHp,
            amount: 25,
          });
        } else {
          this.pullAllGemsToPlayer();
        }
      },
      undefined,
      this
    );

    // 7. Player vs Power-Up Shrines
    this.physics.add.overlap(
      this.playerEntity.sprite!,
      this.shrinesGroup,
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

    // 8. Player vs Gems (Pickup)
    this.physics.add.overlap(
      this.playerEntity.sprite!,
      this.gemsGroup,
      (_playerObj, gemObj) => {
        const gem = gemObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        const xp = (gem.getData('xpValue') as number) || 3;
        gem.destroy();
        this.gameState.addXp(xp);
      },
      undefined,
      this
    );
  }

  private generateMapObjects(worldSize: number): void {
    const playerSpawnX = worldSize / 2;
    const playerSpawnY = worldSize / 2;

    // 1. Obstacle Pillars (35 pillars across the 4000x4000 map)
    for (let i = 0; i < 35; i++) {
      let px = Phaser.Math.Between(200, worldSize - 200);
      let py = Phaser.Math.Between(200, worldSize - 200);

      // Keep safe distance from spawn center
      while (Phaser.Math.Distance.Between(px, py, playerSpawnX, playerSpawnY) < 250) {
        px = Phaser.Math.Between(200, worldSize - 200);
        py = Phaser.Math.Between(200, worldSize - 200);
      }

      const pillar = this.pillarsGroup.create(px, py, 'tex_prop_pillar') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      pillar.setDepth(6);
      pillar.refreshBody();
    }

    // 2. Breakable Barrels in clusters of 3-5 (20 clusters)
    for (let c = 0; c < 22; c++) {
      let cx = Phaser.Math.Between(200, worldSize - 200);
      let cy = Phaser.Math.Between(200, worldSize - 200);

      if (Phaser.Math.Distance.Between(cx, cy, playerSpawnX, playerSpawnY) < 200) continue;

      const clusterSize = Phaser.Math.Between(3, 5);
      for (let b = 0; b < clusterSize; b++) {
        const bx = cx + (Math.random() - 0.5) * 80;
        const by = cy + (Math.random() - 0.5) * 80;
        const barrel = this.barrelsGroup.create(bx, by, 'tex_prop_barrel') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        barrel.setDepth(6);
        barrel.refreshBody();
      }
    }

    // 3. Power-Up Shrines (5 shrines)
    for (let s = 0; s < 5; s++) {
      let sx = Phaser.Math.Between(300, worldSize - 300);
      let sy = Phaser.Math.Between(300, worldSize - 300);

      if (Phaser.Math.Distance.Between(sx, sy, playerSpawnX, playerSpawnY) < 300) continue;

      const shrine = this.shrinesGroup.create(sx, sy, 'tex_prop_shrine') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      shrine.setDepth(7);

      // Pulse animation
      this.tweens.add({
        targets: shrine,
        scaleX: 1.15,
        scaleY: 1.15,
        duration: 800,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private pullAllGemsToPlayer(): void {
    const gems = this.gemsGroup.getChildren() as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[];
    const px = this.playerEntity.x;
    const py = this.playerEntity.y;
    for (const gem of gems) {
      if (gem.active) {
        gem.setData('speed', 700);
        const angle = Phaser.Math.Angle.Between(gem.x, gem.y, px, py);
        gem.setVelocity(Math.cos(angle) * 700, Math.sin(angle) * 700);
      }
    }
  }

  private triggerScreenWipeBlast(x: number, y: number): void {
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

    // Wipe all non-boss enemies in 380px radius
    this.applyAreaDamageToEnemies(x, y, 380, 250);
    this.platform.vibrate(60);
  }

  private applyDamageToPlayer(dmg: number): void {
    if (!this.playerEntity.isAlive || this.playerIframeTimerMs > 0 || this.isDying) return;

    this.playerIframeTimerMs = 600; // 0.6s invulnerability
    this.playerEntity.health.takeDamage(dmg);

    const sprite = this.playerEntity.sprite;
    if (sprite && sprite.active) {
      sprite.setTexture('pose_damaged');
      this.time.delayedCall(220, () => {
        if (sprite.active && sprite.texture.key === 'pose_damaged') {
          sprite.setTexture('pose_idle');
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

    // I-Frame blink
    if (this.playerEntity.sprite) {
      this.tweens.add({
        targets: this.playerEntity.sprite,
        alpha: { from: 0.35, to: 1.0 },
        duration: 75,
        repeat: 3,
        yoyo: true,
      });
    }

    if (!this.playerEntity.isAlive) {
      this.triggerPlayerDeath();
    }
  }

  private triggerPlayerDeath(): void {
    if (this.isDying) return;
    this.isDying = true;
    this.gameState.endRun(false);

    this.playerEntity.sprite?.setVelocity(0, 0);
    this.physics.pause();

    this.cameras.main.fade(700, 11, 14, 20, false, (_cam: any, progress: number) => {
      if (progress === 1) {
        this.scene.start('ResultScene');
      }
    });
  }

  private applyAreaDamageToEnemies(x: number, y: number, radius: number, dmg: number, excludeId?: string): void {
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

    // Guaranteed detonation timer regardless of tween pause
    this.time.delayedCall(600, () => {
      this.detonateExploder(enemy);
    });

    if (enemy.sprite) {
      enemy.sprite.setVelocity(0, 0);
      this.tweens.add({
        targets: enemy.sprite,
        scaleX: 1.35,
        scaleY: 1.35,
        duration: 150,
        yoyo: true,
        repeat: 3,
      });
    }
  }

  private detonateExploder(enemy: Entity): void {
    if (!this.enemiesMap.has(enemy.id)) return; // Prevent double detonation
    const x = enemy.x;
    const y = enemy.y;
    const radius = enemy.definition?.explosionRadius ?? 80;
    const dmg = enemy.definition?.explosionDamage ?? 22;

    this.enemiesMap.delete(enemy.id);
    enemy.destroy();

    const shockwave = this.add.graphics();
    shockwave.lineStyle(3, 0xfacc15, 1);
    shockwave.fillStyle(0xef4444, 0.4);
    shockwave.fillCircle(x, y, radius);
    shockwave.strokeCircle(x, y, radius);

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

    this.spawnGem(x, y, enemy.definition?.xpReward ?? 6);
    this.applyAreaDamageToEnemies(x, y, radius, dmg);
  }

  private setupEvents(): void {
    this.unbindEvents.push(
      this.eventBus.on('enemy:died', (data) => {
        const enemy = this.enemiesMap.get(data.id);
        if (enemy && !enemy.isExploding) {
          if (enemy.definition?.archetype === 'exploder') {
            this.detonateExploder(enemy);
          } else {
            this.spawnGem(data.x, data.y, data.xpValue);
            enemy.destroy();
            this.enemiesMap.delete(data.id);
          }
        }
      }),

      this.eventBus.on('player:levelUp', () => {
        this.isGamePaused = true;
        this.physics.pause();
        this.playerEntity.sprite?.setVelocity(0, 0);
        (this.enemiesGroup.getChildren() as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[]).forEach((sprite) => {
          if (sprite?.body) sprite.body.setVelocity(0, 0);
        });
        (this.playerProjectilesGroup.getChildren() as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[]).forEach((sprite) => {
          if (sprite?.body) sprite.body.setVelocity(0, 0);
        });
        this.levelUpModal.show();
      })
    );
  }

  private flashSprite(sprite: Phaser.GameObjects.Sprite, tintColor: number): void {
    if (!sprite || !sprite.active) return;
    sprite.setTint(tintColor);
    this.time.delayedCall(90, () => {
      if (sprite.active) {
        sprite.clearTint();
      }
    });
  }

  update(_time: number, delta: number): void {
    if (this.isGamePaused || !this.playerEntity.isAlive || this.gameState.isGameOver || this.isDying) return;

    if (this.playerIframeTimerMs > 0) {
      this.playerIframeTimerMs -= delta;
    }

    const deltaSeconds = delta / 1000;
    this.gameState.updateTime(deltaSeconds);

    // Passive HP Regen
    const mods = this.gameState.playerModifiers;
    if (mods.hpRegenPerSec > 0 && this.playerEntity.health.currentHp < this.playerEntity.stats.maxHp) {
      this.playerEntity.health.heal(mods.hpRegenPerSec * deltaSeconds);
    }

    // Low HP Fire Aura (Hot Blood Lv.3+)
    if (mods.fireAuraLowHp && this.playerEntity.health.percent < 0.35) {
      this.applyAreaDamageToEnemies(this.playerEntity.x, this.playerEntity.y, 90, 15 * deltaSeconds);
    }

    this.hud.update(this.gameState);

    // 1. Player Movement & Megabonk Passives (Static Zap & Acid Trail)
    this.handlePlayerMovement(delta);

    // 2. XP Magnet attraction (Scales with level: +2% per level + Tome of Magnetism)
    this.handleXpMagnet(deltaSeconds);

    // 3. Acid Pools
    this.handleAcidPools(delta);

    // 4. Melee Swarm AI with Wrap-Around
    this.handleEnemiesAI(delta);

    // 5. Spawning (Target population)
    this.spawnManager.setEnemyCount(this.enemiesMap.size);
    this.spawnManager.update(delta, this.gameState.runTime);

    // 6. Megabonk Active Weapons Auto-attack
    this.handleAutoAttack(delta);

    // 7. Projectile Homing & Physics Guidance
    this.handleProjectileHoming(deltaSeconds);
  }

  private handleProjectileHoming(_deltaSec: number): void {
    const projs = this.playerProjectilesGroup.getChildren() as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[];
    for (const p of projs) {
      if (!p.active || !p.body) continue;

      if (p.getData('isHoming')) {
        const target = this.findClosestEnemy(p.x, p.y);
        if (target && target.sprite && target.isAlive) {
          const targetAngle = Phaser.Math.Angle.Between(p.x, p.y, target.x, target.y);
          const curAngle = Math.atan2(p.body.velocity.y, p.body.velocity.x);
          const newAngle = Phaser.Math.Angle.RotateTo(curAngle, targetAngle, 0.22);
          const spd = (p.getData('speed') as number) || 580;
          p.setVelocity(Math.cos(newAngle) * spd, Math.sin(newAngle) * spd);
          p.rotation = newAngle;
        }
      } else if (p.getData('isBone')) {
        p.rotation += 0.35; // Continuous bone spin
      }
    }
  }

  private findClosestEnemy(x: number, y: number): Entity | null {
    let closest: Entity | null = null;
    let minD = Infinity;

    this.enemiesMap.forEach((enemy) => {
      if (!enemy.isAlive || enemy.isExploding) return;
      const d = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (d < minD && d < 650) {
        minD = d;
        closest = enemy;
      }
    });

    return closest;
  }

  private findClosestEnemyExcluding(x: number, y: number, excludeId: string): Entity | null {
    let closest: Entity | null = null;
    let minD = Infinity;

    this.enemiesMap.forEach((enemy) => {
      if (enemy.id === excludeId || !enemy.isAlive || enemy.isExploding) return;
      const d = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (d < minD && d < 650) {
        minD = d;
        closest = enemy;
      }
    });

    return closest;
  }

  private handlePlayerMovement(delta: number): void {
    const moveVector = this.inputManager.getMovementVector();
    const isMoving = moveVector.x !== 0 || moveVector.y !== 0;
    const playerSprite = this.playerEntity.sprite!;
    const mods = this.gameState.playerModifiers;

    let currentSpeed = this.playerEntity.effectiveSpeed;

    // Crowd resistance (body-blocking): diving into a horde slows down the worm
    let touchingEnemies = 0;
    const px = this.playerEntity.x;
    const py = this.playerEntity.y;
    this.enemiesMap.forEach((e) => {
      if (e.isAlive && !e.isExploding) {
        if (Phaser.Math.Distance.Between(px, py, e.x, e.y) < 36) {
          touchingEnemies++;
        }
      }
    });

    if (touchingEnemies > 0) {
      const crowdResistance = Math.max(0.50, 1 - touchingEnemies * 0.12);
      currentSpeed *= crowdResistance;
    }

    if (this.wriggleDashTimer > 0) {
      this.wriggleDashTimer -= delta;
      currentSpeed *= 1.25;
    }

    playerSprite.setVelocity(moveVector.x * currentSpeed, moveVector.y * currentSpeed);

    if (isMoving) {
      if (playerSprite.texture.key !== 'pose_run' && !playerSprite.getData('isAttacking')) {
        playerSprite.setTexture('pose_run');
      }
      playerSprite.setFlipX(moveVector.x < 0);
      playerSprite.rotation = moveVector.y * 0.15;
      this.movingTimerMs += delta;

      // 1. Static Zap charging on continuous run
      if (mods.lightningZapLevel > 0) {
        this.staticZapCurrent += delta * (0.05 + (mods.lightningZapLevel - 1) * 0.02);
        if (this.staticZapCurrent >= (mods.staticZapMax || 100)) {
          this.staticZapCurrent = 0;
          this.triggerStaticZap();
        }
      }

      // 2. Acid Trail dropping
      if (mods.acidTrail) {
        this.acidTrailTimer += delta;
        if (this.acidTrailTimer >= 160) {
          this.acidTrailTimer = 0;
          this.spawnAcidPool(this.playerEntity.x, this.playerEntity.y, 28, mods.acidTrailDps || 15, 3500, true);
        }
      }

      if (this.movingTimerMs >= 1200 && !this.isWriggleCharged) {
        this.isWriggleCharged = true;
        if (mods.wriggleDash) {
          this.wriggleDashTimer = 1000;
        }
      }
    } else {
      if (playerSprite.texture.key !== 'pose_idle' && !playerSprite.getData('isAttacking')) {
        playerSprite.setTexture('pose_idle');
        playerSprite.rotation = 0;
      }
      this.movingTimerMs = 0;
      this.isWriggleCharged = false;
    }

    if (this.wriggleAura) {
      this.wriggleAura.clear();
      if (this.isWriggleCharged) {
        this.wriggleAura.lineStyle(3, 0x4ade80, 0.9);
        this.wriggleAura.strokeCircle(this.playerEntity.x, this.playerEntity.y, 24);
      }
    }
  }

  private triggerStaticZap(): void {
    const mods = this.gameState.playerModifiers;
    const targetCount = 3 + mods.lightningZapLevel;
    const zapRange = 320 + mods.extraRange;
    const targets = this.findNearbyEnemies(zapRange).slice(0, targetCount);
    if (targets.length === 0) return;

    if (this.zapGraphics) {
      this.zapGraphics.clear();
      this.zapGraphics.lineStyle(3, 0x38bdf8, 1);

      let prevX = this.playerEntity.x;
      let prevY = this.playerEntity.y;

      for (const t of targets) {
        // Draw jagged electric bolt line
        const midX = (prevX + t.x) / 2 + (Math.random() - 0.5) * 20;
        const midY = (prevY + t.y) / 2 + (Math.random() - 0.5) * 20;
        this.zapGraphics.lineBetween(prevX, prevY, midX, midY);
        this.zapGraphics.lineBetween(midX, midY, t.x, t.y);

        const zapDmg = Math.round(28 * (1 + mods.damagePercentBonus) * (1 + mods.lightningZapLevel * 0.25));
        this.combatSystem.applyDamage(this.playerEntity, t, zapDmg);
        if (t.sprite) {
          this.flashSprite(t.sprite, 0x38bdf8);
        }

        prevX = t.x;
        prevY = t.y;
      }

      this.time.delayedCall(120, () => {
        this.zapGraphics?.clear();
      });
    }

    this.platform.vibrate(30);
  }

  /**
   * Megabonk Progressive XP Magnet (+2% radius per player level + Tome of Magnetism)
   */
  private handleXpMagnet(deltaSeconds: number): void {
    const mods = this.gameState.playerModifiers;
    const levelBonus = 1 + (this.gameState.level - 1) * 0.02;
    const tomeBonus = mods.tomeMagnet > 0 ? (1 + mods.tomeMagnet * 0.4) : 1.0;
    const magnetRadius = (95 + mods.extraRange) * levelBonus * tomeBonus;

    const playerX = this.playerEntity.x;
    const playerY = this.playerEntity.y;

    const gems = this.gemsGroup.getChildren() as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[];
    for (const gem of gems) {
      if (!gem.active) continue;

      const dist = Phaser.Math.Distance.Between(playerX, playerY, gem.x, gem.y);
      if (dist <= magnetRadius) {
        let speed = (gem.getData('speed') as number) || 0;
        speed += (WORM_HERO.stats.speed + 420) * deltaSeconds;
        gem.setData('speed', speed);

        const angle = Phaser.Math.Angle.Between(gem.x, gem.y, playerX, playerY);
        gem.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
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

  private handleEnemiesAI(delta: number): void {
    const enemiesList = Array.from(this.enemiesMap.values());
    const playerX = this.playerEntity.x;
    const playerY = this.playerEntity.y;

    for (const enemy of enemiesList) {
      if (!enemy.isAlive || !enemy.sprite || enemy.isExploding) continue;

      enemy.updateStatusEffects(delta);
      const def = enemy.definition;
      const distToPlayer = Phaser.Math.Distance.Between(enemy.x, enemy.y, playerX, playerY);

      // Vampire Survivors Wrap-Around: If enemy is too far (> 850px), teleport ahead
      if (distToPlayer > 850 && def?.archetype !== 'boss' && def?.archetype !== 'miniboss') {
        const newPos = this.spawnManager.getRepositionPosition();
        enemy.sprite.setPosition(newPos.x, newPos.y);
        continue;
      }

      // Exploder fuse trigger at 45px
      if (def?.archetype === 'exploder' && distToPlayer <= 45) {
        this.startExploderFuse(enemy);
        continue;
      }

      const angleToPlayer = Phaser.Math.Angle.Between(enemy.x, enemy.y, playerX, playerY);
      const spd = enemy.effectiveSpeed;

      // Soft Flocking Separation Force
      let sepX = 0;
      let sepY = 0;
      const separationRadius = 34;

      for (const other of enemiesList) {
        if (other.id !== enemy.id && other.isAlive && other.sprite) {
          const dx = enemy.x - other.x;
          const dy = enemy.y - other.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < separationRadius * separationRadius && distSq > 0.01) {
            const d = Math.sqrt(distSq);
            const force = (separationRadius - d) / separationRadius;
            sepX += (dx / d) * force * 15;
            sepY += (dy / d) * force * 15;
          }
        }
      }

      // Clamp separation force so it NEVER overrides pursuit toward player
      const maxSep = spd * 0.25;
      const sepLen = Math.sqrt(sepX * sepX + sepY * sepY);
      if (sepLen > maxSep && sepLen > 0) {
        sepX = (sepX / sepLen) * maxSep;
        sepY = (sepY / sepLen) * maxSep;
      }

      if (def?.archetype === 'boss') {
        this.handleBossAI(enemy, delta, angleToPlayer);
      } else {
        // Pure Melee Pursuit + Flocking
        const vx = Math.cos(angleToPlayer) * spd + sepX;
        const vy = Math.sin(angleToPlayer) * spd + sepY;
        enemy.sprite.setVelocity(vx, vy);
        enemy.sprite.rotation = Math.atan2(vy, vx);
      }
    }
  }

  private handleBossAI(boss: Entity, delta: number, angle: number): void {
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

      if (this.bossTelegraphGfx) {
        this.bossTelegraphGfx.clear();
        this.bossTelegraphGfx.lineStyle(4, 0xef4444, 0.9);
        this.bossTelegraphGfx.lineBetween(boss.x, boss.y, this.playerEntity.x, this.playerEntity.y);
      }

      this.time.delayedCall(600, () => {
        if (!boss.isAlive || !boss.sprite) return;
        this.bossTelegraphGfx?.clear();

        const dashAngle = Phaser.Math.Angle.Between(boss.x, boss.y, this.playerEntity.x, this.playerEntity.y);
        boss.sprite.setVelocity(Math.cos(dashAngle) * 450, Math.sin(dashAngle) * 450);

        this.time.delayedCall(800, () => {
          if (!boss.isAlive || !boss.sprite) return;
          this.isBossDashing = false;
          this.isBossVulnerable = true;
          this.flashSprite(boss.sprite, 0xfacc15);

          this.time.delayedCall(1500, () => {
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

  private handleAutoAttack(delta: number): void {
    const mods = this.gameState.playerModifiers;
    const baseSpeed = (this.playerEntity.stats.attackSpeed ?? 1.3) * (1 + mods.attackSpeedBonus);
    const baseInterval = WORM_HERO.attackIntervalMs / baseSpeed;

    this.attackTimer += delta;

    // 1. Primary Weapon: Wireless Homing Daggers (Needles)
    if (this.attackTimer >= baseInterval) {
      const maxRange = 280 + mods.extraRange;
      const targets = this.findNearbyEnemies(maxRange);

      if (targets.length > 0) {
        this.attackTimer = 0;
        this.totalPlayerAttacks += 1;

        const primaryTarget = targets[0];
        let primaryDamage = this.playerEntity.stats.damage * (1 + mods.damagePercentBonus);

        // Low HP rage bonus
        if (this.playerEntity.health.percent < mods.lowHpDmgThreshold) {
          primaryDamage *= (1 + mods.lowHpDmgBonus);
        }

        // Critical Hits
        let isCrit = false;
        if (mods.critChance > 0 && Math.random() < mods.critChance) {
          isCrit = true;
          primaryDamage *= mods.critMultiplier;
        }

        // Trigger visual spit attack animation
        const playerSprite = this.playerEntity.sprite;
        if (playerSprite && playerSprite.active) {
          playerSprite.setTexture('pose_ranged_spit');
          playerSprite.setData('isAttacking', true);
          this.time.delayedCall(160, () => {
            if (playerSprite.active) {
              playerSprite.setData('isAttacking', false);
            }
          });
        }

        const totalDaggers = Math.max(1, mods.homingDaggersCount);
        const bursts = Math.max(1, mods.burstFireCount);

        for (let b = 0; b < bursts; b++) {
          this.time.delayedCall(b * 75, () => {
            const spreadAngle = 0.32;
            const startAngle = -((totalDaggers - 1) * spreadAngle) / 2;

            for (let i = 0; i < totalDaggers; i++) {
              const target = targets[i % targets.length] || primaryTarget;
              this.fireHomingDagger(
                this.playerEntity.x,
                this.playerEntity.y,
                target,
                primaryDamage,
                isCrit,
                mods.pierceCount,
                startAngle + i * spreadAngle
              );
            }
          });
        }
      }
    }

    // 2. Secondary Weapon: Bouncing Bones
    if (mods.bouncingBonesLevel > 0) {
      this.boneAttackTimer += delta;
      const boneInterval = 1800 / (1 + mods.attackSpeedBonus * 0.7);

      if (this.boneAttackTimer >= boneInterval) {
        this.boneAttackTimer = 0;
        const targets = this.findNearbyEnemies(350 + mods.extraRange);
        if (targets.length > 0) {
          const boneCount = Math.max(1, mods.bouncingBonesCount);
          const boneDamage = Math.round(primaryTargetDamage() * 1.4);

          for (let i = 0; i < boneCount; i++) {
            const angle = (Math.PI * 2 * i) / boneCount + Math.random() * 0.4;
            this.fireBouncingBone(this.playerEntity.x, this.playerEntity.y, angle, boneDamage, mods.bounceCount || 3);
          }
        }
      }
    }

    function primaryTargetDamage(): number {
      return 24 * (1 + mods.damagePercentBonus);
    }
  }

  private findNearbyEnemies(range: number): Entity[] {
    const valid: Array<{ entity: Entity; dist: number }> = [];

    this.enemiesMap.forEach((enemy) => {
      if (!enemy.isAlive || enemy.isExploding) return;
      const dist = Phaser.Math.Distance.Between(this.playerEntity.x, this.playerEntity.y, enemy.x, enemy.y);
      if (dist <= range) {
        valid.push({ entity: enemy, dist });
      }
    });

    valid.sort((a, b) => a.dist - b.dist);
    return valid.map((v) => v.entity);
  }

  private fireHomingDagger(
    startX: number,
    startY: number,
    target: Entity,
    damage: number,
    isCrit: boolean,
    pierce: number,
    angleOffset = 0
  ): void {
    const proj = this.playerProjectilesGroup.create(startX, startY, 'tex_homing_dagger') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    const scale = (this.gameState.playerModifiers.fatSpitScale || 1.0) * (isCrit ? 1.4 : 1.1);

    proj.setScale(scale);
    proj.setCircle(7 * scale);
    proj.setData('damage', Math.round(damage));
    proj.setData('pierce', pierce);
    proj.setData('isHoming', true);
    proj.setData('speed', 580);
    proj.setDepth(9);

    if (isCrit) {
      proj.setTint(0xfacc15);
    }

    const angle = Phaser.Math.Angle.Between(startX, startY, target.x, target.y) + angleOffset;
    proj.setVelocity(Math.cos(angle) * 580, Math.sin(angle) * 580);
    proj.rotation = angle;

    this.time.delayedCall(1200, () => {
      if (proj && proj.active) proj.destroy();
    });
  }

  private fireBouncingBone(
    startX: number,
    startY: number,
    angle: number,
    damage: number,
    bounces: number
  ): void {
    const bone = this.playerProjectilesGroup.create(startX, startY, 'tex_bouncing_bone') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    const scale = (this.gameState.playerModifiers.fatSpitScale || 1.0) * 1.2;

    bone.setScale(scale);
    bone.setCircle(10 * scale);
    bone.setData('damage', damage);
    bone.setData('bounces', bounces);
    bone.setData('isBone', true);
    bone.setBounce(1, 1);
    bone.setCollideWorldBounds(true);
    bone.setDepth(9);

    const speed = 440;
    bone.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    this.time.delayedCall(3000, () => {
      if (bone && bone.active) bone.destroy();
    });
  }

  shutdown(): void {
    for (const unbind of this.unbindEvents) {
      unbind();
    }
    this.unbindEvents = [];
    this.inputManager.destroy();
    this.hud.destroy();
    this.levelUpModal.destroy();
  }
}
