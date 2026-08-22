import Phaser from 'phaser';
import { EventBus } from '../../core/EventBus';
import type { GameState } from '../../core/GameState';
import { WORM_UPGRADES } from '../../data/upgrades';

export class HUD {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private avatarImage: Phaser.GameObjects.Image;
  private avatarFrame: Phaser.GameObjects.Graphics;

  private hpBarBackground: Phaser.GameObjects.Graphics;
  private hpBarFill: Phaser.GameObjects.Graphics;
  private hpText: Phaser.GameObjects.Text;

  private xpBarBackground: Phaser.GameObjects.Graphics;
  private xpBarFill: Phaser.GameObjects.Graphics;
  private levelText: Phaser.GameObjects.Text;

  private timerText: Phaser.GameObjects.Text;
  private killsText: Phaser.GameObjects.Text;

  // 4 Slot Mutation Tracker
  private slotsGraphics: Phaser.GameObjects.Graphics;
  private slotsTextContainer: Phaser.GameObjects.Container;

  private unbinds: Array<() => void> = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(9000);

    // Avatar Expression Portrait
    this.avatarFrame = scene.add.graphics();
    this.avatarFrame.fillStyle(0x0f172a, 0.9);
    this.avatarFrame.lineStyle(2, 0x4ade80, 1);
    this.avatarFrame.fillRoundedRect(12, 16, 62, 54, 8);
    this.avatarFrame.strokeRoundedRect(12, 16, 62, 54, 8);

    this.avatarImage = scene.add.image(43, 43, 'face_smug').setDisplaySize(56, 46);

    // HP Bar
    this.hpBarBackground = scene.add.graphics();
    this.hpBarFill = scene.add.graphics();
    this.hpText = scene.add.text(84, 40, 'HP: 100/100', {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
      fontFamily: 'monospace',
    });

    // XP Bar (across the top)
    this.xpBarBackground = scene.add.graphics();
    this.xpBarFill = scene.add.graphics();
    this.levelText = scene.add.text(84, 56, 'LVL 1', {
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#4ade80',
      fontFamily: 'monospace',
    });

    // Stats (Right side)
    const rightEdge = scene.cameras.main.width - 16;
    this.timerText = scene.add.text(rightEdge, 16, 'TIME: 00:00', {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(1, 0);

    this.killsText = scene.add.text(rightEdge, 38, 'KILLS: 0', {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#f87171',
      fontFamily: 'monospace',
    }).setOrigin(1, 0);

    // Slots Tracker
    this.slotsGraphics = scene.add.graphics();
    this.slotsTextContainer = scene.add.container(0, 0);

    this.container.add([
      this.avatarFrame,
      this.avatarImage,
      this.hpBarBackground,
      this.hpBarFill,
      this.hpText,
      this.xpBarBackground,
      this.xpBarFill,
      this.levelText,
      this.timerText,
      this.killsText,
      this.slotsGraphics,
      this.slotsTextContainer,
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
        this.levelText.setText(`LVL ${data.level}`);
      }),
      bus.on('player:levelUp', (data) => {
        this.levelText.setText(`LVL ${data.newLevel}`);
        this.avatarImage.setTexture('face_victorious');
      })
    );
  }

  updateHp(current: number, max: number): void {
    const width = 200;
    const height = 18;
    const x = 84;
    const y = 18;

    this.hpBarBackground.clear();
    this.hpBarBackground.fillStyle(0x1f2937, 0.85);
    this.hpBarBackground.lineStyle(1.5, 0x4b5563);
    this.hpBarBackground.fillRoundedRect(x, y, width, height, 5);
    this.hpBarBackground.strokeRoundedRect(x, y, width, height, 5);

    const ratio = Math.max(0, Math.min(1, current / max));
    this.hpBarFill.clear();
    this.hpBarFill.fillStyle(0xef4444, 0.95);
    this.hpBarFill.fillRoundedRect(x, y, width * ratio, height, 5);

    this.hpText.setText(`HP: ${Math.ceil(current)}/${max}`);

    // Update Bashmak Expression Avatar based on Health
    if (ratio > 0.65) {
      this.avatarImage.setTexture('face_smug');
    } else if (ratio >= 0.30) {
      this.avatarImage.setTexture('face_bored');
    } else {
      this.avatarImage.setTexture('face_injured');
    }
  }

  updateXp(current: number, nextLevelXp: number): void {
    const width = this.scene.cameras.main.width - 32;
    const height = 7;
    const x = 16;
    const y = 6;

    this.xpBarBackground.clear();
    this.xpBarBackground.fillStyle(0x1e293b, 0.8);
    this.xpBarBackground.fillRect(x, y, width, height);

    const ratio = Math.max(0, Math.min(1, current / nextLevelXp));
    this.xpBarFill.clear();
    this.xpBarFill.fillStyle(0x3b82f6, 1);
    this.xpBarFill.fillRect(x, y, width * ratio, height);
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
    this.slotsGraphics.clear();
    this.slotsTextContainer.removeAll(true);

    const startX = 14;
    const startY = 82;
    const slotW = 86;
    const slotH = 28;
    const spacing = 8;

    const activeEntries = Array.from(state.activeUpgrades.entries());

    for (let i = 0; i < 4; i++) {
      const x = startX + i * (slotW + spacing);
      const y = startY;

      if (i < activeEntries.length) {
        const [upgId, lvl] = activeEntries[i];
        const upgDef = WORM_UPGRADES.find((u) => u.id === upgId);
        const isMax = lvl >= 5;

        const borderCol = isMax ? 0xfacc15 : 0x4ade80;
        const bgCol = isMax ? 0x422006 : 0x14532d;

        this.slotsGraphics.fillStyle(bgCol, 0.9);
        this.slotsGraphics.lineStyle(1.5, borderCol, 0.95);
        this.slotsGraphics.fillRoundedRect(x, y, slotW, slotH, 5);
        this.slotsGraphics.strokeRoundedRect(x, y, slotW, slotH, 5);

        const shortName = upgDef ? upgDef.name.split(' ')[0] : 'Mut';
        const txt = this.scene.add.text(x + slotW / 2, y + slotH / 2, `${shortName} ${isMax ? 'MAX' : `L${lvl}`}`, {
          fontSize: '11px',
          fontStyle: 'bold',
          color: isMax ? '#fef08a' : '#86efac',
          fontFamily: 'monospace',
        }).setOrigin(0.5);

        this.slotsTextContainer.add(txt);
      } else {
        // Empty slot
        this.slotsGraphics.fillStyle(0x0f172a, 0.55);
        this.slotsGraphics.lineStyle(1, 0x334155, 0.7);
        this.slotsGraphics.fillRoundedRect(x, y, slotW, slotH, 5);
        this.slotsGraphics.strokeRoundedRect(x, y, slotW, slotH, 5);

        const txt = this.scene.add.text(x + slotW / 2, y + slotH / 2, `[ Slot ${i + 1} ]`, {
          fontSize: '11px',
          color: '#64748b',
          fontFamily: 'monospace',
        }).setOrigin(0.5);

        this.slotsTextContainer.add(txt);
      }
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
