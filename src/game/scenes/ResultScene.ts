import Phaser from 'phaser';
import { GameState } from '../core/GameState';
import { SaveManager } from '../core/SaveManager';
import { createPlatformAdapter } from '../../platform';

export class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' });
  }

  create(): void {
    this.cameras.main.resetFX();
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setBackgroundColor('#090d16');
    this.cameras.main.fadeIn(300, 9, 13, 22);

    const width = this.scale.width;
    const height = this.scale.height;
    const state = GameState.getInstance();
    const saveManager = SaveManager.getInstance();
    const platform = createPlatformAdapter();

    // 1. Background
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x090d16, 0.96);

    // 2. Responsive UI Container
    const calcUiScale = (w: number, h: number) => {
      const isPortrait = w < 600 || w < h;
      return isPortrait ? Math.min(1.0, (w - 24) / 380) : Math.min(1.0, (h - 30) / 480);
    };

    const uiScale = calcUiScale(width, height);
    const uiContainer = this.add.container(width / 2, height / 2).setScale(uiScale);

    // Dynamic resize handler
    const onResize = (gameSize: Phaser.Structs.Size) => {
      const w = gameSize.width;
      const h = gameSize.height;
      bg.setPosition(w / 2, h / 2).setSize(w, h);
      uiContainer.setPosition(w / 2, h / 2).setScale(calcUiScale(w, h));
    };
    this.scale.on('resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', onResize);
    });

    // Content inside uiContainer (centered at 0, 0)
    // Header
    const title = this.add.text(0, -190, 'ЗАБЕГ ОКОНЧЕН', {
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#ef4444',
      fontFamily: 'monospace',
      stroke: '#450a0a',
      strokeThickness: 5,
    }).setOrigin(0.5);

    // Stats
    const minutes = Math.floor(state.runTime / 60);
    const seconds = Math.floor(state.runTime % 60);
    const timeSurvived = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const statsInfo = [
      `⏱ Время: ${timeSurvived}`,
      `💀 Врагов убито: ${state.kills}`,
      `⭐ Уровень: ${state.level}`,
      `🏆 Счёт: ${state.score}`,
    ];

    const statsText = this.add.text(0, -110, statsInfo.join('\n'), {
      fontSize: '15px',
      align: 'center',
      color: '#e2e8f0',
      fontFamily: 'monospace',
      lineSpacing: 5,
    }).setOrigin(0.5);

    // GOO Earnings Box
    const gooBoxY = -25;
    const gooBg = this.add.rectangle(0, gooBoxY, 280, 52, 0x14532d, 0.95);
    gooBg.setStrokeStyle(2, 0x4ade80);

    const gooText = this.add.text(0, gooBoxY - 10, `+${state.gooCollected} СЛИЗИ (GOO) ПОЛУЧЕНО!`, {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#4ade80',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const bankText = this.add.text(0, gooBoxY + 12, `В банке: 🧪 ${saveManager.getGoo()}`, {
      fontSize: '13px',
      color: '#86efac',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // 1. Play Again Button
    const playBtn = this.add.rectangle(0, 50, 260, 44, 0x16a34a).setInteractive({ useHandCursor: true });
    playBtn.setStrokeStyle(2, 0x4ade80);

    const playText = this.add.text(0, 50, 'ИГРАТЬ СНОВА', {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    playBtn.on('pointerdown', () => {
      platform.vibrate(30);
      this.scene.start('GameScene');
    });

    // 2. Upgrades Button
    const upgBtn = this.add.rectangle(0, 108, 260, 44, 0xb45309).setInteractive({ useHandCursor: true });
    upgBtn.setStrokeStyle(2, 0xfacc15);

    const upgText = this.add.text(0, 108, '🧪 ЛАБОРАТОРИЯ МУТАЦИЙ', {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#fef08a',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    upgBtn.on('pointerdown', () => {
      platform.vibrate(30);
      this.scene.start('UpgradesScene');
    });

    // 3. Menu Button
    const menuBtn = this.add.rectangle(0, 164, 260, 40, 0x334155).setInteractive({ useHandCursor: true });
    menuBtn.setStrokeStyle(1, 0x64748b);

    const menuText = this.add.text(0, 164, 'ГЛАВНОЕ МЕНЮ', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    menuBtn.on('pointerdown', () => {
      platform.vibrate(30);
      this.scene.start('MenuScene');
    });

    uiContainer.add([
      title,
      statsText,
      gooBg,
      gooText,
      bankText,
      playBtn,
      playText,
      upgBtn,
      upgText,
      menuBtn,
      menuText,
    ]);
  }
}
