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
        fontSize: width < 700 ? '24px' : '34px',
        fontStyle: 'bold',
        color: '#4ade80',
        fontFamily: 'monospace',
        stroke: '#064e3b',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10001);

    const subtitle = this.scene.add
      .text(width / 2, titleY + 30, 'Выбери своего героя канализации:', {
        fontSize: width < 700 ? '11px' : '14px',
        color: '#94a3b8',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10001);

    // Close Button (Top Right)
    const closeBtn = this.scene.add
      .text(width - 36, titleY, '✕', {
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#ef4444',
        fontFamily: 'monospace',
        stroke: '#450a0a',
        strokeThickness: 4,
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
    const availableWidth = width - 48;
    const spacing = Math.min(18, Math.max(8, (availableWidth - totalHeroes * 260) / (totalHeroes - 1)));
    const cardWidth = Math.min(270, Math.floor((availableWidth - (totalHeroes - 1) * spacing) / totalHeroes));
    const cardHeight = Math.min(540, Math.floor(height - titleY - 60));

    const totalRowW = totalHeroes * cardWidth + (totalHeroes - 1) * spacing;
    const startX = (width - totalRowW) / 2 + cardWidth / 2;
    const centerY = titleY + 45 + cardHeight / 2;

    ALL_HEROES.forEach((hero, index) => {
      const cardX = startX + index * (cardWidth + spacing);
      const isSelected = hero.id === currentSelectedId;
      this.createHeroCard(hero, cardX, centerY, cardWidth, cardHeight, isSelected);
    });
  }

  private createHeroCard(
    hero: HeroDefinition,
    x: number,
    y: number,
    w: number,
    h: number,
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

    // 1. Outer Card Box with Comic Border
    const cardBg = this.scene.add.graphics();
    const bgColor = isSelected ? 0x064e3b : (isUnlocked ? 0x0f172a : 0x090d16);
    const borderColor = isSelected ? 0x4ade80 : (isUnlocked ? 0x475569 : 0x1e293b);
    const borderWidth = isSelected ? 3.5 : 2;

    cardBg.fillStyle(bgColor, 0.95);
    cardBg.lineStyle(borderWidth, borderColor, 1);
    cardBg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    cardBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);

    // 2. Poster Art (512x768 master scaled to fit upper 58% of the card)
    const posterH = Math.floor(h * 0.58);
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

    // 3. Stats Strip (Under poster)
    const infoY = posterY + posterH / 2 + 16;
    const statsStr = `HP: ${hero.stats.maxHp}   SPD: ${hero.stats.speed}   DMG: ${hero.stats.damage}`;
    const statsText = this.scene.add
      .text(0, infoY, statsStr, {
        fontSize: w < 240 ? '10px' : '12px',
        fontStyle: 'bold',
        color: isUnlocked ? '#f8fafc' : '#64748b',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    // 4. Trait Block
    const traitY = infoY + 22;
    const traitHeader = this.scene.add
      .text(0, traitY, `⚡ ${hero.trait?.name || 'Трейт'}:`, {
        fontSize: w < 240 ? '10px' : '12px',
        fontStyle: 'bold',
        color: isUnlocked ? '#38bdf8' : '#475569',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    const traitDesc = this.scene.add
      .text(0, traitY + 16, hero.trait?.description || '', {
        fontSize: w < 240 ? '9px' : '10px',
        color: isUnlocked ? '#cbd5e1' : '#475569',
        fontFamily: 'monospace',
        align: 'center',
        wordWrap: { width: w - 16 },
        lineSpacing: 1,
      })
      .setOrigin(0.5, 0);

    // 5. 3D Comic Action Button
    const btnW = Math.min(w - 24, 200);
    const btnH = Math.min(48, Math.floor(btnW * 0.38));
    const btnY = h / 2 - btnH / 2 - 8;

    const btnTex = isSelected
      ? 'btn_comic_green'
      : isUnlocked
      ? 'btn_comic_green'
      : 'btn_comic_dark';

    const btnImage = this.scene.add.image(0, btnY, btnTex);
    btnImage.setDisplaySize(btnW, btnH);

    const btnLabel = isSelected ? 'ВЫБРАН' : (isUnlocked ? 'ВЫБРАТЬ' : 'ЗАКРЫТО');
    const btnTextColor = isSelected ? '#fef08a' : (isUnlocked ? '#ffffff' : '#64748b');

    const btnText = this.scene.add
      .text(0, btnY, btnLabel, {
        fontSize: w < 240 ? '12px' : '14px',
        fontStyle: 'bold',
        color: btnTextColor,
        fontFamily: 'monospace',
        stroke: isUnlocked ? '#064e3b' : '#0f172a',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Active Selection Top Badge
    let activeBadge: Phaser.GameObjects.Text | null = null;
    if (isSelected) {
      activeBadge = this.scene.add
        .text(0, -h / 2 + 14, '★ ACTIVE ★', {
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#facc15',
          fontFamily: 'monospace',
          stroke: '#451a03',
          strokeThickness: 3,
        })
        .setOrigin(0.5);
    } else if (!isUnlocked) {
      activeBadge = this.scene.add
        .text(0, -h / 2 + 14, '🔒 СКОРО', {
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#94a3b8',
          fontFamily: 'monospace',
          stroke: '#0f172a',
          strokeThickness: 2,
        })
        .setOrigin(0.5);
    }

    const containerItems = [
      cardBg,
      posterImage,
      statsText,
      traitHeader,
      traitDesc,
      btnImage,
      btnText,
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
        btnImage.setTexture('btn_comic_green_hover');
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

