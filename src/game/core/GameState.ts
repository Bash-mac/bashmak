import { EventBus } from './EventBus';
import type { PlayerModifiers, UpgradeDefinition } from '../data/definitions';
import type { StatsComponent } from '../entities/components/StatsComponent';
import type { HealthComponent } from '../entities/components/HealthComponent';

export class GameState {
  private static instance: GameState;

  // Run statistics
  public runTime = 0; // In seconds
  public kills = 0;
  public score = 0;
  public gooCollected = 0;
  public isGameOver = false;

  // Progression
  public level = 1;
  public currentXp = 0;
  public nextLevelXp = 5; // Level 2 requires 5 XP

  // Selected upgrades in current run (activeUpgrades maps upgradeId -> current level 1..5)
  public activeUpgrades: Map<string, number> = new Map();
  public selectedUpgrades: string[] = [];
  public playerModifiers: PlayerModifiers = this.createDefaultModifiers();

  // Pending level ups waiting for modal choice
  public pendingLevelUps = 0;

  private constructor() {}

  static getInstance(): GameState {
    if (!GameState.instance) {
      GameState.instance = new GameState();
    }
    return GameState.instance;
  }

  private createDefaultModifiers(): PlayerModifiers {
    return {
      doubleSpitChance: 0,
      multishotCount: 1,
      bounceCount: 0,
      attackSpeedBonus: 0,
      burstFireCount: 1,
      splashRadius: 0,
      splashPercent: 0,
      splashKnockback: false,
      knockbackMultiplier: 1.0,
      splashStun: false,
      poisonSalivaDmg: 0,
      poisonDurationMs: 3000,
      poisonExplodeOnDeath: false,
      poisonSpreadOnDeath: false,
      slowPercent: 0,
      slowDurationMs: 2000,
      spawnSlimePuddles: false,
      slimePuddleDps: 0,
      pierceCount: 0,
      fullDamagePierce: false,
      armorShred: 0,
      damagePercentBonus: 0,
      critChance: 0,
      critMultiplier: 2.0,
      executeLowHpThreshold: 0,
      hpRegenPerSec: 0,
      chitinShieldOnHit: false,
      healOnKill: 0,
      executeFodderChance: 0,
      berserkOnKillTimer: 0,
      lowHpDmgThreshold: 0.5,
      lowHpDmgBonus: 0,
      fireAuraLowHp: false,
      cheatDeathUsed: false,
      cheatDeathUnlocked: false,
      fatSpitScale: 1.0,
      extraRange: 0,
      wriggleDash: false,
      acidTrail: false,

      // Active Weapons
      slimeSpitLevel: 0,
      laceWhipLevel: 0,
      carrotBarrageLevel: 0,
      eggplantRollLevel: 0,
      homingDaggersLevel: 0,
      homingDaggersCount: 1,
      megaBootLevel: 0,
      lightningZapLevel: 0,
      staticZapCharge: 0,
      staticZapMax: 100,
      acidTrailLevel: 0,
      acidTrailDps: 0,
      hasSlimeTrail: false,

      // Global Tomes
      tomeQuantity: 0,
      tomeSpeed: 0,
      tomeMagnet: 0,
      tomeCritSize: 0,

      // Hero Trait Runtime State
      standStillTimerMs: 0,
      standStillBonusActive: false,
      killStreakStacks: 0,
      killStreakTimerMs: 0,
      momentumSpeedBonus: 0,
      straightRunTimerMs: 0,

      // Super Evolutions
      isAcidTsunamiEvolved: false,
      isTyphoonFlailEvolved: false,
      isGatlingCarrotEvolved: false,
      isPlanetaryRollEvolved: false,
    };
  }

  public applyStartingWeapon(startingWeaponId: string): void {
    switch (startingWeaponId) {
      case 'weapon_slime_spit':
        this.playerModifiers.slimeSpitLevel = 1;
        this.activeUpgrades.set('wpn_slime_spit', 1);
        if (!this.selectedUpgrades.includes('wpn_slime_spit')) {
          this.selectedUpgrades.push('wpn_slime_spit');
        }
        break;
      case 'weapon_lace_whip':
        this.playerModifiers.laceWhipLevel = 1;
        this.activeUpgrades.set('wpn_lace_whip', 1);
        if (!this.selectedUpgrades.includes('wpn_lace_whip')) {
          this.selectedUpgrades.push('wpn_lace_whip');
        }
        break;
      case 'weapon_carrot_barrage':
        this.playerModifiers.carrotBarrageLevel = 1;
        this.activeUpgrades.set('wpn_carrot_barrage', 1);
        if (!this.selectedUpgrades.includes('wpn_carrot_barrage')) {
          this.selectedUpgrades.push('wpn_carrot_barrage');
        }
        break;
      case 'weapon_eggplant_roll':
        this.playerModifiers.eggplantRollLevel = 1;
        this.activeUpgrades.set('wpn_eggplant_roll', 1);
        if (!this.selectedUpgrades.includes('wpn_eggplant_roll')) {
          this.selectedUpgrades.push('wpn_eggplant_roll');
        }
        break;
      case 'weapon_homing_daggers':
        this.playerModifiers.homingDaggersLevel = 1;
        this.playerModifiers.homingDaggersCount = 2;
        this.activeUpgrades.set('wpn_homing_daggers', 1);
        if (!this.selectedUpgrades.includes('wpn_homing_daggers')) {
          this.selectedUpgrades.push('wpn_homing_daggers');
        }
        break;
      case 'weapon_mega_boot':
        this.playerModifiers.megaBootLevel = 1;
        this.activeUpgrades.set('wpn_mega_boot', 1);
        if (!this.selectedUpgrades.includes('wpn_mega_boot')) {
          this.selectedUpgrades.push('wpn_mega_boot');
        }
        break;
      case 'weapon_lightning_zap':
        this.playerModifiers.lightningZapLevel = 1;
        this.playerModifiers.staticZapMax = 100;
        this.activeUpgrades.set('wpn_lightning_zap', 1);
        if (!this.selectedUpgrades.includes('wpn_lightning_zap')) {
          this.selectedUpgrades.push('wpn_lightning_zap');
        }
        break;
      case 'weapon_acid_trail':
        this.playerModifiers.acidTrail = true;
        this.playerModifiers.acidTrailLevel = 1;
        this.playerModifiers.acidTrailDps = 15;
        this.activeUpgrades.set('wpn_acid_trail', 1);
        if (!this.selectedUpgrades.includes('wpn_acid_trail')) {
          this.selectedUpgrades.push('wpn_acid_trail');
        }
        break;
      default:
        // Default to homing daggers if unknown
        this.playerModifiers.homingDaggersLevel = 1;
        this.playerModifiers.homingDaggersCount = 2;
        this.activeUpgrades.set('wpn_homing_daggers', 1);
        if (!this.selectedUpgrades.includes('wpn_homing_daggers')) {
          this.selectedUpgrades.push('wpn_homing_daggers');
        }
        break;
    }
  }

  reset(): void {
    this.runTime = 0;
    this.kills = 0;
    this.score = 0;
    this.gooCollected = 0;
    this.isGameOver = false;
    this.level = 1;
    this.currentXp = 0;
    this.nextLevelXp = this.calculateXpForLevel(1);
    this.activeUpgrades.clear();
    this.selectedUpgrades = [];
    this.playerModifiers = this.createDefaultModifiers();
    this.pendingLevelUps = 0;
  }

  /**
   * Exact Vampire Survivors XP Formula:
   * Level 1-20: 5 + (n - 1) * 10
   * Level 21-40: XP(20) + (n - 20) * 13
   * Level 41+: XP(40) + (n - 40) * 16 + (n - 40)^1.1
   */
  public calculateXpForLevel(lvl: number): number {
    const n = Math.max(1, lvl);
    // Smooth power curve: Lvl 1: 15, Lvl 3: 40, Lvl 6: 120, Lvl 10: 380, Lvl 15: 850, Lvl 20: 1550
    return Math.round(12 + Math.pow(n, 1.75) * 8.5);
  }

  updateTime(deltaSeconds: number): void {
    if (this.isGameOver) return;
    this.runTime += deltaSeconds;
  }

  addXp(amount: number): void {
    if (this.isGameOver) return;
    this.currentXp += amount;
    const bus = EventBus.getInstance();

    while (this.currentXp >= this.nextLevelXp) {
      this.currentXp -= this.nextLevelXp;
      this.level += 1;
      this.pendingLevelUps += 1;
      this.nextLevelXp = this.calculateXpForLevel(this.level);
      bus.emit('player:levelUp', { newLevel: this.level });
    }

    bus.emit('xp:gained', {
      amount,
      totalXp: this.currentXp,
      level: this.level,
      nextLevelXp: this.nextLevelXp,
    });
  }

  getEligibleUpgrades(
    pool: UpgradeDefinition[],
    count = 3
  ): { upgrade: UpgradeDefinition; levelToApply: number }[] {
    const normalMutations = pool.filter((u) => !u.isConsumable);
    const consumables = pool.filter((u) => u.isConsumable);

    const eligible: { upgrade: UpgradeDefinition; levelToApply: number }[] = [];
    const isSlotLimitReached = this.activeUpgrades.size >= 4;

    for (const upg of normalMutations) {
      const currentLvl = this.activeUpgrades.get(upg.id) || 0;
      if (currentLvl >= upg.maxLevel) continue; // MAX level reached

      if (currentLvl === 0) {
        // New mutation: allowed ONLY if slots limit (4) is not reached
        if (!isSlotLimitReached) {
          eligible.push({ upgrade: upg, levelToApply: 1 });
        }
      } else {
        // Upgrade existing mutation
        eligible.push({ upgrade: upg, levelToApply: currentLvl + 1 });
      }
    }

    // Shuffle eligible list
    const shuffled = [...eligible].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, count);

    // Fill remaining slots with consumables if needed
    while (picked.length < count && consumables.length > 0) {
      const cons = consumables[Math.floor(Math.random() * consumables.length)];
      picked.push({ upgrade: cons, levelToApply: 1 });
    }

    return picked;
  }

  applyUpgrade(
    upgrade: UpgradeDefinition,
    playerStats: StatsComponent,
    playerHealth: HealthComponent,
    levelToApply = 1
  ): void {
    if (upgrade.isConsumable) {
      if (upgrade.id === 'upg_score_pack') {
        this.score += 150;
      }
      upgrade.levels[0]?.apply(this.playerModifiers, playerStats, playerHealth);
    } else {
      this.activeUpgrades.set(upgrade.id, levelToApply);
      const levelConfig = upgrade.levels.find((l) => l.level === levelToApply);
      if (levelConfig) {
        levelConfig.apply(this.playerModifiers, playerStats, playerHealth);
      }
      if (!this.selectedUpgrades.includes(upgrade.id)) {
        this.selectedUpgrades.push(upgrade.id);
      }
    }

    if (this.pendingLevelUps > 0) {
      this.pendingLevelUps -= 1;
    }
  }

  recordKill(): void {
    this.kills += 1;
    this.score += 100;
  }

  addGoo(amount: number): void {
    if (this.isGameOver) return;
    this.gooCollected += amount;
    EventBus.getInstance().emit('goo:gained', {
      amount,
      totalRunGoo: this.gooCollected,
    });
  }

  endRun(won = false): void {
    if (this.isGameOver) return;
    this.isGameOver = true;
    EventBus.getInstance().emit('run:ended', {
      won,
      timeSurvived: Math.floor(this.runTime),
      kills: this.kills,
      level: this.level,
      score: this.score,
      gooCollected: this.gooCollected,
    });
  }
}
