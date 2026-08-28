import Phaser from 'phaser';
import { getHeroById } from '../../data/heroes';
import type { HeroDefinition } from '../../data/definitions';
import { SaveManager } from '../../core/SaveManager';
import { createPlatformAdapter } from '../../../platform';
import { AudioManager } from '../../audio/AudioManager';

interface HeroDossierExtra {
  aka: string;
  statsBars: {
    hp: number;
    speed: number;
    damage: number;
    mass: number;
    special: number;
  };
  artConfig: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  weaponName: string;
  weaponDesc: string;
  traitName: string;
  traitDesc: string;
  favorites: string;
}

const HERO_DOSSIER_DATA: Record<string, HeroDossierExtra> = {
  hero_vypolzok: {
    aka: 'СЛИЗНЯК',
    statsBars: { hp: 3, speed: 4, damage: 3, mass: 4, special: 4 },
    artConfig: { x: 148, y: -52, w: 192, h: 269 },
    weaponName: 'ТОКСИЧНЫЕ ПЛЕВКИ',
    weaponDesc: 'Плевок сгустками кислоты. Создает лужи замедления (-35% врагам).',
    traitName: 'СЛИЗИСТЫЙ СЛЕД',
    traitDesc: 'Оставляет дорожку слизи. Выползок на ней получает +20% скорости и реген HP.',
    favorites: 'SLIME SODA\nГРЯЗЬ\nПОСПАТЬ И ПОЖРАТЬ',
  },
  hero_bashmak: {
    aka: 'БОТИНОК',
    statsBars: { hp: 5, speed: 2, damage: 4, mass: 5, special: 3 },
    artConfig: { x: 180, y: -15, w: 235, h: 335 },
    weaponName: 'ШНУРОВОЙ КНУТ',
    weaponDesc: 'Удар шнурком по дуге 180° с мощным отбрасыванием врагов.',
    traitName: 'ТЯЖЁЛАЯ ПОСТУПЬ',
    traitDesc: 'При стоянии на месте получает +50% урона и +2 брони.',
    favorites: 'ДАВИТЬ ВРАГОВ\nКРЕМ ДЛЯ ОБУВИ\nТЯЖЕЛЫЙ РОК',
  },
  hero_markovka: {
    aka: 'БЕДА',
    statsBars: { hp: 2, speed: 5, damage: 4, mass: 2, special: 5 },
    artConfig: { x: 180, y: -20, w: 245, h: 350 },
    weaponName: 'МОРКОВНЫЙ ГРАД',
    weaponDesc: 'Скоростной веерный залп острых морковок с пробитием целей.',
    traitName: 'ЖАЖДА СКОРОСТИ',
    traitDesc: 'Убийства дают стаки скорости. При 10 стаках — следующая атака наносит 2× урон.',
    favorites: 'УЛИЧНЫЕ ДРАКИ\nИРОКЕЗЫ\nХАОС И СКОРОСТЬ',
  },
  hero_baklazhan: {
    aka: 'ТАРАН',
    statsBars: { hp: 4, speed: 3, damage: 5, mass: 5, special: 3 },
    artConfig: { x: 180, y: -15, w: 230, h: 335 },
    weaponName: 'ФИОЛЕТОВЫЙ ШАР',
    weaponDesc: 'Сворачивается в шар и сминает орды мобов в лепешку.',
    traitName: 'РАЗБЕГ',
    traitDesc: 'Непрерывный бег разгоняет до +40% скорости и дает таранный урон.',
    favorites: 'ТАРАНИТЬ ВСЁ\nКЕДЫ СО ШНУРКАМИ\nБЫТЬ САМЫМ КРУТЫМ',
  },
};




export class HeroSelectModal {
  private scene: Phaser.Scene;
  private onHeroSelected: (hero: HeroDefinition) => void;
  private platform = createPlatformAdapter();
  private audio = AudioManager.getInstance();
  private elements: Phaser.GameObjects.GameObject[] = [];
  public isVisible = false;

  private previewedHeroId: string = 'hero_vypolzok';
  private leftPageElements: Phaser.GameObjects.GameObject[] = [];
  private rightPageElements: Phaser.GameObjects.GameObject[] = [];
  private modalContainer?: Phaser.GameObjects.Container;



  constructor(scene: Phaser.Scene, onHeroSelected: (hero: HeroDefinition) => void) {
    this.scene = scene;
    this.onHeroSelected = onHeroSelected;
  }

  show(): void {
    this.clear();
    this.isVisible = true;
    const saveManager = SaveManager.getInstance();
    this.previewedHeroId = saveManager.getSelectedHeroId();
    this.render();
  }

  private render(): void {
    this.clear();
    const { width, height } = this.scene.cameras.main;

    // 1. Dark Atmospheric Overlay (Full Screen)
    const overlay = this.scene.add
      .rectangle(width / 2, height / 2, width, height, 0x02050c, 0.92)
      .setScrollFactor(0)
      .setDepth(10000)
      .setInteractive();
    this.elements.push(overlay);

    // 2. Master Responsive Modal Container (Virtual Viewport 1280x720)
    const virtualW = 1280;
    const virtualH = 720;
    const modalScale = Math.min((width * 0.98) / virtualW, (height * 0.98) / virtualH);

    const modalContainer = this.scene.add
      .container(width / 2, height / 2)
      .setDepth(10001)
      .setScrollFactor(0)
      .setScale(modalScale);
    this.modalContainer = modalContainer;
    this.elements.push(modalContainer);

    // 3. Dossier Book Background (1280x720)
    const bookBg = this.scene.add
      .image(0, 0, 'hero_dossier_bg')
      .setDisplaySize(virtualW, virtualH)
      .setOrigin(0.5);
    modalContainer.add(bookBg);

    // 4. Close Button (Top-Right of Book)
    const closeBtnX = virtualW / 2 - 45;
    const closeBtnY = -virtualH / 2 + 45;

    const closeGfx = this.scene.add.graphics();
    closeGfx.fillStyle(0x7f1d1d, 1);
    closeGfx.lineStyle(3, 0xef4444, 1);
    closeGfx.fillCircle(closeBtnX, closeBtnY, 20);
    closeGfx.strokeCircle(closeBtnX, closeBtnY, 20);
    modalContainer.add(closeGfx);

    const closeBtnText = this.scene.add
      .text(closeBtnX, closeBtnY - 1, '\u2715', {
        fontSize: '22px',
        color: '#ffffff',
        fontFamily: 'Gagalin',
      })
      .setOrigin(0.5);
    modalContainer.add(closeBtnText);

    const closeHit = this.scene.add
      .circle(closeBtnX, closeBtnY, 26, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    modalContainer.add(closeHit);

    closeHit.on('pointerdown', () => {
      this.platform.vibrate(20);
      this.audio.playClick();
      this.hide();
    });


    // 5. Left Page: 4 Polaroid Slots
    this.renderLeftPagePolaroids(modalContainer);

    // 6. Right Page: Dynamic Hero Dossier
    this.renderRightPageDossier(modalContainer);
  }

  private renderLeftPagePolaroids(container: Phaser.GameObjects.Container): void {
    this.leftPageElements.forEach((el) => {
      this.scene.tweens.killTweensOf(el);
      el.destroy();
    });
    this.leftPageElements = [];

    const saveManager = SaveManager.getInstance();
    const currentSelectedId = saveManager.getSelectedHeroId();

    try { localStorage.removeItem('dev_heroes_unlocked'); } catch (e) {}
    const isDev = typeof window !== 'undefined' && (
      window.location.search.includes('dev=1')
    );

    const slots = [
      { id: 'hero_vypolzok', x: -356, y: -80, rot: -0.02, polKey: 'polaroid_vypolzok' },
      { id: 'hero_bashmak',  x: -160, y: -80, rot: 0.03,  polKey: 'polaroid_bashmak' },
      { id: 'hero_markovka', x: -356, y: 175, rot: 0.02,  polKey: 'polaroid_markovka' },
      { id: 'hero_baklazhan',x: -160, y: 175, rot: -0.03, polKey: 'polaroid_baklazhan' },
    ];

    slots.forEach((slot) => {
      const hero = getHeroById(slot.id);
      const isLocked = !isDev && slot.id !== 'hero_vypolzok' && slot.id !== 'hero_markovka';
      const isSelected = slot.id === currentSelectedId;

      const polContainer = this.scene.add
        .container(slot.x, slot.y)
        .setRotation(slot.rot)
        .setScale(isSelected ? 1.05 : 1.0);
      container.add(polContainer);
      this.leftPageElements.push(polContainer);

      const photo = this.scene.add
        .image(0, -16, slot.polKey)
        .setDisplaySize(142, 142)
        .setOrigin(0.5);


      polContainer.add(photo);

      if (isLocked) {
        photo.setTint(0x333333);
        const polChains = this.scene.add
          .image(0, -16, 'chains_pod')
          .setDisplaySize(120, 120)
          .setOrigin(0.5)
          .setAlpha(0.9);
        polContainer.add(polChains);
      }

      const nameColor = isLocked ? '#94a3b8' : isSelected ? '#15803d' : '#1e293b';
      const nameStroke = isSelected ? '#052e16' : '#ffffff';
      const nameStrokeThickness = isSelected ? 3.5 : 2;

      const nameText = this.scene.add
        .text(0, 72, hero.name.toUpperCase(), {
          fontSize: isSelected ? '16px' : '15px',
          color: nameColor,
          fontFamily: 'Gagalin',
          stroke: nameStroke,
          strokeThickness: nameStrokeThickness,
        })
        .setOrigin(0.5);
      polContainer.add(nameText);

      if (isLocked) {
        const lockBadge = this.scene.add.graphics();
        lockBadge.fillStyle(0x7f1d1d, 0.92);
        lockBadge.lineStyle(2, 0xef4444, 1);
        lockBadge.fillRoundedRect(-54, 38, 108, 22, 4);
        lockBadge.strokeRoundedRect(-54, 38, 108, 22, 4);
        polContainer.add(lockBadge);

        const lockText = this.scene.add
          .text(0, 49, 'СЕКРЕТНО ', {
            fontSize: '10.5px',
            color: '#fecaca',
            fontFamily: 'Gagalin',
          })
          .setOrigin(0.5);
        polContainer.add(lockText);
      }


      const hit = this.scene.add
        .rectangle(0, 10, 160, 200, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      polContainer.add(hit);

      hit.on('pointerover', () => {
        polContainer.setScale(1.04);
        this.audio.playClick();
      });

      hit.on('pointerout', () => {
        polContainer.setScale(1.0);
      });

      hit.on('pointerdown', () => {
        this.platform.vibrate(20);
        this.audio.playClick();
        this.previewedHeroId = slot.id;
        if (!isLocked) {
          saveManager.setSelectedHeroId(slot.id);
        }
        if (this.modalContainer) {
          this.renderLeftPagePolaroids(this.modalContainer);
          this.renderRightPageDossier(this.modalContainer);
        }
      });
    });
  }





  private renderRightPageDossier(container: Phaser.GameObjects.Container): void {
    this.rightPageElements.forEach((el) => el.destroy());
    this.rightPageElements = [];

    const saveManager = SaveManager.getInstance();
    const hero = getHeroById(this.previewedHeroId);
    const extra = HERO_DOSSIER_DATA[this.previewedHeroId] || HERO_DOSSIER_DATA['hero_vypolzok'];


    const isDev = typeof window !== 'undefined' && (
      window.location.search.includes('dev=1')
    );
    const isLocked = !isDev && this.previewedHeroId !== 'hero_vypolzok' && this.previewedHeroId !== 'hero_markovka';

    // 1. Title & Subtitle Header (Aligned to -7.5 deg Top Edge of the Book Page)
    const headerContainer = this.scene.add
      .container(20, -255)
      .setRotation(Phaser.Math.DegToRad(-7.5));
    container.add(headerContainer);
    this.rightPageElements.push(headerContainer);

    const titleText = this.scene.add
      .text(0, 0, hero.name.toUpperCase(), {
        fontSize: '30px',
        color: '#15803d',
        fontFamily: 'Gagalin',
        stroke: '#052e16',
        strokeThickness: 3.5,
      })
      .setOrigin(0, 0.5);
    headerContainer.add(titleText);

    const subText = this.scene.add
      .text(2, 22, hero.description, {
        fontSize: '15px',
        color: '#020617',
        fontFamily: 'Boingster',
        wordWrap: { width: 280 },
        lineSpacing: 2,
      })
      .setOrigin(0, 0);
    headerContainer.add(subText);


    // 2. Full Body Hero Character Art
    const charKey = 'char_' + hero.id.replace('hero_', '');
    const cfg = extra.artConfig;
    const heroSprite = this.scene.add
      .image(cfg.x, cfg.y, charKey)
      .setDisplaySize(cfg.w, cfg.h)
      .setOrigin(0.5);

    if (isLocked) {
      heroSprite.setTint(0x222222);
    }

    this.scene.tweens.add({
      targets: heroSprite,
      scaleY: heroSprite.scaleY * 1.02,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    container.add(heroSprite);
    this.rightPageElements.push(heroSprite);

    if (isLocked) {
      const chains = this.scene.add
        .image(cfg.x, cfg.y, 'chains_pod')
        .setDisplaySize(300, 300)
        .setOrigin(0.5);

      this.scene.tweens.add({
        targets: chains,
        angle: { from: -1.5, to: 1.5 },
        y: cfg.y + 3,
        duration: 1600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      container.add(chains);
      this.rightPageElements.push(chains);
    }

    // 3. Stats Note (Graph Paper Section - Perfectly Aligned to -7.3 deg Paper Grid)
    const statsContainer = this.scene.add
      .container(315, -182)
      .setRotation(Phaser.Math.DegToRad(-7.3));
    container.add(statsContainer);
    this.rightPageElements.push(statsContainer);

    const statLabels = [
      { name: 'ЗДОРОВЬЕ', val: extra.statsBars.hp, max: 5 },
      { name: 'СКОРОСТЬ', val: extra.statsBars.speed, max: 5 },
      { name: 'УРОН',     val: extra.statsBars.damage, max: 5 },
      { name: 'МАССА',    val: extra.statsBars.mass, max: 5 },
      { name: 'СЛИЗЬ',    val: extra.statsBars.special, max: 5 },
    ];

    statLabels.forEach((st, idx) => {
      const rowY = 24 + idx * 21;

      const label = this.scene.add
        .text(0, rowY, st.name, {
          fontSize: '13px',
          color: '#020617',
          fontFamily: 'Gagalin',
        })
        .setOrigin(0, 0.5);
      statsContainer.add(label);

      for (let b = 0; b < st.max; b++) {
        const isFilled = b < st.val;
        const block = this.scene.add.graphics();
        block.fillStyle(isFilled ? 0x6d28d9 : 0xdbeafe, 1);
        block.lineStyle(1, 0x1e293b, 0.8);
        block.fillRect(76 + b * 17, rowY - 7, 14, 14);
        block.strokeRect(76 + b * 17, rowY - 7, 14, 14);
        statsContainer.add(block);
      }
    });

    // 4. Weapon Section (Aligned to Right Column Stream: x=315, -7.3 deg)
    const weaponContainer = this.scene.add
      .container(315, -30)
      .setRotation(Phaser.Math.DegToRad(-7.3));
    container.add(weaponContainer);
    this.rightPageElements.push(weaponContainer);

    const wepTitle = this.scene.add
      .text(0, 0, 'ОРУЖИЕ: ' + extra.weaponName, {
        fontSize: '16.5px',
        color: '#7c2d12',
        fontFamily: 'Gagalin',
      })
      .setOrigin(0, 0.5);
    weaponContainer.add(wepTitle);

    const wepDesc = this.scene.add
      .text(0, 16, extra.weaponDesc, {
        fontSize: '14.5px',
        color: '#020617',
        fontFamily: 'Boingster',
        wordWrap: { width: 230 },
        lineSpacing: 2,
      })
      .setOrigin(0, 0);
    weaponContainer.add(wepDesc);

    // 5. Trait Section (Aligned to Right Column Stream: x=315, -7.3 deg, closer to weapon)
    const traitContainer = this.scene.add
      .container(315, 52)
      .setRotation(Phaser.Math.DegToRad(-7.3));
    container.add(traitContainer);
    this.rightPageElements.push(traitContainer);

    const traitTitle = this.scene.add
      .text(0, 0, 'ТРЕЙТ: ' + extra.traitName, {
        fontSize: '16.5px',
        color: '#581c87',
        fontFamily: 'Gagalin',
      })
      .setOrigin(0, 0.5);
    traitContainer.add(traitTitle);

    const traitDesc = this.scene.add
      .text(0, 16, extra.traitDesc, {
        fontSize: '14.5px',
        color: '#020617',
        fontFamily: 'Boingster',
        wordWrap: { width: 230 },
        lineSpacing: 2,
      })
      .setOrigin(0, 0);
    traitContainer.add(traitDesc);

    // 6. Sticky Note "ЛЮБИТ" (Aligned to -7.3 deg Sticky Paper)
    const stickyContainer = this.scene.add
      .container(0, 174)
      .setRotation(Phaser.Math.DegToRad(-7.3));
    container.add(stickyContainer);
    this.rightPageElements.push(stickyContainer);

    const stickyHeader = this.scene.add
      .text(4, 12, 'ЛЮБИТ: ', {
        fontSize: '13px',
        color: '#14532d',
        fontFamily: 'Gagalin',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0, 0);
    stickyContainer.add(stickyHeader);

    const stickyText = this.scene.add
      .text(4, 30, extra.favorites, {
        fontSize: '11px',
        color: '#020617',
        fontFamily: 'Boingster',
        wordWrap: { width: 96 },
        lineSpacing: 2,
      })
      .setOrigin(0, 0);
    stickyContainer.add(stickyText);


    // 7. Red Action Button "TO BATTLE! / В БОЙ!" (Aligned to -13.5 deg Red Stamp Plate)
    const btnX = 434;
    const btnY = 247;
    const btnRotation = Phaser.Math.DegToRad(-13.5);

    const btnLabel = isLocked
      ? 'ЗАКРЫТО '
      : 'В БОЙ! ';

    const actionText = this.scene.add
      .text(btnX, btnY, btnLabel, {
        fontSize: '26px',
        color: isLocked ? '#94a3b8' : '#ffffff',
        fontFamily: 'Gagalin',
        stroke: '#450a0a',
        strokeThickness: 5,
      })
      .setRotation(btnRotation)
      .setOrigin(0.5);
    container.add(actionText);
    this.rightPageElements.push(actionText);

    const btnHit = this.scene.add
      .rectangle(btnX, btnY, 340, 95, 0x000000, 0)
      .setRotation(btnRotation)
      .setInteractive({ useHandCursor: isLocked ? false : true });
    container.add(btnHit);
    this.rightPageElements.push(btnHit);

    if (!isLocked) {
      btnHit.on('pointerover', () => {
        actionText.setScale(1.08);
      });
      btnHit.on('pointerout', () => {
        actionText.setScale(1.0);
      });
      btnHit.on('pointerdown', () => {
        this.platform.vibrate(40);
        this.audio.playLevelUp();

        this.scene.tweens.add({
          targets: actionText,
          scaleX: 0.9,
          scaleY: 0.9,
          duration: 100,
          yoyo: true,
          onComplete: () => {
            saveManager.setSelectedHeroId(this.previewedHeroId);
            this.onHeroSelected(hero);
            this.hide();
          },
        });
      });
    }
  }

  hide(): void {
    this.clear();
    this.isVisible = false;
  }

  private clear(): void {
    this.rightPageElements.forEach((el) => {
      this.scene.tweens.killTweensOf(el);
      el.destroy();
    });
    this.rightPageElements = [];
    this.leftPageElements.forEach((el) => {
      this.scene.tweens.killTweensOf(el);
      el.destroy();
    });
    this.leftPageElements = [];
    this.elements.forEach((el) => {
      this.scene.tweens.killTweensOf(el);
      el.destroy();
    });
    this.elements = [];
  }
}

