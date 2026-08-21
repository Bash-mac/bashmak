import Phaser from 'phaser';
import { BootScene } from '../game/scenes/BootScene';
import { MenuScene } from '../game/scenes/MenuScene';
import { GameScene } from '../game/scenes/GameScene';
import { ResultScene } from '../game/scenes/ResultScene';

export const GameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#121824',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 800,
    height: 600,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, GameScene, ResultScene],
  input: {
    activePointers: 3,
  },
};
