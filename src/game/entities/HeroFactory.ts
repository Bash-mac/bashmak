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
    const isMarkovka = heroId === 'hero_markovka';
    const scale = isMarkovka ? 0.20 : 0.72;

    const sprite = scene.physics.add.sprite(x, y, textureKey);
    sprite.setName('hero');
    sprite.setScale(scale).setCollideWorldBounds(false).setDepth(10);

    const targetRadius = isMarkovka ? 14 : 18;
    if (sprite.body) {
      const bodyRadius = targetRadius / scale;
      sprite.body.setCircle(
        bodyRadius,
        (sprite.width - bodyRadius * 2) / 2,
        (sprite.height - bodyRadius * 2) / 2 + (isMarkovka ? bodyRadius * 0.45 : 2)
      );
    }

    if (heroId === 'hero_markovka' && scene.anims.exists('markovka_anim_idle')) {
      sprite.play('markovka_anim_idle');
    } else if (textureKey.startsWith('vypolzok') && scene.anims.exists('vypolzok_anim_idle')) {
      sprite.play('vypolzok_anim_idle');
    }

    const playerEntity = new Entity({
      id: 'player',
      type: 'hero',
      stats: { ...currentHero.stats },
      sprite,
    });

    gameState.currentHeroId = currentHero.id;
    gameState.applyStartingWeapon(currentHero.startingWeaponId);
    currentHero.trait?.apply?.(gameState.playerModifiers, playerEntity.stats);
    saveManager.applyToPlayerStats(playerEntity.stats, playerEntity.health, gameState.playerModifiers);

    return { playerEntity, currentHero };
  }
}
