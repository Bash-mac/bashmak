import Phaser from 'phaser';
import { GameState } from '../../core/GameState';
import { AudioManager } from '../../audio/AudioManager';
import { createPlatformAdapter } from '../../../platform';
import { ALL_UPGRADES } from '../../data/upgrades';
import { EVOLUTION_RECIPES } from '../../data/evolutions';

export interface PauseModalCallbacks {
  onResume: () => void;
  onGrimoire?: () => void;
  onRestart: () => void;
  onMenu: () => void;
}

export class PauseModal {
  private scene: Phaser.Scene;
  private platform = createPlatformAdapter();
  private audio = AudioManager.getInstance();
  private elements: Phaser.GameObjects.GameObject[] = [];
  public isVisible = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public show(callbacks: PauseModalCallbacks): void {
    this.clear();
    this.isVisible = true;

    const { width, height } = this.scene.cameras.main;
    const state = GameState.getInstance();
    const isPortrait = width < 650 || width < height;
    const centerX = width / 2;
    const centerY = height / 2;

    const boxW = Math.min(520, width - 24);
    const boxH = Math.min(520, height - 30);

    // 1. Dark Backdrop (Depth: 25000)
    const backdrop = this.scene.add
      .rectangle(centerX, centerY, width, height, 0x090d16, 0.88)
      .setScrollFactor(0)
      .setDepth(25000)
      .setInteractive();
    this.elements.push(backdrop);

    // 2. Modal Box
    const boxBg = this.scene.add
      .rectangle(centerX, centerY, boxW, boxH, 0x111827, 0.98)
      .setStrokeStyle(3, 0xfacc15)
      .setScrollFactor(0)
      .setDepth(25001);
    this.elements.push(boxBg);

    // 3. Title
    const title = this.scene.add
      .text(centerX, centerY - boxH / 2 + 35, 'ПАУЗА', {
        fontSize: isPortrait ? '24px' : '30px',
        fontStyle: 'bold',
        color: '#facc15',
        fontFamily: '"Gagalin", "Balsamiq Sans", monospace',
        stroke: '#451a03',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(25002);
    this.elements.push(title);

    // 4. Stats Summary
    const minutes = Math.floor(state.runTime / 60);
    const seconds = Math.floor(state.runTime % 60);
    const timeSurvived = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const statsInfo = `Время: ${timeSurvived}   |   Убийства: ${state.kills}   |   Уровень: ${state.level}`;
    const statsText = this.scene.add
      .text(centerX, centerY - boxH / 2 + 70, statsInfo, {
        fontSize: isPortrait ? '11px' : '13px',
        color: '#94a3b8',
        fontFamily: '"Balsamiq Sans", monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(25002);
    this.elements.push(statsText);

    // 5. Active Upgrades Overview (Weapons + Tomes)
    const activeWeaponsList: { id: string; name: string; level: number; icon: string }[] = [];
    const activeTomesList: { id: string; name: string; level: number; icon: string }[] = [];

    state.activeUpgrades.forEach((level, id) => {
      const upgDef = ALL_UPGRADES.find((u) => u.id === id);
      const evoDef = EVOLUTION_RECIPES.find((e) => e.id === id);
      if (upgDef || evoDef) {
        const item = {
          id,
          name: upgDef?.name || evoDef?.name || '',
          level,
          icon: upgDef?.iconKey || evoDef?.iconKey || 'icon_weapon_slime_spit',
        };
        if (evoDef || upgDef?.category === 'weapon') activeWeaponsList.push(item);
        else if (upgDef?.category === 'tome') activeTomesList.push(item);
      }
    });

    const upgradesBoxY = centerY - boxH / 2 + 95;
    const renderSlotsRow = (titleText: string, items: typeof activeWeaponsList, maxSlots: number, rowY: number) => {
      const title = this.scene.add.text(centerX, rowY, titleText, {
        fontSize: '11px', fontStyle: 'bold', color: '#94a3b8', fontFamily: 'monospace',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(25002);
      this.elements.push(title);

      const iconSize = 28;
      const iconSpacing = 6;
      const totalW = maxSlots * iconSize + (maxSlots - 1) * iconSpacing;
      const startX = centerX - totalW / 2 + iconSize / 2;
      const iconsY = rowY + 18;

      for (let i = 0; i < maxSlots; i++) {
        const ix = startX + i * (iconSize + iconSpacing);
        const item = items[i];
        const iconBg = this.scene.add.rectangle(ix, iconsY, iconSize, iconSize, 0x0f172a)
          .setStrokeStyle(1, item ? 0x4ade80 : 0x334155).setScrollFactor(0).setDepth(25002);
        this.elements.push(iconBg);

        if (item) {
          const iconImg = this.scene.add.image(ix, iconsY, item.icon).setDisplaySize(iconSize - 4, iconSize - 4).setScrollFactor(0).setDepth(25003);
          const lvlBadge = this.scene.add.text(ix + iconSize / 2 - 1, iconsY + iconSize / 2 - 1, `L${item.level}`, {
            fontSize: '8px', fontStyle: 'bold', color: '#fde047', fontFamily: 'monospace', stroke: '#000000', strokeThickness: 2,
          }).setOrigin(1, 1).setScrollFactor(0).setDepth(25004);
          this.elements.push(iconImg, lvlBadge);
        }
      }
    };

    renderSlotsRow(`ОРУЖИЕ (${activeWeaponsList.length}/${state.maxWeaponSlots}):`, activeWeaponsList, state.maxWeaponSlots, upgradesBoxY);
    renderSlotsRow(`ФОЛИАНТЫ (${activeTomesList.length}/${state.maxTomeSlots}):`, activeTomesList, state.maxTomeSlots, upgradesBoxY + 44);

    // 6. Action Buttons
    const btnW = Math.min(280, boxW - 40);
    const btnH = 42;
    const startBtnY = centerY + 45;
    const btnSpacing = 10;

    let isTriggered = false;

    // --- Button 1: Resume ---
    const resumeBtnY = startBtnY;
    const resumeBtn = this.scene.add
      .rectangle(centerX, resumeBtnY, btnW, btnH, 0x16a34a)
      .setStrokeStyle(2, 0x4ade80)
      .setScrollFactor(0)
      .setDepth(25002)
      .setInteractive({ useHandCursor: true });

    const resumeText = this.scene.add
      .text(centerX, resumeBtnY, 'ПРОДОЛЖИТЬ', {
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#ffffff',
        fontFamily: '"Gagalin", "Balsamiq Sans", monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(25003);

    resumeBtn.on('pointerdown', () => {
      if (isTriggered) return;
      isTriggered = true;
      this.platform.vibrate(20);
      this.audio.playClick();
      this.clear();
      callbacks.onResume();
    });
    this.elements.push(resumeBtn, resumeText);

    // --- Button 2: Grimoire ---
    const grimoireBtnY = resumeBtnY + btnH + btnSpacing;
    const grimoireBtn = this.scene.add
      .rectangle(centerX, grimoireBtnY, btnW, btnH, 0x4338ca)
      .setStrokeStyle(2, 0x818cf8)
      .setScrollFactor(0)
      .setDepth(25002)
      .setInteractive({ useHandCursor: true });

    const grimoireText = this.scene.add
      .text(centerX, grimoireBtnY, 'ГРИМУАР ЭВОЛЮЦИЙ', {
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#ffffff',
        fontFamily: '"Gagalin", "Balsamiq Sans", monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(25003);

    grimoireBtn.on('pointerdown', () => {
      this.platform.vibrate(20);
      this.audio.playClick();
      this.clear();
      callbacks.onGrimoire?.();
    });
    this.elements.push(grimoireBtn, grimoireText);

    // --- Button 3: Restart ---
    const restartBtnY = grimoireBtnY + btnH + btnSpacing;
    const restartBtn = this.scene.add
      .rectangle(centerX, restartBtnY, btnW, btnH, 0xb45309)
      .setStrokeStyle(1.5, 0xfbbf24)
      .setScrollFactor(0)
      .setDepth(25002)
      .setInteractive({ useHandCursor: true });

    const restartText = this.scene.add
      .text(centerX, restartBtnY, 'ЗАНОВО', {
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fef3c7',
        fontFamily: '"Gagalin", "Balsamiq Sans", monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(25003);

    restartBtn.on('pointerdown', () => {
      if (isTriggered) return;
      isTriggered = true;
      this.platform.vibrate(30);
      this.audio.playClick();
      this.clear();
      callbacks.onRestart();
    });
    this.elements.push(restartBtn, restartText);

    // --- Button 4: Main Menu ---
    const menuBtnY = restartBtnY + btnH + btnSpacing;
    const menuBtn = this.scene.add
      .rectangle(centerX, menuBtnY, btnW, btnH, 0x334155)
      .setStrokeStyle(1, 0x64748b)
      .setScrollFactor(0)
      .setDepth(25002)
      .setInteractive({ useHandCursor: true });

    const menuText = this.scene.add
      .text(centerX, menuBtnY, 'В ГЛАВНОЕ МЕНЮ', {
        fontSize: '13px',
        color: '#cbd5e1',
        fontFamily: '"Gagalin", "Balsamiq Sans", monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(25003);

    menuBtn.on('pointerdown', () => {
      if (isTriggered) return;
      isTriggered = true;
      this.platform.vibrate(30);
      this.audio.playClick();
      this.clear();
      callbacks.onMenu();
    });
    this.elements.push(menuBtn, menuText);
  }

  public clear(): void {
    this.isVisible = false;
    for (const el of this.elements) {
      el.destroy();
    }
    this.elements = [];
  }

  public destroy(): void {
    this.clear();
  }
}
