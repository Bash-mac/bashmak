import Phaser from 'phaser';
import { GameState } from '../core/GameState';
import { EventBus } from '../core/EventBus';
import { InputManager } from '../../input/InputManager';
import { HUD } from './ui/HUD';
import { CombatSystem } from '../combat/CombatSystem';
import { SpawnManager } from '../spawning/SpawnManager';
import { Entity } from '../entities/Entity';
import { STARTER_HERO } from '../data/heroes';
import type { EnemyDefinition } from '../data/definitions';
import { createPlatformAdapter } from '../../platform';

export class GameScene extends Phaser.Scene {
  private inputManager!: InputManager;
  private hud!: HUD;
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
  private projectilesGroup!: Phaser.Physics.Arcade.Group;
  private gemsGroup!: Phaser.Physics.Arcade.Group;

  // Attack timer
  private attackTimer = 0;
  private attackIntervalMs = 700; // 0.7 sec auto attack
  private attackRange = 350;

  // Cleanup
  private unbindEvents: Array<() => void> = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // 1. Core state init
    this.gameState = GameState.getInstance();
    this.gameState.reset();
    this.enemiesMap.clear();
    this.enemyIdCounter = 0;

    // 2. World & Background
    const worldSize = 2400;
    this.physics.world.setBounds(0, 0, worldSize, worldSize);
    this.add.tileSprite(0, 0, worldSize, worldSize, 'tex_floor').setOrigin(0, 0);

    // 3. Physics Groups
    this.enemiesGroup = this.physics.add.group();
    this.projectilesGroup = this.physics.add.group();
    this.gemsGroup = this.physics.add.group();

    // 4. Player Entity creation
    this.createPlayer(worldSize / 2, worldSize / 2);

    // 5. Systems
    this.combatSystem = new CombatSystem();
    this.inputManager = new InputManager(this);
    this.inputManager.init();

    this.hud = new HUD(this);

    this.spawnManager = new SpawnManager(
      () => ({ x: this.playerEntity.x, y: this.playerEntity.y }),
      (def, x, y) => this.spawnEnemy(def, x, y)
    );

    // 6. Camera Follow
    if (this.playerEntity.sprite) {
      this.cameras.main.startFollow(this.playerEntity.sprite, true, 0.1, 0.1);
      this.cameras.main.setBounds(0, 0, worldSize, worldSize);
    }

    // 7. Collisions & Overlaps
    this.setupCollisions();

    // 8. Event Listeners
    this.setupEvents();

    this.eventBus.emit('run:started');
  }

  private createPlayer(x: number, y: number): void {
    const sprite = this.physics.add.sprite(x, y, STARTER_HERO.textureKey);
    sprite.setCollideWorldBounds(true);
    sprite.setCircle(14, 2, 2);

    this.playerEntity = new Entity({
      id: 'player',
      type: 'hero',
      stats: STARTER_HERO.stats,
      sprite,
    });
  }

  private spawnEnemy(definition: EnemyDefinition, x: number, y: number): void {
    const id = `enemy_${++this.enemyIdCounter}`;
    const sprite = this.enemiesGroup.create(x, y, definition.textureKey) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    sprite.setCollideWorldBounds(true);
    sprite.setCircle(12, 2, 2);
    sprite.setData('entityId', id);

    const enemyEntity = new Entity({
      id,
      type: 'enemy',
      stats: definition.stats,
      sprite,
    });

    this.enemiesMap.set(id, enemyEntity);
    this.eventBus.emit('enemy:spawned', { id, x, y });
  }

  private spawnGem(x: number, y: number, _value = 5): void {
    const gem = this.gemsGroup.create(x, y, 'tex_gem') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    gem.setCircle(8);
  }

  private setupCollisions(): void {
    // Projectile vs Enemy
    this.physics.add.overlap(
      this.projectilesGroup,
      this.enemiesGroup,
      (projObj, enemyObj) => {
        const projectile = projObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        const enemySprite = enemyObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        const enemyId = enemySprite.getData('entityId') as string;
        const enemy = this.enemiesMap.get(enemyId);

        if (enemy && enemy.isAlive) {
          this.combatSystem.applyDamage(this.playerEntity, enemy);
          this.flashSprite(enemySprite, 0xffffff);
        }

        projectile.destroy();
      },
      undefined,
      this
    );

    // Enemy vs Player (Contact damage)
    this.physics.add.overlap(
      this.playerEntity.sprite!,
      this.enemiesGroup,
      (_playerObj, enemyObj) => {
        const enemySprite = enemyObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        const enemyId = enemySprite.getData('entityId') as string;
        const enemy = this.enemiesMap.get(enemyId);

        if (enemy && enemy.isAlive && this.playerEntity.isAlive) {
          // Push enemy slightly back
          if (enemy.sprite && this.playerEntity.sprite) {
            const angle = Phaser.Math.Angle.Between(
              this.playerEntity.x,
              this.playerEntity.y,
              enemy.x,
              enemy.y
            );
            enemy.sprite.setVelocity(Math.cos(angle) * 120, Math.sin(angle) * 120);
          }

          this.combatSystem.applyDamage(enemy, this.playerEntity);
          this.flashSprite(this.playerEntity.sprite!, 0xff4444);
          this.platform.vibrate(50);
        }
      },
      undefined,
      this
    );

    // Player vs Gems
    this.physics.add.overlap(
      this.playerEntity.sprite!,
      this.gemsGroup,
      (_playerObj, gemObj) => {
        const gem = gemObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        gem.destroy();
        this.gameState.addXp(5);
      },
      undefined,
      this
    );
  }

  private setupEvents(): void {
    this.unbindEvents.push(
      this.eventBus.on('enemy:died', (data) => {
        const enemy = this.enemiesMap.get(data.id);
        if (enemy) {
          this.spawnGem(data.x, data.y, data.xpValue);
          enemy.destroy();
          this.enemiesMap.delete(data.id);
        }
      }),

      this.eventBus.on('player:died', () => {
        this.cameras.main.fade(800, 15, 23, 42, false, (_cam: any, progress: number) => {
          if (progress === 1) {
            this.scene.start('ResultScene');
          }
        });
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
    if (!this.playerEntity.isAlive || this.gameState.isGameOver) return;

    const deltaSeconds = delta / 1000;
    this.gameState.updateTime(deltaSeconds);
    this.hud.update(this.gameState);

    // 1. Player movement
    const moveVector = this.inputManager.getMovementVector();
    const speed = this.playerEntity.stats.speed;
    const playerSprite = this.playerEntity.sprite!;

    playerSprite.setVelocity(moveVector.x * speed, moveVector.y * speed);

    if (moveVector.x !== 0 || moveVector.y !== 0) {
      playerSprite.rotation = Math.atan2(moveVector.y, moveVector.x);
    }

    // 2. Enemies AI movement
    this.enemiesMap.forEach((enemy) => {
      if (enemy.isAlive && enemy.sprite) {
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.playerEntity.x, this.playerEntity.y);
        const enemySpeed = enemy.stats.speed;
        enemy.sprite.setVelocity(Math.cos(angle) * enemySpeed, Math.sin(angle) * enemySpeed);
        enemy.sprite.rotation = angle;
      }
    });

    // 3. Spawning update
    this.spawnManager.setEnemyCount(this.enemiesMap.size);
    this.spawnManager.update(delta);

    // 4. Auto attack closest enemy
    this.handleAutoAttack(delta);
  }

  private handleAutoAttack(delta: number): void {
    this.attackTimer += delta;
    if (this.attackTimer < this.attackIntervalMs) return;

    const closestEnemy = this.findClosestEnemy();
    if (!closestEnemy) return;

    this.attackTimer = 0;
    this.fireProjectileAt(closestEnemy.x, closestEnemy.y);
  }

  private findClosestEnemy(): Entity | null {
    let closest: Entity | null = null;
    let minDistance = this.attackRange;

    this.enemiesMap.forEach((enemy) => {
      if (!enemy.isAlive) return;
      const dist = Phaser.Math.Distance.Between(this.playerEntity.x, this.playerEntity.y, enemy.x, enemy.y);
      if (dist < minDistance) {
        minDistance = dist;
        closest = enemy;
      }
    });

    return closest;
  }

  private fireProjectileAt(targetX: number, targetY: number): void {
    const startX = this.playerEntity.x;
    const startY = this.playerEntity.y;

    const projectile = this.projectilesGroup.create(startX, startY, 'tex_projectile') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    projectile.setCircle(5);

    const angle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);
    const speed = 400;

    projectile.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    // Auto destroy projectile after lifespan
    this.time.delayedCall(1200, () => {
      if (projectile && projectile.active) {
        projectile.destroy();
      }
    });
  }

  shutdown(): void {
    for (const unbind of this.unbindEvents) {
      unbind();
    }
    this.unbindEvents = [];
    this.inputManager.destroy();
    this.hud.destroy();
  }
}
