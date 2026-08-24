import Phaser from 'phaser';
import { ALL_HEROES } from '../../data/heroes';
import type { HeroDefinition } from '../../data/definitions';
import { SaveManager } from '../../core/SaveManager';
import { createPlatformAdapter } from '../../../platform';

export class HeroSelectModal {
  private scene: Phaser.Scene;
  private onHeroSelected: (hero: HeroDefinition) => void;
  private platform = createPlatformAdapter();
  private elements: Phaser.GameObjects.GameObject[] = [];
  public isVisible = false;

  constructor(scene: Phaser.Scene, onHeroSelected: (hero: HeroDefinition) => void) {
    this.scene = scene;
    this.onHeroSelected = onHeroSelected;
  }

  show(): void {
    this.clear();
    this.isVisible = true;
    const { width, height } = this.scene.cameras.main;
    const saveManager = SaveManager.getInstance();
    const currentSelectedId = saveManager.getSelectedHeroId();

    // 1. Dark Backdrop Overlay
    const overlay = this.scene.add
      .rectangle(width / 2, height / 2, width, height, 0x090d16, 0.92)
      .setScrollFactor(0)
      .setDepth(10000)
      .setInteractive();
    this.elements.push(overlay);

    // 2. Title & Comic Subtitle
    const title = this.scene.add
      .text(width / 2, 45, 'HERO SELECTION', {
        fontSize: '34px',
        fontStyle: 'bold',
        color: '#4ade80',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10001);

    const subtitle = this.scene.add
      .text(width / 2, 85, 'Выбери своего мутанта для забега:', {
        fontSize: '16px',
        color: '#94a3b8',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10001);

    // Close Button (Top Right)
    const closeBtn = this.scene.add
      .text(width - 40, 40, '✕', {
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#f87171',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10001)
      .setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => {
      this.platform.vibrate(20);
      this.hide();
    });

    this.elements.push(title, subtitle, closeBtn);

    // 3. Render Hero Cards (2x2 grid in portrait, 4 in a row in landscape)
    const isPortrait = width < 850 || width < height;

    if (isPortrait) {
      const cardWidth = Math.min((width - 40) / 2, 185);
      const cardHeight = Math.min((height - 120) / 2, 270);
      const gapX = 12;
      const gapY = 12;
      const totalGridW = 2 * cardWidth + gapX;
      const startX = (width - totalGridW) / 2 + cardWidth / 2;
      const startY = 100 + cardHeight / 2;

      ALL_HEROES.forEach((hero, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const cardX = startX + col * (cardWidth + gapX);
        const cardY = startY + row * (cardHeight + gapY);
        const isSelected = hero.id === currentSelectedId;
        this.createHeroCard(hero, cardX, cardY, cardWidth, cardHeight, isSelected, true);
      });
    } else {
      const cardWidth = Math.min(240, (width - 60) / ALL_HEROES.length - 15);
      const cardHeight = Math.min(440, height - 120);
      const gap = 16;
      const totalRowWidth = ALL_HEROES.length * cardWidth + (ALL_HEROES.length - 1) * gap;
      const startX = (width - totalRowWidth) / 2 + cardWidth / 2;
      const centerY = height / 2 + 30;

      ALL_HEROES.forEach((hero, index) => {
        const cardX = startX + index * (cardWidth + gap);
        const isSelected = hero.id === currentSelectedId;
        this.createHeroCard(hero, cardX, centerY, cardWidth, cardHeight, isSelected, false);
      });
    }
  }

  private createHeroCard(
    hero: HeroDefinition,
    x: number,
    y: number,
    w: number,
    h: number,
    isSelected: boolean,
    isCompact = false
  ): void {
    const cardContainer = this.scene.add.container(x, y).setDepth(10002).setScrollFactor(0);

    // Background Panel
    const cardBg = this.scene.add.graphics();
    const bgColor = isSelected ? 0x14532d : 0x1e293b;
    const borderColor = isSelected ? 0x4ade80 : 0x475569;
    const borderWidth = isSelected ? 3 : 1.5;

    cardBg.fillStyle(bgColor, 0.95);
    cardBg.lineStyle(borderWidth, borderColor, 1);
    cardBg.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    cardBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);

    // Selected Badge
    let selectedBadge: Phaser.GameObjects.Text | null = null;
    if (isSelected) {
      selectedBadge = this.scene.add
        .text(0, -h / 2 + 18, '★ ACTIVE ★', {
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#4ade80',
          fontFamily: 'monospace',
        })
        .setOrigin(0.5);
    }

    // Hero Portrait / Sprite
    const portraitKey = hero.portraitKey || hero.textureKey || 'tony_portrait';
    const portrait = this.scene.add.image(0, isCompact ? -h / 2 + 45 : -h / 2 + 75, portraitKey);
    portrait.setDisplaySize(isCompact ? 48 : 70, isCompact ? 48 : 70);

    // Hero Name & Comic Tag
    const nameText = this.scene.add
      .text(0, isCompact ? -h / 2 + 78 : -h / 2 + 125, hero.name, {
        fontSize: isCompact ? '14px' : '18px',
        fontStyle: 'bold',
        color: isSelected ? '#4ade80' : '#ffffff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    const titleText = this.scene.add
      .text(0, isCompact ? -h / 2 + 94 : -h / 2 + 145, hero.comicTitle || '', {
        fontSize: isCompact ? '9px' : '11px',
        color: '#facc15',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    // Stats Grid
    const statsY = isCompact ? -h / 2 + 110 : -h / 2 + 180;
    const statsLines = isCompact
      ? [`HP:${hero.stats.maxHp} SPD:${hero.stats.speed}`, `DMG:${hero.stats.damage} DEF:${hero.stats.armor ?? 0}`]
      : [
          `HP: ${hero.stats.maxHp}  |  SPD: ${hero.stats.speed}`,
          `DMG: ${hero.stats.damage}  |  ARMOR: ${hero.stats.armor ?? 0}`,
          `ATK SPD: ${hero.stats.attackSpeed ?? 1.0}×`,
        ];

    const statsText = this.scene.add
      .text(0, statsY, statsLines.join('\n'), {
        fontSize: isCompact ? '10px' : '12px',
        color: '#cbd5e1',
        fontFamily: 'monospace',
        align: 'center',
        lineSpacing: isCompact ? 2 : 4,
      })
      .setOrigin(0.5, 0);

    // Trait Section
    const traitY = isCompact ? -h / 2 + 150 : -h / 2 + 255;
    const traitHeader = this.scene.add
      .text(0, traitY, `⚡ ${hero.trait?.name || 'Трейт'}:`, {
        fontSize: isCompact ? '10px' : '12px',
        fontStyle: 'bold',
        color: '#38bdf8',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5, 0);

    const traitDesc = this.scene.add
      .text(0, traitY + (isCompact ? 13 : 18), hero.trait?.description || '', {
        fontSize: isCompact ? '9px' : '11px',
        color: '#94a3b8',
        fontFamily: 'monospace',
        align: 'center',
        wordWrap: { width: w - (isCompact ? 16 : 24) },
        lineSpacing: 1,
      })
      .setOrigin(0.5, 0);

    // Select Button
    const btnH = isCompact ? 26 : 36;
    const btnY = h / 2 - (isCompact ? 20 : 35);
    const btnBg = this.scene.add.graphics();
    const btnColor = isSelected ? 0x22c55e : 0x3b82f6;
    btnBg.fillStyle(btnColor, 1);
    btnBg.fillRoundedRect(-w / 2 + (isCompact ? 12 : 20), btnY - btnH / 2, w - (isCompact ? 24 : 40), btnH, 6);

    const btnText = this.scene.add
      .text(0, btnY, isSelected ? 'ВЫБРАН' : 'ВЫБРАТЬ', {
        fontSize: isCompact ? '11px' : '14px',
        fontStyle: 'bold',
        color: '#ffffff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    // Make whole card or button interactive
    const hitArea = this.scene.add
      .rectangle(0, 0, w, h, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    hitArea.on('pointerover', () => {
      this.scene.tweens.add({
        targets: cardContainer,
        scaleX: 1.03,
        scaleY: 1.03,
        duration: 100,
        ease: 'Quad.easeOut',
      });
    });

    hitArea.on('pointerout', () => {
      this.scene.tweens.add({
        targets: cardContainer,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 100,
        ease: 'Quad.easeOut',
      });
    });

    hitArea.on('pointerdown', () => {
      this.platform.vibrate(35);
      SaveManager.getInstance().setSelectedHeroId(hero.id);
      this.onHeroSelected(hero);
      this.show(); // Refresh view with new active state
    });

    const elementsToAdd = [
      cardBg,
      portrait,
      nameText,
      titleText,
      statsText,
      traitHeader,
      traitDesc,
      btnBg,
      btnText,
      hitArea,
    ];
    if (selectedBadge) {
      elementsToAdd.push(selectedBadge);
    }

    cardContainer.add(elementsToAdd);
    this.elements.push(cardContainer);
  }

  hide(): void {
    this.clear();
    this.isVisible = false;
  }

  private clear(): void {
    this.elements.forEach((el) => el.destroy());
    this.elements = [];
  }
}
