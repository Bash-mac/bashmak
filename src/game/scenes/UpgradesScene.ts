import Phaser from 'phaser';
import { SaveManager } from '../core/SaveManager';
import { META_POWERUPS, type MetaPowerUpDefinition } from '../data/metaUpgrades';
import { createPlatformAdapter } from '../../platform';

export class UpgradesScene extends Phaser.Scene {
  private saveManager = SaveManager.getInstance();
  private platform = createPlatformAdapter();
  private gooText!: Phaser.GameObjects.Text;
  private cardsContainer!: Phaser.GameObjects.Container;
  private maxScrollY = 0;

  constructor() {
    super({ key: 'UpgradesScene' });
  }

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    // 1. Background
    const bgScale = Math.max(width / 1280, height / 720);
    if (this.textures.exists('menu_bg')) {
      const bg = this.add.image(width / 2, height / 2, 'menu_bg').setScale(bgScale);
      bg.setTint(0x475569); // Darker tint for lab feel
    } else {
      this.add.rectangle(0, 0, width, height, 0x090d16).setOrigin(0, 0);
    }

    // Dark overlay
    this.add.rectangle(0, 0, width, height, 0x050811, 0.75).setOrigin(0, 0);

    // 2. Top Header Bar
    const headerY = 50;

    // Title
    const title = this.add.text(width / 2, headerY, 'MUTATION LAB', {
      fontSize: width < 600 ? '26px' : '36px',
      fontStyle: 'bold',
      color: '#facc15',
      fontFamily: 'monospace',
      stroke: '#451a03',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: title,
      scaleX: 1.03,
      scaleY: 0.98,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtitle
    this.add.text(width / 2, headerY + 32, 'ПОСТОЯННЫЕ МУТАЦИИ ЗА ТОКСИЧНУЮ СЛИЗЬ', {
      fontSize: width < 600 ? '11px' : '14px',
      color: '#94a3b8',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // GOO Balance Badge (Top Right or Center Top)
    const gooBadgeX = width / 2;
    const gooBadgeY = headerY + 68;

    const gooBg = this.add.rectangle(gooBadgeX, gooBadgeY, 220, 36, 0x14532d, 0.9);
    gooBg.setStrokeStyle(2, 0x4ade80);

    this.gooText = this.add.text(gooBadgeX, gooBadgeY, `🧪 GOO: ${this.saveManager.getGoo()}`, {
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#4ade80',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // 3. PowerUps Cards List (Scrollable Container)
    const listTopY = headerY + 100;
    const listBottomY = height - 85;
    const listHeight = listBottomY - listTopY;

    this.cardsContainer = this.add.container(0, 0);
    this.renderPowerUpCards(width, listTopY);

    // Mask for scrolling
    const shape = this.make.graphics({ x: 0, y: 0 });
    shape.fillRect(0, listTopY, width, listHeight);
    const mask = shape.createGeometryMask();
    this.cardsContainer.setMask(mask);

    // Touch / Wheel Drag Scroll
    this.input.on('wheel', (_pointer: any, _gameObjects: any, _deltaX: number, deltaY: number) => {
      this.scroll(deltaY * 0.8);
    });

    let dragStartY = 0;
    let containerStartY = 0;
    let isDragging = false;

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y >= listTopY && pointer.y <= listBottomY) {
        isDragging = true;
        dragStartY = pointer.y;
        containerStartY = this.cardsContainer.y;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (isDragging) {
        const delta = pointer.y - dragStartY;
        this.setScroll(containerStartY + delta);
      }
    });

    this.input.on('pointerup', () => {
      isDragging = false;
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.removeAllListeners();
    });

    // 4. Bottom Footer (Action Buttons)
    const footerY = height - 42;

    // Refund All Button
    const refundBtn = this.add.rectangle(width * 0.3, footerY, width < 600 ? 140 : 200, 44, 0x7f1d1d).setInteractive({ useHandCursor: true });
    refundBtn.setStrokeStyle(2, 0xef4444);

    this.add.text(width * 0.3, footerY, '🔄 100% СБРОС', {
      fontSize: width < 600 ? '12px' : '14px',
      fontStyle: 'bold',
      color: '#fecaca',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    refundBtn.on('pointerdown', () => {
      this.platform.vibrate(40);
      const refunded = this.saveManager.refundAll();
      this.refreshUI();
      this.showFloatingNotice(`Возвращено: +${refunded} GOO!`, 0x4ade80);
    });

    // Back to Menu Button
    const backBtn = this.add.rectangle(width * 0.7, footerY, width < 600 ? 140 : 200, 44, 0x1e293b).setInteractive({ useHandCursor: true });
    backBtn.setStrokeStyle(2, 0x64748b);

    this.add.text(width * 0.7, footerY, '🔙 В МЕНЮ', {
      fontSize: width < 600 ? '13px' : '15px',
      fontStyle: 'bold',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    backBtn.on('pointerdown', () => {
      this.platform.vibrate(30);
      this.scene.start('MenuScene');
    });
  }

  private renderPowerUpCards(width: number, startY: number): void {
    this.cardsContainer.removeAll(true);

    const cardWidth = Math.min(width - 32, 680);
    const cardHeight = 84;
    const cardSpacing = 12;
    let currentY = startY;

    META_POWERUPS.forEach((powerUp) => {
      const card = this.createCard(width / 2, currentY + cardHeight / 2, cardWidth, cardHeight, powerUp);
      this.cardsContainer.add(card);
      currentY += cardHeight + cardSpacing;
    });

    const totalContentHeight = currentY - startY;
    const visibleHeight = this.scale.height - startY - 85;
    this.maxScrollY = Math.max(0, totalContentHeight - visibleHeight);
    this.cardsContainer.y = 0;
  }

  private createCard(
    x: number,
    y: number,
    w: number,
    h: number,
    powerUp: MetaPowerUpDefinition
  ): Phaser.GameObjects.Container {
    const cardContainer = this.add.container(x, y);

    const currentLvl = this.saveManager.getPowerUpLevel(powerUp.id);
    const isMax = currentLvl >= powerUp.maxLevel;
    const cost = powerUp.getCost(currentLvl);
    const canAfford = !isMax && this.saveManager.getGoo() >= cost;

    // Card BG
    const cardBg = this.add.rectangle(0, 0, w, h, 0x111827, 0.9);
    cardBg.setStrokeStyle(2, isMax ? 0xfacc15 : (canAfford ? 0x22c55e : 0x374151));

    // Icon
    const iconText = this.add.text(-w / 2 + 28, 0, powerUp.icon, {
      fontSize: '28px',
    }).setOrigin(0.5);

    // Title & Comic tag
    const titleX = -w / 2 + 60;
    const titleText = this.add.text(titleX, -22, powerUp.name, {
      fontSize: w < 500 ? '14px' : '16px',
      fontStyle: 'bold',
      color: '#f8fafc',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);

    // Description & Bonus
    const descText = this.add.text(titleX, 2, powerUp.description, {
      fontSize: w < 500 ? '10px' : '12px',
      color: '#94a3b8',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);

    // Level pips (e.g. ● ● ○ ○ ○)
    let pipsStr = '';
    for (let i = 0; i < powerUp.maxLevel; i++) {
      pipsStr += i < currentLvl ? '● ' : '○ ';
    }
    const bonusStr = currentLvl > 0 ? `(${powerUp.getBonusText(currentLvl)})` : '';
    const pipsText = this.add.text(titleX, 24, `${pipsStr} ${bonusStr}`, {
      fontSize: '12px',
      fontStyle: 'bold',
      color: isMax ? '#facc15' : '#4ade80',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);

    // Buy Button
    const btnW = w < 500 ? 95 : 125;
    const btnH = 46;
    const btnX = w / 2 - btnW / 2 - 12;

    const btnBg = this.add.rectangle(btnX, 0, btnW, btnH, isMax ? 0x334155 : (canAfford ? 0x15803d : 0x1f2937)).setInteractive({ useHandCursor: canAfford });
    btnBg.setStrokeStyle(2, isMax ? 0x475569 : (canAfford ? 0x4ade80 : 0x374151));

    const btnLabel = isMax ? 'MAX' : `🧪 ${cost}`;
    const btnText = this.add.text(btnX, 0, btnLabel, {
      fontSize: w < 500 ? '12px' : '15px',
      fontStyle: 'bold',
      color: isMax ? '#94a3b8' : (canAfford ? '#ffffff' : '#64748b'),
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    if (canAfford) {
      btnBg.on('pointerdown', () => {
        this.platform.vibrate(30);
        if (this.saveManager.buyPowerUp(powerUp.id)) {
          this.refreshUI();
          this.showFloatingNotice(`+1 ${powerUp.name}!`, 0x4ade80);
        }
      });
    }

    cardContainer.add([cardBg, iconText, titleText, descText, pipsText, btnBg, btnText]);
    return cardContainer;
  }

  private refreshUI(): void {
    this.gooText.setText(`🧪 GOO: ${this.saveManager.getGoo()}`);
    this.tweens.add({
      targets: this.gooText,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 100,
      yoyo: true,
      ease: 'Back.easeOut',
    });
    this.renderPowerUpCards(this.scale.width, 150);
  }

  private scroll(deltaY: number): void {
    this.setScroll(this.cardsContainer.y - deltaY);
  }

  private setScroll(y: number): void {
    const clampedY = Phaser.Math.Clamp(y, -this.maxScrollY, 0);
    this.cardsContainer.y = clampedY;
  }

  private showFloatingNotice(text: string, color: number): void {
    const notice = this.add.text(this.scale.width / 2, this.scale.height / 2, text, {
      fontSize: '20px',
      fontStyle: 'bold',
      color: `#${color.toString(16)}`,
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: notice,
      y: notice.y - 60,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => notice.destroy(),
    });
  }
}
