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
    weaponDesc: 'Плевок сгустками кислоты. Создает лужи замедления.',
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
    favorites: 'УЛИЧНЫЕ ДРАКИ\nХАОС И СКОРОСТЬ\nВОРЧАТЬ И БУБНЕТЬ\nТРЯСТИ ДРУЗЕЙ',
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




interface LayoutItem {
  x: number;
  y: number;
  scale?: number;
  rot?: number; // angle in degrees
}

interface LayoutConfig {
  slot_vypolzok: LayoutItem;
  slot_bashmak: LayoutItem;
  slot_markovka: LayoutItem;
  slot_baklazhan: LayoutItem;
  header: LayoutItem;
  hero_art: LayoutItem;
  stats: LayoutItem;
  weapon: LayoutItem;
  trait: LayoutItem;
  sticky: LayoutItem;
  btn_battle: LayoutItem;
}

const DEFAULT_LAYOUT: LayoutConfig = {
  slot_vypolzok: { x: -367, y: -145, scale: 0.94, rot: -6.2 },
  slot_bashmak:  { x: -382, y: 99,   scale: 1,    rot: 2.7 },
  slot_markovka: { x: -154, y: -139, scale: 0.98, rot: 5.2 },
  slot_baklazhan:{ x: -171, y: 95,   scale: 1,    rot: -4.7 },
  header:        { x: 46,   y: -258, scale: 0.94, rot: -4.5 },
  hero_art:      { x: 181,  y: -36,  scale: 0.92, rot: 0 },
  stats:         { x: 333,  y: -201, scale: 0.96, rot: -7.3 },
  weapon:        { x: 322,  y: -27,  scale: 1,    rot: -7.3 },
  trait:         { x: 332,  y: 51,   scale: 1,    rot: -7.3 },
  sticky:        { x: 68,   y: 159,  scale: 1,    rot: 3.7 },
  btn_battle:    { x: 441,  y: 238,  scale: 1,    rot: -13.5 },
};

export class HeroSelectModal {
  private scene: Phaser.Scene;
  private onHeroSelected: (hero: HeroDefinition, startBattle?: boolean) => void;
  private platform = createPlatformAdapter();
  private audio = AudioManager.getInstance();
  private elements: Phaser.GameObjects.GameObject[] = [];
  public isVisible = false;

  private previewedHeroId: string = 'hero_vypolzok';
  private leftPageElements: Phaser.GameObjects.GameObject[] = [];
  private rightPageElements: Phaser.GameObjects.GameObject[] = [];
  private modalContainer?: Phaser.GameObjects.Container;

  // Dev layout editor
  private isEditMode = false;
  private selectedKey: keyof LayoutConfig | null = null;
  private selectedElement: Phaser.GameObjects.GameObject | null = null;
  private layout: LayoutConfig = { ...DEFAULT_LAYOUT };
  private hudElements: Phaser.GameObjects.GameObject[] = [];
  private selectionBox?: Phaser.GameObjects.Graphics;
  private keydownHandler?: (event: KeyboardEvent) => void;
  private hasInitDragHandlers = false;

  constructor(scene: Phaser.Scene, onHeroSelected: (hero: HeroDefinition, startBattle?: boolean) => void) {
    this.scene = scene;
    this.onHeroSelected = onHeroSelected;
    this.loadLayout();
  }

  private loadLayout(): void {
    try {
      const saved = localStorage.getItem('bashmak_hero_layout');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.layout = { ...DEFAULT_LAYOUT };
        for (const k of Object.keys(DEFAULT_LAYOUT) as (keyof LayoutConfig)[]) {
          if (parsed[k]) {
            this.layout[k] = { ...DEFAULT_LAYOUT[k], ...parsed[k] };
          }
        }
      }
    } catch {
      this.layout = { ...DEFAULT_LAYOUT };
    }
  }

  private saveLayout(): void {
    try {
      localStorage.setItem('bashmak_hero_layout', JSON.stringify(this.layout));
    } catch {}
  }

  show(): void {
    this.clear();
    this.isVisible = true;
    const saveManager = SaveManager.getInstance();
    this.previewedHeroId = saveManager.getSelectedHeroId();
    this.setupKeyboard();
    this.initGlobalDragHandlers();
    this.render();
  }

  private setupKeyboard(): void {
    this.cleanupKeyboard();
    this.keydownHandler = (e: KeyboardEvent) => {
      if (!this.isVisible) return;
      if (e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В') {
        this.isEditMode = !this.isEditMode;
        this.render();
        return;
      }

      if (!this.isEditMode || !this.selectedKey || !this.selectedElement) return;

      const step = e.shiftKey ? 10 : 1;
      const rotStep = e.shiftKey ? 5 : 1;
      const scaleStep = e.shiftKey ? 0.1 : 0.02;
      let handled = false;
      const pos = this.layout[this.selectedKey];

      // Position (Arrows)
      if (e.key === 'ArrowLeft') { pos.x -= step; handled = true; }
      else if (e.key === 'ArrowRight') { pos.x += step; handled = true; }
      else if (e.key === 'ArrowUp') { pos.y -= step; handled = true; }
      else if (e.key === 'ArrowDown') { pos.y += step; handled = true; }

      // Rotation (Q / E)
      else if (e.key === 'q' || e.key === 'Q' || e.key === 'й' || e.key === 'Й') {
        pos.rot = Math.round(((pos.rot || 0) - rotStep) * 10) / 10;
        handled = true;
      }
      else if (e.key === 'e' || e.key === 'E' || e.key === 'у' || e.key === 'У') {
        pos.rot = Math.round(((pos.rot || 0) + rotStep) * 10) / 10;
        handled = true;
      }

      // Scale (- / + / [ / ])
      else if (e.key === '-' || e.key === '_' || e.key === '[') {
        pos.scale = Math.max(0.2, Math.round(((pos.scale || 1) - scaleStep) * 100) / 100);
        handled = true;
      }
      else if (e.key === '=' || e.key === '+' || e.key === ']') {
        pos.scale = Math.min(3.0, Math.round(((pos.scale || 1) + scaleStep) * 100) / 100);
        handled = true;
      }

      if (handled) {
        e.preventDefault();
        (this.selectedElement as any).x = pos.x;
        (this.selectedElement as any).y = pos.y;
        (this.selectedElement as any).setAngle?.(pos.rot || 0);
        (this.selectedElement as any).setScale?.(pos.scale || 1);
        this.saveLayout();
        this.updateSelectionBox();
        this.updateHud();
      }
    };
    window.addEventListener('keydown', this.keydownHandler);
  }

  private cleanupKeyboard(): void {
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = undefined;
    }
  }

  private render(): void {
    this.clear();
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    // 1. Cover Background (Fills 100% of any screen aspect ratio with zero black bars, blocks click-through)
    const bgScale = Math.max(width / 1280, height / 720);
    const bg = this.scene.add
      .image(width / 2, height / 2, 'menu_bg')
      .setScale(bgScale)
      .setScrollFactor(0)
      .setDepth(10000)
      .setInteractive();
    this.elements.push(bg);

    // 2. Universal Scalable UI Container (1280x720 centered & fit to visible area)
    const virtualW = 1280;
    const virtualH = 720;
    const uiScale = Math.min(width / virtualW, height / virtualH);

    const modalContainer = this.scene.add
      .container(width / 2, height / 2)
      .setDepth(10001)
      .setScrollFactor(0)
      .setScale(uiScale);
    this.modalContainer = modalContainer;
    this.elements.push(modalContainer);

    // 3. Clean Sliced Dossier Book Base (1160x680)
    const book = this.scene.add
      .image(0, 0, 'dossier_book')
      .setDisplaySize(1160, 680)
      .setOrigin(0.5);
    modalContainer.add(book);

    // Metal Binder Clip on Top Binding
    const clip = this.scene.add
      .image(-28, -320, 'metal_binder_clip')
      .setDisplaySize(54, 62)
      .setOrigin(0.5);
    modalContainer.add(clip);

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

    // 7. Dev Layout Editor HUD
    this.renderDevHud(modalContainer);
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

    const slots: Array<{
      id: string;
      x: number;
      y: number;
      rot?: number;
      scale?: number;
      polKey: string;
      tapeKey: string;
      key: keyof LayoutConfig;
      name: string;
    }> = [
      { id: 'hero_vypolzok', ...this.layout.slot_vypolzok, polKey: 'polaroid_vypolzok', tapeKey: 'tape_green_1', key: 'slot_vypolzok', name: 'Выползок' },
      // { id: 'hero_bashmak',  ...this.layout.slot_bashmak,  polKey: 'polaroid_bashmak',  tapeKey: 'tape_green_2', key: 'slot_bashmak',  name: 'Башмак' },
      { id: 'hero_markovka', ...this.layout.slot_markovka, polKey: 'polaroid_markovka', tapeKey: 'tape_green_3', key: 'slot_markovka', name: 'Морковка' },
      // { id: 'hero_baklazhan',...this.layout.slot_baklazhan,polKey: 'polaroid_baklazhan',tapeKey: 'tape_green_4', key: 'slot_baklazhan',name: 'Баклажан' },
    ];

    slots.forEach((slot) => {
      const hero = getHeroById(slot.id);
      const isLocked = !isDev && slot.id !== 'hero_vypolzok' && slot.id !== 'hero_markovka';
      const isSelected = slot.id === currentSelectedId;

      const polContainer = this.scene.add
        .container(slot.x, slot.y)
        .setAngle(slot.rot ?? 0)
        .setScale((slot.scale ?? 1) * (isSelected ? 1.04 : 1.0));
      container.add(polContainer);
      this.leftPageElements.push(polContainer);

      // 1. Sliced Polaroid Frame
      const frame = this.scene.add
        .image(0, 0, 'polaroid_frame')
        .setDisplaySize(176, 202)
        .setOrigin(0.5);
      polContainer.add(frame);

      // 2. Hero Photo Inside Frame
      const photo = this.scene.add
        .image(0, -18, slot.polKey)
        .setDisplaySize(136, 136)
        .setOrigin(0.5);
      polContainer.add(photo);

      // 3. Green Scotch Tape on Top Corner
      const tape = this.scene.add
        .image(-48, -88, slot.tapeKey)
        .setDisplaySize(52, 26)
        .setRotation(-0.32);
      polContainer.add(tape);

      if (isLocked) {
        photo.setTint(0x222222);
        const polChains = this.scene.add
          .image(0, -18, 'chains_pod')
          .setDisplaySize(130, 130)
          .setOrigin(0.5)
          .setAlpha(0.92);
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
          .text(0, 49, 'СЕКРЕТНО', {
            fontSize: '10.5px',
            color: '#fecaca',
            fontFamily: 'Gagalin',
          })
          .setOrigin(0.5);
        polContainer.add(lockText);
      }

      if (this.isEditMode) {
        this.makeDraggable(polContainer, slot.key, slot.name, 176, 202, 0, 0);
      } else {
        const hit = this.scene.add
          .rectangle(0, 0, 176, 202, 0x000000, 0)
          .setInteractive({ useHandCursor: true });
        polContainer.add(hit);

        hit.on('pointerover', () => {
          polContainer.setScale(1.06);
          this.audio.playClick();
        });

        hit.on('pointerout', () => {
          polContainer.setScale(isSelected ? 1.04 : 1.0);
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
      }
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

    // 1. Title & Subtitle Header
    const headerContainer = this.scene.add
      .container(this.layout.header.x, this.layout.header.y)
      .setAngle(this.layout.header.rot ?? -7.5)
      .setScale(this.layout.header.scale ?? 1);
    container.add(headerContainer);
    this.rightPageElements.push(headerContainer);

    const titleText = this.scene.add
      .text(0, 0, hero.name.toUpperCase(), {
        fontSize: '30px',
        color: '#7f1d1d',
        fontFamily: 'Gagalin',
        stroke: '#450a0a',
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

    this.makeDraggable(headerContainer, 'header', 'Заголовок', 300, 90, 150, 40);

    // 2. Full Body Hero Character Art
    const charKey = 'char_' + hero.id.replace('hero_', '');
    const cfg = extra.artConfig;
    const heroContainer = this.scene.add
      .container(this.layout.hero_art.x, this.layout.hero_art.y)
      .setAngle(this.layout.hero_art.rot ?? 0)
      .setScale(this.layout.hero_art.scale ?? 1);
    container.add(heroContainer);
    this.rightPageElements.push(heroContainer);

    const heroSprite = this.scene.add
      .image(0, 0, charKey)
      .setDisplaySize(cfg.w, cfg.h)
      .setOrigin(0.5);

    if (isLocked) {
      heroSprite.setTint(0x222222);
    }

    if (!this.isEditMode) {
      this.scene.tweens.add({
        targets: heroSprite,
        scaleY: heroSprite.scaleY * 1.02,
        duration: 1400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    heroContainer.add(heroSprite);

    if (isLocked) {
      const chains = this.scene.add
        .image(0, 0, 'chains_pod')
        .setDisplaySize(300, 300)
        .setOrigin(0.5);

      if (!this.isEditMode) {
        this.scene.tweens.add({
          targets: chains,
          angle: { from: -1.5, to: 1.5 },
          y: 3,
          duration: 1600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }

      heroContainer.add(chains);
    }

    this.makeDraggable(heroContainer, 'hero_art', 'Арт героя', cfg.w, cfg.h, 0, 0);

    // 3. Stats Note (Graph Paper Note with Red Pin)
    const statsContainer = this.scene.add
      .container(this.layout.stats.x, this.layout.stats.y)
      .setAngle(this.layout.stats.rot ?? -7.3)
      .setScale(this.layout.stats.scale ?? 1);
    container.add(statsContainer);
    this.rightPageElements.push(statsContainer);

    const statsBackdrop = this.scene.add
      .image(80, 58, 'note_stats_backdrop')
      .setDisplaySize(248, 216)
      .setOrigin(0.5);
    statsContainer.add(statsBackdrop);

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

    this.makeDraggable(statsContainer, 'stats', 'Характеристики', 248, 216, 80, 58);

    // 4. Weapon Section
    const weaponContainer = this.scene.add
      .container(this.layout.weapon.x, this.layout.weapon.y)
      .setAngle(this.layout.weapon.rot ?? -7.3)
      .setScale(this.layout.weapon.scale ?? 1);
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

    this.makeDraggable(weaponContainer, 'weapon', 'Оружие', 240, 70, 115, 30);

    // 5. Trait Section
    const traitContainer = this.scene.add
      .container(this.layout.trait.x, this.layout.trait.y)
      .setAngle(this.layout.trait.rot ?? -7.3)
      .setScale(this.layout.trait.scale ?? 1);
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

    this.makeDraggable(traitContainer, 'trait', 'Трейт', 240, 70, 115, 30);

    // 6. Sticky Note "ЛЮБИТ"
    const stickyContainer = this.scene.add
      .container(this.layout.sticky.x, this.layout.sticky.y)
      .setAngle(this.layout.sticky.rot ?? 3.7)
      .setScale(this.layout.sticky.scale ?? 1);
    container.add(stickyContainer);
    this.rightPageElements.push(stickyContainer);

    const stickyBackdrop = this.scene.add
      .image(58, 52, 'paper_note_small')
      .setDisplaySize(162, 148)
      .setOrigin(0.5);
    stickyContainer.add(stickyBackdrop);

    // Tilted text sub-container aligned with the drawn inner frame (-5.5 deg)
    const textSub = this.scene.add
      .container(12, 14)
      .setAngle(-5.5);
    stickyContainer.add(textSub);

    const stickyHeader = this.scene.add
      .text(0, 0, 'ЛЮБИТ:', {
        fontSize: '13.5px',
        color: '#7f1d1d',
        fontFamily: 'Gagalin',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0, 0);
    textSub.add(stickyHeader);

    const stickyText = this.scene.add
      .text(0, 18, extra.favorites, {
        fontSize: '11px',
        color: '#020617',
        fontFamily: 'Boingster',
        wordWrap: { width: 116 },
        lineSpacing: 1.5,
      })
      .setOrigin(0, 0);
    textSub.add(stickyText);

    this.makeDraggable(stickyContainer, 'sticky', 'Стикер Любит', 162, 148, 58, 52);

    // 7. Red Action Button "В БОЙ!"
    const btnBaseScale = this.layout.btn_battle.scale ?? 1;
    const btnBaseAngle = this.layout.btn_battle.rot ?? -13.5;

    const btnContainer = this.scene.add
      .container(this.layout.btn_battle.x, this.layout.btn_battle.y)
      .setAngle(btnBaseAngle)
      .setScale(btnBaseScale);
    container.add(btnContainer);
    this.rightPageElements.push(btnContainer);

    const btnBackdrop = this.scene.add
      .image(0, 0, 'btn_battle_red_plate')
      .setDisplaySize(340, 96)
      .setOrigin(0.5);
    btnContainer.add(btnBackdrop);

    const btnLabel = isLocked ? 'ЗАКРЫТО' : 'В БОЙ!';
    const actionText = this.scene.add
      .text(0, -2, btnLabel, {
        fontSize: '32px',
        color: isLocked ? '#94a3b8' : '#fff1f2',
        fontFamily: 'Gagalin',
        stroke: '#450a0a',
        strokeThickness: 6,
        shadow: {
          offsetX: 0,
          offsetY: 3,
          color: '#1a0505',
          blur: 4,
          fill: true,
          stroke: true,
        },
      })
      .setOrigin(0.5);
    btnContainer.add(actionText);

    if (this.isEditMode) {
      this.makeDraggable(btnContainer, 'btn_battle', 'Кнопка В бой', 340, 96, 0, 0);
    } else if (!isLocked) {
      btnBackdrop.setInteractive({ useHandCursor: true });

      btnBackdrop.on('pointerover', () => {
        this.scene.tweens.killTweensOf(btnContainer);
        this.scene.tweens.add({
          targets: btnContainer,
          scaleX: btnBaseScale * 1.07,
          scaleY: btnBaseScale * 1.07,
          angle: btnBaseAngle + 2,
          duration: 120,
          ease: 'Back.easeOut',
        });
      });

      btnBackdrop.on('pointerout', () => {
        this.scene.tweens.killTweensOf(btnContainer);
        this.scene.tweens.add({
          targets: btnContainer,
          scaleX: btnBaseScale,
          scaleY: btnBaseScale,
          angle: btnBaseAngle,
          duration: 120,
          ease: 'Quad.easeOut',
        });
      });

      btnBackdrop.on('pointerdown', () => {
        AudioManager.getInstance().init();
        AudioManager.getInstance().playClick();
        this.platform.vibrate(30);

        this.scene.tweens.killTweensOf(btnContainer);
        this.scene.tweens.add({
          targets: btnContainer,
          scaleX: btnBaseScale * 0.92,
          scaleY: btnBaseScale * 0.92,
          duration: 70,
          yoyo: true,
          ease: 'Quad.easeOut',
          onComplete: () => {
            saveManager.setSelectedHeroId(this.previewedHeroId);
            this.onHeroSelected(hero, true);
            this.hide();
          },
        });
      });
    }
  }

  private activeDrag: {
    key: keyof LayoutConfig;
    target: Phaser.GameObjects.Container | Phaser.GameObjects.GameObject;
    startX: number;
    startY: number;
    itemStartX: number;
    itemStartY: number;
  } | null = null;

  private makeDraggable(
    target: Phaser.GameObjects.Container | Phaser.GameObjects.GameObject,
    key: keyof LayoutConfig,
    displayName: string,
    width: number = 200,
    height: number = 100,
    offsetX: number = 0,
    offsetY: number = 0
  ): void {
    if (!this.modalContainer) return;

    (target as any).layoutKey = key;
    (target as any).displayName = displayName;

    if (this.isEditMode) {
      // Add a visible drag outline and hit area
      const hitZone = this.scene.add
        .rectangle(offsetX, offsetY, width, height, 0x22c55e, 0.08)
        .setStrokeStyle(1.5, 0x22c55e, 0.7)
        .setInteractive({ useHandCursor: true });

      if (target instanceof Phaser.GameObjects.Container) {
        target.add(hitZone);
      } else {
        hitZone.setPosition((target as any).x + offsetX, (target as any).y + offsetY);
        this.modalContainer.add(hitZone);
      }

      hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (!this.isEditMode) return;
        this.selectedKey = key;
        this.selectedElement = target;
        this.activeDrag = {
          key,
          target,
          startX: pointer.x,
          startY: pointer.y,
          itemStartX: (target as any).x,
          itemStartY: (target as any).y,
        };
        this.updateSelectionBox();
        this.updateHud();
      });
    }
  }

  private initGlobalDragHandlers(): void {
    if (this.hasInitDragHandlers) return;
    this.hasInitDragHandlers = true;

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.activeDrag || !this.isEditMode || !this.modalContainer) return;
      const modalScale = this.modalContainer.scaleX || 1;
      const dx = (pointer.x - this.activeDrag.startX) / modalScale;
      const dy = (pointer.y - this.activeDrag.startY) / modalScale;

      const newX = Math.round(this.activeDrag.itemStartX + dx);
      const newY = Math.round(this.activeDrag.itemStartY + dy);

      (this.activeDrag.target as any).x = newX;
      (this.activeDrag.target as any).y = newY;
      this.layout[this.activeDrag.key].x = newX;
      this.layout[this.activeDrag.key].y = newY;

      this.updateSelectionBox();
      this.updateHud();
    });

    this.scene.input.on('pointerup', () => {
      if (this.activeDrag) {
        this.activeDrag = null;
        this.saveLayout();
      }
    });

    // Mouse wheel: Scale or Rotate
    this.scene.input.on('wheel', (pointer: Phaser.Input.Pointer, _gameObjects: any, _deltaX: number, deltaY: number) => {
      if (!this.isEditMode || !this.selectedKey || !this.selectedElement) return;
      const pos = this.layout[this.selectedKey];
      if (!pos) return;

      const isAltOrCtrl = pointer.event?.altKey || pointer.event?.ctrlKey;
      if (isAltOrCtrl) {
        const rotDir = deltaY > 0 ? 1 : -1;
        const rotStep = pointer.event?.shiftKey ? 5 : 1;
        pos.rot = Math.round(((pos.rot || 0) + rotDir * rotStep) * 10) / 10;
        (this.selectedElement as any).setAngle?.(pos.rot || 0);
      } else {
        const scaleStep = pointer.event?.shiftKey ? 0.1 : 0.02;
        const stepVal = deltaY > 0 ? -scaleStep : scaleStep;
        pos.scale = Math.min(3.0, Math.max(0.2, Math.round(((pos.scale || 1) + stepVal) * 100) / 100));
        (this.selectedElement as any).setScale?.(pos.scale || 1);
      }

      this.saveLayout();
      this.updateSelectionBox();
      this.updateHud();
    });
  }

  private renderDevHud(container: Phaser.GameObjects.Container): void {
    this.hudElements.forEach((el) => el.destroy());
    this.hudElements = [];
    if (this.selectionBox) {
      this.selectionBox.destroy();
      this.selectionBox = undefined;
    }

    if (!this.isEditMode) return;

    const hudBar = this.scene.add.container(0, -325);
    container.add(hudBar);
    this.hudElements.push(hudBar);

    const bgGfx = this.scene.add.graphics();
    bgGfx.fillStyle(0x1e293b, 0.95);
    bgGfx.lineStyle(2, 0x22c55e, 1);
    bgGfx.fillRoundedRect(-590, -18, 1180, 36, 6);
    bgGfx.strokeRoundedRect(-590, -18, 1180, 36, 6);
    hudBar.add(bgGfx);

    const toggleBtn = this.scene.add
      .text(-570, 0, '[D] РАЗМЕТКА: ВКЛ', {
        fontSize: '14px',
        color: '#4ade80',
        fontFamily: 'Gagalin',
      })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });
    hudBar.add(toggleBtn);

    toggleBtn.on('pointerdown', () => {
      this.isEditMode = false;
      this.render();
    });

    const copyBtn = this.scene.add
      .text(380, 0, '[ СКОПИРОВАТЬ КОНФИГ ]', {
        fontSize: '13px',
        color: '#fbbf24',
        fontFamily: 'Gagalin',
      })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });
    hudBar.add(copyBtn);

    copyBtn.on('pointerdown', () => {
      const text = JSON.stringify(this.layout, null, 2);
      try {
        navigator.clipboard?.writeText(text);
      } catch {}
      console.log('--- НОВЫЕ КООРДИНАТЫ HERO_SELECT ---');
      console.log(text);
      copyBtn.setText('[ СКОПИРОВАНО В БУФЕР! ]');
      this.scene.time.delayedCall(1500, () => {
        if (copyBtn.active) copyBtn.setText('[ СКОПИРОВАТЬ КОНФИГ ]');
      });
    });

    const resetBtn = this.scene.add
      .text(260, 0, '[ СБРОСИТЬ ]', {
        fontSize: '13px',
        color: '#ef4444',
        fontFamily: 'Gagalin',
      })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });
    hudBar.add(resetBtn);

    resetBtn.on('pointerdown', () => {
      this.layout = { ...DEFAULT_LAYOUT };
      this.saveLayout();
      this.render();
    });

    this.selectionBox = this.scene.add.graphics();
    container.add(this.selectionBox);
    this.hudElements.push(this.selectionBox);

    this.updateHud();
  }

  private updateHud(): void {
    if (!this.modalContainer) return;
    const existingStatus = this.hudElements.find((el) => (el as any).isStatusText);
    if (existingStatus) {
      existingStatus.destroy();
      this.hudElements = this.hudElements.filter((el) => el !== existingStatus);
    }

    if (!this.isEditMode) return;

    let info = 'Стрелки: сдвиг | Q/E: поворот | -/+: масштаб | Колесо мыши (Alt: поворот)';
    if (this.selectedKey && this.layout[this.selectedKey]) {
      const pos = this.layout[this.selectedKey];
      const name = (this.selectedElement as any)?.displayName || this.selectedKey;
      info = `${name} | X: ${pos.x}, Y: ${pos.y} | Масштаб: ${(pos.scale ?? 1).toFixed(2)}x | Угол: ${pos.rot ?? 0}°`;
    }

    const hudBar = this.hudElements[0] as Phaser.GameObjects.Container;
    if (hudBar) {
      const status = this.scene.add
        .text(-380, 0, info, {
          fontSize: '12px',
          color: '#ffffff',
          fontFamily: 'Gagalin',
        })
        .setOrigin(0, 0.5);
      (status as any).isStatusText = true;
      hudBar.add(status);
      this.hudElements.push(status);
    }
  }

  private updateSelectionBox(): void {
    if (!this.selectionBox || !this.selectedElement || !this.isEditMode) {
      this.selectionBox?.clear();
      return;
    }

    this.selectionBox.clear();
    this.selectionBox.lineStyle(2, 0x22c55e, 0.9);
    const el = this.selectedElement as any;
    const x = el.x;
    const y = el.y;

    this.selectionBox.strokeRect(x - 60, y - 60, 120, 120);
    this.selectionBox.fillStyle(0x22c55e, 0.2);
    this.selectionBox.fillRect(x - 60, y - 60, 120, 120);
  }

  hide(): void {
    this.cleanupKeyboard();
    this.clear();
    this.isVisible = false;
  }

  private clear(): void {
    this.hudElements.forEach((el) => el.destroy());
    this.hudElements = [];
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

