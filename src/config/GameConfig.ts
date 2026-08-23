import Phaser from 'phaser';
import { BootScene } from '../game/scenes/BootScene';
import { MenuScene } from '../game/scenes/MenuScene';
import { GameScene } from '../game/scenes/GameScene';
import { UpgradesScene } from '../game/scenes/UpgradesScene';
import { ResultScene } from '../game/scenes/ResultScene';

export const GameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#0b0e14',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',
    height: '100%',
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, GameScene, UpgradesScene, ResultScene],
  input: {
    activePointers: 3,
  },
};
