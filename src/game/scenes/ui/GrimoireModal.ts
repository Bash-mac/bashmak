import Phaser from 'phaser';
import { EVOLUTION_RECIPES, type EvolutionRecipe } from '../../data/evolutions';
import { GameState } from '../../core/GameState';
import { AudioManager } from '../../audio/AudioManager';

const FRAME_NATIVE_W = 820;
const FRAME_NATIVE_H = 547;

export class GrimoireModal {
  private scene: Phaser.Scene;
  private elements: Phaser.GameObjects.GameObject[] = [];
  public isVisible = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(onClose?: () => void): void {
    this.clear();
    this.isVisible = true;

    const { width, height } = this.scene.cameras.main;
    const cx = width / 2;
    const cy = height / 2;
    const gameState = GameState.getInstance();

    // 1. Dark Backdrop (Closes only when clicking outside the grimoire frame)
    const backdrop = this.scene.add
      .rectangle(cx, cy, width, height, 0x05070d, 0.94)
      .setScrollFactor(0)
      .setDepth(20000)
      .setInteractive();

    backdrop.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const frameW = FRAME_NATIVE_W * scale;
      const frameH = FRAME_NATIVE_H * scale;
      const isOutside = Math.abs(pointer.x - cx) > frameW / 2 || Math.abs(pointer.y - cy) > frameH / 2;
      if (isOutside) {
        AudioManager.getInstance().playClick();
        this.hide();
        onClose?.();
      }
    });
    this.elements.push(backdrop);

    // 2. Responsive Frame Scale
    const scale = Math.min((width * 0.96) / FRAME_NATIVE_W, (height * 0.96) / FRAME_NATIVE_H);

    // 3. Sewer Pipe Frame (Background Frame - blocks click pass-through)
    const frame = this.scene.add
      .image(cx, cy, 'grimoire_frame')
      .setScale(scale)
      .setScrollFactor(0)
      .setDepth(20010)
      .setInteractive();
    this.elements.push(frame);

    // 4. Header Title: Comic container with layered background stroke
    const topY = cy - 200 * scale;
    const headerTitle = this.scene.add.container(cx, topY).setDepth(20020).setScrollFactor(0);

    const fontConfig = {
      fontFamily: "'Gagalin', monospace",
      fontSize: `${Math.round(32 * scale)}px`,
      stroke: '#0f172a',
      strokeThickness: Math.round(8 * scale),
      shadow: { offsetX: 0, offsetY: Math.round(4 * scale), color: '#000000', blur: 0, stroke: true, fill: true },
    };

    const grimoireX = -60 * scale;
    const grimoireY = -18 * scale;
    const wordGrimoire = this.scene.add
      .text(grimoireX, grimoireY, 'ГРИМУАР', {
        ...fontConfig,
        color: '#a3e635',
      })
      .setOrigin(0.5)
      .setAngle(-4);

    const mutationsX = 75 * scale;
    const mutationsY = -2 * scale;
    const wordMutations = this.scene.add
      .text(mutationsX, mutationsY, 'МУТАЦИЙ', {
        ...fontConfig,
        color: '#ef4444',
      })
      .setOrigin(0.5)
      .setAngle(3);

    const bgStrokeThickness = Math.round(16 * scale);

    const grimoireBg = this.scene.add
      .text(grimoireX, grimoireY, 'ГРИМУАР', {
        ...fontConfig,
        strokeThickness: bgStrokeThickness,
        shadow: { offsetX: 0, offsetY: 0, color: '#000000', blur: 0, stroke: true, fill: true },
      })
      .setOrigin(0.5)
      .setAngle(-4);

    const mutationsBg = this.scene.add
      .text(mutationsX, mutationsY, 'МУТАЦИЙ', {
        ...fontConfig,
        strokeThickness: bgStrokeThickness,
        shadow: { offsetX: 0, offsetY: 0, color: '#000000', blur: 0, stroke: true, fill: true },
      })
      .setOrigin(0.5)
      .setAngle(3);

    headerTitle.add([grimoireBg, mutationsBg, wordGrimoire, wordMutations]);
    this.elements.push(headerTitle);

    // 5. 4 Evolution Rows (Uniform Aspect Ratio, No Distortion)
    const rowScale = 0.72 * scale;
    const startY = cy - 105 * scale;
    const rowStep = 78 * scale;

    EVOLUTION_RECIPES.forEach((recipe, idx) => {
      const rowY = startY + idx * rowStep;
      this.buildEvolutionRow(cx, rowY, recipe, rowScale, scale, gameState);
    });

    // 6. Bottom Close Button using authentic btn_frame_red (native 512x205 aspect ratio)
    const closeBtnY = cy + 225 * scale;
    const btnBaseScale = 0.38 * scale;

    const closeBtnBg = this.scene.add
      .image(cx, closeBtnY, 'btn_frame_red')
      .setScale(btnBaseScale)
      .setScrollFactor(0)
      .setDepth(20020)
      .setInteractive({ useHandCursor: true });

    const closeBtnText = this.scene.add
      .text(cx, closeBtnY - 2 * scale, '✕ ЗАКРЫТЬ', {
        fontSize: `${Math.round(17 * scale)}px`,
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#450a0a',
        strokeThickness: Math.round(4 * scale),
        fontFamily: "'Gagalin', monospace",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20021);

    closeBtnBg.on('pointerover', () => {
      this.scene.tweens.add({
        targets: [closeBtnBg, closeBtnText],
        scaleX: btnBaseScale * 1.07,
        scaleY: btnBaseScale * 1.07,
        angle: 1.2,
        duration: 120,
        ease: 'Back.easeOut',
      });
    });

    closeBtnBg.on('pointerout', () => {
      this.scene.tweens.add({
        targets: [closeBtnBg, closeBtnText],
        scaleX: btnBaseScale,
        scaleY: btnBaseScale,
        angle: 0,
        duration: 120,
        ease: 'Quad.easeOut',
      });
    });

    closeBtnBg.on('pointerdown', () => {
      AudioManager.getInstance().playClick();
      this.scene.tweens.add({
        targets: [closeBtnBg, closeBtnText],
        scaleX: btnBaseScale * 0.92,
        scaleY: btnBaseScale * 0.92,
        duration: 70,
        yoyo: true,
        onComplete: () => {
          this.hide();
          onClose?.();
        },
      });
    });

    this.elements.push(closeBtnBg, closeBtnText);
  }

  private buildEvolutionRow(
    cx: number,
    rowY: number,
    recipe: EvolutionRecipe,
    rowScale: number,
    scale: number,
    state: GameState
  ): void {
    const isEvolved = state.activeUpgrades.has(recipe.id);
    const weaponLvl = state.activeUpgrades.get(recipe.baseWeaponId) || 0;
    const tomeLvl = state.activeUpgrades.get(recipe.requiredTomeId) || 0;
    const isReady = weaponLvl >= 5 && tomeLvl >= 5 && !isEvolved;

    // 1. Solid Textured Row Plate (Original Proportions)
    const rowBgKey = recipe.rowBgKey || 'grimoire_row_acid';
    const plate = this.scene.add
      .image(cx, rowY, rowBgKey)
      .setScale(rowScale)
      .setScrollFactor(0)
      .setDepth(20011);
    this.elements.push(plate);

    // 2. Left Ring: Icon perfectly centered in the round ring
    const leftX = cx - 220 * scale;
    const leftY = rowY - 4 * scale;
    const iconKey = recipe.iconKey || `icon_weapon_${recipe.baseWeaponId}`;
    if (this.scene.textures.exists(iconKey)) {
      const ringIcon = this.scene.add
        .image(leftX, leftY, iconKey)
        .setDisplaySize(62 * scale, 62 * scale)
        .setScrollFactor(0)
        .setDepth(20012);
      this.elements.push(ringIcon);
    }

    // 3. Middle: High-Impact Comic Title
    const textStartX = cx - 162 * scale;
    const themeGlows: Record<string, { stroke: string; glow: string }> = {
      grimoire_row_acid: { stroke: '#022c22', glow: '#10b981' },
      grimoire_row_electric: { stroke: '#082f49', glow: '#0284c7' },
      grimoire_row_fire: { stroke: '#431407', glow: '#ea580c' },
      grimoire_row_void: { stroke: '#3b0764', glow: '#a855f7' },
    };
    const style = themeGlows[rowBgKey] || { stroke: '#09090b', glow: '#64748b' };
    const titleColor = isEvolved ? '#4ade80' : isReady ? '#facc15' : '#ffffff';

    const title = this.scene.add
      .text(textStartX, rowY - 11 * scale, recipe.comicTitle, {
        fontSize: `${Math.round(19 * scale)}px`,
        fontStyle: 'bold',
        color: titleColor,
        stroke: style.stroke,
        strokeThickness: Math.round(5 * scale),
        fontFamily: "'Gagalin', monospace",
        shadow: {
          offsetX: 0,
          offsetY: 2 * scale,
          color: style.glow,
          blur: 3 * scale,
          stroke: true,
          fill: true,
        },
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(20012);

    // 4. Formula Text: Clean, high-contrast, integrated into background texture
    const cleanWpnName = recipe.baseWeaponName.replace(/\s*\(Lv\.\d+\)/g, '');
    const cleanTomeName = recipe.requiredTomeName.replace(/\s*\(Lv\.\d+\)/g, '').replace(/^[«"']|[»"']$/g, '');

    const formulaY = rowY + 11 * scale;
    const wpnColor = weaponLvl >= 5 ? '#facc15' : weaponLvl > 0 ? '#4ade80' : '#f1f5f9';
    const tomeColor = tomeLvl >= 5 ? '#facc15' : tomeLvl > 0 ? '#4ade80' : '#f1f5f9';
    const fontStr = `${Math.round(11.5 * scale)}px`;

    const wpnText = this.scene.add
      .text(textStartX, formulaY, `${cleanWpnName} (${weaponLvl}/5)`, {
        fontSize: fontStr,
        color: wpnColor,
        fontStyle: 'bold',
        stroke: '#09090b',
        strokeThickness: Math.round(3 * scale),
        fontFamily: "'Balsamiq Sans', monospace",
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(20012);

    const plusX = textStartX + wpnText.width + 8 * scale;
    const plusText = this.scene.add
      .text(plusX, formulaY, '+', {
        fontSize: `${Math.round(13 * scale)}px`,
        fontStyle: 'bold',
        color: '#94a3b8',
        stroke: '#09090b',
        strokeThickness: Math.round(3 * scale),
        fontFamily: "'Gagalin', monospace",
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(20012);

    const tomeX = plusX + plusText.width + 8 * scale;
    const tomeText = this.scene.add
      .text(tomeX, formulaY, `${cleanTomeName} (${tomeLvl}/5)`, {
        fontSize: fontStr,
        color: tomeColor,
        fontStyle: 'bold',
        stroke: '#09090b',
        strokeThickness: Math.round(3 * scale),
        fontFamily: "'Balsamiq Sans', monospace",
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(20012);

    this.elements.push(title, wpnText, plusText, tomeText);

    // 5. Right Riveted Metal Plate: Status Plaque (Passive locked state vs active ready)
    const rightX = cx + 204 * scale;
    const statusText = isEvolved ? 'АКТИВНО' : isReady ? 'ГОТОВО!' : 'ЗАКРЫТО';
    const statusColor = isEvolved ? '#4ade80' : isReady ? '#facc15' : '#64748b';
    const statusStroke = isEvolved ? '#022c22' : isReady ? '#451a03' : '#0f172a';
    const statusFontSize = isReady ? 15 : isEvolved ? 14 : 12;

    const status = this.scene.add
      .text(rightX, rowY + 1 * scale, statusText, {
        fontSize: `${Math.round(statusFontSize * scale)}px`,
        fontStyle: 'bold',
        color: statusColor,
        stroke: statusStroke,
        strokeThickness: Math.round(2 * scale),
        fontFamily: "'Gagalin', monospace",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20012);

    if (isReady) {
      this.scene.tweens.add({
        targets: status,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    this.elements.push(status);
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


