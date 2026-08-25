import Phaser from 'phaser';
import { EventBus } from '../../core/EventBus';
import type { GameState } from '../../core/GameState';
import { ALL_UPGRADES } from '../../data/upgrades';
import { EVOLUTION_RECIPES } from '../../data/evolutions';

interface HudSlot {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  icon: Phaser.GameObjects.Image;
  frame: Phaser.GameObjects.Image;
  badge: Phaser.GameObjects.Text;
}

export class HUD {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private avatarImage: Phaser.GameObjects.Image;

  // HP Pipe Bar System
  private hpFillImage: Phaser.GameObjects.Image;
  private hpText: Phaser.GameObjects.Text;

  // XP Pipe Bar System (Matching 90s acid pipe)
  private xpFillImage: Phaser.GameObjects.Image;
  private xpText: Phaser.GameObjects.Text;

  // Stats (Right side)
  private timerText: Phaser.GameObjects.Text;
  private killsText: Phaser.GameObjects.Text;

  // 4 Slot Mutation Tracker (Using hud_slot_frame & square icons)
  private slots: HudSlot[] = [];
  private lastSlotsSignature = '';

  private unbinds: Array<() => void> = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(9000);

    // 1. Avatar Expression Portrait & Comic Porthole Frame
    const avatarX = 54;
    const avatarY = 54;

    const maskGfx = scene.make.graphics({ x: 0, y: 0 });
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillCircle(avatarX, avatarY, 34);
    const mask = maskGfx.createGeometryMask();

    const heroId = scene.registry.get('selectedHeroId') || 'hero_vypolzok';
    const initAvatarKey = heroId === 'hero_markovka' ? 'hud_face_smug_markovka' : 'hud_face_smug';
    this.avatarImage = scene.add.image(avatarX, avatarY, scene.textures.exists(initAvatarKey) ? initAvatarKey : 'face_smug');
    this.avatarImage.setDisplaySize(68, 68);
    this.avatarImage.setMask(mask);

    const avatarBadge = scene.add.image(avatarX, avatarY, 'hud_avatar_badge_frame');
    avatarBadge.setDisplaySize(92, 92);

    // 2. Dual Pipe Bar System (HP Blood Pipe + XP Acid Pipe)
    const barX = 106;
    const barW = 230;
    const barH = 34;

    // The clear glass cutout inside hud_bar_frame starts at offset +66 and is 144px wide
    const tubeOffsetX = 66;
    const tubeW = 144;
    const tubeH = 12;

    // --- HP Pipe (Top) ---
    const hpY = 28;
    const hpBg = scene.add.graphics();
    hpBg.fillStyle(0x0a0f1d, 0.95);
    hpBg.fillRect(barX + tubeOffsetX, hpY - tubeH / 2, tubeW, tubeH);

    this.hpFillImage = scene.add.image(barX + tubeOffsetX, hpY, 'hud_bar_fill_hp').setOrigin(0, 0.5);
    this.hpFillImage.setDisplaySize(tubeW, tubeH);

    const hpPipeFrame = scene.add.image(barX + barW / 2 - 2, hpY, 'hud_bar_frame');
    hpPipeFrame.setDisplaySize(barW, barH);

    this.hpText = scene.add.text(barX + tubeOffsetX + 8, hpY, 'HP: 100/100', {
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#450a0a',
      strokeThickness: 2,
    }).setOrigin(0, 0.5);

    // --- XP Pipe (Directly below HP Pipe) ---
    const xpY = 62;
    const xpBg = scene.add.graphics();
    xpBg.fillStyle(0x0a0f1d, 0.95);
    xpBg.fillRect(barX + tubeOffsetX, xpY - tubeH / 2, tubeW, tubeH);

    this.xpFillImage = scene.add.image(barX + tubeOffsetX, xpY, 'hud_bar_fill_xp').setOrigin(0, 0.5);
    this.xpFillImage.setDisplaySize(tubeW, tubeH);

    const xpPipeFrame = scene.add.image(barX + barW / 2 - 2, xpY, 'hud_bar_frame');
    xpPipeFrame.setDisplaySize(barW, barH);

    this.xpText = scene.add.text(barX + tubeOffsetX + 8, xpY, 'LVL 1 (0/10 XP)', {
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#4ade80',
      fontFamily: 'monospace',
      stroke: '#064e3b',
      strokeThickness: 2,
    }).setOrigin(0, 0.5);

    // 3. Stats (Right side)
    const rightEdge = scene.cameras.main.width - 16;
    this.timerText = scene.add.text(rightEdge, 16, 'TIME: 00:00', {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#0f172a',
      strokeThickness: 3,
    }).setOrigin(1, 0);

    this.killsText = scene.add.text(rightEdge, 38, 'KILLS: 0', {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#f87171',
      fontFamily: 'monospace',
      stroke: '#450a0a',
      strokeThickness: 3,
    }).setOrigin(1, 0);

    // 4. 4 Mutation / Weapon Slots Under Avatar (Aligned cleanly under porthole)
    const startX = 32;
    const startY = 120;
    const slotSize = 48;
    const slotSpacing = 6;

    for (let i = 0; i < 4; i++) {
      const slotX = startX + i * (slotSize + slotSpacing);
      const slotY = startY;

      const slotContainer = scene.add.container(slotX, slotY);

      // Clean dark backdrop strictly within the inner frame cutout (no sticking out ears)
      const innerCutout = slotSize * 0.70;
      const slotBg = scene.add.graphics();
      slotBg.fillStyle(0x060911, 0.95);
      slotBg.fillRect(-innerCutout / 2, -innerCutout / 2, innerCutout, innerCutout);

      const slotIcon = scene.add.image(0, 0, 'icon_weapon_slime_spit');
      slotIcon.setDisplaySize(innerCutout, innerCutout);
      slotIcon.setVisible(false);

      const slotFrame = scene.add.image(0, 0, 'hud_slot_frame');
      slotFrame.setDisplaySize(slotSize, slotSize);
      slotFrame.setAlpha(0.35);

      const slotBadge = scene.add.text(innerCutout / 2 - 1, innerCutout / 2 - 1, 'L1', {
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#facc15',
        fontFamily: 'monospace',
        stroke: '#451a03',
        strokeThickness: 2,
      }).setOrigin(1, 1).setVisible(false);

      slotContainer.add([slotBg, slotIcon, slotFrame, slotBadge]);
      this.slots.push({
        container: slotContainer,
        bg: slotBg,
        icon: slotIcon,
        frame: slotFrame,
        badge: slotBadge,
      });
    }

    this.container.add([
      this.avatarImage,
      avatarBadge,
      hpBg,
      this.hpFillImage,
      hpPipeFrame,
      this.hpText,
      xpBg,
      this.xpFillImage,
      xpPipeFrame,
      this.xpText,
      this.timerText,
      this.killsText,
      ...this.slots.map((s) => s.container),
    ]);

    this.setupEventListeners();
    this.updateHp(100, 100);
    this.updateXp(0, 10);
  }

  private setupEventListeners(): void {
    const bus = EventBus.getInstance();

    this.unbinds.push(
      bus.on('player:damaged', (data) => {
        this.updateHp(data.currentHp, data.maxHp);
      }),
      bus.on('player:healed', (data) => {
        this.updateHp(data.currentHp, data.maxHp);
      }),
      bus.on('xp:gained', (data) => {
        this.updateXp(data.totalXp, data.nextLevelXp);
      }),
      bus.on('player:levelUp', () => {
        this.avatarImage.setTexture('face_victorious').setDisplaySize(68, 68);
      })
    );
  }

  updateHp(current: number, max: number): void {
    const ratio = Math.max(0, Math.min(1, current / max));
    if (this.hpFillImage && this.hpFillImage.texture) {
      const origW = this.hpFillImage.texture.getSourceImage().width;
      const origH = this.hpFillImage.texture.getSourceImage().height;
      this.hpFillImage.setCrop(0, 0, Math.max(1, origW * ratio), origH);
    }

    this.hpText.setText(`HP: ${Math.ceil(current)}/${max}`);

    // Update Expression Avatar based on Health and Hero
    const heroId = this.scene.registry.get('selectedHeroId') || 'hero_worm';
    let smugKey = 'face_smug';
    let boredKey = 'face_bored';
    let injuredKey = 'face_injured';

    if (heroId === 'hero_markovka') {
      smugKey = 'hud_face_smug_markovka';
      boredKey = 'hud_face_bored_markovka';
      injuredKey = 'hud_face_injured_markovka';
    } else if (heroId === 'hero_worm') {
      smugKey = 'hud_face_smug';
      boredKey = 'hud_face_bored';
      injuredKey = 'hud_face_injured';
    }

    let targetKey = smugKey;
    if (ratio > 0.65) {
      targetKey = this.scene.textures.exists(smugKey) ? smugKey : 'face_smug';
    } else if (ratio >= 0.30) {
      targetKey = this.scene.textures.exists(boredKey) ? boredKey : 'face_bored';
    } else {
      targetKey = this.scene.textures.exists(injuredKey) ? injuredKey : 'face_injured';
    }

    this.avatarImage.setTexture(targetKey).setDisplaySize(68, 68);
  }

  updateXp(current: number, nextLevelXp: number): void {
    const ratio = Math.max(0, Math.min(1, current / Math.max(1, nextLevelXp)));
    if (this.xpFillImage && this.xpFillImage.texture) {
      const origW = this.xpFillImage.texture.getSourceImage().width;
      const origH = this.xpFillImage.texture.getSourceImage().height;
      this.xpFillImage.setCrop(0, 0, Math.max(1, origW * ratio), origH);
    }

    const state = (this.scene as any).gameState as GameState | undefined;
    const lvl = state?.level ?? 1;
    this.xpText.setText(`LVL ${lvl} (${current}/${nextLevelXp} XP)`);
  }

  update(state: GameState): void {
    const rightEdge = this.scene.cameras.main.width - 16;
    this.timerText.setX(rightEdge);
    this.killsText.setX(rightEdge);

    const minutes = Math.floor(state.runTime / 60);
    const seconds = Math.floor(state.runTime % 60);
    const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    this.timerText.setText(`TIME: ${timeFormatted}`);
    this.killsText.setText(`KILLS: ${state.kills}`);

    this.updateBuildSlots(state);
  }

  private updateBuildSlots(state: GameState): void {
    const activeEntries = Array.from(state.activeUpgrades.entries());
    const signature = activeEntries.map(([id, lvl]) => `${id}:${lvl}`).join('|');

    if (signature === this.lastSlotsSignature) {
      return;
    }
    this.lastSlotsSignature = signature;

    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (i < activeEntries.length) {
        const [upgId, lvl] = activeEntries[i];
        const upgDef = ALL_UPGRADES.find((u) => u.id === upgId);
        const evoDef = EVOLUTION_RECIPES.find((e) => e.id === upgId);

        const iconKey = upgDef?.iconKey || evoDef?.iconKey || 'icon_weapon_slime_spit';
        const isMax = lvl >= 5 || !!evoDef;

        slot.icon.setTexture(iconKey).setVisible(true);
        slot.frame.setAlpha(1.0);
        slot.badge.setText(isMax ? 'MAX' : `L${lvl}`).setVisible(true);
        slot.badge.setColor(isMax ? '#facc15' : '#4ade80');
      } else {
        slot.icon.setVisible(false);
        slot.frame.setAlpha(0.35);
        slot.badge.setVisible(false);
      }
    }
  }

  resize(width: number, _height: number): void {
    const rightEdge = width - 16;
    this.timerText.setX(rightEdge);
    this.killsText.setX(rightEdge);
  }

  destroy(): void {
    for (const unbind of this.unbinds) {
      unbind();
    }
    this.unbinds = [];
    this.container.destroy();
  }
}
