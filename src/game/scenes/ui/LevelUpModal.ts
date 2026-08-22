import Phaser from 'phaser';
import type { UpgradeDefinition } from '../../data/definitions';
import { WORM_UPGRADES } from '../../data/upgrades';
import { GameState } from '../../core/GameState';
import { createPlatformAdapter } from '../../../platform';

export class LevelUpModal {
  private scene: Phaser.Scene;
  private onUpgradeSelected: (upgrade: UpgradeDefinition, levelToApply: number) => void;
  private platform = createPlatformAdapter();
  private elements: Phaser.GameObjects.GameObject[] = [];
  public isVisible = false;

  constructor(
    scene: Phaser.Scene,
    onUpgradeSelected: (upgrade: UpgradeDefinition, levelToApply: number) => void
  ) {
    this.scene = scene;
    this.onUpgradeSelected = onUpgradeSelected;
  }

  show(): void {
    this.clear();
    this.isVisible = true;
    const { width, height } = this.scene.cameras.main;

    // 1. Semi-transparent dark overlay (Depth: 10000)
    const overlay = this.scene.add
      .rectangle(width / 2, height / 2, width, height, 0x090d16, 0.88)
      .setScrollFactor(0)
      .setDepth(10000)
      .setInteractive(); // Blocks game clicks beneath
    this.elements.push(overlay);

    // 2. Title Banner (Depth: 10001)
    const title = this.scene.add
      .text(width / 2, 105, 'LEVEL UP!', {
        fontSize: '44px',
        fontStyle: 'bold',
        color: '#4ade80',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10001);

    const subtitle = this.scene.add
      .text(width / 2, 160, 'Выбери развитие билда червяка:', {
        fontSize: '18px',
        color: '#cbd5e1',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10001);

    this.elements.push(title, subtitle);

    // 3. Get eligible options from GameState (respects 4-slot limit)
    const gameState = GameState.getInstance();
    const options = gameState.getEligibleUpgrades(WORM_UPGRADES, 3);

    const cardWidth = 330;
    const cardHeight = 380;
    const spacing = 35;
    const totalW = options.length * cardWidth + (options.length - 1) * spacing;
    const startX = (width - totalW) / 2 + cardWidth / 2;

    options.forEach((opt, idx) => {
      const cardX = startX + idx * (cardWidth + spacing);
      const cardY = height / 2 + 35;

      this.createCard(opt.upgrade, opt.levelToApply, cardX, cardY, cardWidth, cardHeight);
    });
  }

  private createCard(
    upgrade: UpgradeDefinition,
    levelToApply: number,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    const isConsumable = upgrade.isConsumable;
    const isEvo = levelToApply >= 3 && !isConsumable;
    const borderColor = isEvo ? 0xfacc15 : isConsumable ? 0x60a5fa : 0x4ade80;
    const bgColor = isEvo ? 0x422006 : isConsumable ? 0x1e3a8a : 0x14532d;

    // Card Background Box (Depth: 10002)
    const bg = this.scene.add
      .rectangle(x, y, w, h, bgColor, 0.95)
      .setScrollFactor(0)
      .setDepth(10002)
      .setStrokeStyle(3, borderColor)
      .setInteractive({ useHandCursor: true });

    // Level Header / Badge (Depth: 10003)
    let badgeText = 'НОВАЯ МУТАЦИЯ';
    if (isConsumable) {
      badgeText = 'РАСХОДНИК';
    } else if (levelToApply > 1) {
      badgeText = `УРОВЕНЬ ${levelToApply - 1} → ${levelToApply}`;
    }

    const badgeLabel = this.scene.add
      .text(x, y - h / 2 + 25, badgeText, {
        fontSize: '13px',
        fontStyle: 'bold',
        color: isEvo ? '#fef08a' : isConsumable ? '#93c5fd' : '#86efac',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10003);

    // Title
    const nameText = this.scene.add
      .text(x, y - h / 2 + 70, upgrade.name, {
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffffff',
        fontFamily: 'monospace',
        align: 'center',
        wordWrap: { width: w - 30 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10003);

    // Level description
    const levelConfig = upgrade.levels.find((l) => l.level === levelToApply) || upgrade.levels[0];
    const descText = this.scene.add
      .text(x, y + 15, levelConfig?.description || '', {
        fontSize: '15px',
        color: '#e2e8f0',
        fontFamily: 'monospace',
        align: 'center',
        wordWrap: { width: w - 40 },
        lineSpacing: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10003);

    // Choose Button at bottom
    const selectBtn = this.scene.add
      .rectangle(x, y + h / 2 - 40, w - 50, 44, borderColor, 0.9)
      .setScrollFactor(0)
      .setDepth(10003);

    const selectText = this.scene.add
      .text(x, y + h / 2 - 40, 'ВЫБРАТЬ', {
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#0f172a',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10004);

    const cardElements = [bg, badgeLabel, nameText, descText, selectBtn, selectText];
    this.elements.push(...cardElements);

    // Click/Hover Handlers
    bg.on('pointerover', () => {
      bg.setFillStyle(isEvo ? 0x713f12 : isConsumable ? 0x1e40af : 0x166534, 1);
      bg.setScale(1.03);
      selectBtn.setScale(1.03);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(bgColor, 0.95);
      bg.setScale(1.0);
      selectBtn.setScale(1.0);
    });

    bg.on('pointerdown', () => {
      this.platform.vibrate(40);
      this.hide();
      this.onUpgradeSelected(upgrade, levelToApply);
    });
  }

  hide(): void {
    this.clear();
    this.isVisible = false;
  }

  private clear(): void {
    for (const el of this.elements) {
      el.destroy();
    }
    this.elements = [];
  }

  destroy(): void {
    this.clear();
  }
}
