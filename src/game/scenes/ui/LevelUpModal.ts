import Phaser from 'phaser';
import type { UpgradeDefinition } from '../../data/definitions';
import { ALL_UPGRADES } from '../../data/upgrades';
import { GameState } from '../../core/GameState';
import { createPlatformAdapter } from '../../../platform';
import { getReadyEvolution, EVOLUTION_RECIPES, type EvolutionRecipe } from '../../data/evolutions';
import { AudioManager } from '../../audio/AudioManager';

interface CardActionItem {
  select: () => void;
  setFocus: (focused: boolean) => void;
}

export class LevelUpModal {
  private scene: Phaser.Scene;
  private onUpgradeSelected: (upgrade: UpgradeDefinition, levelToApply: number) => void;
  private onSkip?: () => void;
  private platform = createPlatformAdapter();
  private elements: Phaser.GameObjects.GameObject[] = [];
  private cardItems: CardActionItem[] = [];
  private focusedIndex = -1;
  private onKeyDownBound?: (event: KeyboardEvent) => void;
  public isVisible = false;

  constructor(
    scene: Phaser.Scene,
    onUpgradeSelected: (upgrade: UpgradeDefinition, levelToApply: number) => void,
    onSkip?: () => void
  ) {
    this.scene = scene;
    this.onUpgradeSelected = onUpgradeSelected;
    this.onSkip = onSkip;
  }

  show(): void {
    this.clear();
    this.isVisible = true;
    const { width, height } = this.scene.cameras.main;

    // 1. Semi-transparent dark overlay (Depth: 10000)
    const overlay = this.scene.add
      .rectangle(width / 2, height / 2, width, height, 0x050811, 0.92)
      .setScrollFactor(0)
      .setDepth(10000)
      .setInteractive();
    this.elements.push(overlay);

    // 2. Title Banner (Depth: 10001)
    const titleY = Math.max(22, height * 0.05);
    const subtitleY = titleY + 26;

    const title = this.scene.add
      .text(width / 2, titleY, 'LEVEL UP!', {
        fontSize: width < 700 ? '24px' : '34px',
        fontStyle: 'bold',
        color: '#4ade80',
        fontFamily: 'monospace',
        stroke: '#064e3b',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10001);

    const subtitle = this.scene.add
      .text(width / 2, subtitleY, 'Выбери развитие мутации:', {
        fontSize: width < 700 ? '11px' : '13px',
        color: '#cbd5e1',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10001);

    this.elements.push(title, subtitle);

    const gameState = GameState.getInstance();

    // 3. Active Inventory Ribbon (Equipped Weapons & Tomes)
    const ribbonY = subtitleY + 28;
    this.createInventoryRibbon(width, ribbonY, gameState);

    // 4. Check for ready weapon evolution & eligible options
    const readyEvo = getReadyEvolution(gameState);
    const neededNormalCount = readyEvo ? 2 : 3;
    const options = gameState.getEligibleUpgrades(ALL_UPGRADES, neededNormalCount);
    const totalCards = (readyEvo ? 1 : 0) + options.length;

    // 5. Single Horizontal Row Layout (Landscape 16:9)
    const availableWidth = width - 48;
    const spacing = Math.min(22, Math.max(10, (availableWidth - totalCards * 280) / Math.max(1, totalCards - 1)));
    const cardWidth = Math.min(280, Math.floor((availableWidth - (totalCards - 1) * spacing) / totalCards));
    const cardHeight = Math.min(390, Math.floor(height - ribbonY - 68));

    const totalW = totalCards * cardWidth + (totalCards - 1) * spacing;
    const startX = (width - totalW) / 2 + cardWidth / 2;
    const cardY = ribbonY + 20 + cardHeight / 2;

    let currentIdx = 0;

    if (readyEvo) {
      const cardX = startX + currentIdx * (cardWidth + spacing);
      this.createEvolutionCard(readyEvo, cardX, cardY, cardWidth, cardHeight, currentIdx + 1);
      currentIdx++;
    }

    options.forEach((opt) => {
      const cardX = startX + currentIdx * (cardWidth + spacing);
      this.createCard(opt.upgrade, opt.levelToApply, cardX, cardY, cardWidth, cardHeight, currentIdx + 1);
      currentIdx++;
    });

    // 5. Bottom Action Bar: REROLL & SKIP
    const btnBarY = height - 26;
    const btnW = Math.min(180, Math.floor(width * 0.22));
    const btnH = 34;
    const btnGap = 20;

    // Reroll Button
    const rerollX = width / 2 - btnW / 2 - btnGap / 2;
    const canReroll = gameState.rerollsRemaining > 0;
    const rerollBg = this.scene.add
      .rectangle(rerollX, btnBarY, btnW, btnH, canReroll ? 0x78350f : 0x1e293b, 0.95)
      .setStrokeStyle(1.5, canReroll ? 0xfacc15 : 0x475569)
      .setScrollFactor(0)
      .setDepth(10005);

    const rerollText = this.scene.add
      .text(rerollX, btnBarY, `[R] РЕРОЛЛ (${gameState.rerollsRemaining})`, {
        fontSize: width < 700 ? '12px' : '13px',
        fontStyle: 'bold',
        color: canReroll ? '#fde047' : '#64748b',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10006);

    const triggerReroll = () => {
      if (!canReroll) return;
      this.platform.vibrate(30);
      AudioManager.getInstance().playClick();
      gameState.rerollsRemaining--;
      this.show();
    };

    if (canReroll) {
      rerollBg.setInteractive({ useHandCursor: true });
      rerollBg.on('pointerover', () => rerollBg.setScale(1.04));
      rerollBg.on('pointerout', () => rerollBg.setScale(1.0));
      rerollBg.on('pointerdown', triggerReroll);
    }

    // Skip Button
    const skipX = width / 2 + btnW / 2 + btnGap / 2;
    const canSkip = gameState.skipsRemaining > 0;
    const skipBg = this.scene.add
      .rectangle(skipX, btnBarY, btnW, btnH, canSkip ? 0x1e3a8a : 0x1e293b, 0.95)
      .setStrokeStyle(1.5, canSkip ? 0x60a5fa : 0x475569)
      .setScrollFactor(0)
      .setDepth(10005);

    const skipText = this.scene.add
      .text(skipX, btnBarY, `[S] ПРОПУСК (${gameState.skipsRemaining})`, {
        fontSize: width < 700 ? '12px' : '13px',
        fontStyle: 'bold',
        color: canSkip ? '#93c5fd' : '#64748b',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10006);

    const triggerSkip = () => {
      if (!canSkip) return;
      this.platform.vibrate(30);
      AudioManager.getInstance().playClick();
      gameState.skipsRemaining--;
      this.hide();
      if (this.onSkip) {
        this.onSkip();
      }
    };

    if (canSkip) {
      skipBg.setInteractive({ useHandCursor: true });
      skipBg.on('pointerover', () => skipBg.setScale(1.04));
      skipBg.on('pointerout', () => skipBg.setScale(1.0));
      skipBg.on('pointerdown', triggerSkip);
    }

    this.elements.push(rerollBg, rerollText, skipBg, skipText);
    this.setupKeyboard(canReroll, triggerReroll, canSkip, triggerSkip);
  }

  private createEvolutionCard(
    evo: EvolutionRecipe,
    x: number,
    y: number,
    w: number,
    h: number,
    cardIndex: number
  ): void {
    const cardContainer = this.scene.add.container(x, y).setDepth(10002).setScrollFactor(0);

    // 1. Dark Backdrop ONLY within central cutout (never sticks out of frame)
    const cutoutW = w * 0.74;
    const cutoutH = h * 0.74;
    const bg = this.scene.add
      .rectangle(0, 0, cutoutW, cutoutH, 0x1e0e38, 0.96);

    // 2. Gold Frame Image (512x768)
    const frame = this.scene.add.image(0, 0, 'card_frame_gold');
    frame.setDisplaySize(w, h);

    // 3. Category Badge (Under top plate)
    const badgeLabel = this.scene.add
      .text(0, -h * 0.23, 'СУПЕР-ЭВОЛЮЦИЯ', {
        fontSize: w < 240 ? '11px' : '13px',
        fontStyle: 'bold',
        color: '#facc15',
        fontFamily: '"Gagalin", "Balsamiq Sans", monospace',
        stroke: '#451a03',
        strokeThickness: 3,
        resolution: 2,
      })
      .setOrigin(0.5, 0.5);

    // 4. Square Icon (Prominent and centered in upper window)
    const iconKey = evo.iconKey || 'icon_evo_acid_tsunami';
    const iconSize = Math.min(92, Math.floor(w * 0.36));
    const iconY = -h * 0.08;
    const icon = this.scene.add.image(0, iconY, iconKey);
    icon.setDisplaySize(iconSize, iconSize);

    // 5. Title
    const titleY = iconY + iconSize / 2 + 16;
    const nameText = this.scene.add
      .text(0, titleY, evo.comicTitle, {
        fontSize: w < 240 ? '15px' : '17px',
        color: '#fef08a',
        fontFamily: '"Gagalin", "Balsamiq Sans", monospace',
        align: 'center',
        wordWrap: { width: cutoutW - 16 },
        stroke: '#451a03',
        strokeThickness: 3,
        resolution: 2,
      })
      .setOrigin(0.5, 0.5);

    // 6. Description
    const descY = titleY + 16;
    const descText = this.scene.add
      .text(0, descY, evo.description, {
        fontSize: w < 240 ? '10px' : '12px',
        color: '#f3e8ff',
        fontFamily: '"Balsamiq Sans", monospace',
        align: 'center',
        wordWrap: { width: cutoutW - 16 },
        lineSpacing: 3,
        resolution: 2,
      })
      .setOrigin(0.5, 0);

    // 7. 3D Comic Action Button (Resting over bottom plate)
    const btnW = Math.min(w - 48, 175);
    const btnH = Math.round(btnW * (205 / 512));
    const btnY = h * 0.355;

    const btnImage = this.scene.add.image(0, btnY, 'btn_frame_gold');
    btnImage.setDisplaySize(btnW, btnH);

    const btnLabel = this.scene.add
      .text(0, btnY - 2, `[${cardIndex}] МУТИРОВАТЬ`, {
        fontSize: w < 240 ? '12px' : '14px',
        fontFamily: '"Gagalin", "Balsamiq Sans", monospace',
        color: '#451a03',
        stroke: '#fef08a',
        strokeThickness: 1,
        resolution: 2,
      })
      .setOrigin(0.5, 0.5);

    cardContainer.add([
      bg,
      frame,
      badgeLabel,
      icon,
      nameText,
      descText,
      btnImage,
      btnLabel,
    ]);

    // Top-Level HitArea (guaranteed click handling across all cameras)
    const hitArea = this.scene.add
      .rectangle(x, y, w, h, 0x000000, 0.001)
      .setScrollFactor(0)
      .setDepth(10005)
      .setInteractive({ useHandCursor: true });

    const selectUpgrade = () => {
      this.platform.vibrate(60);
      AudioManager.getInstance().playLevelUp();
      evo.apply(GameState.getInstance());
      this.hide();
      this.onUpgradeSelected(
        {
          id: evo.id,
          name: evo.name,
          maxLevel: 1,
          levels: [],
        },
        1
      );
    };

    const setFocus = (focused: boolean) => {
      if (focused) {
        btnImage.setTint(0xfff0aa);
        this.scene.tweens.add({
          targets: cardContainer,
          scaleX: 1.04,
          scaleY: 1.04,
          duration: 100,
          ease: 'Quad.easeOut',
        });
      } else {
        btnImage.clearTint();
        this.scene.tweens.add({
          targets: cardContainer,
          scaleX: 1.0,
          scaleY: 1.0,
          duration: 100,
          ease: 'Quad.easeOut',
        });
      }
    };

    this.cardItems.push({ select: selectUpgrade, setFocus });

    hitArea.on('pointerover', () => {
      this.focusedIndex = cardIndex - 1;
      this.cardItems.forEach((c, idx) => c.setFocus(idx === this.focusedIndex));
    });

    hitArea.on('pointerout', () => {
      setFocus(false);
      if (this.focusedIndex === cardIndex - 1) this.focusedIndex = -1;
    });

    hitArea.on('pointerdown', selectUpgrade);

    this.elements.push(cardContainer, hitArea);
  }

  private createCard(
    upgrade: UpgradeDefinition,
    levelToApply: number,
    x: number,
    y: number,
    w: number,
    h: number,
    cardIndex: number
  ): void {
    const cardContainer = this.scene.add.container(x, y).setDepth(10002).setScrollFactor(0);

    const isConsumable = !!upgrade.isConsumable;
    const isWeapon = upgrade.category === 'weapon';
    const isNew = !isConsumable && levelToApply === 1;
    const isUpgrade = !isConsumable && levelToApply > 1;

    // 1. Dark Backdrop ONLY within central cutout (never sticks out of frame)
    const cutoutW = w * 0.74;
    const cutoutH = h * 0.74;
    const bg = this.scene.add
      .rectangle(0, 0, cutoutW, cutoutH, isUpgrade ? 0x140d04 : 0x070b14, 0.96);

    // 2. Frame Image: Standard iron frame for NEW items, Golden frame for UPGRADES
    const frameTex = isConsumable
      ? 'card_frame_consumable'
      : isUpgrade
      ? 'card_frame_gold'
      : 'card_frame_standard';
    const frame = this.scene.add.image(0, 0, frameTex);
    frame.setDisplaySize(w, h);

    // 3. Category / Level Badge (Under top plate)
    let badgeText = '';
    let badgeColor = '#4ade80';

    if (isConsumable) {
      badgeText = 'РАСХОДНИК';
      badgeColor = '#60a5fa';
    } else if (isNew) {
      badgeText = isWeapon ? 'НОВОЕ ОРУЖИЕ' : 'НОВЫЙ ТОМ';
      badgeColor = isWeapon ? '#4ade80' : '#38bdf8';
    } else {
      const typeStr = isWeapon ? 'ОРУЖИЕ' : 'ТОМ';
      badgeText = `${typeStr} • УР. ${levelToApply - 1} -> ${levelToApply}`;
      badgeColor = '#facc15';
    }

    const badgeLabel = this.scene.add
      .text(0, -h * 0.23, badgeText, {
        fontSize: w < 240 ? '10px' : '12px',
        color: badgeColor,
        fontFamily: '"Gagalin", "Balsamiq Sans", monospace',
        stroke: '#050811',
        strokeThickness: 3,
        resolution: 2,
      })
      .setOrigin(0.5, 0.5);

    // 4. Square Icon (Prominent and centered in upper window)
    const iconKey = upgrade.iconKey || 'icon_weapon_slime_spit';
    const iconSize = Math.min(92, Math.floor(w * 0.36));
    const iconY = -h * 0.08;
    const icon = this.scene.add.image(0, iconY, iconKey);
    icon.setDisplaySize(iconSize, iconSize);

    // 5. Title
    const titleY = iconY + iconSize / 2 + 16;
    const nameText = this.scene.add
      .text(0, titleY, upgrade.name, {
        fontSize: w < 240 ? '15px' : '18px',
        color: isUpgrade ? '#fef08a' : '#ffffff',
        fontFamily: '"Gagalin", "Balsamiq Sans", monospace',
        align: 'center',
        wordWrap: { width: cutoutW - 16 },
        stroke: '#050811',
        strokeThickness: 3,
        resolution: 2,
      })
      .setOrigin(0.5, 0.5);

    // 6. Level Description
    const levelConfig = upgrade.levels.find((l) => l.level === levelToApply) || upgrade.levels[0];
    const descY = titleY + 16;
    const descText = this.scene.add
      .text(0, descY, levelConfig?.description || '', {
        fontSize: w < 240 ? '10px' : '12px',
        color: '#cbd5e1',
        fontFamily: '"Balsamiq Sans", monospace',
        align: 'center',
        wordWrap: { width: cutoutW - 16 },
        lineSpacing: 3,
        resolution: 2,
      })
      .setOrigin(0.5, 0);

    // 7. 3D Comic Action Button (Resting over bottom plate)
    const btnW = Math.min(w - 48, 175);
    const btnH = Math.round(btnW * (205 / 512));
    const btnY = h * 0.355;

    const btnTex = isUpgrade ? 'btn_frame_gold' : 'btn_frame_green';
    const btnImage = this.scene.add.image(0, btnY, btnTex);
    btnImage.setDisplaySize(btnW, btnH);

    const actionText = isConsumable
      ? `[${cardIndex}] ПРИМЕНИТЬ`
      : isNew
      ? `[${cardIndex}] ВЗЯТЬ`
      : `[${cardIndex}] УЛУЧШИТЬ (L${levelToApply})`;

    const btnLabel = this.scene.add
      .text(0, btnY - 2, actionText, {
        fontSize: w < 240 ? '12px' : '14px',
        fontFamily: '"Gagalin", "Balsamiq Sans", monospace',
        color: isUpgrade ? '#451a03' : '#052e16',
        stroke: isUpgrade ? '#fef08a' : '#86efac',
        strokeThickness: 1,
        resolution: 2,
      })
      .setOrigin(0.5, 0.5);

    cardContainer.add([
      bg,
      frame,
      badgeLabel,
      icon,
      nameText,
      descText,
      btnImage,
      btnLabel,
    ]);

    // Top-Level HitArea (guaranteed click handling across all cameras)
    const hitArea = this.scene.add
      .rectangle(x, y, w, h, 0x000000, 0.001)
      .setScrollFactor(0)
      .setDepth(10005)
      .setInteractive({ useHandCursor: true });

    const selectUpgrade = () => {
      this.platform.vibrate(40);
      AudioManager.getInstance().playClick();
      this.hide();
      this.onUpgradeSelected(upgrade, levelToApply);
    };

    const setFocus = (focused: boolean) => {
      if (focused) {
        btnImage.setTint(isUpgrade ? 0xfff0aa : 0xddffdd);
        this.scene.tweens.add({
          targets: cardContainer,
          scaleX: 1.04,
          scaleY: 1.04,
          duration: 100,
          ease: 'Quad.easeOut',
        });
      } else {
        btnImage.clearTint();
        this.scene.tweens.add({
          targets: cardContainer,
          scaleX: 1.0,
          scaleY: 1.0,
          duration: 100,
          ease: 'Quad.easeOut',
        });
      }
    };

    this.cardItems.push({ select: selectUpgrade, setFocus });

    hitArea.on('pointerover', () => {
      this.focusedIndex = cardIndex - 1;
      this.cardItems.forEach((c, idx) => c.setFocus(idx === this.focusedIndex));
    });

    hitArea.on('pointerout', () => {
      setFocus(false);
      if (this.focusedIndex === cardIndex - 1) this.focusedIndex = -1;
    });

    hitArea.on('pointerdown', selectUpgrade);

    this.elements.push(cardContainer, hitArea);
  }

  private setupKeyboard(
    canReroll: boolean,
    onReroll: () => void,
    canSkip: boolean,
    onSkip: () => void
  ): void {
    this.removeKeyboard();
    this.onKeyDownBound = (event: KeyboardEvent) => {
      if (!this.isVisible) return;
      const key = event.key;
      const code = event.code;

      if (key === '1' || code === 'Digit1' || code === 'Numpad1') {
        if (this.cardItems[0]) this.cardItems[0].select();
      } else if (key === '2' || code === 'Digit2' || code === 'Numpad2') {
        if (this.cardItems[1]) this.cardItems[1].select();
      } else if (key === '3' || code === 'Digit3' || code === 'Numpad3') {
        if (this.cardItems[2]) this.cardItems[2].select();
      } else if (key === '4' || code === 'Digit4' || code === 'Numpad4') {
        if (this.cardItems[3]) this.cardItems[3].select();
      } else if (key === 'ArrowLeft' || code === 'KeyA' || key === 'a' || key === 'A' || key === 'ф' || key === 'Ф') {
        this.navigateFocus(-1);
      } else if (key === 'ArrowRight' || code === 'KeyD' || key === 'd' || key === 'D' || key === 'в' || key === 'В') {
        this.navigateFocus(1);
      } else if (key === 'Enter' || key === ' ') {
        if (this.focusedIndex >= 0 && this.cardItems[this.focusedIndex]) {
          this.cardItems[this.focusedIndex].select();
        } else if (this.cardItems.length > 0 && this.cardItems[0]) {
          this.cardItems[0].select();
        }
      } else if (code === 'KeyR' || key === 'r' || key === 'R' || key === 'к' || key === 'К') {
        if (canReroll) onReroll();
      } else if (code === 'KeyS' || key === 's' || key === 'S' || key === 'ы' || key === 'Ы' || key === 'Escape') {
        if (canSkip) onSkip();
      }
    };
    this.scene.input.keyboard?.on('keydown', this.onKeyDownBound);
  }

  private navigateFocus(dir: number): void {
    if (this.cardItems.length === 0) return;
    if (this.focusedIndex === -1) {
      this.focusedIndex = dir > 0 ? 0 : this.cardItems.length - 1;
    } else {
      this.focusedIndex = (this.focusedIndex + dir + this.cardItems.length) % this.cardItems.length;
    }
    this.cardItems.forEach((c, idx) => c.setFocus(idx === this.focusedIndex));
  }

  private removeKeyboard(): void {
    if (this.onKeyDownBound) {
      this.scene.input.keyboard?.off('keydown', this.onKeyDownBound);
      this.onKeyDownBound = undefined;
    }
  }

  hide(): void {
    this.clear();
    this.isVisible = false;
  }

  private clear(): void {
    this.removeKeyboard();
    this.cardItems = [];
    this.focusedIndex = -1;
    for (const el of this.elements) {
      el.destroy();
    }
    this.elements = [];
  }

  private createInventoryRibbon(width: number, topY: number, gameState: GameState): void {
    const activeUpgradesMap = gameState.activeUpgrades;
    const upgradeDefsMap = new Map<string, UpgradeDefinition>();
    ALL_UPGRADES.forEach((u) => upgradeDefsMap.set(u.id, u));

    const equippedWeapons: Array<{ def: UpgradeDefinition; lvl: number }> = [];
    const equippedTomes: Array<{ def: UpgradeDefinition; lvl: number }> = [];

    for (const [id, lvl] of activeUpgradesMap.entries()) {
      const def = upgradeDefsMap.get(id);
      const evo = EVOLUTION_RECIPES.find((e) => e.id === id);
      if (evo) {
        equippedWeapons.push({
          def: { id: evo.id, name: evo.name, category: 'weapon', iconKey: evo.iconKey, maxLevel: 1, levels: [] },
          lvl: 1,
        });
      } else if (def) {
        if (def.category === 'weapon') {
          equippedWeapons.push({ def, lvl });
        } else if (def.category === 'tome') {
          equippedTomes.push({ def, lvl });
        }
      }
    }

    const slotSize = 34;
    const slotGap = 6;
    const maxWeapons = gameState.maxWeaponSlots || 2;
    const maxTomes = gameState.maxTomeSlots || 2;

    const weaponsBlockWidth = maxWeapons * slotSize + (maxWeapons - 1) * slotGap;
    const tomesBlockWidth = maxTomes * slotSize + (maxTomes - 1) * slotGap;
    const sectionGap = 28;
    const totalBarWidth = 75 + weaponsBlockWidth + sectionGap + 55 + tomesBlockWidth;

    let currX = width / 2 - totalBarWidth / 2;

    // 1. Weapons Label
    const wLabel = this.scene.add
      .text(currX, topY, 'ОРУЖИЕ:', {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#facc15',
        fontFamily: 'monospace',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(10001);
    this.elements.push(wLabel);
    currX += wLabel.width + 8;

    // 2. Weapon Slots
    for (let i = 0; i < maxWeapons; i++) {
      const slotX = currX + i * (slotSize + slotGap) + slotSize / 2;
      const slotY = topY;
      const equipped = equippedWeapons[i];

      const slotBg = this.scene.add
        .rectangle(slotX, slotY, slotSize, slotSize, 0x0f172a, 0.92)
        .setStrokeStyle(1.5, equipped ? 0xfacc15 : 0x334155)
        .setScrollFactor(0)
        .setDepth(10001);
      this.elements.push(slotBg);

      if (equipped) {
        if (equipped.def.iconKey && this.scene.textures.exists(equipped.def.iconKey)) {
          const icon = this.scene.add
            .image(slotX, slotY, equipped.def.iconKey)
            .setDisplaySize(slotSize - 8, slotSize - 8)
            .setScrollFactor(0)
            .setDepth(10002);
          this.elements.push(icon);
        }
        const lvlBadge = this.scene.add
          .text(slotX + slotSize / 2 - 2, slotY + slotSize / 2 - 2, `${equipped.lvl}`, {
            fontSize: '10px',
            fontStyle: 'bold',
            color: '#fef08a',
            fontFamily: 'monospace',
            stroke: '#000000',
            strokeThickness: 3,
          })
          .setOrigin(1, 1)
          .setScrollFactor(0)
          .setDepth(10003);
        this.elements.push(lvlBadge);
      } else {
        const dash = this.scene.add
          .text(slotX, slotY, '-', {
            fontSize: '13px',
            color: '#475569',
            fontFamily: 'monospace',
          })
          .setOrigin(0.5)
          .setScrollFactor(0)
          .setDepth(10002);
        this.elements.push(dash);
      }
    }
    currX += weaponsBlockWidth + sectionGap;

    // 3. Tomes Label
    const tLabel = this.scene.add
      .text(currX, topY, 'ТОМА:', {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#4ade80',
        fontFamily: 'monospace',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(10001);
    this.elements.push(tLabel);
    currX += tLabel.width + 8;

    // 4. Tome Slots
    for (let i = 0; i < maxTomes; i++) {
      const slotX = currX + i * (slotSize + slotGap) + slotSize / 2;
      const slotY = topY;
      const equipped = equippedTomes[i];

      const slotBg = this.scene.add
        .rectangle(slotX, slotY, slotSize, slotSize, 0x0f172a, 0.92)
        .setStrokeStyle(1.5, equipped ? 0x4ade80 : 0x334155)
        .setScrollFactor(0)
        .setDepth(10001);
      this.elements.push(slotBg);

      if (equipped) {
        if (equipped.def.iconKey && this.scene.textures.exists(equipped.def.iconKey)) {
          const icon = this.scene.add
            .image(slotX, slotY, equipped.def.iconKey)
            .setDisplaySize(slotSize - 8, slotSize - 8)
            .setScrollFactor(0)
            .setDepth(10002);
          this.elements.push(icon);
        }
        const lvlBadge = this.scene.add
          .text(slotX + slotSize / 2 - 2, slotY + slotSize / 2 - 2, `${equipped.lvl}`, {
            fontSize: '10px',
            fontStyle: 'bold',
            color: '#bbf7d0',
            fontFamily: 'monospace',
            stroke: '#000000',
            strokeThickness: 3,
          })
          .setOrigin(1, 1)
          .setScrollFactor(0)
          .setDepth(10003);
        this.elements.push(lvlBadge);
      } else {
        const dash = this.scene.add
          .text(slotX, slotY, '-', {
            fontSize: '13px',
            color: '#475569',
            fontFamily: 'monospace',
          })
          .setOrigin(0.5)
          .setScrollFactor(0)
          .setDepth(10002);
        this.elements.push(dash);
      }
    }
  }

  destroy(): void {
    this.clear();
  }
}

