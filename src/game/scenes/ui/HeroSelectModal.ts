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

    // 2. Title & Subtitle Banner (Resting on a massive Sewer Pipe / Iron Plank)
    const titleY = Math.max(32, height * 0.075);
    const bannerW = Math.min(width - 48, 760);
    const bannerH = 56;

    const bannerGfx = this.scene.add.graphics().setDepth(10000).setScrollFactor(0);
    bannerGfx.fillStyle(0x070b13, 0.95);
    bannerGfx.lineStyle(2, 0x1e293b, 1);
    bannerGfx.fillRoundedRect(width / 2 - bannerW / 2, titleY - bannerH / 2 + 10, bannerW, bannerH, 10);
    bannerGfx.strokeRoundedRect(width / 2 - bannerW / 2, titleY - bannerH / 2 + 10, bannerW, bannerH, 10);

    // Pipe rivet bolts on sides
    bannerGfx.fillStyle(0x334155, 1);
    bannerGfx.fillCircle(width / 2 - bannerW / 2 + 14, titleY + 10, 4);
    bannerGfx.fillCircle(width / 2 + bannerW / 2 - 14, titleY + 10, 4);

    const title = this.scene.add
      .text(width / 2, titleY - 2, 'ВЫБОР МУТАНТА', {
        fontSize: width < 700 ? '24px' : '32px',
        color: '#4ade80',
        fontFamily: 'Boingster',
        stroke: '#064e3b',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10001);

    const subtitle = this.scene.add
      .text(width / 2, titleY + 23, 'Выбери своего героя канализации:', {
        fontSize: width < 700 ? '11px' : '13px',
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

    this.elements.push(bannerGfx, title, subtitle, closeBtn);

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
    const centerY = titleY + 44 + cardHeight / 2;

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

    // 1. Outer Card Box with Multi-layer Glow & Corner Accents
    const cardBg = this.scene.add.graphics();
    const bgColor = 0x060911; // Solid dark background

    if (isSelected) {
      // 3-layer soft green slime glow
      cardBg.lineStyle(14 * scale, 0x22c55e, 0.08);
      cardBg.strokeRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 12);
      cardBg.lineStyle(8 * scale, 0x22c55e, 0.18);
      cardBg.strokeRoundedRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 10);
      cardBg.lineStyle(3 * scale, 0x4ade80, 1.0);
      cardBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);

      // Slime/metallic corner accents
      cardBg.fillStyle(0x4ade80, 1);
      const cSize = 7 * scale;
      cardBg.fillRect(-w / 2, -h / 2, cSize, 2.5);
      cardBg.fillRect(-w / 2, -h / 2, 2.5, cSize);
      cardBg.fillRect(w / 2 - cSize, -h / 2, cSize, 2.5);
      cardBg.fillRect(w / 2 - 2.5, -h / 2, 2.5, cSize);
      cardBg.fillRect(-w / 2, h / 2 - 2.5, cSize, 2.5);
      cardBg.fillRect(-w / 2, h / 2 - cSize, 2.5, cSize);
      cardBg.fillRect(w / 2 - cSize, h / 2 - 2.5, cSize, 2.5);
      cardBg.fillRect(w / 2 - 2.5, h / 2 - cSize, 2.5, cSize);
    } else {
      cardBg.lineStyle(isUnlocked ? 1.8 : 1.2, isUnlocked ? 0x334155 : 0x1e293b, 1);
      cardBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    }

    cardBg.fillStyle(bgColor, 0.98);
    cardBg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);

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

    // 3. Stats Panel (3 Columns with Dividers & +30% Larger Numbers)
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
    const statsLblY = statsPanelY + Math.round(11 * scale);

    const statColor = isUnlocked ? '#ffffff' : '#64748b';
    const labelColor = isUnlocked ? '#e2e8f0' : '#475569';
    const statFontSize = Math.round(16 * scale) + 'px'; // +25-30% larger
    const labelFontSize = Math.round(10.5 * scale) + 'px';

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

    // 4. Trait Card with Unified Iron Plate Icon Box
    const traitPanelW = w - 14;
    const traitPanelY = statsPanelY + statsPanelH / 2 + 5 + traitPanelH / 2;

    const traitGfx = this.scene.add.graphics();
    traitGfx.fillStyle(0x0a0f1a, 0.95);
    traitGfx.lineStyle(1, 0x1e293b, 1);
    traitGfx.fillRoundedRect(-traitPanelW / 2, traitPanelY - traitPanelH / 2, traitPanelW, traitPanelH, 6);
    traitGfx.strokeRoundedRect(-traitPanelW / 2, traitPanelY - traitPanelH / 2, traitPanelW, traitPanelH, 6);

    // Unified Iron Box for all 4 trait icons
    const iconBoxSize = Math.round(44 * scale);
    const iconBoxX = -traitPanelW / 2 + 6 + iconBoxSize / 2;
    const iconBoxY = traitPanelY;

    traitGfx.fillStyle(isUnlocked ? 0x052e16 : 0x070b13, 0.95);
    traitGfx.lineStyle(1.5, isUnlocked ? 0x15803d : 0x1e293b, 1);
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

    // 5. 3D Comic Action Button (Clean Status vs Action CTA Logic)
    const btnW = Math.min(w - 20, Math.round(195 * scale));
    const btnY = traitPanelY + traitPanelH / 2 + 6 + btnH / 2;

    const btnTex = isSelected
      ? 'btn_frame_dark' // Calm dark-emerald status plate for selected
      : isUnlocked
      ? 'btn_frame_green' // Juicy primary CTA for available heroes
      : 'btn_frame_dark';

    const btnImage = this.scene.add.image(0, btnY, btnTex);
    btnImage.setDisplaySize(btnW, btnH);
    if (isSelected) {
      btnImage.setTint(0x1e3a29); // Subtle emerald sheen
    }

    const btnLabelStr = isSelected
      ? '✓ АКТИВЕН'
      : isUnlocked
      ? 'ВЫБРАТЬ'
      : 'ЗАКРЫТО';

    const btnLabelColor = isSelected
      ? '#86efac'
      : isUnlocked
      ? '#ffffff'
      : '#64748b';

    const btnLabelStroke = isSelected
      ? '#064e3b'
      : isUnlocked
      ? '#064e3b'
      : '#0f172a';

    const btnLabel = this.scene.add
      .text(0, btnY, btnLabelStr, {
        fontSize: Math.round(15 * scale) + 'px',
        color: btnLabelColor,
        fontFamily: 'Gagalin',
        stroke: btnLabelStroke,
        strokeThickness: Math.round(3.5 * scale),
      })
      .setOrigin(0.5);

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
      btnLabel,
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
          btnImage.setTint(0xe2fbe8);
          btnLabel.setScale(1.06);
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
        btnImage.clearTint();
        btnLabel.setScale(1.0);
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

