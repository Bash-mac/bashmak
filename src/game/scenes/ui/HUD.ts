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

  // Avatar Level Badge
  private lvlBadgeText: Phaser.GameObjects.Text;

  // HP Pipe Bar System
  private hpFillImage: Phaser.GameObjects.Image;
  private hpText: Phaser.GameObjects.Text;

  // XP Pipe Bar System (Matching 90s acid pipe)
  private xpFillImage: Phaser.GameObjects.Image;

  // Stats (Right side)
  private timerText: Phaser.GameObjects.Text;
  private killsText: Phaser.GameObjects.Text;

  // 4 Slot Mutation Tracker (Using hud_slot_frame & square icons)
  private slots: HudSlot[] = [];
  private lastSlotsChecksum = -1;

  private unbinds: Array<() => void> = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(9000);

    // 1. Avatar Expression Portrait & Comic Porthole Frame (Shifted right of TG Close button)
    const avatarX = 175;
    const avatarY = 50;

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

    // Level Badge attached directly to the avatar frame
    const lvlBadgeBg = scene.add.graphics();
    lvlBadgeBg.fillStyle(0x0f172a, 0.95);
    lvlBadgeBg.lineStyle(2.5, 0xfacc15, 1);
    lvlBadgeBg.fillCircle(avatarX + 28, avatarY + 26, 13);
    lvlBadgeBg.strokeCircle(avatarX + 28, avatarY + 26, 13);

    this.lvlBadgeText = scene.add.text(avatarX + 28, avatarY + 26, '1', {
      fontSize: '12px',
      color: '#fde047',
      fontFamily: '"Gagalin", "Balsamiq Sans", monospace',
      stroke: '#451a03',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5);

    // 2. Dual Pipe Bar System (HP Blood Pipe + XP Acid Pipe)
    const barX = 227;
    const barW = 230;
    const barH = 34;

    // The clear glass cutout inside hud_bar_frame starts at offset +66 and is 144px wide
    const tubeOffsetX = 66;
    const tubeW = 144;
    const tubeH = 12;

    // --- HP Pipe (Top) ---
    const hpY = 26;
    const hpBg = scene.add.graphics();
    hpBg.fillStyle(0x0a0f1d, 0.95);
    hpBg.fillRect(barX + tubeOffsetX, hpY - tubeH / 2, tubeW, tubeH);

    this.hpFillImage = scene.add.image(barX + tubeOffsetX, hpY, 'hud_bar_fill_hp').setOrigin(0, 0.5);
    this.hpFillImage.setDisplaySize(tubeW, tubeH);

    const hpPipeFrame = scene.add.image(barX + barW / 2 - 2, hpY, 'hud_bar_frame');
    hpPipeFrame.setDisplaySize(barW, barH);

    // Compact centered HP text
    this.hpText = scene.add.text(barX + tubeOffsetX + tubeW / 2, hpY, '100 / 100', {
      fontSize: '10px',
      color: '#ffffff',
      fontFamily: '"Gagalin", "Balsamiq Sans", monospace',
      stroke: '#3b0707',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5);

    // --- XP Pipe (Directly below HP Pipe — pure visual liquid progress) ---
    const xpY = 58;
    const xpBg = scene.add.graphics();
    xpBg.fillStyle(0x0a0f1d, 0.95);
    xpBg.fillRect(barX + tubeOffsetX, xpY - tubeH / 2, tubeW, tubeH);

    this.xpFillImage = scene.add.image(barX + tubeOffsetX, xpY, 'hud_bar_fill_xp').setOrigin(0, 0.5);
    this.xpFillImage.setDisplaySize(tubeW, tubeH);

    const xpPipeFrame = scene.add.image(barX + barW / 2 - 2, xpY, 'hud_bar_frame');
    xpPipeFrame.setDisplaySize(barW, barH);

    // 3. Stats (Right side shifted left to avoid TG buttons)
    const rightEdge = scene.cameras.main.width - 110;
    this.timerText = scene.add.text(rightEdge, 14, 'TIME: 00:00', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: '"Gagalin", "Balsamiq Sans", monospace',
      stroke: '#090d16',
      strokeThickness: 3,
    }).setOrigin(1, 0);

    this.killsText = scene.add.text(rightEdge, 36, 'KILLS: 0', {
      fontSize: '16px',
      color: '#f87171',
      fontFamily: '"Gagalin", "Balsamiq Sans", monospace',
      stroke: '#450a0a',
      strokeThickness: 3,
    }).setOrigin(1, 0);

    // 4. 4 Mutation / Weapon Slots (Bottom Center)
    const slotSize = 48;
    const slotSpacing = 8;
    const totalW = 4 * slotSize + 3 * slotSpacing;
    const startX = scene.cameras.main.width / 2 - totalW / 2 + slotSize / 2;
    const slotY = scene.cameras.main.height - 34;

    for (let i = 0; i < 4; i++) {
      const slotX = startX + i * (slotSize + slotSpacing);

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
        color: '#facc15',
        fontFamily: '"Gagalin", "Balsamiq Sans", monospace',
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
      lvlBadgeBg,
      this.lvlBadgeText,
      hpBg,
      this.hpFillImage,
      hpPipeFrame,
      this.hpText,
      xpBg,
      this.xpFillImage,
      xpPipeFrame,
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
        const heroId = this.scene.registry.get('selectedHeroId') || 'hero_vypolzok';
        const victoriousKey = heroId === 'hero_markovka' ? 'hud_face_smug_markovka' : 'hud_face_smug';
        if (this.scene.textures.exists(victoriousKey)) {
          this.avatarImage.setTexture(victoriousKey).setDisplaySize(68, 68);
        }
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

    this.hpText.setText(`${Math.ceil(current)} / ${max}`);

    // Update Expression Avatar based on Health and Hero
    const heroId = this.scene.registry.get('selectedHeroId') || 'hero_vypolzok';
    let smugKey = 'hud_face_smug';
    let boredKey = 'hud_face_bored';
    let injuredKey = 'hud_face_injured';

    if (heroId === 'hero_markovka') {
      smugKey = 'hud_face_smug_markovka';
      boredKey = 'hud_face_bored_markovka';
      injuredKey = 'hud_face_injured_markovka';
    }

    let targetKey = smugKey;
    if (ratio > 0.65) {
      targetKey = smugKey;
    } else if (ratio >= 0.30) {
      targetKey = boredKey;
    } else {
      targetKey = injuredKey;
    }

    if (this.avatarImage && this.scene.textures.exists(targetKey)) {
      this.avatarImage.setTexture(targetKey).setDisplaySize(68, 68);
    }
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
    if (this.lvlBadgeText) {
      this.lvlBadgeText.setText(String(lvl));
    }
  }

  update(state: GameState): void {
    const rightEdge = this.scene.cameras.main.width - 110;
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
    let checksum = state.activeUpgrades.size;
    for (const lvl of state.activeUpgrades.values()) {
      checksum = (checksum * 31 + lvl) | 0;
    }

    if (checksum === this.lastSlotsChecksum) {
      return;
    }
    this.lastSlotsChecksum = checksum;

    let idx = 0;
    for (const [upgId, lvl] of state.activeUpgrades.entries()) {
      if (idx >= this.slots.length) break;
      const slot = this.slots[idx];
      const upgDef = ALL_UPGRADES.find((u) => u.id === upgId);
      const evoDef = EVOLUTION_RECIPES.find((e) => e.id === upgId);

      const iconKey = upgDef?.iconKey || evoDef?.iconKey || 'icon_weapon_slime_spit';
      const isMax = lvl >= 5 || !!evoDef;

      slot.icon.setTexture(iconKey).setVisible(true);
      slot.frame.setAlpha(1.0);
      slot.badge.setText(isMax ? 'MAX' : `L${lvl}`).setVisible(true);
      slot.badge.setColor(isMax ? '#facc15' : '#4ade80');
      idx++;
    }

    for (let i = idx; i < this.slots.length; i++) {
      const slot = this.slots[i];
      slot.icon.setVisible(false);
      slot.frame.setAlpha(0.35);
      slot.badge.setVisible(false);
    }
  }

  resize(width: number, height: number): void {
    const rightEdge = width - 110;
    this.timerText.setX(rightEdge);
    this.killsText.setX(rightEdge);

    const slotSize = 48;
    const slotSpacing = 8;
    const totalW = 4 * slotSize + 3 * slotSpacing;
    const startX = width / 2 - totalW / 2 + slotSize / 2;
    const slotY = height - 34;

    for (let i = 0; i < this.slots.length; i++) {
      this.slots[i].container.setPosition(startX + i * (slotSize + slotSpacing), slotY);
    }
  }

  destroy(): void {
    for (const unbind of this.unbinds) {
      unbind();
    }
    this.unbinds = [];
    this.container.destroy();
  }
}
