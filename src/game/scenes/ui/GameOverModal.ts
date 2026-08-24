import Phaser from 'phaser';
import { GameState } from '../../core/GameState';
import { SaveManager } from '../../core/SaveManager';
import { createPlatformAdapter } from '../../../platform';
import { AudioManager } from '../../audio/AudioManager';

export class GameOverModal {
  private scene: Phaser.Scene;
  private platform = createPlatformAdapter();
  private audio = AudioManager.getInstance();
  private elements: Phaser.GameObjects.GameObject[] = [];
  public isVisible = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public show(won = false): void {
    this.clear();
    this.isVisible = true;

    const { width, height } = this.scene.cameras.main;
    const state = GameState.getInstance();
    const saveManager = SaveManager.getInstance();
    const centerX = width / 2;
    const centerY = height / 2;

    // 1. Semi-transparent dark overlay (Depth: 10000)
    const overlay = this.scene.add
      .rectangle(centerX, centerY, width, height, 0x090d16, 0.93)
      .setScrollFactor(0)
      .setDepth(10000)
      .setInteractive();
    this.elements.push(overlay);

    // 2. Title Banner (Depth: 10002)
    const titleText = won ? 'ПОБЕДА!' : 'ЗАБЕГ ОКОНЧЕН';
    const titleColor = won ? '#4ade80' : '#ef4444';
    const titleStroke = won ? '#14532d' : '#450a0a';

    const title = this.scene.add
      .text(centerX, centerY - 170, titleText, {
        fontSize: '34px',
        fontStyle: 'bold',
        color: titleColor,
        fontFamily: 'monospace',
        stroke: titleStroke,
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10002);
    this.elements.push(title);

    // 3. Stats Block
    const minutes = Math.floor(state.runTime / 60);
    const seconds = Math.floor(state.runTime % 60);
    const timeSurvived = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const statsInfo = [
      `⏱ Время: ${timeSurvived}`,
      `💀 Врагов убито: ${state.kills}`,
      `⭐ Уровень: ${state.level}`,
      `🏆 Счёт: ${state.score}`,
    ];

    const statsText = this.scene.add
      .text(centerX, centerY - 95, statsInfo.join('\n'), {
        fontSize: '15px',
        align: 'center',
        color: '#e2e8f0',
        fontFamily: 'monospace',
        lineSpacing: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10002);
    this.elements.push(statsText);

    // 4. GOO Earnings Box
    const gooBoxY = centerY - 20;
    const gooBg = this.scene.add
      .rectangle(centerX, gooBoxY, 280, 52, 0x14532d, 0.95)
      .setStrokeStyle(2, 0x4ade80)
      .setScrollFactor(0)
      .setDepth(10002);

    const gooText = this.scene.add
      .text(centerX, gooBoxY - 10, `+${state.gooCollected} СЛИЗИ (GOO) ПОЛУЧЕНО!`, {
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#4ade80',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10003);

    const bankText = this.scene.add
      .text(centerX, gooBoxY + 12, `В банке: 🧪 ${saveManager.getGoo()}`, {
        fontSize: '13px',
        color: '#86efac',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10003);

    this.elements.push(gooBg, gooText, bankText);

    // 5. Action Buttons (Depth: 10002 & 10003)
    let isActionTriggered = false;

    // --- Button 1: Play Again ---
    const playBtnY = centerY + 52;
    const playBtn = this.scene.add
      .rectangle(centerX, playBtnY, 270, 44, 0x16a34a)
      .setStrokeStyle(2, 0x4ade80)
      .setScrollFactor(0)
      .setDepth(10002)
      .setInteractive({ useHandCursor: true });

    const playText = this.scene.add
      .text(centerX, playBtnY, 'ИГРАТЬ СНОВА', {
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffffff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10003);

    playBtn.on('pointerdown', () => {
      if (isActionTriggered) return;
      isActionTriggered = true;
      this.platform.vibrate(30);
      this.audio.playClick();
      this.scene.time.delayedCall(20, () => {
        this.clear();
        this.scene.scene.restart();
      });
    });
    playBtn.on('pointerover', () => playBtn.setScale(1.03));
    playBtn.on('pointerout', () => playBtn.setScale(1.0));

    // --- Button 2: Mutations Lab ---
    const upgBtnY = centerY + 108;
    const upgBtn = this.scene.add
      .rectangle(centerX, upgBtnY, 270, 44, 0xb45309)
      .setStrokeStyle(2, 0xfacc15)
      .setScrollFactor(0)
      .setDepth(10002)
      .setInteractive({ useHandCursor: true });

    const upgText = this.scene.add
      .text(centerX, upgBtnY, '🧪 ЛАБОРАТОРИЯ МУТАЦИЙ', {
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fef08a',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10003);

    upgBtn.on('pointerdown', () => {
      if (isActionTriggered) return;
      isActionTriggered = true;
      this.platform.vibrate(30);
      this.audio.playClick();
      this.scene.time.delayedCall(20, () => {
        this.clear();
        this.scene.scene.start('UpgradesScene');
      });
    });
    upgBtn.on('pointerover', () => upgBtn.setScale(1.03));
    upgBtn.on('pointerout', () => upgBtn.setScale(1.0));

    // --- Button 3: Main Menu ---
    const menuBtnY = centerY + 164;
    const menuBtn = this.scene.add
      .rectangle(centerX, menuBtnY, 270, 40, 0x334155)
      .setStrokeStyle(1, 0x64748b)
      .setScrollFactor(0)
      .setDepth(10002)
      .setInteractive({ useHandCursor: true });

    const menuText = this.scene.add
      .text(centerX, menuBtnY, 'ГЛАВНОЕ МЕНЮ', {
        fontSize: '14px',
        color: '#ffffff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10003);

    menuBtn.on('pointerdown', () => {
      if (isActionTriggered) return;
      isActionTriggered = true;
      this.platform.vibrate(30);
      this.audio.playClick();
      this.scene.time.delayedCall(20, () => {
        this.clear();
        this.scene.scene.start('MenuScene');
      });
    });
    menuBtn.on('pointerover', () => menuBtn.setScale(1.03));
    menuBtn.on('pointerout', () => menuBtn.setScale(1.0));

    this.elements.push(playBtn, playText, upgBtn, upgText, menuBtn, menuText);
  }

  public clear(): void {
    this.isVisible = false;
    for (const el of this.elements) {
      el.destroy();
    }
    this.elements = [];
  }
}
