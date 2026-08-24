import Phaser from 'phaser';
import type { UpgradeDefinition } from '../../data/definitions';
import { ALL_UPGRADES } from '../../data/upgrades';
import { GameState } from '../../core/GameState';
import { createPlatformAdapter } from '../../../platform';
import { getReadyEvolution, type EvolutionRecipe } from '../../data/evolutions';
import { AudioManager } from '../../audio/AudioManager';

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
    const isPortrait = width < 760 || width < height;

    // 1. Semi-transparent dark overlay (Depth: 10000)
    const overlay = this.scene.add
      .rectangle(width / 2, height / 2, width, height, 0x090d16, 0.88)
      .setScrollFactor(0)
      .setDepth(10000)
      .setInteractive(); // Blocks game clicks beneath
    this.elements.push(overlay);

    // 2. Title Banner (Depth: 10001)
    const titleY = isPortrait ? Math.max(30, height * 0.05) : Math.max(45, height * 0.1);
    const subtitleY = titleY + (isPortrait ? 28 : 42);

    const title = this.scene.add
      .text(width / 2, titleY, 'LEVEL UP!', {
        fontSize: isPortrait ? '28px' : '42px',
        fontStyle: 'bold',
        color: '#4ade80',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10001);

    const subtitle = this.scene.add
      .text(width / 2, subtitleY, 'Выбери развитие билда червяка:', {
        fontSize: isPortrait ? '13px' : '17px',
        color: '#cbd5e1',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10001);

    this.elements.push(title, subtitle);

    // 3. Check for ready weapon evolution
    const gameState = GameState.getInstance();
    const readyEvo = getReadyEvolution(gameState);

    const neededNormalCount = readyEvo ? 2 : 3;
    const options = gameState.getEligibleUpgrades(ALL_UPGRADES, neededNormalCount);
    const totalCards = (readyEvo ? 1 : 0) + options.length;

    let currentIdx = 0;

    if (isPortrait) {
      const topOffset = subtitleY + 20;
      const bottomMargin = 15;
      const availableH = height - topOffset - bottomMargin;
      const spacing = 10;
      const cardHeight = Math.min(135, Math.floor((availableH - (totalCards - 1) * spacing) / totalCards));
      const cardWidth = Math.min(width - 32, 420);
      const startY = topOffset + cardHeight / 2;

      if (readyEvo) {
        const cardY = startY + currentIdx * (cardHeight + spacing);
        this.createEvolutionCard(readyEvo, width / 2, cardY, cardWidth, cardHeight, true);
        currentIdx++;
      }

      options.forEach((opt) => {
        const cardY = startY + currentIdx * (cardHeight + spacing);
        this.createCard(opt.upgrade, opt.levelToApply, width / 2, cardY, cardWidth, cardHeight, true);
        currentIdx++;
      });
    } else {
      const cardWidth = Math.min(320, (width - 60) / Math.max(1, totalCards) - 15);
      const cardHeight = Math.min(380, height - subtitleY - 50);
      const spacing = 20;
      const totalW = totalCards * cardWidth + (totalCards - 1) * spacing;
      const startX = (width - totalW) / 2 + cardWidth / 2;
      const cardY = subtitleY + 25 + cardHeight / 2;

      if (readyEvo) {
        const cardX = startX + currentIdx * (cardWidth + spacing);
        this.createEvolutionCard(readyEvo, cardX, cardY, cardWidth, cardHeight, false);
        currentIdx++;
      }

      options.forEach((opt) => {
        const cardX = startX + currentIdx * (cardWidth + spacing);
        this.createCard(opt.upgrade, opt.levelToApply, cardX, cardY, cardWidth, cardHeight, false);
        currentIdx++;
      });
    }
  }

  private createEvolutionCard(
    evo: EvolutionRecipe,
    x: number,
    y: number,
    w: number,
    h: number,
    isCompact = false
  ): void {
    const borderColor = 0xfacc15;
    const bgColor = 0x581c87;

    const bg = this.scene.add
      .rectangle(x, y, w, h, bgColor, 0.98)
      .setScrollFactor(0)
      .setDepth(10002)
      .setStrokeStyle(isCompact ? 2 : 4, borderColor)
      .setInteractive({ useHandCursor: true });

    const badgeLabel = this.scene.add
      .text(x, isCompact ? y - h / 2 + 14 : y - h / 2 + 32, '👑 СУПЕР-ЭВОЛЮЦИЯ', {
        fontSize: isCompact ? '11px' : '15px',
        fontStyle: 'bold',
        color: '#facc15',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10003);

    const nameText = this.scene.add
      .text(x, isCompact ? y - h / 2 + 34 : y - h / 2 + 75, evo.comicTitle, {
        fontSize: isCompact ? '16px' : '20px',
        fontStyle: 'bold',
        color: '#fef08a',
        fontFamily: 'monospace',
        align: 'center',
        wordWrap: { width: w - 30 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10003);

    const descText = this.scene.add
      .text(x, isCompact ? y + 4 : y + 10, evo.description, {
        fontSize: isCompact ? '12px' : '14px',
        color: '#f3e8ff',
        fontFamily: 'monospace',
        align: 'center',
        wordWrap: { width: w - 35 },
        lineSpacing: isCompact ? 2 : 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10003);

    const btnH = isCompact ? 26 : 44;
    const selectBtn = this.scene.add
      .rectangle(x, y + h / 2 - (isCompact ? 18 : 40), w - (isCompact ? 40 : 50), btnH, 0xfacc15, 0.95)
      .setScrollFactor(0)
      .setDepth(10003);

    const selectText = this.scene.add
      .text(x, y + h / 2 - (isCompact ? 18 : 40), 'МУТИРОВАТЬ!', {
        fontSize: isCompact ? '12px' : '16px',
        fontStyle: 'bold',
        color: '#0f172a',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10004);

    this.elements.push(bg, badgeLabel, nameText, descText, selectBtn, selectText);

    // Pulsing gold glow
    this.scene.tweens.add({
      targets: bg,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    bg.on('pointerdown', () => {
      this.platform.vibrate(60);
      AudioManager.getInstance().playLevelUp();
      evo.apply(GameState.getInstance());
      this.hide();
      this.onUpgradeSelected(
        {
          id: evo.id,
          name: evo.name,
          maxLevel: 1,
          levels: [],
        },
        1
      );
    });
  }

  private createCard(
    upgrade: UpgradeDefinition,
    levelToApply: number,
    x: number,
    y: number,
    w: number,
    h: number,
    isCompact = false
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
      .setStrokeStyle(isCompact ? 2 : 3, borderColor)
      .setInteractive({ useHandCursor: true });

    // Level Header / Badge (Depth: 10003)
    let badgeText = upgrade.category === 'weapon' ? '⚔️ ОРУЖИЕ' : upgrade.category === 'tome' ? '📜 ФОЛИАНТ' : 'НОВАЯ МУТАЦИЯ';
    if (isConsumable) {
      badgeText = '🧪 РАСХОДНИК';
    } else if (levelToApply > 1) {
      const catPrefix = upgrade.category === 'weapon' ? '⚔️ ОРУЖИЕ' : upgrade.category === 'tome' ? '📜 ФОЛИАНТ' : '';
      badgeText = `${catPrefix} LVL ${levelToApply - 1} → ${levelToApply}`;
    }

    const badgeLabel = this.scene.add
      .text(x, isCompact ? y - h / 2 + 14 : y - h / 2 + 25, badgeText, {
        fontSize: isCompact ? '11px' : '13px',
        fontStyle: 'bold',
        color: isEvo ? '#fef08a' : isConsumable ? '#93c5fd' : '#86efac',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10003);

    // Title
    const nameText = this.scene.add
      .text(x, isCompact ? y - h / 2 + 34 : y - h / 2 + 70, upgrade.name, {
        fontSize: isCompact ? '16px' : '20px',
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
      .text(x, isCompact ? y + 4 : y + 15, levelConfig?.description || '', {
        fontSize: isCompact ? '12px' : '15px',
        color: '#e2e8f0',
        fontFamily: 'monospace',
        align: 'center',
        wordWrap: { width: w - 35 },
        lineSpacing: isCompact ? 2 : 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10003);

    // Choose Button at bottom
    const btnH = isCompact ? 26 : 44;
    const selectBtn = this.scene.add
      .rectangle(x, y + h / 2 - (isCompact ? 18 : 40), w - (isCompact ? 40 : 50), btnH, borderColor, 0.9)
      .setScrollFactor(0)
      .setDepth(10003);

    const selectText = this.scene.add
      .text(x, y + h / 2 - (isCompact ? 18 : 40), 'ВЫБРАТЬ', {
        fontSize: isCompact ? '12px' : '16px',
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
      bg.setScale(1.02);
      selectBtn.setScale(1.02);
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
