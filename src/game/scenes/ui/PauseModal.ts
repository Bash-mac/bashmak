import Phaser from 'phaser';
import { GameState } from '../../core/GameState';
import { AudioManager } from '../../audio/AudioManager';
import { createPlatformAdapter } from '../../../platform';
import { ALL_UPGRADES } from '../../data/upgrades';
import { EVOLUTION_RECIPES } from '../../data/evolutions';

export interface PauseModalCallbacks {
  onResume: () => void;
  onGrimoire?: () => void;
  onRestart: () => void;
  onMenu: () => void;
}

// Proportions of pause_panel.webp (1366x1024 native)
const PANEL_W = 1366;
const PANEL_H = 1024;
const BANNER_CX = 0.49; // green banner center, measured on the art
const BANNER_CY = 0.10;

interface SlotItem {
  id: string;
  name: string;
  level: number;
  icon: string;
  isMax: boolean;
}

interface ButtonDef {
  frame: string;
  icon: string;
  label: string;
  color: string;
  vibrate: number;
  guarded: boolean;
  cb: () => void;
}

export class PauseModal {
  private scene: Phaser.Scene;
  private platform = createPlatformAdapter();
  private audio = AudioManager.getInstance();
  private elements: Phaser.GameObjects.GameObject[] = [];
  public isVisible = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public show(callbacks: PauseModalCallbacks): void {
    this.clear();
    this.isVisible = true;

    const { width, height } = this.scene.cameras.main;
    const state = GameState.getInstance();
    const centerX = width / 2;

    const backdrop = this.scene.add
      .rectangle(centerX, height / 2, width, height, 0x090d16, 0.88)
      .setScrollFactor(0)
      .setDepth(25000)
      .setInteractive();
    this.elements.push(backdrop);

    // Panel art keeps its native aspect; content offsets are defined in
    // native panel units and multiplied by k so both orientations scale.
    const panelH = Math.min(height - 24, (width - 24) * (PANEL_H / PANEL_W));
    const k = panelH / PANEL_H;
    const panelW = panelH * (PANEL_W / PANEL_H);
    const panelX = centerX;
    const panelY = height / 2;
    const topY = panelY - panelH / 2;
    const px = (nx: number) => panelX + (nx - PANEL_W / 2) * k;
    const py = (ny: number) => topY + ny * k;

    const panel = this.scene.add
      .image(panelX, panelY, 'pause_panel')
      .setDisplaySize(panelW, panelH)
      .setScrollFactor(0)
      .setDepth(25001)
      .setInteractive();
    this.elements.push(panel);

    // Title on the painted green banner
    const title = this.scene.add
      .text(px(BANNER_CX * PANEL_W), py(BANNER_CY * PANEL_H), 'ПАУЗА', {
        fontSize: `${Math.max(20, Math.round(46 * k))}px`,
        fontStyle: 'bold',
        color: '#1a2f08',
        fontFamily: '"Gagalin", "Balsamiq Sans", monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(25005);
    this.elements.push(title);

    // Stats on the parchment ribbon, colored segments like the reference
    const minutes = Math.floor(state.runTime / 60);
    const seconds = Math.floor(state.runTime % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    const segFont = { fontSize: `${Math.max(12, Math.round(27 * k))}px`, fontFamily: '"Gagalin", "Balsamiq Sans", monospace' };
    const segs: { text: string; color: string }[] = [
      { text: 'ВРЕМЯ ', color: '#6b5a3e' },
      { text: timeStr, color: '#2e7d32' },
      { text: '   УБИЙСТВА ', color: '#6b5a3e' },
      { text: String(state.kills), color: '#6a1b9a' },
      { text: '   УРОВЕНЬ ', color: '#6b5a3e' },
      { text: String(state.level), color: '#c05600' },
    ];
    const statsY = py(216);
    const statsTexts = segs.map((s) => {
      const t = this.scene.add.text(0, statsY - 12 * k, s.text, { ...segFont, color: s.color }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(25005);
      this.elements.push(t);
      return t;
    });
    const totalW = statsTexts.reduce((acc, t) => acc + t.width, 0);
    let cursor = panelX - totalW / 2;
    for (const t of statsTexts) {
      t.setX(Math.round(cursor));
      cursor += t.width;
    }

    const statsRibbon = this.scene.add
      .image(panelX, statsY, 'pause_ribbon_stats')
      .setDisplaySize(620 * k, 620 * k * (184 / 912))
      .setScrollFactor(0)
      .setDepth(25002);
    this.elements.push(statsRibbon);

    const weapons = this.collectSlots(state, 'weapon');
    const tomes = this.collectSlots(state, 'tome');

    this.renderSlotsRow('ОРУЖИЕ', weapons, state.maxWeaponSlots, py(296), py(366), 0x8be85f, k);
    this.renderSlotsRow('ФОЛИАНТЫ', tomes, state.maxTomeSlots, py(438), py(508), 0xb678f0, k);

    let isTriggered = false;
    const buttons: ButtonDef[] = [
      { frame: 'pause_btn_green', icon: 'pause_icon_play', label: 'ПРОДОЛЖИТЬ', color: '#ffffff', vibrate: 20, guarded: true, cb: callbacks.onResume },
      { frame: 'pause_btn_purple', icon: 'pause_icon_grimoire', label: 'ГРИМУАР ЭВОЛЮЦИЙ', color: '#ffffff', vibrate: 20, guarded: false, cb: () => callbacks.onGrimoire?.() },
      { frame: 'pause_btn_orange', icon: 'pause_icon_restart', label: 'ЗАНОВО', color: '#fef3c7', vibrate: 30, guarded: true, cb: callbacks.onRestart },
      { frame: 'pause_btn_gray', icon: 'pause_icon_home', label: 'В ГЛАВНОЕ МЕНЮ', color: '#cbd5e1', vibrate: 30, guarded: true, cb: callbacks.onMenu },
    ];

    const btnW = 500 * k;
    const btnH = 96 * k;
    const centers = [604, 714, 824, 934];
    buttons.forEach((def, i) => {
      const by = py(centers[i]);
      const frame = this.scene.add
        .image(panelX, by, def.frame)
        .setDisplaySize(btnW, btnH)
        .setScrollFactor(0)
        .setDepth(25003)
        .setInteractive({ useHandCursor: true });
      frame.on('pointerdown', () => {
        if (def.guarded && isTriggered) return;
        isTriggered = true;
        this.platform.vibrate(def.vibrate);
        this.audio.playClick();
        this.clear();
        def.cb();
      });
      this.elements.push(frame);

      // Optically centered on the plank area (art has slime drips on the top edge)
      const contentY = by + 3 * k;
      const iconSize = 56 * k;
      const label = this.scene.add.text(0, contentY, def.label, {
        fontSize: `${Math.max(12, Math.round(28 * k))}px`,
        fontStyle: 'bold',
        color: def.color,
        fontFamily: '"Gagalin", "Balsamiq Sans", monospace',
        stroke: '#1a1206',
        strokeThickness: Math.max(2, Math.round(4 * k)),
      }).setOrigin(0.5).setScrollFactor(0).setDepth(25005);
      const contentW = label.width + iconSize + 12 * k;
      // icon left of the text, pair centered on the button
      const icon = this.scene.add
        .image(panelX - contentW / 2 + iconSize / 2, contentY, def.icon)
        .setDisplaySize(iconSize, iconSize)
        .setScrollFactor(0)
        .setDepth(25004);
      label.setX(icon.x + iconSize / 2 + 12 * k + label.width / 2);
      this.elements.push(frame, icon, label);
    });
  }

  private collectSlots(state: GameState, kind: 'weapon' | 'tome'): SlotItem[] {
    const items: SlotItem[] = [];
    state.activeUpgrades.forEach((level, id) => {
      const upgDef = ALL_UPGRADES.find((u) => u.id === id);
      const evoDef = EVOLUTION_RECIPES.find((e) => e.id === id);
      if (!upgDef && !evoDef) return;
      const isWeapon = !!evoDef || upgDef?.category === 'weapon';
      if (kind === 'weapon' ? !isWeapon : isWeapon || upgDef?.category !== 'tome') return;
      items.push({
        id,
        name: upgDef?.name || evoDef?.name || '',
        level,
        icon: upgDef?.iconKey || evoDef?.iconKey || 'icon_weapon_slime_spit',
        isMax: level >= 5 || !!evoDef,
      });
    });
    return items;
  }

  private renderSlotsRow(label: string, items: SlotItem[], maxSlots: number, ribbonY: number, slotsY: number, tint: number, k: number): void {
    const centerX = this.scene.cameras.main.width / 2;

    const ribbon = this.scene.add
      .image(centerX, ribbonY, 'pause_ribbon_section')
      .setDisplaySize(300 * k, 300 * k * (72 / 277))
      .setScrollFactor(0)
      .setDepth(25002);
    this.elements.push(ribbon);

    const labelText = this.scene.add
      .text(centerX, ribbonY, `${label}  ${items.length}/${maxSlots}`, {
        fontSize: `${Math.max(11, Math.round(24 * k))}px`,
        fontStyle: 'bold',
        color: '#3b2a14',
        fontFamily: '"Gagalin", "Balsamiq Sans", monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(25005);
    this.elements.push(labelText);

    const slotSize = Math.max(34, Math.round(80 * k));
    const gap = Math.round(14 * k);
    const startX = centerX - (maxSlots * slotSize + (maxSlots - 1) * gap) / 2 + slotSize / 2;

    for (let i = 0; i < maxSlots; i++) {
      const sx = startX + i * (slotSize + gap);
      const item = items[i];
      const frame = this.scene.add
        .image(sx, slotsY, 'pause_slot_empty')
        .setDisplaySize(slotSize, slotSize)
        .setScrollFactor(0)
        .setDepth(25003);
      if (item) {
        frame.setTint(tint);
      } else {
        frame.setAlpha(0.55);
      }
      this.elements.push(frame);

      if (item) {
        const icon = this.scene.add
          .image(sx, slotsY, item.icon)
          .setDisplaySize(slotSize * 0.66, slotSize * 0.66)
          .setScrollFactor(0)
          .setDepth(25004);
        const badge = this.scene.add
          .text(Math.round(sx + slotSize / 2 - 2), Math.round(slotsY + slotSize / 2 - 2), item.isMax ? 'MAX' : `L${item.level}`, {
            fontSize: `${Math.max(8, Math.round(17 * k))}px`,
            fontStyle: 'bold',
            color: item.isMax ? '#facc15' : '#4ade80',
            fontFamily: '"Gagalin", "Balsamiq Sans", monospace',
            stroke: '#000000',
            strokeThickness: 2,
          })
          .setOrigin(1, 1)
          .setScrollFactor(0)
          .setDepth(25005);
        this.elements.push(icon, badge);
      }
    }
  }

  public clear(): void {
    this.isVisible = false;
    for (const el of this.elements) {
      el.destroy();
    }
    this.elements = [];
  }

  public destroy(): void {
    this.clear();
  }
}
