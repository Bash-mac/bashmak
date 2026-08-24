import Phaser from 'phaser';
import { EVOLUTION_RECIPES } from '../../data/evolutions';
import { GameState } from '../../core/GameState';
import { AudioManager } from '../../audio/AudioManager';

export class GrimoireModal {
  private scene: Phaser.Scene;
  private elements: Phaser.GameObjects.GameObject[] = [];
  public isVisible = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(onClose?: () => void): void {
    this.clear();
    this.isVisible = true;
    const { width, height } = this.scene.cameras.main;
    const gameState = GameState.getInstance();

    // 1. Dark Backdrop
    const backdrop = this.scene.add
      .rectangle(width / 2, height / 2, width, height, 0x090d16, 0.92)
      .setScrollFactor(0)
      .setDepth(20000)
      .setInteractive();
    this.elements.push(backdrop);

    // 2. Grimoire Book Container Box
    const isPortrait = width < 650 || width < height;
    const bookW = Math.min(880, width - 24);
    const bookH = Math.min(580, height - 30);

    const bookBg = this.scene.add
      .rectangle(width / 2, height / 2, bookW, bookH, 0x1e1b4b, 0.98)
      .setScrollFactor(0)
      .setDepth(20001)
      .setStrokeStyle(isPortrait ? 2 : 4, 0xfacc15);
    this.elements.push(bookBg);

    // 3. Header Title
    const title = this.scene.add
      .text(width / 2, height / 2 - bookH / 2 + (isPortrait ? 30 : 45), '📖 ГРИМУАР МУТАЦИЙ', {
        fontSize: isPortrait ? '20px' : '32px',
        fontStyle: 'bold',
        color: '#facc15',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20002);

    const subtitle = this.scene.add
      .text(width / 2, height / 2 - bookH / 2 + (isPortrait ? 58 : 82), isPortrait ? 'Оружие (Lv.5) + Пассивка (Lv.5)' : 'Формулы супер-эволюций: Оружие (Lv.5) + Пассивка (Lv.5)', {
        fontSize: isPortrait ? '11px' : '15px',
        color: '#cbd5e1',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20002);
    this.elements.push(title, subtitle);

    // 4. Render 4 Evolution Recipe Cards
    const startY = height / 2 - bookH / 2 + (isPortrait ? 95 : 130);
    const rowH = isPortrait ? 78 : 88;
    const spacing = isPortrait ? 8 : 12;

    EVOLUTION_RECIPES.forEach((recipe, idx) => {
      const rowY = startY + idx * (rowH + spacing);
      const isEvolved = gameState.activeUpgrades.has(recipe.id);
      const weaponLvl = gameState.activeUpgrades.get(recipe.baseWeaponId) || 0;
      const tomeLvl = gameState.activeUpgrades.get(recipe.requiredTomeId) || 0;
      const isReady = weaponLvl >= 5 && tomeLvl >= 5 && !isEvolved;

      const cardColor = isEvolved ? 0x064e3b : isReady ? 0x78350f : 0x0f172a;
      const borderColor = isEvolved ? 0x34d399 : isReady ? 0xfacc15 : 0x334155;

      const card = this.scene.add
        .rectangle(width / 2, rowY, bookW - (isPortrait ? 20 : 50), rowH, cardColor, 0.95)
        .setScrollFactor(0)
        .setDepth(20002)
        .setStrokeStyle(isPortrait ? 1 : 2, borderColor);

      // Recipe Title & Formula
      const nameText = this.scene.add
        .text(width / 2 - bookW / 2 + (isPortrait ? 20 : 50), rowY - (isPortrait ? 24 : 22), recipe.comicTitle, {
          fontSize: isPortrait ? '13px' : '18px',
          fontStyle: 'bold',
          color: isEvolved ? '#34d399' : isReady ? '#facc15' : '#e2e8f0',
          fontFamily: 'monospace',
        })
        .setScrollFactor(0)
        .setDepth(20003);

      const formulaText = this.scene.add
        .text(width / 2 - bookW / 2 + (isPortrait ? 20 : 50), rowY - (isPortrait ? 4 : -3), `${recipe.baseWeaponName} (${weaponLvl}/5) ➕ ${recipe.requiredTomeName} (${tomeLvl}/5)`, {
          fontSize: isPortrait ? '10px' : '13px',
          color: '#94a3b8',
          fontFamily: 'monospace',
        })
        .setScrollFactor(0)
        .setDepth(20003);

      const statusTag = isEvolved
        ? '✅ АКТИВНО'
        : isReady
        ? '🔥 ГОТОВО'
        : '🔒 ЗАКРЫТО';
      const statusColor = isEvolved ? '#34d399' : isReady ? '#facc15' : '#64748b';

      let tagText: Phaser.GameObjects.Text;
      if (isPortrait) {
        tagText = this.scene.add
          .text(width / 2 - bookW / 2 + 20, rowY + 16, statusTag, {
            fontSize: '10px',
            fontStyle: 'bold',
            color: statusColor,
            fontFamily: 'monospace',
          })
          .setScrollFactor(0)
          .setDepth(20003);
      } else {
        tagText = this.scene.add
          .text(width / 2 + bookW / 2 - 65, rowY, statusTag, {
            fontSize: '14px',
            fontStyle: 'bold',
            color: statusColor,
            fontFamily: 'monospace',
          })
          .setOrigin(1, 0.5)
          .setScrollFactor(0)
          .setDepth(20003);
      }

      this.elements.push(card, nameText, formulaText, tagText);
    });

    // 5. Close Button
    const closeBtn = this.scene.add
      .rectangle(width / 2, height / 2 + bookH / 2 - 38, 220, 44, 0xef4444, 0.95)
      .setScrollFactor(0)
      .setDepth(20003)
      .setInteractive({ useHandCursor: true });

    const closeText = this.scene.add
      .text(width / 2, height / 2 + bookH / 2 - 38, 'ЗАКРЫТЬ (✕)', {
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffffff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20004);

    closeBtn.on('pointerdown', () => {
      AudioManager.getInstance().playClick();
      this.hide();
      onClose?.();
    });

    this.elements.push(closeBtn, closeText);
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
