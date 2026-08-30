import Phaser from 'phaser';
import { SaveManager } from '../core/SaveManager';
import { createPlatformAdapter } from '../../platform';
import { type ShopItemMock, SHOP_MOCK_CATALOG } from '../data/shopCatalog';

export class UpgradesScene extends Phaser.Scene {
  private saveManager = SaveManager.getInstance();
  private platform = createPlatformAdapter();
  private rootContainer!: Phaser.GameObjects.Container;
  private selectedCategory = 'МУТАЦИИ';
  private selectedItem: ShopItemMock | null = null;

  private categoryButtons: { tab: string; container: Phaser.GameObjects.Container; bg: Phaser.GameObjects.Image; text: Phaser.GameObjects.Text; w: number; h: number }[] = [];
  private slotContainers: Phaser.GameObjects.Container[] = [];
  private rightDetailContainer!: Phaser.GameObjects.Container;
  private detailTitleText!: Phaser.GameObjects.Text;
  private detailStatsText!: Phaser.GameObjects.Text;
  private detailDescText!: Phaser.GameObjects.Text;
  private detailPips: Phaser.GameObjects.Rectangle[] = [];
  private actionButtonBg!: Phaser.GameObjects.Image;
  private actionButtonText!: Phaser.GameObjects.Text;
  private gooText!: Phaser.GameObjects.Text;

  private itemsCatalog: ShopItemMock[] = [...SHOP_MOCK_CATALOG];

  constructor() {
    super({ key: 'UpgradesScene' });
  }

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    this.add.rectangle(width / 2, height / 2, width, height, 0x070a0f);

    const uiScale = Math.min(width / 1280, height / 720);
    this.rootContainer = this.add.container(width / 2, height / 2).setScale(uiScale);

    const onResize = (gameSize: Phaser.Structs.Size) => {
      this.rootContainer.setPosition(gameSize.width / 2, gameSize.height / 2).setScale(Math.min(gameSize.width / 1280, gameSize.height / 720));
    };
    this.scale.on('resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', onResize));

    const roomBg = this.add.image(0, 0, 'shop_room_bg').setDisplaySize(1280, 720);
    const sign = this.add.image(175 - 640, 98 - 360, 'shop_sign').setDisplaySize(390, 155);
    const leftFrame = this.add.image(-525, 2, 'shop_left_frame').setDisplaySize(200, 480);
    const board = this.add.image(485 - 640, 370 - 360, 'shop_board_slots').setDisplaySize(580, 440);
    const topBar = this.add.image(960 - 640, 62 - 360, 'shop_top_bar').setDisplaySize(490, 102);
    const sellerDesk = this.add.image(990 - 640, 370 - 360, 'shop_seller_desk').setDisplaySize(535, 645);
    this.rootContainer.add([roomBg, sign, leftFrame, board, topBar, sellerDesk]);

    this.createHeader();
    this.createTopResources();
    this.createCategoryTabs();
    this.createSlotsGrid();
    this.createRightDetails();
    this.createBottomBar();

    this.selectItem(this.itemsCatalog[0]);
  }

  private createHeader(): void {
    const title = this.add.text(175 - 640, 98 - 360, 'ЛАВКА БАКЛАЖАНА', {
      fontFamily: 'Gagalin, monospace', fontSize: '24px', color: '#facc15', stroke: '#3b0764', strokeThickness: 4,
    }).setOrigin(0.5);
    this.tweens.add({ targets: title, scaleX: 1.03, scaleY: 0.97, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.rootContainer.add(title);
  }

  private createTopResources(): void {
    const resY = 62 - 360;
    const font = { fontFamily: 'Gagalin, monospace', fontSize: '18px' };
    this.gooText = this.add.text(905 - 640, resY, `${this.saveManager.getGoo()}`, { ...font, color: '#4ade80', stroke: '#052e16', strokeThickness: 3 }).setOrigin(0.5);
    const crystals = this.add.text(1050 - 640, resY, '42', { ...font, color: '#c084fc', stroke: '#3b0764', strokeThickness: 3 }).setOrigin(0.5);
    const scrap = this.add.text(1195 - 640, resY, '12', { ...font, color: '#facc15', stroke: '#713f12', strokeThickness: 3 }).setOrigin(0.5);
    this.rootContainer.add([this.gooText, crystals, scrap]);
  }

  private createCategoryTabs(): void {
    const categories = [
      { tab: 'МУТАЦИИ', relX: -525, relY: -133, w: 194, h: 44 },
      { tab: 'ОРУЖИЕ', relX: -525, relY: -80, w: 194, h: 44 },
      { tab: 'ПАССИВКИ', relX: -525, relY: -26, w: 194, h: 44 },
      { tab: 'ТОВАРЫ', relX: -525, relY: 28, w: 194, h: 44 },
      { tab: 'СБРОС', relX: -525, relY: 83, w: 194, h: 44 },
      { tab: 'УЙТИ', relX: -525, relY: 138, w: 194, h: 44 },
    ];
    this.categoryButtons = [];

    categories.forEach(({ tab, relX, relY, w, h }) => {
      const container = this.add.container(relX, relY);
      const isSelected = tab === this.selectedCategory;

      const tex = isSelected ? 'btn_shop_tab_active' : 'btn_shop_tab_inactive';
      const bg = this.add.image(0, 0, tex).setDisplaySize(w, h).setInteractive({ useHandCursor: true });

      const text = this.add.text(0, -1, tab, {
        fontFamily: 'Gagalin, monospace',
        fontSize: '15px',
        color: isSelected ? '#ffffff' : '#94a3b8',
        stroke: isSelected ? '#3b0764' : '#0f172a',
        strokeThickness: 3,
      }).setOrigin(0.5);

      bg.on('pointerover', () => {
        if (this.selectedCategory !== tab) {
          bg.setTint(0xe2e8f0);
          text.setColor('#e2e8f0');
        }
      });
      bg.on('pointerout', () => {
        if (this.selectedCategory !== tab) {
          bg.clearTint();
          text.setColor('#94a3b8');
        }
      });
      bg.on('pointerdown', () => {
        this.platform.vibrate(25);
        this.switchCategory(tab);
      });

      container.add([bg, text]);
      this.rootContainer.add(container);
      this.categoryButtons.push({ tab, container, bg, text, w, h });
    });
  }

  private switchCategory(newCategory: string): void {
    if (newCategory === 'УЙТИ') {
      this.platform.vibrate(30);
      this.scene.start('MenuScene');
      return;
    }

    if (newCategory === 'СБРОС') {
      const refunded = this.saveManager.refundAll();
      this.gooText.setText(`${this.saveManager.getGoo()}`);
      this.showNotice(`Возвращено: +${refunded} GOO!`);
      return;
    }

    this.selectedCategory = newCategory;
    this.categoryButtons.forEach(({ tab, bg, text, w, h }) => {
      const isSelected = tab === newCategory;
      bg.setTexture(isSelected ? 'btn_shop_tab_active' : 'btn_shop_tab_inactive').setDisplaySize(w, h);
      bg.clearTint();
      text.setColor(isSelected ? '#ffffff' : '#94a3b8');
      text.setStroke(isSelected ? '#3b0764' : '#0f172a', 3);
    });

    this.refreshSlots();
  }

  private createSlotsGrid(): void {
    const colCenters = [318 - 640, 483 - 640, 648 - 640];
    const rowCenters = [312 - 360, 482 - 360];
    this.slotContainers = [];

    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        const slot = this.createSlotItem(colCenters[c], rowCenters[r], r * 3 + c);
        this.slotContainers.push(slot);
        this.rootContainer.add(slot);
      }
    }
    this.refreshSlots();
  }

  private createSlotItem(x: number, y: number, index: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const hitArea = this.add.rectangle(0, 0, 140, 156, 0x000000, 0.01).setInteractive({ useHandCursor: true });

    const selectFrame = this.add.rectangle(0, 0, 142, 158, 0x000000, 0).setName('selectFrame');
    const iconPlaceholder = this.add.circle(0, -22, 34, 0x16a34a, 0.85).setName('iconBg');
    iconPlaceholder.setStrokeStyle(2, 0x86efac);

    const iconSymbol = this.add.text(0, -22, '!', { fontSize: '28px', color: '#ffffff', fontFamily: 'Gagalin, monospace' }).setOrigin(0.5);
    const badgeBg = this.add.rectangle(0, 53, 110, 24, 0x0f172a, 0.9);
    badgeBg.setStrokeStyle(1.5, 0x4ade80);

    const badgeText = this.add.text(0, 53, '150 GOO', { fontFamily: 'Gagalin, monospace', fontSize: '13px', color: '#4ade80' }).setOrigin(0.5).setName('badgeText');
    const levelText = this.add.text(0, 20, 'LVL 1/5', { fontFamily: 'Balsamiq Sans, monospace', fontSize: '11px', fontStyle: 'bold', color: '#cbd5e1' }).setOrigin(0.5).setName('levelText');

    hitArea.on('pointerover', () => {
      this.tweens.add({ targets: container, scaleX: 1.03, scaleY: 1.03, duration: 80, ease: 'Sine.easeOut' });
    });
    hitArea.on('pointerout', () => {
      this.tweens.add({ targets: container, scaleX: 1.0, scaleY: 1.0, duration: 80, ease: 'Sine.easeOut' });
    });
    hitArea.on('pointerdown', () => {
      this.platform.vibrate(20);
      const item = this.itemsCatalog[index];
      if (item) this.selectItem(item);
    });

    container.add([hitArea, selectFrame, iconPlaceholder, iconSymbol, levelText, badgeBg, badgeText]);
    return container;
  }

  private refreshSlots(): void {
    this.slotContainers.forEach((container, idx) => {
      const item = this.itemsCatalog[idx];
      const selectFrame = container.getByName('selectFrame') as Phaser.GameObjects.Rectangle;
      const iconBg = container.getByName('iconBg') as Phaser.GameObjects.Shape;
      const badgeText = container.getByName('badgeText') as Phaser.GameObjects.Text;
      const levelText = container.getByName('levelText') as Phaser.GameObjects.Text;

      if (item) {
        container.setVisible(true);
        badgeText.setText(`${item.price} GOO`);
        levelText.setText(`УР. ${item.level}/${item.maxLevel}`);
        if (item.iconColor) iconBg.setFillStyle(item.iconColor, 0.85);
        const isSelected = this.selectedItem?.id === item.id;
        selectFrame.setStrokeStyle(3, 0x4ade80, isSelected ? 1 : 0);
      } else {
        container.setVisible(false);
      }
    });
  }

  private selectItem(item: ShopItemMock): void {
    this.selectedItem = item;
    this.refreshSlots();

    this.detailTitleText.setText(item.name);
    this.detailStatsText.setText(item.stats);
    this.detailDescText.setText(item.description);

    this.detailPips.forEach((pip, idx) => {
      if (idx < item.maxLevel) {
        pip.setVisible(true);
        const isBought = idx < item.level;
        pip.setFillStyle(isBought ? 0x22c55e : 0x1e293b, 0.95);
        pip.setStrokeStyle(1.5, isBought ? 0x86efac : 0x475569);
      } else {
        pip.setVisible(false);
      }
    });

    const isMax = item.level >= item.maxLevel;
    const canAfford = this.saveManager.getGoo() >= item.price;
    const btnW = 345;
    const btnH = 76;

    if (isMax) {
      this.actionButtonText.setText('МАКСИМУМ');
      this.actionButtonBg.setTexture('btn_shop_buy_dark').setDisplaySize(btnW, btnH);
    } else if (canAfford) {
      this.actionButtonText.setText(`КУПИТЬ ЗА ${item.price} GOO`);
      this.actionButtonBg.setTexture('btn_shop_buy_green').setDisplaySize(btnW, btnH);
    } else {
      this.actionButtonText.setText(`НЕДОСТАТОЧНО GOO (${item.price})`);
      this.actionButtonBg.setTexture('btn_shop_buy_red').setDisplaySize(btnW, btnH);
    }
  }

  private createRightDetails(): void {
    const cardCenterX = 992 - 640;
    const infoCenterY = 530 - 360;
    this.rightDetailContainer = this.add.container(cardCenterX, infoCenterY).setAngle(-0.6);

    this.detailTitleText = this.add.text(0, -52, '', {
      fontFamily: 'Gagalin, monospace', fontSize: '24px', color: '#1c1917', stroke: '#fef3c7', strokeThickness: 2,
    }).setOrigin(0.5);

    this.detailStatsText = this.add.text(0, -26, '', {
      fontFamily: 'Gagalin, monospace', fontSize: '16px', color: '#16a34a', stroke: '#dcfce7', strokeThickness: 1,
    }).setOrigin(0.5);

    this.detailDescText = this.add.text(0, 0, '', {
      fontFamily: 'Balsamiq Sans, monospace', fontSize: '14px', fontStyle: 'bold', color: '#0f172a', align: 'center', wordWrap: { width: 380 },
    }).setOrigin(0.5);

    this.detailPips = [];
    const pipsStartX = -(5 * 24) / 2 + 12;
    for (let i = 0; i < 5; i++) {
      const pip = this.add.rectangle(pipsStartX + i * 24, 26, 18, 8, 0x334155, 0.9);
      pip.setStrokeStyle(1.5, 0x475569);
      this.detailPips.push(pip);
    }

    const btnRelY = 70;
    const btnW = 345;
    const btnH = 76;
    this.actionButtonBg = this.add.image(0, btnRelY, 'btn_shop_buy_green').setDisplaySize(btnW, btnH).setInteractive({ useHandCursor: true });
    this.actionButtonText = this.add.text(0, btnRelY, 'КУПИТЬ', {
      fontFamily: 'Gagalin, monospace', fontSize: '16px', color: '#ffffff', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    this.actionButtonBg.on('pointerdown', () => { this.platform.vibrate(35); this.onActionButtonClick(); });
    this.actionButtonBg.on('pointerover', () => {
      this.actionButtonBg.setDisplaySize(btnW * 1.025, btnH * 1.025);
      this.actionButtonText.setScale(1.025);
    });
    this.actionButtonBg.on('pointerout', () => {
      this.actionButtonBg.setDisplaySize(btnW, btnH);
      this.actionButtonText.setScale(1.0);
    });

    this.rightDetailContainer.add([
      this.detailTitleText, this.detailStatsText, this.detailDescText,
      ...this.detailPips, this.actionButtonBg, this.actionButtonText,
    ]);
    this.rootContainer.add(this.rightDetailContainer);
  }

  private onActionButtonClick(): void {
    if (!this.selectedItem) return;
    if (this.selectedItem.level >= this.selectedItem.maxLevel) {
      this.showNotice('Достигнут максимальный уровень!');
      return;
    }
    const currentGoo = this.saveManager.getGoo();
    if (currentGoo < this.selectedItem.price) {
      this.showNotice('Недостаточно слизи!');
      return;
    }
    this.selectedItem.level++;
    this.showNotice(`Куплено: ${this.selectedItem.name}!`);
    this.selectItem(this.selectedItem);
  }

  private createBottomBar(): void {
    const slotCentersX = [83 - 640, 226 - 640, 369 - 640, 512 - 640];
    const bottomY = 654 - 360;

    slotCentersX.forEach((x, idx) => {
      const slot = this.add.container(x, bottomY);
      const hit = this.add.rectangle(0, 0, 130, 70, 0x000000, 0.01);
      const label = this.add.text(0, 0, `СЛОТ ${idx + 1}`, { fontFamily: 'Gagalin, monospace', fontSize: '12px', color: '#475569' }).setOrigin(0.5);
      slot.add([hit, label]);
      this.rootContainer.add(slot);
    });

    const exitX = 630 - 640;
    const exitBtn = this.add.rectangle(exitX, bottomY, 95, 65, 0x000000, 0.01).setInteractive({ useHandCursor: true });
    const exitText = this.add.text(exitX, bottomY, 'НАЗАД', { fontFamily: 'Gagalin, monospace', fontSize: '18px', color: '#451a03', stroke: '#fef08a', strokeThickness: 2 }).setOrigin(0.5);

    exitBtn.on('pointerover', () => exitText.setScale(1.08));
    exitBtn.on('pointerout', () => exitText.setScale(1.0));
    exitBtn.on('pointerdown', () => { this.platform.vibrate(30); this.scene.start('MenuScene'); });

    this.rootContainer.add([exitBtn, exitText]);
  }

  private showNotice(text: string): void {
    const notice = this.add.text(0, -220, text, { fontFamily: 'Gagalin, monospace', fontSize: '20px', color: '#facc15', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5);
    this.rootContainer.add(notice);
    this.tweens.add({ targets: notice, y: -245, alpha: { from: 1, to: 0 }, duration: 1100, onComplete: () => notice.destroy() });
  }
}
