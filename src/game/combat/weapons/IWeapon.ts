import type Phaser from 'phaser';
import type { Entity } from '../../entities/Entity';
import type { GameState } from '../../core/GameState';
import type { CombatSystem } from '../CombatSystem';

export interface WeaponContext {
  scene: Phaser.Scene;
  player: Entity;
  gameState: GameState;
  combatSystem: CombatSystem;
  projectilesGroup: Phaser.Physics.Arcade.Group;
  enemiesMap: Map<string, Entity>;
  flashSprite?: (sprite: Phaser.GameObjects.Sprite, color: number) => void;
  vibrate?: (ms: number) => void;
  spawnAcidPool?: (x: number, y: number, radius: number, damage: number, durationMs: number, isPlayer: boolean) => void;
}

export interface IWeapon {
  readonly id: string;
  readonly name: string;
  update(delta: number, ctx: WeaponContext): void;
}
