import Phaser from 'phaser';
import type { UpgradeDefinition } from '../../data/definitions';
import { ALL_UPGRADES } from '../../data/upgrades';
import { GameState } from '../../core/GameState';
import { createPlatformAdapter } from '../../../platform';
import { getReadyEvolution, type EvolutionRecipe } from '../../data/evolutions';
import { AudioManager } from '../../audio/AudioManager';

export class LevelUpModal {
  private scene: Phaser.Scene;
  private onUpgradeSelected: (upgrade: UpgradeDefinition, levelToApply: number) => void;
  private onSkip?: () => void;
  private platform = createPlatformAdapter();
  private elements: Phaser.GameObjects.GameObject[] = [];
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
    const titleY = Math.max(30, height * 0.08);
    const subtitleY = titleY + 32;

    const title = this.scene.add
      .text(width / 2, titleY, 'LEVEL UP!', {
        fontSize: width < 700 ? '28px' : '40px',
        fontStyle: 'bold',
        color: '#4ade80',
        fontFamily: 'monospace',
        stroke: '#064e3b',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10001);

    const subtitle = this.scene.add
      .text(width / 2, subtitleY, 'Выбери развитие мутации:', {
        fontSize: width < 700 ? '12px' : '15px',
        color: '#cbd5e1',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10001);

    this.elements.push(title, subtitle);

    // 3. Check for ready weapon evolution
    const gameState = GameState.getInstance();
    const readyEvo = getReadyEvolution(gameState);

    const neededNormalCount = readyEvo ? 2 : 3;
    const options = gameState.getEligibleUpgrades(ALL_UPGRADES, neededNormalCount);
    const totalCards = (readyEvo ? 1 : 0) + options.length;

    // 4. Single Horizontal Row Layout (Landscape 16:9)
    const availableWidth = width - 48;
    const spacing = Math.min(22, Math.max(10, (availableWidth - totalCards * 280) / Math.max(1, totalCards - 1)));
    const cardWidth = Math.min(280, Math.floor((availableWidth - (totalCards - 1) * spacing) / totalCards));
    const cardHeight = Math.min(430, Math.floor(height - subtitleY - 65));

    const totalW = totalCards * cardWidth + (totalCards - 1) * spacing;
    const startX = (width - totalW) / 2 + cardWidth / 2;
    const cardY = subtitleY + 14 + cardHeight / 2;

    let currentIdx = 0;

    if (readyEvo) {
      const cardX = startX + currentIdx * (cardWidth + spacing);
      this.createEvolutionCard(readyEvo, cardX, cardY, cardWidth, cardHeight);
      currentIdx++;
    }

    options.forEach((opt) => {
      const cardX = startX + currentIdx * (cardWidth + spacing);
      this.createCard(opt.upgrade, opt.levelToApply, cardX, cardY, cardWidth, cardHeight);
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
      .text(rerollX, btnBarY, `🎲 РЕРОЛЛ (${gameState.rerollsRemaining})`, {
        fontSize: width < 700 ? '12px' : '13px',
        fontStyle: 'bold',
        color: canReroll ? '#fde047' : '#64748b',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10006);

    if (canReroll) {
      rerollBg.setInteractive({ useHandCursor: true });
      rerollBg.on('pointerover', () => rerollBg.setScale(1.04));
      rerollBg.on('pointerout', () => rerollBg.setScale(1.0));
      rerollBg.on('pointerdown', () => {
        this.platform.vibrate(30);
        AudioManager.getInstance().playClick();
        gameState.rerollsRemaining--;
        this.show();
      });
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
      .text(skipX, btnBarY, `⏭ ПРОПУСК (${gameState.skipsRemaining})`, {
        fontSize: width < 700 ? '12px' : '13px',
        fontStyle: 'bold',
        color: canSkip ? '#93c5fd' : '#64748b',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10006);

    if (canSkip) {
      skipBg.setInteractive({ useHandCursor: true });
      skipBg.on('pointerover', () => skipBg.setScale(1.04));
      skipBg.on('pointerout', () => skipBg.setScale(1.0));
      skipBg.on('pointerdown', () => {
        this.platform.vibrate(30);
        AudioManager.getInstance().playClick();
        gameState.skipsRemaining--;
        this.hide();
        if (this.onSkip) {
          this.onSkip();
        }
      });
    }

    this.elements.push(rerollBg, rerollText, skipBg, skipText);
  }

  private createEvolutionCard(
    evo: EvolutionRecipe,
    x: number,
    y: number,
    w: number,
    h: number
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
      .text(0, -h * 0.23, '👑 СУПЕР-ЭВОЛЮЦИЯ', {
        fontSize: w < 240 ? '11px' : '13px',
        fontStyle: 'bold',
        color: '#facc15',
        fontFamily: 'monospace',
        stroke: '#451a03',
        strokeThickness: 3,
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
        fontStyle: 'bold',
        color: '#fef08a',
        fontFamily: 'monospace',
        align: 'center',
        wordWrap: { width: cutoutW - 16 },
        stroke: '#451a03',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0.5);

    // 6. Description
    const descY = titleY + 16;
    const descText = this.scene.add
      .text(0, descY, evo.description, {
        fontSize: w < 240 ? '10px' : '12px',
        color: '#f3e8ff',
        fontFamily: 'monospace',
        align: 'center',
        wordWrap: { width: cutoutW - 16 },
        lineSpacing: 3,
      })
      .setOrigin(0.5, 0);

    // 7. 3D Comic Action Button (Resting over bottom plate)
    const btnW = Math.min(w - 48, 175);
    const btnH = Math.min(46, Math.floor(btnW * 0.38));
    const btnY = h * 0.355;

    const btnImage = this.scene.add.image(0, btnY, 'btn_comic_gold');
    btnImage.setDisplaySize(btnW, btnH);

    const btnText = this.scene.add
      .text(0, btnY, 'МУТИРОВАТЬ!', {
        fontSize: w < 240 ? '12px' : '14px',
        fontStyle: 'bold',
        color: '#0f172a',
        fontFamily: 'monospace',
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
      btnText,
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

    hitArea.on('pointerover', () => {
      this.scene.tweens.add({
        targets: cardContainer,
        scaleX: 1.03,
        scaleY: 1.03,
        duration: 100,
        ease: 'Quad.easeOut',
      });
    });

    hitArea.on('pointerout', () => {
      this.scene.tweens.add({
        targets: cardContainer,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 100,
        ease: 'Quad.easeOut',
      });
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
    h: number
  ): void {
    const cardContainer = this.scene.add.container(x, y).setDepth(10002).setScrollFactor(0);

    const isConsumable = upgrade.isConsumable;
    const isWeapon = upgrade.category === 'weapon';

    // 1. Dark Backdrop ONLY within central cutout (never sticks out of frame)
    const cutoutW = w * 0.74;
    const cutoutH = h * 0.74;
    const bg = this.scene.add
      .rectangle(0, 0, cutoutW, cutoutH, 0x070b14, 0.96);

    // 2. Frame Image (512x768)
    const frameTex = isConsumable ? 'card_frame_consumable' : 'card_frame_standard';
    const frame = this.scene.add.image(0, 0, frameTex);
    frame.setDisplaySize(w, h);

    // 3. Category / Level Badge (Under top plate)
    let badgeText = isWeapon ? '⚔️ ОРУЖИЕ' : isConsumable ? '🧪 РАСХОДНИК' : '📜 ФОЛИАНТ';
    if (!isConsumable && levelToApply > 1) {
      badgeText = `${badgeText}  LVL ${levelToApply - 1} → ${levelToApply}`;
    }

    const badgeColor = isWeapon ? '#4ade80' : isConsumable ? '#60a5fa' : '#facc15';
    const badgeLabel = this.scene.add
      .text(0, -h * 0.23, badgeText, {
        fontSize: w < 240 ? '10px' : '12px',
        fontStyle: 'bold',
        color: badgeColor,
        fontFamily: 'monospace',
        stroke: '#050811',
        strokeThickness: 3,
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
        fontStyle: 'bold',
        color: '#ffffff',
        fontFamily: 'monospace',
        align: 'center',
        wordWrap: { width: cutoutW - 16 },
        stroke: '#050811',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0.5);

    // 6. Level Description
    const levelConfig = upgrade.levels.find((l) => l.level === levelToApply) || upgrade.levels[0];
    const descY = titleY + 16;
    const descText = this.scene.add
      .text(0, descY, levelConfig?.description || '', {
        fontSize: w < 240 ? '10px' : '12px',
        color: '#cbd5e1',
        fontFamily: 'monospace',
        align: 'center',
        wordWrap: { width: cutoutW - 16 },
        lineSpacing: 3,
      })
      .setOrigin(0.5, 0);

    // 7. 3D Comic Action Button (Resting over bottom plate)
    const btnW = Math.min(w - 48, 175);
    const btnH = Math.min(46, Math.floor(btnW * 0.38));
    const btnY = h * 0.355;

    const btnImage = this.scene.add.image(0, btnY, 'btn_comic_green');
    btnImage.setDisplaySize(btnW, btnH);

    const btnText = this.scene.add
      .text(0, btnY, 'ВЫБРАТЬ', {
        fontSize: w < 240 ? '12px' : '14px',
        fontStyle: 'bold',
        color: '#ffffff',
        fontFamily: 'monospace',
        stroke: '#064e3b',
        strokeThickness: 3,
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
      btnText,
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

    hitArea.on('pointerover', () => {
      btnImage.setTexture('btn_comic_green_hover');
      this.scene.tweens.add({
        targets: cardContainer,
        scaleX: 1.03,
        scaleY: 1.03,
        duration: 100,
        ease: 'Quad.easeOut',
      });
    });

    hitArea.on('pointerout', () => {
      btnImage.setTexture('btn_comic_green');
      this.scene.tweens.add({
        targets: cardContainer,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 100,
        ease: 'Quad.easeOut',
      });
    });

    hitArea.on('pointerdown', selectUpgrade);

    this.elements.push(cardContainer, hitArea);
  }

  hide(): void {
    this.clear();
    this.isVisible = false;
  }

  private clear(): void {
    for (const el of this.elements) {
      el.destroy();
    }
    this.elements = [];
  }

  destroy(): void {
    this.clear();
  }
}

