import Phaser from 'phaser';
import { BootScene } from '../game/scenes/BootScene';
import { MenuScene } from '../game/scenes/MenuScene';
import { GameScene } from '../game/scenes/GameScene';
import { UpgradesScene } from '../game/scenes/UpgradesScene';

export const GameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#0b0e14',
  scale: {
    mode: Phaser.Scale.EXPAND,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  render: {
    powerPreference: 'high-performance',
    antialias: true,
    antialiasGL: true,
    pixelArt: false,
    roundPixels: true,
  },


  scene: [BootScene, MenuScene, GameScene, UpgradesScene],
  input: {
    activePointers: 3,
  },
};
