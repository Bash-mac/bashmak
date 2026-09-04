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
import { ARMORED_SLUG, MINI_BOSS_ELITE, BOSS_KURGAN, SPRINTER_BUG } from '../../data/enemies';
import type { AutoplayBot } from '../../bot/AutoplayBot';

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
  autoplayBot?: AutoplayBot;
}

export interface LiveBalanceConfig {
  weaponDamageMult: number;
  weaponSpeedMult: number;
  extraProjectiles: number;
  extraPierce: number;
  knockbackMult: number;
  mobHpMult: number;
  mobSpeedMult: number;
  spawnRateMult: number;
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

  public liveBalance: LiveBalanceConfig = {
    weaponDamageMult: 0.8,
    weaponSpeedMult: 0.9,
    extraProjectiles: 0,
    extraPierce: 0,
    knockbackMult: 1.0,
    mobHpMult: 1.0,
    mobSpeedMult: 0.8,
    spawnRateMult: 0.8,
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public applyLiveBalance(ctx: DebugContext): void {
    const mods = ctx.gameState.playerModifiers;
    mods.damagePercentBonus = Number((this.liveBalance.weaponDamageMult - 1.0).toFixed(2));
    mods.attackSpeedBonus = Number((this.liveBalance.weaponSpeedMult - 1.0).toFixed(2));
    mods.multishotCount = 1 + this.liveBalance.extraProjectiles + (mods.tomeQuantity || 0);
    mods.pierceCount = this.liveBalance.extraPierce;
    mods.knockbackMultiplier = Number(this.liveBalance.knockbackMult.toFixed(2));

    ctx.spawnManager.debugHpMult = Number(this.liveBalance.mobHpMult.toFixed(2));
    ctx.spawnManager.debugSpeedMult = Number(this.liveBalance.mobSpeedMult.toFixed(2));
    ctx.spawnManager.debugSpawnRateMult = Number(this.liveBalance.spawnRateMult.toFixed(2));
    ctx.spawnManager.isSpawnPaused = this.isSpawnPaused;
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
      .text(centerX - boxW / 2 + 18, centerY - boxH / 2 + 22, 'ADMIN / BALANCE STUDIO', {
        fontSize: isMobile ? '12px' : '15px',
        fontStyle: 'bold',
        color: '#38bdf8',
        fontFamily: 'monospace',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(30002);
    this.elements.push(title);

    // Copy Config Button [📋 ЭКСПОРТ]
    const copyBtnX = centerX + boxW / 2 - 135;
    const copyBtnY = centerY - boxH / 2 + 22;
    const copyBtn = this.scene.add
      .rectangle(copyBtnX, copyBtnY, isMobile ? 120 : 160, 28, 0x16a34a, 0.95)
      .setStrokeStyle(1.5, 0x4ade80)
      .setScrollFactor(0)
      .setDepth(30002)
      .setInteractive({ useHandCursor: true });
    const copyText = this.scene.add
      .text(copyBtnX, copyBtnY, isMobile ? '📋 ЭКСПОРТ' : '📋 КОПИРОВАТЬ КОНФИГ', {
        fontSize: isMobile ? '10px' : '11px',
        fontStyle: 'bold',
        color: '#ffffff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30003);

    copyBtn.on('pointerdown', () => {
      const config = {
        weaponDamageMult: Number(this.liveBalance.weaponDamageMult.toFixed(2)),
        weaponSpeedMult: Number(this.liveBalance.weaponSpeedMult.toFixed(2)),
        extraProjectiles: this.liveBalance.extraProjectiles,
        extraPierce: this.liveBalance.extraPierce,
        knockbackMult: Number(this.liveBalance.knockbackMult.toFixed(2)),
        mobHpMult: Number(this.liveBalance.mobHpMult.toFixed(2)),
        mobSpeedMult: Number(this.liveBalance.mobSpeedMult.toFixed(2)),
        spawnRateMult: Number(this.liveBalance.spawnRateMult.toFixed(2)),
      };
      const json = JSON.stringify(config, null, 2);
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(json).catch(() => {});
      }
      copyText.setText('СКОПИРОВАНО!');
      copyBtn.setFillStyle(0x22c55e);
      this.scene.time.delayedCall(1500, () => {
        if (copyText.active) {
          copyText.setText(isMobile ? '📋 ЭКСПОРТ' : '📋 КОПИРОВАТЬ КОНФИГ');
          copyBtn.setFillStyle(0x16a34a);
        }
      });
    });
    this.elements.push(copyBtn, copyText);

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
      { id: 'weapons', label: 'БАЛАНС ОРУЖИЯ' },
      { id: 'spawn', label: 'БАЛАНС СПАВНА' },
      { id: 'cheats', label: 'ЧИТЫ И ПРОКАЧКА' },
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
    const leftX = centerX - w / 2;
    let curY = topY + 14;

    // --- Section 1: Live Balance Steppers ---
    const sec1Title = this.scene.add
      .text(leftX, curY, '⚙️ ЖИВЫЕ МОДИФИКАТОРЫ ОРУЖИЯ (ONLINE TUNING):', {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#38bdf8',
        fontFamily: 'monospace',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
    this.scrollContainer.add(sec1Title);
    curY += 24;

    const steppers = [
      {
        label: 'МНОЖИТЕЛЬ УРОНА',
        val: `${this.liveBalance.weaponDamageMult.toFixed(1)}x`,
        minus: () => {
          this.liveBalance.weaponDamageMult = Math.max(0.2, Number((this.liveBalance.weaponDamageMult - 0.1).toFixed(1)));
          this.applyLiveBalance(ctx);
          this.show(ctx);
        },
        plus: () => {
          this.liveBalance.weaponDamageMult = Math.min(5.0, Number((this.liveBalance.weaponDamageMult + 0.1).toFixed(1)));
          this.applyLiveBalance(ctx);
          this.show(ctx);
        },
        reset: () => {
          this.liveBalance.weaponDamageMult = 0.8;
          this.applyLiveBalance(ctx);
          this.show(ctx);
        },
      },
      {
        label: 'СКОРОСТЬ АТАКИ',
        val: `${this.liveBalance.weaponSpeedMult.toFixed(1)}x`,
        minus: () => {
          this.liveBalance.weaponSpeedMult = Math.max(0.2, Number((this.liveBalance.weaponSpeedMult - 0.1).toFixed(1)));
          this.applyLiveBalance(ctx);
          this.show(ctx);
        },
        plus: () => {
          this.liveBalance.weaponSpeedMult = Math.min(4.0, Number((this.liveBalance.weaponSpeedMult + 0.1).toFixed(1)));
          this.applyLiveBalance(ctx);
          this.show(ctx);
        },
        reset: () => {
          this.liveBalance.weaponSpeedMult = 0.9;
          this.applyLiveBalance(ctx);
          this.show(ctx);
        },
      },
      {
        label: 'ДОП. СНАРЯДЫ (MULTISHOT)',
        val: `+${this.liveBalance.extraProjectiles}`,
        minus: () => {
          this.liveBalance.extraProjectiles = Math.max(0, this.liveBalance.extraProjectiles - 1);
          this.applyLiveBalance(ctx);
          this.show(ctx);
        },
        plus: () => {
          this.liveBalance.extraProjectiles = Math.min(8, this.liveBalance.extraProjectiles + 1);
          this.applyLiveBalance(ctx);
          this.show(ctx);
        },
        reset: () => {
          this.liveBalance.extraProjectiles = 0;
          this.applyLiveBalance(ctx);
          this.show(ctx);
        },
      },
      {
        label: 'ПРОБИТИЕ (PIERCE)',
        val: `+${this.liveBalance.extraPierce}`,
        minus: () => {
          this.liveBalance.extraPierce = Math.max(0, this.liveBalance.extraPierce - 1);
          this.applyLiveBalance(ctx);
          this.show(ctx);
        },
        plus: () => {
          this.liveBalance.extraPierce = Math.min(10, this.liveBalance.extraPierce + 1);
          this.applyLiveBalance(ctx);
          this.show(ctx);
        },
        reset: () => {
          this.liveBalance.extraPierce = 0;
          this.applyLiveBalance(ctx);
          this.show(ctx);
        },
      },
      {
        label: 'ОТТАЛКИВАНИЕ (KNOCKBACK)',
        val: `${this.liveBalance.knockbackMult.toFixed(1)}x`,
        minus: () => {
          this.liveBalance.knockbackMult = Math.max(0.0, Number((this.liveBalance.knockbackMult - 0.2).toFixed(1)));
          this.applyLiveBalance(ctx);
          this.show(ctx);
        },
        plus: () => {
          this.liveBalance.knockbackMult = Math.min(4.0, Number((this.liveBalance.knockbackMult + 0.2).toFixed(1)));
          this.applyLiveBalance(ctx);
          this.show(ctx);
        },
        reset: () => {
          this.liveBalance.knockbackMult = 1.0;
          this.applyLiveBalance(ctx);
          this.show(ctx);
        },
      },
    ];

    steppers.forEach((s) => {
      const rowObjs = this.createStepperRow(leftX, curY, w, s.label, s.val, s.minus, s.plus, s.reset);
      this.scrollContainer!.add(rowObjs);
      curY += 36;
    });

    curY += 16;

    // --- Section 2: Weapons & Tomes Levels ---
    const weapons = ALL_UPGRADES.filter((u) => u.category === 'weapon');
    const tomes = ALL_UPGRADES.filter((u) => u.category === 'tome');

    const colW = isMobile ? w : (w - 20) / 2;
    const rightX = isMobile ? leftX : leftX + colW + 20;
    const rowH = 34;

    let leftY = curY + 24;
    let rightY = isMobile ? curY + 24 + (weapons.length + 1) * rowH + 20 : curY + 24;

    // --- Left Column Header: WEAPONS ---
    const wpnHeader = this.scene.add
      .text(leftX, curY + 6, `ОРУЖИЕ (${weapons.length})`, {
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

    // --- Col 1 & 2: Autoplay Bot & Diagnostics ---
    const isBotActive = ctx.autoplayBot?.isEnabled ?? false;
    const botBtn = this.createBigBtn(centerX - w / 4, leftY, colW, btnH, `АВТОБОТ (AI): ${isBotActive ? 'ON' : 'OFF'}`, isBotActive ? 0x16a34a : 0x475569, () => {
      ctx.autoplayBot?.toggle();
      this.show(ctx);
    });
    this.scrollContainer.add([botBtn.bg, botBtn.text]);
    leftY += btnH + gap;

    const reportBtn = this.createBigBtn(centerX + w / 4, rightY, colW, btnH, 'СКОПИРОВАТЬ ОТЧЕТ [БУФЕР]', 0x0284c7, () => {
      ctx.autoplayBot?.copyReportToClipboard();
      this.show(ctx);
    });
    this.scrollContainer.add([reportBtn.bg, reportBtn.text]);
    rightY += btnH + gap;

    const metrics = ctx.autoplayBot?.getMetrics();
    const metricsY = Math.max(leftY, rightY);
    const dpsText = `DPS: ${metrics?.currentDps ?? 0} (avg ${metrics?.averageDps ?? 0}) | Kills: ${metrics?.kills ?? 0} | Bugs: ${ctx.autoplayBot?.detectedBugs.length ?? 0}`;
    const statsLabel = this.scene.add
      .text(centerX, metricsY, dpsText, {
        fontSize: '11px',
        color: '#38bdf8',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.scrollContainer.add(statsLabel);

    return metricsY - topY + 28;
  }

  private renderSpawnTab(
    ctx: DebugContext,
    centerX: number,
    topY: number,
    w: number,
    _isMobile: boolean
  ): number {
    if (!this.scrollContainer) return 0;
    const leftX = centerX - w / 2;
    let curY = topY + 14;

    // --- Section 1: Live Enemy & Wave Steppers ---
    const sec1Title = this.scene.add
      .text(leftX, curY, '⚙️ ЖИВЫЕ МОДИФИКАТОРЫ ВРАГОВ И СПАВНА:', {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#f87171',
        fontFamily: 'monospace',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
    this.scrollContainer.add(sec1Title);
    curY += 24;

    const spawnSteppers = [
      {
        label: 'ЗДОРОВЬЕ ВРАГОВ (MOB HP)',
        val: `${this.liveBalance.mobHpMult.toFixed(1)}x`,
        minus: () => {
          this.liveBalance.mobHpMult = Math.max(0.2, Number((this.liveBalance.mobHpMult - 0.1).toFixed(1)));
          this.applyLiveBalance(ctx);
          this.show(ctx);
        },
        plus: () => {
          this.liveBalance.mobHpMult = Math.min(5.0, Number((this.liveBalance.mobHpMult + 0.1).toFixed(1)));
          this.applyLiveBalance(ctx);
          this.show(ctx);
        },
        reset: () => {
          this.liveBalance.mobHpMult = 1.0;
          this.applyLiveBalance(ctx);
          this.show(ctx);
        },
      },
      {
        label: 'СКОРОСТЬ ВРАГОВ (SPEED)',
        val: `${this.liveBalance.mobSpeedMult.toFixed(1)}x`,
        minus: () => {
          this.liveBalance.mobSpeedMult = Math.max(0.2, Number((this.liveBalance.mobSpeedMult - 0.1).toFixed(1)));
          this.applyLiveBalance(ctx);
          this.show(ctx);
        },
        plus: () => {
          this.liveBalance.mobSpeedMult = Math.min(3.0, Number((this.liveBalance.mobSpeedMult + 0.1).toFixed(1)));
          this.applyLiveBalance(ctx);
          this.show(ctx);
        },
        reset: () => {
          this.liveBalance.mobSpeedMult = 0.8;
          this.applyLiveBalance(ctx);
          this.show(ctx);
        },
      },
      {
        label: 'ПЛОТНОСТЬ СПАВНА (DENSITY)',
        val: `${this.liveBalance.spawnRateMult.toFixed(1)}x`,
        minus: () => {
          this.liveBalance.spawnRateMult = Math.max(0.2, Number((this.liveBalance.spawnRateMult - 0.1).toFixed(1)));
          this.applyLiveBalance(ctx);
          this.show(ctx);
        },
        plus: () => {
          this.liveBalance.spawnRateMult = Math.min(4.0, Number((this.liveBalance.spawnRateMult + 0.1).toFixed(1)));
          this.applyLiveBalance(ctx);
          this.show(ctx);
        },
        reset: () => {
          this.liveBalance.spawnRateMult = 0.8;
          this.applyLiveBalance(ctx);
          this.show(ctx);
        },
      },
    ];

    spawnSteppers.forEach((s) => {
      const rowObjs = this.createStepperRow(leftX, curY, w, s.label, s.val, s.minus, s.plus, s.reset);
      this.scrollContainer!.add(rowObjs);
      curY += 36;
    });

    curY += 16;

    // --- Section 2: Spawn Shortcuts & Time Control ---
    const colW = (w - 20) / 2;
    let leftY = curY + 24;
    let rightY = curY + 24;
    const btnH = 36;
    const gap = 10;

    // Col 1: Spawn Specific Entities
    const spawnTitle = this.scene.add
      .text(centerX - w / 4, curY + 6, 'ТОЧЕЧНЫЙ СПАВН:', {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#eab308',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0);
    this.scrollContainer.add(spawnTitle);

    const chestBtn = this.createBigBtn(centerX - w / 4, leftY, colW, btnH, 'СУНДУК МУТАЦИИ', 0xeab308, () => {
      ctx.lootSystem.spawnChest(ctx.player.x, ctx.player.y - 40);
      this.hide(ctx);
    });
    this.scrollContainer.add([chestBtn.bg, chestBtn.text]);
    leftY += btnH + gap;

    const champBtn = this.createBigBtn(centerX - w / 4, leftY, colW, btnH, 'СПАВН ЧЕМПИОНА', 0x854d0e, () => {
      const pos = ctx.spawnManager.getScreenPerimeterPosition();
      ctx.spawnManager.spawnDirect(ARMORED_SLUG, pos.x, pos.y, { hpMultiplier: 4.2, speedMultiplier: 1.1, damageMultiplier: 1.25 }, true);
      this.hide(ctx);
    });
    this.scrollContainer.add([champBtn.bg, champBtn.text]);
    leftY += btnH + gap;

    const runnerBtn = this.createBigBtn(centerX - w / 4, leftY, colW, btnH, 'ЗОЛОТОЙ БЕГУНЕЦ', 0xca8a04, () => {
      const pos = ctx.spawnManager.getScreenPerimeterPosition();
      ctx.spawnManager.spawnDirect(SPRINTER_BUG, pos.x, pos.y, { hpMultiplier: 3.5, speedMultiplier: 1.25, damageMultiplier: 0.5 }, true);
      this.hide(ctx);
    });
    this.scrollContainer.add([runnerBtn.bg, runnerBtn.text]);
    leftY += btnH + gap;

    const ratBtn = this.createBigBtn(centerX - w / 4, leftY, colW, btnH, 'МИНИ-БОСС ХРЯКОГЛОТ (5:00)', 0x9f1239, () => {
      const pos = ctx.spawnManager.getScreenPerimeterPosition();
      ctx.spawnManager.spawnDirect(MINI_BOSS_ELITE, pos.x, pos.y, { hpMultiplier: 2.0, speedMultiplier: 1.0, damageMultiplier: 1.0 }, false);
      this.hide(ctx);
    });
    this.scrollContainer.add([ratBtn.bg, ratBtn.text]);
    leftY += btnH + gap;

    const bossBtn = this.createBigBtn(centerX - w / 4, leftY, colW, btnH, 'БОСС КУРГАН (8:00)', 0x7f1d1d, () => {
      const pos = ctx.spawnManager.getScreenPerimeterPosition();
      ctx.spawnManager.spawnDirect(BOSS_KURGAN, pos.x, pos.y, { hpMultiplier: 3.0, speedMultiplier: 1.0, damageMultiplier: 1.0 }, false);
      this.hide(ctx);
    });
    this.scrollContainer.add([bossBtn.bg, bossBtn.text]);
    leftY += btnH + gap;

    // Col 2: Time & Wave State
    const timeTitle = this.scene.add
      .text(centerX + w / 4, curY + 6, 'ВРЕМЯ ЗАБЕГА И СПАВНЕР:', {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#38bdf8',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0);
    this.scrollContainer.add(timeTitle);

    const t1Btn = this.createBigBtn(centerX + w / 4, rightY, colW, btnH, 'ВРЕМЯ: +1 МИНУТА', 0x0284c7, () => {
      ctx.gameState.runTime += 60;
      this.show(ctx);
    });
    this.scrollContainer.add([t1Btn.bg, t1Btn.text]);
    rightY += btnH + gap;

    const t3Btn = this.createBigBtn(centerX + w / 4, rightY, colW, btnH, 'ВРЕМЯ: +3 МИНУТЫ', 0x0369a1, () => {
      ctx.gameState.runTime += 180;
      this.show(ctx);
    });
    this.scrollContainer.add([t3Btn.bg, t3Btn.text]);
    rightY += btnH + gap;

    const t5Btn = this.createBigBtn(centerX + w / 4, rightY, colW, btnH, 'ВРЕМЯ: +5 МИНУТ', 0x075985, () => {
      ctx.gameState.runTime += 300;
      this.show(ctx);
    });
    this.scrollContainer.add([t5Btn.bg, t5Btn.text]);
    rightY += btnH + gap;

    const toggleSpawnBtn = this.createBigBtn(
      centerX + w / 4,
      rightY,
      colW,
      btnH,
      `СПАВН: ${this.isSpawnPaused ? 'ПАУЗА' : 'АКТИВЕН'}`,
      this.isSpawnPaused ? 0xdc2626 : 0x16a34a,
      () => {
        this.isSpawnPaused = !this.isSpawnPaused;
        ctx.spawnManager.isSpawnPaused = this.isSpawnPaused;
        this.show(ctx);
      }
    );
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

  private createStepperRow(
    x: number,
    y: number,
    w: number,
    label: string,
    valStr: string,
    onMinus: () => void,
    onPlus: () => void,
    onReset: () => void
  ): Phaser.GameObjects.GameObject[] {
    const isMobile = this.scene.cameras.main.width < 760;
    const labelW = isMobile ? Math.floor(w * 0.44) : Math.floor(w * 0.50);
    const btnW = isMobile ? 32 : 38;
    const btnH = 26;
    const valW = isMobile ? 55 : 68;

    const rowBg = this.scene.add
      .rectangle(x + w / 2, y, w, 32, 0x111827, 0.85)
      .setStrokeStyle(1, 0x374151)
      .setScrollFactor(0);

    const titleText = this.scene.add
      .text(x + 8, y, label, {
        fontSize: isMobile ? '10px' : '11px',
        fontStyle: 'bold',
        color: '#f1f5f9',
        fontFamily: 'monospace',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0);

    const minusBtn = this.createSmallBtn(x + labelW + btnW / 2, y, '-', 0xdc2626, onMinus, btnW, btnH);

    const valText = this.scene.add
      .text(x + labelW + btnW + valW / 2, y, valStr, {
        fontSize: '11.5px',
        fontStyle: 'bold',
        color: '#facc15',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0);

    const plusBtn = this.createSmallBtn(x + labelW + btnW + valW + btnW / 2, y, '+', 0x16a34a, onPlus, btnW, btnH);

    const resetBtn = this.createSmallBtn(x + w - 20, y, 'R', 0x475569, onReset, 26, btnH);

    return [rowBg, titleText, minusBtn.bg, minusBtn.text, valText, plusBtn.bg, plusBtn.text, resetBtn.bg, resetBtn.text];
  }

  public hide(ctx: DebugContext): void {
    this.applyLiveBalance(ctx);
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
