import Phaser from 'phaser';
import type { Entity } from '../../entities/Entity';
import { GameState } from '../../core/GameState';
import { SaveManager } from '../../core/SaveManager';
import { ALL_UPGRADES } from '../../data/upgrades';
import { EVOLUTION_RECIPES } from '../../data/evolutions';
import type { PlayerModifiers } from '../../data/definitions';
import { WEAPON_IDS, TOME_IDS } from '../../data/itemIds';
import type { SpawnManager } from '../../spawning/SpawnManager';
import type { LootSystem } from '../../loot/LootSystem';
import type { CombatSystem } from '../../combat/CombatSystem';
import type { HUD } from './HUD';
import { AudioManager } from '../../audio/AudioManager';
import { ARMORED_SLUG, MINI_BOSS_ELITE, BOSS_KURGAN } from '../../data/enemies';

export interface DebugContext {
  scene: Phaser.Scene;
  player: Entity;
  gameState: GameState;
  spawnManager: SpawnManager;
  lootSystem: LootSystem;
  enemiesMap: Map<string, Entity>;
  combatSystem: CombatSystem;
  hud: HUD;
  resumeGame: () => void;
  pauseGame: () => void;
}

export class DebugModal {
  private scene: Phaser.Scene;
  private elements: Phaser.GameObjects.GameObject[] = [];
  public isVisible = false;
  private currentTab: 'weapons' | 'cheats' | 'spawn' = 'weapons';
  public isGodMode = false;
  public isSpawnPaused = false;
  private speedMultiplier = 1.0;
  private scrollContainer?: Phaser.GameObjects.Container;
  private scrollY = 0;
  private maxScrollY = 0;
  private wheelHandler?: (pointer: Phaser.Input.Pointer, deltaX: number, deltaY: number) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public toggle(ctx: DebugContext): void {
    if (this.isVisible) {
      this.hide(ctx);
    } else {
      this.show(ctx);
    }
  }

  public show(ctx: DebugContext): void {
    this.clear();
    this.isVisible = true;
    ctx.pauseGame();

    const { width, height } = this.scene.cameras.main;
    const isMobile = width < 760;
    const boxW = Math.min(940, width - 24);
    const boxH = Math.min(620, height - 24);
    const centerX = width / 2;
    const centerY = height / 2;

    // 1. Dark Backdrop
    const backdrop = this.scene.add
      .rectangle(centerX, centerY, width, height, 0x030712, 0.94)
      .setScrollFactor(0)
      .setDepth(30000)
      .setInteractive();
    this.elements.push(backdrop);

    // 2. Main Window Box
    const boxBg = this.scene.add
      .rectangle(centerX, centerY, boxW, boxH, 0x0b1329, 0.98)
      .setStrokeStyle(2, 0x38bdf8)
      .setScrollFactor(0)
      .setDepth(30001);
    this.elements.push(boxBg);

    // 3. Header Title
    const title = this.scene.add
      .text(centerX - boxW / 2 + 20, centerY - boxH / 2 + 22, 'SECRET DEV CONSOLE [TEST ONLY]', {
        fontSize: isMobile ? '13px' : '16px',
        fontStyle: 'bold',
        color: '#38bdf8',
        fontFamily: 'monospace',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(30002);
    this.elements.push(title);

    // Close Button [X]
    const closeBtn = this.scene.add
      .rectangle(centerX + boxW / 2 - 25, centerY - boxH / 2 + 22, 34, 28, 0xdc2626)
      .setStrokeStyle(1, 0xf87171)
      .setScrollFactor(0)
      .setDepth(30002)
      .setInteractive({ useHandCursor: true });
    const closeText = this.scene.add
      .text(closeBtn.x, closeBtn.y, 'X', {
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#ffffff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30003);
    closeBtn.on('pointerdown', () => this.hide(ctx));
    this.elements.push(closeBtn, closeText);

    // 4. Tab Navigation Buttons
    const tabs: { id: 'weapons' | 'cheats' | 'spawn'; label: string }[] = [
      { id: 'weapons', label: 'ОРУЖИЕ И ТОМА' },
      { id: 'cheats', label: 'ЧИТЫ И ХАРАКТЕРИСТИКИ' },
      { id: 'spawn', label: 'СПАВН И ВРЕМЯ' },
    ];
    const tabW = (boxW - 40) / tabs.length;
    const tabH = 32;
    const tabY = centerY - boxH / 2 + 56;

    tabs.forEach((tab, idx) => {
      const tx = centerX - boxW / 2 + 20 + idx * tabW + tabW / 2;
      const isActive = this.currentTab === tab.id;
      const tabBg = this.scene.add
        .rectangle(tx, tabY, tabW - 4, tabH, isActive ? 0x0284c7 : 0x1e293b)
        .setStrokeStyle(1, isActive ? 0x38bdf8 : 0x475569)
        .setScrollFactor(0)
        .setDepth(30002)
        .setInteractive({ useHandCursor: true });
      const tabLabel = this.scene.add
        .text(tx, tabY, tab.label, {
          fontSize: isMobile ? '10px' : '12px',
          fontStyle: 'bold',
          color: isActive ? '#ffffff' : '#94a3b8',
          fontFamily: 'monospace',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(30003);

      tabBg.on('pointerdown', () => {
        this.currentTab = tab.id;
        this.scrollY = 0;
        this.show(ctx);
      });
      this.elements.push(tabBg, tabLabel);
    });

    // 5. Scrollable Content Area with Mask
    const contentX = centerX - boxW / 2 + 20;
    const contentY = tabY + 22;
    const contentW = boxW - 40;
    const contentH = boxH - 95;

    const maskShape = this.scene.make.graphics({ x: 0, y: 0 });
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(contentX, contentY, contentW, contentH);
    const geomMask = maskShape.createGeometryMask();
    this.elements.push(maskShape);

    this.scrollContainer = this.scene.add.container(0, this.scrollY).setDepth(30002);
    this.scrollContainer.setMask(geomMask);
    this.elements.push(this.scrollContainer);

    let totalContentHeight = 0;
    if (this.currentTab === 'weapons') {
      totalContentHeight = this.renderWeaponsTab(ctx, centerX, contentY, contentW, isMobile);
    } else if (this.currentTab === 'cheats') {
      totalContentHeight = this.renderCheatsTab(ctx, centerX, contentY, contentW, isMobile);
    } else {
      totalContentHeight = this.renderSpawnTab(ctx, centerX, contentY, contentW, isMobile);
    }

    this.maxScrollY = Math.max(0, totalContentHeight - contentH);

    // Mouse Wheel Scroll Listener
    this.wheelHandler = (_pointer, _dx, dy) => {
      if (!this.isVisible || !this.scrollContainer) return;
      this.scrollY = Phaser.Math.Clamp(this.scrollY - dy * 0.5, -this.maxScrollY, 0);
      this.scrollContainer.y = this.scrollY;
    };
    this.scene.input.on('wheel', this.wheelHandler);
  }

  private renderWeaponsTab(
    ctx: DebugContext,
    centerX: number,
    topY: number,
    w: number,
    isMobile: boolean
  ): number {
    if (!this.scrollContainer) return 0;

    const weapons = ALL_UPGRADES.filter((u) => u.category === 'weapon');
    const tomes = ALL_UPGRADES.filter((u) => u.category === 'tome');

    const colW = isMobile ? w : (w - 20) / 2;
    const leftX = centerX - w / 2;
    const rightX = isMobile ? leftX : leftX + colW + 20;
    const rowH = 34;

    let leftY = topY + 28;
    let rightY = isMobile ? topY + 28 + (weapons.length + 1) * rowH + 20 : topY + 28;

    // --- Left Column Header: WEAPONS ---
    const wpnHeader = this.scene.add
      .text(leftX, topY + 8, `ОРУЖИЕ (${weapons.length})`, {
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#38bdf8',
        fontFamily: 'monospace',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
    this.scrollContainer.add(wpnHeader);

    weapons.forEach((wpn) => {
      this.renderUpgradeRow(ctx, wpn, leftX, leftY, colW, isMobile);
      leftY += rowH;
    });

    // --- Right Column Header: TOMES ---
    const tomeHeader = this.scene.add
      .text(rightX, isMobile ? leftY + 12 : topY + 8, `ФОЛИАНТЫ (${tomes.length})`, {
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#4ade80',
        fontFamily: 'monospace',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
    this.scrollContainer.add(tomeHeader);

    if (isMobile) rightY = leftY + 32;

    tomes.forEach((tome) => {
      this.renderUpgradeRow(ctx, tome, rightX, rightY, colW, isMobile);
      rightY += rowH;
    });

    // --- Bottom Section: SUPER EVOLUTIONS ---
    let evoY = Math.max(leftY, rightY) + 16;
    const evoTitle = this.scene.add
      .text(leftX, evoY, 'МГНОВЕННЫЕ СУПЕР-ЭВОЛЮЦИИ (ОРУЖИЕ + ФОЛИАНТ):', {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#facc15',
        fontFamily: 'monospace',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
    this.scrollContainer.add(evoTitle);
    evoY += 26;

    const evoCols = isMobile ? 2 : 4;
    const evoW = (w - (evoCols - 1) * 10) / evoCols;
    EVOLUTION_RECIPES.forEach((evo, i) => {
      const col = i % evoCols;
      const row = Math.floor(i / evoCols);
      const ex = leftX + col * (evoW + 10) + evoW / 2;
      const ey = evoY + row * 38;

      const evoBtn = this.createSmallBtn(
        ex,
        ey,
        evo.name.split(' ')[0],
        0x7c3aed,
        () => {
          evo.apply(ctx.gameState);
          AudioManager.getInstance().playLevelUp();
          this.show(ctx);
        },
        evoW - 4,
        28
      );
      this.scrollContainer!.add([evoBtn.bg, evoBtn.text]);
    });

    const totalHeight = evoY + Math.ceil(EVOLUTION_RECIPES.length / evoCols) * 38 + 20 - topY;
    return totalHeight;
  }

  private renderUpgradeRow(
    ctx: DebugContext,
    upg: (typeof ALL_UPGRADES)[0],
    x: number,
    y: number,
    w: number,
    isMobile: boolean
  ): void {
    if (!this.scrollContainer) return;
    const curLvl = ctx.gameState.activeUpgrades.get(upg.id) || 0;

    // Item Name
    const nameText = this.scene.add
      .text(x, y, `${upg.name} (Lv.${curLvl})`, {
        fontSize: isMobile ? '10px' : '12px',
        color: curLvl > 0 ? '#4ade80' : '#cbd5e1',
        fontFamily: 'monospace',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0);

    const btnSetLevel = (targetLvl: number) => {
      if (targetLvl === 0) {
        ctx.gameState.activeUpgrades.delete(upg.id);
        const idx = ctx.gameState.selectedUpgrades.indexOf(upg.id);
        if (idx !== -1) ctx.gameState.selectedUpgrades.splice(idx, 1);
        this.resetUpgradeModifier(upg.id, ctx.gameState.playerModifiers);
      } else {
        ctx.gameState.activeUpgrades.set(upg.id, targetLvl);
        if (!ctx.gameState.selectedUpgrades.includes(upg.id)) {
          ctx.gameState.selectedUpgrades.push(upg.id);
        }
        const lvlDef = upg.levels.find((l) => l.level === targetLvl) || upg.levels[upg.levels.length - 1];
        lvlDef?.apply(ctx.gameState.playerModifiers, ctx.player.stats, ctx.player.health);
      }
      this.show(ctx);
    };

    const b1 = this.createSmallBtn(x + w - 120, y, '+1', 0x16a34a, () => btnSetLevel(Math.min(5, curLvl + 1)), 34, 22);
    const bMax = this.createSmallBtn(x + w - 78, y, 'MAX', 0xeab308, () => btnSetLevel(5), 42, 22);
    const b0 = this.createSmallBtn(x + w - 30, y, 'CLR', 0x475569, () => btnSetLevel(0), 38, 22);

    this.scrollContainer.add([nameText, b1.bg, b1.text, bMax.bg, bMax.text, b0.bg, b0.text]);
  }

  private resetUpgradeModifier(upgId: string, mods: PlayerModifiers): void {
    switch (upgId) {
      case WEAPON_IDS.SLIME_SPIT:
      case 'weapon_slime_spit':
        mods.slimeSpitLevel = 0;
        mods.doubleSpitChance = 0;
        mods.burstFireCount = 1;
        mods.poisonSalivaDmg = 0;
        mods.fatSpitScale = 1.0;
        break;
      case WEAPON_IDS.LACE_WHIP:
      case 'weapon_lace_whip':
        mods.laceWhipLevel = 0;
        break;
      case WEAPON_IDS.CARROT_BARRAGE:
      case 'weapon_carrot_barrage':
        mods.carrotBarrageLevel = 0;
        break;
      case WEAPON_IDS.EGGPLANT_ROLL:
      case 'weapon_eggplant_roll':
        mods.eggplantRollLevel = 0;
        break;
      case WEAPON_IDS.HOMING_DAGGERS:
      case 'weapon_homing_daggers':
        mods.homingDaggersLevel = 0;
        mods.homingDaggersCount = 0;
        break;
      case WEAPON_IDS.MEGA_BOOT:
      case 'weapon_mega_boot':
        mods.megaBootLevel = 0;
        break;
      case WEAPON_IDS.LIGHTNING_ZAP:
      case 'weapon_lightning_zap':
        mods.lightningZapLevel = 0;
        break;
      case WEAPON_IDS.ACID_TRAIL:
      case 'weapon_acid_trail':
        mods.acidTrailLevel = 0;
        mods.acidTrailDps = 0;
        mods.hasSlimeTrail = false;
        break;
      case WEAPON_IDS.TOILET_LID:
      case 'weapon_toilet_lid':
        mods.toiletLidLevel = 0;
        mods.toiletLidBounces = 0;
        mods.toiletLidSlimeTrail = false;
        break;
      case TOME_IDS.QUANTITY:
        mods.tomeQuantity = 0;
        mods.multishotCount = 1;
        break;
      case TOME_IDS.SPEED:
        mods.tomeSpeed = 0;
        break;
      case TOME_IDS.ATTACK_SPEED:
        mods.tomeAttackSpeed = 0;
        mods.attackSpeedBonus = 0;
        break;
      case TOME_IDS.ARMOR:
        mods.tomeArmor = 0;
        break;
      case TOME_IDS.HP_REGEN:
        mods.tomeHpRegen = 0;
        mods.hpRegenPerSec = 0;
        break;
      case TOME_IDS.LIFESTEAL:
        mods.tomeLifesteal = 0;
        mods.healOnKill = 0;
        break;
      case TOME_IDS.MAGNET:
        mods.tomeMagnet = 0;
        mods.magnetRadiusBonus = 0;
        break;
      case TOME_IDS.DAMAGE:
        mods.tomeDamage = 0;
        mods.damagePercentBonus = 0;
        break;
      case TOME_IDS.CRIT:
        mods.tomeCrit = 0;
        mods.critChance = 0;
        break;
      case TOME_IDS.AREA:
        mods.tomeArea = 0;
        mods.attackAreaBonus = 0;
        break;
    }
  }

  private renderCheatsTab(
    ctx: DebugContext,
    centerX: number,
    topY: number,
    w: number,
    _isMobile: boolean
  ): number {
    if (!this.scrollContainer) return 0;
    const colW = (w - 20) / 2;
    let leftY = topY + 24;
    let rightY = topY + 24;
    const btnH = 38;
    const gap = 12;

    // --- Col 1: Hero State ---
    // God Mode
    const godBtn = this.createBigBtn(centerX - w / 4, leftY, colW, btnH, `GOD MODE: ${this.isGodMode ? 'ON' : 'OFF'}`, this.isGodMode ? 0x16a34a : 0x475569, () => {
      this.isGodMode = !this.isGodMode;
      ctx.player.health.isInvulnerable = this.isGodMode;
      this.show(ctx);
    });
    this.scrollContainer.add([godBtn.bg, godBtn.text]);
    leftY += btnH + gap;

    // Full Heal
    const healBtn = this.createBigBtn(centerX - w / 4, leftY, colW, btnH, 'FULL HEAL (100% HP)', 0x059669, () => {
      ctx.player.health.heal(9999);
      ctx.hud.updateHp(ctx.player.health.currentHp, ctx.player.stats.maxHp);
      this.show(ctx);
    });
    this.scrollContainer.add([healBtn.bg, healBtn.text]);
    leftY += btnH + gap;

    // Speed x1 / x2 / x5
    const speedBtn = this.createBigBtn(centerX - w / 4, leftY, colW, btnH, `SPEED BOOST: ${this.speedMultiplier}x`, 0x0284c7, () => {
      this.speedMultiplier = this.speedMultiplier === 1.0 ? 2.0 : this.speedMultiplier === 2.0 ? 4.0 : 1.0;
      ctx.player.stats.speed = 175 * this.speedMultiplier;
      this.show(ctx);
    });
    this.scrollContainer.add([speedBtn.bg, speedBtn.text]);
    leftY += btnH + gap;

    // Add 1000 GOO
    const gooBtn = this.createBigBtn(centerX - w / 4, leftY, colW, btnH, '+1000 GOO (CURRENCY)', 0x15803d, () => {
      SaveManager.getInstance().addGoo(1000);
      AudioManager.getInstance().playGooPickup();
      this.show(ctx);
    });
    this.scrollContainer.add([gooBtn.bg, gooBtn.text]);
    leftY += btnH + gap;

    // --- Col 2: Level & Progression ---
    // +1 Level
    const lvl1Btn = this.createBigBtn(centerX + w / 4, rightY, colW, btnH, '+1 LEVEL UP (+XP)', 0xca8a04, () => {
      ctx.gameState.addXp(ctx.gameState.nextLevelXp);
      this.show(ctx);
    });
    this.scrollContainer.add([lvl1Btn.bg, lvl1Btn.text]);
    rightY += btnH + gap;

    // +5 Levels
    const lvl5Btn = this.createBigBtn(centerX + w / 4, rightY, colW, btnH, '+5 LEVELS UP', 0xb45309, () => {
      for (let i = 0; i < 5; i++) {
        ctx.gameState.addXp(ctx.gameState.nextLevelXp);
      }
      this.show(ctx);
    });
    this.scrollContainer.add([lvl5Btn.bg, lvl5Btn.text]);
    rightY += btnH + gap;

    // Trigger Level Up Modal Choice
    const triggerModalBtn = this.createBigBtn(centerX + w / 4, rightY, colW, btnH, 'TRIGGER LEVEL-UP MODAL', 0x9333ea, () => {
      this.hide(ctx);
      ctx.gameState.pendingLevelUps++;
      ctx.scene.events.emit('player:levelUp');
    });
    this.scrollContainer.add([triggerModalBtn.bg, triggerModalBtn.text]);
    rightY += btnH + gap;

    // NUKE: Kill All Mobs
    const nukeBtn = this.createBigBtn(centerX + w / 4, rightY, colW, btnH, 'NUKE (KILL ALL MOBS)', 0xdc2626, () => {
      ctx.enemiesMap.forEach((e) => {
        if (e.isAlive) ctx.combatSystem.applyDamage(ctx.player, e, 99999);
      });
      this.show(ctx);
    });
    this.scrollContainer.add([nukeBtn.bg, nukeBtn.text]);
    rightY += btnH + gap;

    return Math.max(leftY, rightY) - topY + 20;
  }

  private renderSpawnTab(
    ctx: DebugContext,
    centerX: number,
    topY: number,
    w: number,
    _isMobile: boolean
  ): number {
    if (!this.scrollContainer) return 0;
    const colW = (w - 20) / 2;
    let leftY = topY + 24;
    let rightY = topY + 24;
    const btnH = 38;
    const gap = 12;

    // --- Col 1: Spawn Specific Entities ---
    // Spawn Chest
    const chestBtn = this.createBigBtn(centerX - w / 4, leftY, colW, btnH, 'SPAWN TREASURE CHEST', 0xeab308, () => {
      ctx.lootSystem.spawnChest(ctx.player.x, ctx.player.y - 40);
      this.hide(ctx);
    });
    this.scrollContainer.add([chestBtn.bg, chestBtn.text]);
    leftY += btnH + gap;

    // Spawn Champion Mob
    const champBtn = this.createBigBtn(centerX - w / 4, leftY, colW, btnH, 'SPAWN CHAMPION MUTANT', 0x854d0e, () => {
      const pos = ctx.spawnManager.getScreenPerimeterPosition();
      ctx.spawnManager.spawnDirect(ARMORED_SLUG, pos.x, pos.y, { hpMultiplier: 4.2, speedMultiplier: 1.1, damageMultiplier: 1.25 }, true);
      this.hide(ctx);
    });
    this.scrollContainer.add([champBtn.bg, champBtn.text]);
    leftY += btnH + gap;

    // Spawn Miniboss (Elite Rat)
    const ratBtn = this.createBigBtn(centerX - w / 4, leftY, colW, btnH, 'SPAWN MINIBOSS (5:00)', 0x9f1239, () => {
      const pos = ctx.spawnManager.getScreenPerimeterPosition();
      ctx.spawnManager.spawnDirect(MINI_BOSS_ELITE, pos.x, pos.y, { hpMultiplier: 2.0, speedMultiplier: 1.0, damageMultiplier: 1.0 }, false);
      this.hide(ctx);
    });
    this.scrollContainer.add([ratBtn.bg, ratBtn.text]);
    leftY += btnH + gap;

    // Spawn Boss (Kurgan Roach)
    const bossBtn = this.createBigBtn(centerX - w / 4, leftY, colW, btnH, 'SPAWN BOSS (8:00)', 0x7f1d1d, () => {
      const pos = ctx.spawnManager.getScreenPerimeterPosition();
      ctx.spawnManager.spawnDirect(BOSS_KURGAN, pos.x, pos.y, { hpMultiplier: 3.0, speedMultiplier: 1.0, damageMultiplier: 1.0 }, false);
      this.hide(ctx);
    });
    this.scrollContainer.add([bossBtn.bg, bossBtn.text]);
    leftY += btnH + gap;

    // --- Col 2: Time & Spawn Controller ---
    // Time +1 Min
    const t1Btn = this.createBigBtn(centerX + w / 4, rightY, colW, btnH, 'RUN TIME: +1 MIN', 0x0284c7, () => {
      ctx.gameState.runTime += 60;
      this.show(ctx);
    });
    this.scrollContainer.add([t1Btn.bg, t1Btn.text]);
    rightY += btnH + gap;

    // Time +5 Min
    const t5Btn = this.createBigBtn(centerX + w / 4, rightY, colW, btnH, 'RUN TIME: +5 MIN', 0x0369a1, () => {
      ctx.gameState.runTime += 300;
      this.show(ctx);
    });
    this.scrollContainer.add([t5Btn.bg, t5Btn.text]);
    rightY += btnH + gap;

    // Spawn Toggle
    const toggleSpawnBtn = this.createBigBtn(centerX + w / 4, rightY, colW, btnH, `SPAWNING: ${this.isSpawnPaused ? 'PAUSED' : 'ACTIVE'}`, this.isSpawnPaused ? 0xdc2626 : 0x16a34a, () => {
      this.isSpawnPaused = !this.isSpawnPaused;
      this.show(ctx);
    });
    this.scrollContainer.add([toggleSpawnBtn.bg, toggleSpawnBtn.text]);
    rightY += btnH + gap;

    return Math.max(leftY, rightY) - topY + 20;
  }

  private createSmallBtn(
    x: number,
    y: number,
    label: string,
    color: number,
    onClick: () => void,
    w = 40,
    h = 24
  ): { bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text } {
    const bg = this.scene.add
      .rectangle(x, y, w, h, color, 0.9)
      .setStrokeStyle(1, 0xffffff, 0.6)
      .setScrollFactor(0)
      .setDepth(30004)
      .setInteractive({ useHandCursor: true });
    const text = this.scene.add
      .text(x, y, label, {
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffffff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30005);

    bg.on('pointerdown', onClick);
    return { bg, text };
  }

  private createBigBtn(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    color: number,
    onClick: () => void
  ): { bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text } {
    const bg = this.scene.add
      .rectangle(x, y, w, h, color, 0.95)
      .setStrokeStyle(1.5, 0xffffff, 0.7)
      .setScrollFactor(0)
      .setDepth(30004)
      .setInteractive({ useHandCursor: true });
    const text = this.scene.add
      .text(x, y, label, {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffffff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30005);

    bg.on('pointerdown', onClick);
    return { bg, text };
  }

  public hide(ctx: DebugContext): void {
    this.clear();
    this.isVisible = false;
    ctx.resumeGame();
  }

  public clear(): void {
    if (this.wheelHandler) {
      this.scene.input.off('wheel', this.wheelHandler);
      this.wheelHandler = undefined;
    }
    for (const el of this.elements) {
      el.destroy();
    }
    this.elements = [];
    this.scrollContainer = undefined;
  }

  public destroy(): void {
    this.clear();
  }
}
