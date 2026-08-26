import Phaser from 'phaser';
import { ALL_HEROES } from '../../data/heroes';
import type { HeroDefinition } from '../../data/definitions';
import { SaveManager } from '../../core/SaveManager';
import { createPlatformAdapter } from '../../../platform';
import { AudioManager } from '../../audio/AudioManager';

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
      .rectangle(width / 2, height / 2, width, height, 0x050811, 0.94)
      .setScrollFactor(0)
      .setDepth(10000)
      .setInteractive();
    this.elements.push(overlay);

    // 2. Title & Subtitle Banner
    const titleY = Math.max(30, height * 0.07);
    const title = this.scene.add
      .text(width / 2, titleY, 'ВЫБОР МУТАНТА', {
        fontSize: width < 700 ? '26px' : '34px',
        color: '#4ade80',
        fontFamily: 'Boingster',
        stroke: '#064e3b',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10001);

    const subtitle = this.scene.add
      .text(width / 2, titleY + 30, 'Выбери своего героя канализации:', {
        fontSize: width < 700 ? '12px' : '14px',
        color: '#94a3b8',
        fontFamily: 'NarisovanniySANS',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10001);

    // Close Button (Top Right)
    const closeBtn = this.scene.add
      .text(width - 36, titleY, '✕', {
        fontSize: '26px',
        color: '#ef4444',
        fontFamily: 'Boingster',
        stroke: '#450a0a',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10001)
      .setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => {
      this.platform.vibrate(20);
      AudioManager.getInstance().playClick();
      this.hide();
    });

    this.elements.push(title, subtitle, closeBtn);

    // 3. Render 4 Hero Cards in a Single Horizontal Row (Landscape)
    const totalHeroes = ALL_HEROES.length;
    const availableWidth = width - 64;
    const availableHeight = height - titleY - 60;

    // Responsive scaling based on viewport size (mobile -> tablet -> desktop)
    const targetCardHeight = Math.min(680, Math.max(440, Math.floor(availableHeight * 0.94)));
    const scale = Math.min(1.45, Math.max(0.9, targetCardHeight / 460));

    const spacing = Math.min(22, Math.max(8, Math.floor(14 * scale)));
    const maxCardW = Math.floor((availableWidth - (totalHeroes - 1) * spacing) / totalHeroes);
    const cardWidth = Math.min(320, Math.max(220, maxCardW));

    // Dynamic tight card height with proportional scaling
    const posterW = cardWidth - 10;
    const posterH = Math.round(posterW * 1.05);
    const statsPanelH = Math.round(44 * scale);
    const traitPanelH = Math.round(66 * scale);
    const scaledBtnH = Math.round(46 * scale);
    const cardPadding = Math.round(6 * scale);
    const gap = Math.round(5 * scale);

    const cardHeight = cardPadding + posterH + gap + statsPanelH + gap + traitPanelH + gap + scaledBtnH + cardPadding + 2;

    const totalRowW = totalHeroes * cardWidth + (totalHeroes - 1) * spacing;
    const startX = (width - totalRowW) / 2 + cardWidth / 2;
    const centerY = titleY + 40 + cardHeight / 2;

    ALL_HEROES.forEach((hero, index) => {
      const cardX = startX + index * (cardWidth + spacing);
      const isSelected = hero.id === currentSelectedId;
      this.createHeroCard(hero, cardX, centerY, cardWidth, cardHeight, posterH, statsPanelH, traitPanelH, scaledBtnH, scale, isSelected);
    });
  }

  private createHeroCard(
    hero: HeroDefinition,
    x: number,
    y: number,
    w: number,
    h: number,
    posterH: number,
    statsPanelH: number,
    traitPanelH: number,
    btnH: number,
    scale: number,
    isSelected: boolean
  ): void {
    const cardContainer = this.scene.add.container(x, y).setDepth(10002).setScrollFactor(0);

    // Check Hero Unlock State
    const isDev = typeof window !== 'undefined' && (
      (window as any).__DEV_HEROES__ === true ||
      localStorage.getItem('dev_heroes_unlocked') === 'true' ||
      window.location.search.includes('hero=markovka') ||
      window.location.search.includes('dev=1')
    );

    const isUnlocked = hero.id === 'hero_vypolzok' || hero.id === 'hero_worm' || (hero.id === 'hero_markovka' && isDev);

    // 1. Outer Card Box with Dark Comic Theme & Active Neon Glow
    const cardBg = this.scene.add.graphics();
    const bgColor = 0x060911; // Solid dark background
    const borderColor = isSelected ? 0x22c55e : (isUnlocked ? 0x334155 : 0x1e293b);
    const borderWidth = isSelected ? 3.5 : 1.5;

    // Glow for selected
    if (isSelected) {
      cardBg.lineStyle(6 * scale, 0x22c55e, 0.25);
      cardBg.strokeRoundedRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 10);
    }

    cardBg.fillStyle(bgColor, 0.98);
    cardBg.lineStyle(borderWidth, borderColor, 1);
    cardBg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    cardBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);

    // 2. Poster Art (Positioned tightly at top)
    const posterW = w - 10;
    const posterY = -h / 2 + 5 + posterH / 2;

    const posterKey = hero.posterKey || 'hero_card_worm';
    const posterImage = this.scene.add.image(0, posterY, posterKey);
    posterImage.setDisplaySize(posterW, posterH);

    // Mask for rounded corners on poster
    const posterMaskGfx = this.scene.make.graphics({ x: 0, y: 0 });
    posterMaskGfx.fillStyle(0xffffff, 1);
    posterMaskGfx.fillRoundedRect(x - posterW / 2, y + posterY - posterH / 2, posterW, posterH, 6);
    posterImage.setMask(posterMaskGfx.createGeometryMask());

    if (!isUnlocked) {
      posterImage.setTint(0x334155);
    }

    // 3. Stats Panel (3 Columns with Dividers)
    const statsPanelW = w - 14;
    const statsPanelY = posterY + posterH / 2 + 5 + statsPanelH / 2;

    const statsGfx = this.scene.add.graphics();
    statsGfx.fillStyle(0x0a0f1a, 0.95);
    statsGfx.lineStyle(1, 0x1e293b, 1);
    statsGfx.fillRoundedRect(-statsPanelW / 2, statsPanelY - statsPanelH / 2, statsPanelW, statsPanelH, 6);
    statsGfx.strokeRoundedRect(-statsPanelW / 2, statsPanelY - statsPanelH / 2, statsPanelW, statsPanelH, 6);

    // Vertical column dividers
    statsGfx.lineStyle(1, 0x1e293b, 0.9);
    const div1X = -statsPanelW / 6;
    const div2X = statsPanelW / 6;
    const divTopY = statsPanelY - statsPanelH / 2 + 5;
    const divBotY = statsPanelY + statsPanelH / 2 - 5;
    statsGfx.lineBetween(div1X, divTopY, div1X, divBotY);
    statsGfx.lineBetween(div2X, divTopY, div2X, divBotY);

    const col1X = -statsPanelW / 3;
    const col2X = 0;
    const col3X = statsPanelW / 3;
    const statsValY = statsPanelY - Math.round(9 * scale);
    const statsLblY = statsPanelY + Math.round(10 * scale);

    const statColor = isUnlocked ? '#f8fafc' : '#64748b';
    const labelColor = isUnlocked ? '#94a3b8' : '#475569';
    const statFontSize = Math.round(13 * scale) + 'px';
    const labelFontSize = Math.round(10 * scale) + 'px';

    // Col 1: HP
    const hpVal = this.scene.add
      .text(col1X, statsValY, `💖 ${hero.stats.maxHp}`, {
        fontSize: statFontSize,
        color: statColor,
        fontFamily: 'Boingster',
      })
      .setOrigin(0.5);
    const hpLbl = this.scene.add
      .text(col1X, statsLblY, 'ЗДОРОВЬЕ', {
        fontSize: labelFontSize,
        color: labelColor,
        fontFamily: 'NarisovanniySANS',
      })
      .setOrigin(0.5);

    // Col 2: SPD
    const spdVal = this.scene.add
      .text(col2X, statsValY, `⚡ ${hero.stats.speed}`, {
        fontSize: statFontSize,
        color: statColor,
        fontFamily: 'Boingster',
      })
      .setOrigin(0.5);
    const spdLbl = this.scene.add
      .text(col2X, statsLblY, 'СКОРОСТЬ', {
        fontSize: labelFontSize,
        color: labelColor,
        fontFamily: 'NarisovanniySANS',
      })
      .setOrigin(0.5);

    // Col 3: DMG
    const dmgVal = this.scene.add
      .text(col3X, statsValY, `⚔️ ${hero.stats.damage}`, {
        fontSize: statFontSize,
        color: statColor,
        fontFamily: 'Boingster',
      })
      .setOrigin(0.5);
    const dmgLbl = this.scene.add
      .text(col3X, statsLblY, 'УРОН', {
        fontSize: labelFontSize,
        color: labelColor,
        fontFamily: 'NarisovanniySANS',
      })
      .setOrigin(0.5);

    // 4. Trait Card with Slime Icon Box
    const traitPanelW = w - 14;
    const traitPanelY = statsPanelY + statsPanelH / 2 + 5 + traitPanelH / 2;

    const traitGfx = this.scene.add.graphics();
    traitGfx.fillStyle(0x0a0f1a, 0.95);
    traitGfx.lineStyle(1, 0x1e293b, 1);
    traitGfx.fillRoundedRect(-traitPanelW / 2, traitPanelY - traitPanelH / 2, traitPanelW, traitPanelH, 6);
    traitGfx.strokeRoundedRect(-traitPanelW / 2, traitPanelY - traitPanelH / 2, traitPanelW, traitPanelH, 6);

    // Slime Icon Badge on the left
    const iconBoxSize = Math.round(44 * scale);
    const iconBoxX = -traitPanelW / 2 + 6 + iconBoxSize / 2;
    const iconBoxY = traitPanelY;

    traitGfx.fillStyle(isUnlocked ? 0x052e16 : 0x0f172a, 0.9);
    traitGfx.lineStyle(1, isUnlocked ? 0x15803d : 0x1e293b, 1);
    traitGfx.fillRoundedRect(iconBoxX - iconBoxSize / 2, iconBoxY - iconBoxSize / 2, iconBoxSize, iconBoxSize, 6);
    traitGfx.strokeRoundedRect(iconBoxX - iconBoxSize / 2, iconBoxY - iconBoxSize / 2, iconBoxSize, iconBoxSize, 6);

    const traitIconMap: Record<string, string> = {
      hero_vypolzok: '🧪',
      hero_worm: '🧪',
      hero_bashmak: '🥾',
      hero_markovka: '✖️',
      hero_baklazhan: '💀',
    };
    const traitIconSymbol = this.scene.add
      .text(iconBoxX, iconBoxY, isUnlocked ? (traitIconMap[hero.id] || '⚡') : '🔒', {
        fontSize: Math.round(22 * scale) + 'px',
      })
      .setOrigin(0.5);

    // Trait Content (Title & Multi-line description)
    const textStartX = iconBoxX + iconBoxSize / 2 + 6;
    const textAvailableW = traitPanelW - (iconBoxSize + 16);

    const traitHeader = this.scene.add
      .text(textStartX, traitPanelY - traitPanelH / 2 + Math.round(6 * scale), `${(hero.trait?.name || 'ТРЕЙТ').toUpperCase()}:`, {
        fontSize: Math.round(13 * scale) + 'px',
        color: isUnlocked ? '#4ade80' : '#475569',
        fontFamily: 'Boingster',
        stroke: isUnlocked ? '#064e3b' : '#0f172a',
        strokeThickness: 2,
      })
      .setOrigin(0, 0);

    const traitDesc = this.scene.add
      .text(textStartX, traitPanelY - traitPanelH / 2 + Math.round(24 * scale), hero.trait?.description || '', {
        fontSize: Math.round(11 * scale) + 'px',
        color: isUnlocked ? '#e2e8f0' : '#475569',
        fontFamily: 'NarisovanniySANS',
        align: 'left',
        wordWrap: { width: textAvailableW },
        lineSpacing: 1.5,
      })
      .setOrigin(0, 0);

    // 5. 3D Comic Action Button (Positioned tightly at the bottom)
    const btnW = Math.min(w - 20, Math.round(195 * scale));
    const btnY = traitPanelY + traitPanelH / 2 + 6 + btnH / 2;

    const btnTex = isSelected
      ? 'btn_comic_gold'
      : isUnlocked
      ? 'btn_comic_green'
      : 'btn_comic_dark';

    const btnImage = this.scene.add.image(0, btnY, btnTex);
    btnImage.setDisplaySize(btnW, btnH);

    // Active Selection Top Badge
    let activeBadge: Phaser.GameObjects.Text | null = null;
    if (isSelected) {
      activeBadge = this.scene.add
        .text(0, -h / 2 + Math.round(12 * scale), '★ ACTIVE ★', {
          fontSize: Math.round(11 * scale) + 'px',
          color: '#facc15',
          fontFamily: 'Boingster',
          stroke: '#451a03',
          strokeThickness: 3,
        })
        .setOrigin(0.5);
    } else if (!isUnlocked) {
      activeBadge = this.scene.add
        .text(0, -h / 2 + Math.round(12 * scale), '🔒 СКОРО', {
          fontSize: Math.round(11 * scale) + 'px',
          color: '#94a3b8',
          fontFamily: 'Boingster',
          stroke: '#0f172a',
          strokeThickness: 2.5,
        })
        .setOrigin(0.5);
    }

    const containerItems = [
      cardBg,
      posterImage,
      statsGfx,
      hpVal,
      hpLbl,
      spdVal,
      spdLbl,
      dmgVal,
      dmgLbl,
      traitGfx,
      traitIconSymbol,
      traitHeader,
      traitDesc,
      btnImage,
    ];
    if (activeBadge) containerItems.push(activeBadge);

    cardContainer.add(containerItems);
    this.elements.push(cardContainer, posterMaskGfx);

    if (isUnlocked) {
      const hitArea = this.scene.add
        .rectangle(x, y, w, h, 0x000000, 0.001)
        .setScrollFactor(0)
        .setDepth(10005)
        .setInteractive({ useHandCursor: true });

      hitArea.on('pointerover', () => {
        if (!isSelected) {
          btnImage.setTexture('btn_comic_green_hover');
        }
        this.scene.tweens.add({
          targets: cardContainer,
          scaleX: 1.03,
          scaleY: 1.03,
          duration: 100,
          ease: 'Quad.easeOut',
        });
      });

      hitArea.on('pointerout', () => {
        btnImage.setTexture(btnTex);
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
        AudioManager.getInstance().playClick();
        SaveManager.getInstance().setSelectedHeroId(hero.id);
        this.onHeroSelected(hero);
        this.show(); // Re-render view
      });

      this.elements.push(hitArea);
    }
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

