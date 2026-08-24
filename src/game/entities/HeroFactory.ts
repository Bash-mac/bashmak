import Phaser from 'phaser';
import { Entity } from './Entity';
import { getHeroById } from '../data/heroes';
import type { HeroDefinition } from '../data/definitions';
import type { GameState } from '../core/GameState';
import type { SaveManager } from '../core/SaveManager';

export class HeroFactory {
  public static createPlayer(
    scene: Phaser.Scene,
    x: number,
    y: number,
    gameState: GameState,
    saveManager: SaveManager
  ): { playerEntity: Entity; currentHero: HeroDefinition } {
    const heroId = saveManager.getSelectedHeroId();
    const currentHero = getHeroById(heroId);
    scene.registry.set('selectedHeroId', heroId);

    const textureKey = currentHero.textureKey || 'vypolzok_idle_1';
    const sprite = scene.physics.add.sprite(x, y, textureKey);
    sprite.setScale(0.72).setCollideWorldBounds(true).setDepth(10);

    const radius = 22;
    if (sprite.body) {
      sprite.body.setCircle(
        radius,
        (sprite.width - radius * 2) / 2,
        (sprite.height - radius * 2) / 2 + 2
      );
    }

    if ((textureKey.startsWith('vypolzok') || textureKey.startsWith('tony')) && scene.anims.exists('vypolzok_anim_idle')) {
      sprite.play('vypolzok_anim_idle');
    }

    const playerEntity = new Entity({
      id: 'player',
      type: 'hero',
      stats: { ...currentHero.stats },
      sprite,
    });

    gameState.applyStartingWeapon(currentHero.startingWeaponId);
    currentHero.trait?.apply?.(gameState.playerModifiers, playerEntity.stats);
    saveManager.applyToPlayerStats(playerEntity.stats, playerEntity.health, gameState.playerModifiers);

    return { playerEntity, currentHero };
  }
}
