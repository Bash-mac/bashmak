import Phaser from 'phaser';
import { EventBus } from '../../core/EventBus';
import type { GameState } from '../../core/GameState';
import { ALL_UPGRADES } from '../../data/upgrades';
import { EVOLUTION_RECIPES } from '../../data/evolutions';
import { isAdminUser } from '../../../platform';
import { getHeroById } from '../../data/heroes';

interface HudSlot {
  bg: Phaser.GameObjects.Graphics;
  icon: Phaser.GameObjects.Image;
  frame: Phaser.GameObjects.Image;
  badge: Phaser.GameObjects.Text;
}

export class HUD {
  private scene: Phaser.Scene;
  private elements: Phaser.GameObjects.GameObject[] = [];
  private avatarImage: Phaser.GameObjects.Image;

  // Avatar Level Badge
  private lvlBadgeText: Phaser.GameObjects.Text;

  // HP Pipe Bar System
  private hpFillImage: Phaser.GameObjects.Image;
  private hpText: Phaser.GameObjects.Text;
  private lastHpText = '';

  // XP Pipe Bar System (Matching 90s acid pipe)
  private xpFillImage: Phaser.GameObjects.Image;

  // Stats (Right side)
  private timerText: Phaser.GameObjects.Text;
  private killsText: Phaser.GameObjects.Text;

  // Pause button (Top Right)
  private pauseBtn: Phaser.GameObjects.Rectangle;
  private pauseText: Phaser.GameObjects.Text;

  // Dynamic Weapons & Tomes Build Slots (2 rows: weaponSlots & tomeSlots)
  private weaponSlots: HudSlot[] = [];
  private tomeSlots: HudSlot[] = [];
  private lastSlotsChecksum = -1;

  private unbinds: Array<() => void> = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // 1. Avatar Expression Portrait & Comic Porthole Frame (Shifted right of TG Close button)
    const avatarX = 175;
    const avatarY = 50;

    const maskGfx = scene.make.graphics({ x: 0, y: 0 });
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillCircle(avatarX, avatarY, 34);
    const mask = maskGfx.createGeometryMask();

    const heroId = scene.registry.get('selectedHeroId') || 'hero_vypolzok';
    const initAvatarKey = heroId === 'hero_markovka' ? 'hud_face_smug_markovka' : heroId === 'hero_baklazhan' ? 'portrait_baklazhan' : 'hud_face_smug';
    this.avatarImage = scene.add.image(avatarX, avatarY, scene.textures.exists(initAvatarKey) ? initAvatarKey : 'face_smug')
      .setScrollFactor(0)
      .setDepth(9000);
    this.avatarImage.setDisplaySize(68, 68);
    this.avatarImage.setMask(mask);
    this.elements.push(this.avatarImage);

    const avatarBadge = scene.add.image(avatarX, avatarY, 'hud_avatar_badge_frame')
      .setScrollFactor(0)
      .setDepth(9001);
    avatarBadge.setDisplaySize(92, 92);
    this.elements.push(avatarBadge);

    // Level Badge attached directly to the avatar frame
    const lvlBadgeBg = scene.add.graphics()
      .setScrollFactor(0)
      .setDepth(9002);
    lvlBadgeBg.fillStyle(0x0f172a, 0.95);
    lvlBadgeBg.lineStyle(2.5, 0xfacc15, 1);
    lvlBadgeBg.fillCircle(avatarX + 28, avatarY + 26, 13);
    lvlBadgeBg.strokeCircle(avatarX + 28, avatarY + 26, 13);
    this.elements.push(lvlBadgeBg);

    this.lvlBadgeText = scene.add.text(avatarX + 28, avatarY + 27, '1', {
      fontSize: '13px',
      color: '#fde047',
      fontFamily: '"Gagalin", "Balsamiq Sans", monospace',
      stroke: '#451a03',
      strokeThickness: 2,
      fixedWidth: 20,
      fixedHeight: 20,
      align: 'center',
      padding: { x: 0, y: 0 },
      resolution: 2,
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(9003);
    this.elements.push(this.lvlBadgeText);

    // 2. Dual Pipe Bar System (HP Blood Pipe + XP Acid Pipe)
    const barX = 227;
    const barW = 240;
    const barH = 38;

    // The clear glass cutout inside hud_bar_frame (texture 512x82) is x:144..404 (w:260), y:31..48 (h:18)
    const tubeOffsetX = 67;
    const tubeW = 122;
    const tubeH = 8;
    const glassCenterX = barX + tubeOffsetX + tubeW / 2; // 355

    // --- HP Pipe (Top) ---
    const hpY = 26;
    const hpBg = scene.add.graphics()
      .setScrollFactor(0)
      .setDepth(9000);
    hpBg.fillStyle(0x0a0f1d, 0.95);
    hpBg.fillRect(barX + tubeOffsetX, hpY - tubeH / 2, tubeW, tubeH);
    this.elements.push(hpBg);

    this.hpFillImage = scene.add.image(barX + tubeOffsetX, hpY, 'hud_bar_fill_hp')
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(9001);
    this.hpFillImage.setDisplaySize(tubeW, tubeH);
    this.elements.push(this.hpFillImage);

    const hpPipeFrame = scene.add.image(barX + barW / 2, hpY, 'hud_bar_frame')
      .setScrollFactor(0)
      .setDepth(9002);
    hpPipeFrame.setDisplaySize(barW, barH);
    this.elements.push(hpPipeFrame);

    // Centered HP text neatly fitting within the 8px liquid slit
    this.hpText = scene.add.text(glassCenterX, hpY, '100 / 100', {
      fontSize: '10px',
      color: '#ffffff',
      fontFamily: '"Gagalin", "Balsamiq Sans", monospace',
      stroke: '#3b0707',
      strokeThickness: 1.5,
      fixedWidth: 80,
      fixedHeight: 12,
      align: 'center',
      padding: { x: 0, y: 0 },
      resolution: 2,
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(9003);
    this.elements.push(this.hpText);

    // --- XP Pipe (Directly below HP Pipe — pure visual liquid progress) ---
    const xpY = 60;
    const xpBg = scene.add.graphics()
      .setScrollFactor(0)
      .setDepth(9000);
    xpBg.fillStyle(0x0a0f1d, 0.95);
    xpBg.fillRect(barX + tubeOffsetX, xpY - tubeH / 2, tubeW, tubeH);
    this.elements.push(xpBg);

    this.xpFillImage = scene.add.image(barX + tubeOffsetX, xpY, 'hud_bar_fill_xp')
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(9001);
    this.xpFillImage.setDisplaySize(tubeW, tubeH);
    this.elements.push(this.xpFillImage);

    const xpPipeFrame = scene.add.image(barX + barW / 2, xpY, 'hud_bar_frame')
      .setScrollFactor(0)
      .setDepth(9002);
    xpPipeFrame.setDisplaySize(barW, barH);
    this.elements.push(xpPipeFrame);

    // 3. Stats (Right side shifted left to avoid TG buttons)
    const rightEdge = scene.cameras.main.width - 110;
    this.timerText = scene.add.text(rightEdge, 14, 'TIME: 00:00', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: '"Gagalin", "Balsamiq Sans", monospace',
      stroke: '#090d16',
      strokeThickness: 3,
      resolution: 2,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(9000);
    this.elements.push(this.timerText);

    this.killsText = scene.add.text(rightEdge, 36, 'KILLS: 0', {
      fontSize: '16px',
      color: '#f87171',
      fontFamily: '"Gagalin", "Balsamiq Sans", monospace',
      stroke: '#450a0a',
      strokeThickness: 3,
      resolution: 2,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(9000);
    this.elements.push(this.killsText);

    // Pause Button (Top Right corner)
    const pauseX = scene.cameras.main.width - 45;
    const pauseY = 32;
    this.pauseBtn = scene.add.rectangle(pauseX, pauseY, 36, 36, 0x0f172a, 0.9)
      .setStrokeStyle(2, 0xfacc15)
      .setScrollFactor(0)
      .setDepth(9005)
      .setInteractive({ useHandCursor: true });
    this.pauseBtn.on('pointerdown', () => {
      EventBus.getInstance().emit('ui:pause_requested');
    });
    this.elements.push(this.pauseBtn);

    this.pauseText = scene.add.text(pauseX, pauseY, '||', {
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#facc15',
      fontFamily: '"Gagalin", "Balsamiq Sans", monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(9006);
    this.elements.push(this.pauseText);

    const platform = (scene as any).platform;
    if (isAdminUser(platform)) {
      const devX = pauseX - 58;
      const devBtn = scene.add.rectangle(devX, pauseY, 56, 32, 0x0369a1, 0.95)
        .setStrokeStyle(2, 0x38bdf8)
        .setScrollFactor(0)
        .setDepth(9005)
        .setInteractive({ useHandCursor: true });
      const devText = scene.add.text(devX, pauseY, 'DEV', {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffffff',
        fontFamily: '"Gagalin", "Balsamiq Sans", monospace',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(9006);
      devBtn.on('pointerdown', () => {
        EventBus.getInstance().emit('ui:toggleDebug');
      });
      this.elements.push(devBtn, devText);
    }

    // 4. Dynamic Weapons & Tomes Build Slots (Bottom Center, 2 rows)
    const state = (scene as any).gameState as GameState | undefined;
    const maxWpns = state?.maxWeaponSlots ?? 2;
    const maxTomes = state?.maxTomeSlots ?? 2;

    const slotSize = 34;
    const slotSpacing = 6;
    const innerCutout = slotSize * 0.70;

    // Row 1: Weapons
    const totalWpnW = maxWpns * slotSize + (maxWpns - 1) * slotSpacing;
    const startWpnX = scene.cameras.main.width / 2 - totalWpnW / 2 + slotSize / 2;
    const wpnSlotY = scene.cameras.main.height - 48;

    for (let i = 0; i < maxWpns; i++) {
      const slotX = Math.round(startWpnX + i * (slotSize + slotSpacing));
      const slotBg = scene.add.graphics().setScrollFactor(0).setDepth(9000);
      slotBg.fillStyle(0x060911, 0.95);
      slotBg.fillRect(Math.round(slotX - innerCutout / 2), Math.round(wpnSlotY - innerCutout / 2), innerCutout, innerCutout);
      this.elements.push(slotBg);

      const slotIcon = scene.add.image(slotX, wpnSlotY, 'icon_weapon_slime_spit').setScrollFactor(0).setDepth(9001).setVisible(false);
      slotIcon.setDisplaySize(innerCutout, innerCutout);
      this.elements.push(slotIcon);

      const slotFrame = scene.add.image(slotX, wpnSlotY, 'hud_slot_frame').setScrollFactor(0).setDepth(9002);
      slotFrame.setDisplaySize(slotSize, slotSize).setAlpha(0.35);
      this.elements.push(slotFrame);

      const slotBadge = scene.add.text(Math.round(slotX + innerCutout / 2 - 1), Math.round(wpnSlotY + innerCutout / 2 - 1), 'L1', {
        fontSize: '9px', color: '#facc15', fontFamily: '"Gagalin", "Balsamiq Sans", monospace',
        stroke: '#451a03', strokeThickness: 2, resolution: 2,
      }).setOrigin(1, 1).setScrollFactor(0).setDepth(9003).setVisible(false);
      this.elements.push(slotBadge);

      this.weaponSlots.push({ bg: slotBg, icon: slotIcon, frame: slotFrame, badge: slotBadge });
    }

    // Row 2: Tomes
    const totalTomeW = maxTomes * slotSize + (maxTomes - 1) * slotSpacing;
    const startTomeX = scene.cameras.main.width / 2 - totalTomeW / 2 + slotSize / 2;
    const tomeSlotY = scene.cameras.main.height - 18;

    for (let i = 0; i < maxTomes; i++) {
      const slotX = Math.round(startTomeX + i * (slotSize + slotSpacing));
      const slotBg = scene.add.graphics().setScrollFactor(0).setDepth(9000);
      slotBg.fillStyle(0x060911, 0.95);
      slotBg.fillRect(Math.round(slotX - innerCutout / 2), Math.round(tomeSlotY - innerCutout / 2), innerCutout, innerCutout);
      this.elements.push(slotBg);

      const slotIcon = scene.add.image(slotX, tomeSlotY, 'icon_tome_damage').setScrollFactor(0).setDepth(9001).setVisible(false);
      slotIcon.setDisplaySize(innerCutout, innerCutout);
      this.elements.push(slotIcon);

      const slotFrame = scene.add.image(slotX, tomeSlotY, 'hud_slot_frame').setScrollFactor(0).setDepth(9002);
      slotFrame.setDisplaySize(slotSize, slotSize).setAlpha(0.35);
      this.elements.push(slotFrame);

      const slotBadge = scene.add.text(Math.round(slotX + innerCutout / 2 - 1), Math.round(tomeSlotY + innerCutout / 2 - 1), 'L1', {
        fontSize: '9px', color: '#facc15', fontFamily: '"Gagalin", "Balsamiq Sans", monospace',
        stroke: '#451a03', strokeThickness: 2, resolution: 2,
      }).setOrigin(1, 1).setScrollFactor(0).setDepth(9003).setVisible(false);
      this.elements.push(slotBadge);

      this.tomeSlots.push({ bg: slotBg, icon: slotIcon, frame: slotFrame, badge: slotBadge });
    }

    this.setupEventListeners();
    const initialMaxHp = getHeroById(heroId).stats.maxHp;
    this.updateHp(initialMaxHp, initialMaxHp);
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

    const newHpText = `${Math.ceil(current)} / ${max}`;
    if (newHpText !== this.lastHpText) {
      this.lastHpText = newHpText;
      this.hpText.setText(newHpText);
    }

    // Update Expression Avatar based on Health and Hero
    const heroId = this.scene.registry.get('selectedHeroId') || 'hero_vypolzok';
    let smugKey = 'hud_face_smug';
    let boredKey = 'hud_face_bored';
    let injuredKey = 'hud_face_injured';

    if (heroId === 'hero_markovka') {
      smugKey = 'hud_face_smug_markovka';
      boredKey = 'hud_face_bored_markovka';
      injuredKey = 'hud_face_injured_markovka';
    } else if (heroId === 'hero_baklazhan') {
      smugKey = 'portrait_baklazhan';
      boredKey = 'portrait_baklazhan';
      injuredKey = 'portrait_baklazhan';
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
    const rightEdge = Math.round(this.scene.cameras.main.width - 110);
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
    if (checksum === this.lastSlotsChecksum) return;
    this.lastSlotsChecksum = checksum;

    const pool = ALL_UPGRADES;
    const activeWeapons: { id: string; level: number; icon: string; isMax: boolean }[] = [];
    const activeTomes: { id: string; level: number; icon: string; isMax: boolean }[] = [];

    for (const [upgId, lvl] of state.activeUpgrades.entries()) {
      if (lvl <= 0) continue;
      const upgDef = pool.find((u) => u.id === upgId);
      const evoDef = EVOLUTION_RECIPES.find((e) => e.id === upgId);
      const iconKey = upgDef?.iconKey || evoDef?.iconKey || 'icon_weapon_slime_spit';
      const isMax = lvl >= 5 || !!evoDef;

      if (evoDef || upgDef?.category === 'weapon') {
        activeWeapons.push({ id: upgId, level: lvl, icon: iconKey, isMax });
      } else if (upgDef?.category === 'tome') {
        activeTomes.push({ id: upgId, level: lvl, icon: iconKey, isMax });
      }
    }

    // Update weapon slots
    for (let i = 0; i < this.weaponSlots.length; i++) {
      const slot = this.weaponSlots[i];
      if (i < activeWeapons.length) {
        const item = activeWeapons[i];
        slot.icon.setTexture(item.icon).setVisible(true);
        slot.frame.setAlpha(1.0);
        slot.badge.setText(item.isMax ? 'MAX' : `L${item.level}`).setVisible(true);
        slot.badge.setColor(item.isMax ? '#facc15' : '#4ade80');
      } else {
        slot.icon.setVisible(false);
        slot.frame.setAlpha(0.35);
        slot.badge.setVisible(false);
      }
    }

    // Update tome slots
    for (let i = 0; i < this.tomeSlots.length; i++) {
      const slot = this.tomeSlots[i];
      if (i < activeTomes.length) {
        const item = activeTomes[i];
        slot.icon.setTexture(item.icon).setVisible(true);
        slot.frame.setAlpha(1.0);
        slot.badge.setText(item.isMax ? 'MAX' : `L${item.level}`).setVisible(true);
        slot.badge.setColor(item.isMax ? '#facc15' : '#4ade80');
      } else {
        slot.icon.setVisible(false);
        slot.frame.setAlpha(0.35);
        slot.badge.setVisible(false);
      }
    }
  }

  resize(width: number, height: number): void {
    const rightEdge = Math.round(width - 110);
    this.timerText.setX(rightEdge);
    this.killsText.setX(rightEdge);

    const pauseX = Math.round(width - 45);
    this.pauseBtn.setPosition(pauseX, 32);
    this.pauseText.setPosition(pauseX, 32);

    const slotSize = 34;
    const slotSpacing = 6;
    const innerCutout = slotSize * 0.70;

    // Row 1: Weapons
    const totalWpnW = this.weaponSlots.length * slotSize + (this.weaponSlots.length - 1) * slotSpacing;
    const startWpnX = Math.round(width / 2 - totalWpnW / 2 + slotSize / 2);
    const wpnSlotY = Math.round(height - 48);

    for (let i = 0; i < this.weaponSlots.length; i++) {
      const slot = this.weaponSlots[i];
      const slotX = Math.round(startWpnX + i * (slotSize + slotSpacing));
      slot.bg.clear();
      slot.bg.fillStyle(0x060911, 0.95);
      slot.bg.fillRect(Math.round(slotX - innerCutout / 2), Math.round(wpnSlotY - innerCutout / 2), innerCutout, innerCutout);
      slot.icon.setPosition(slotX, wpnSlotY);
      slot.frame.setPosition(slotX, wpnSlotY);
      slot.badge.setPosition(Math.round(slotX + innerCutout / 2 - 1), Math.round(wpnSlotY + innerCutout / 2 - 1));
    }

    // Row 2: Tomes
    const totalTomeW = this.tomeSlots.length * slotSize + (this.tomeSlots.length - 1) * slotSpacing;
    const startTomeX = Math.round(width / 2 - totalTomeW / 2 + slotSize / 2);
    const tomeSlotY = Math.round(height - 18);

    for (let i = 0; i < this.tomeSlots.length; i++) {
      const slot = this.tomeSlots[i];
      const slotX = Math.round(startTomeX + i * (slotSize + slotSpacing));
      slot.bg.clear();
      slot.bg.fillStyle(0x060911, 0.95);
      slot.bg.fillRect(Math.round(slotX - innerCutout / 2), Math.round(tomeSlotY - innerCutout / 2), innerCutout, innerCutout);
      slot.icon.setPosition(slotX, tomeSlotY);
      slot.frame.setPosition(slotX, tomeSlotY);
      slot.badge.setPosition(Math.round(slotX + innerCutout / 2 - 1), Math.round(tomeSlotY + innerCutout / 2 - 1));
    }
  }

  destroy(): void {
    for (const unbind of this.unbinds) {
      unbind();
    }
    this.unbinds = [];
    for (const el of this.elements) {
      el.destroy();
    }
    this.elements = [];
  }
}
