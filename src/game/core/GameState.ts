import { EventBus } from './EventBus';
import { SaveManager } from './SaveManager';
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
  public nextLevelXp = 23; // Level 2 requires 23 XP (calculateXpForLevel(1))

  // Dynamic weapon & tome slots (from SaveManager meta-upgrades)
  public maxWeaponSlots = 2;
  public maxTomeSlots = 2;

  // Selected upgrades in current run (activeUpgrades maps upgradeId -> current level 1..5)
  public activeUpgrades: Map<string, number> = new Map();
  public selectedUpgrades: string[] = [];
  public playerModifiers: PlayerModifiers = this.createDefaultModifiers();

  // Current selected hero
  public currentHeroId = 'hero_vypolzok';

  // Pending level ups waiting for modal choice
  public pendingLevelUps = 0;

  // Reroll & Skip Limits per Run
  public rerollsRemaining = 2;
  public skipsRemaining = 2;

  private constructor() {}

  static getInstance(): GameState {
    if (!GameState.instance) {
      GameState.instance = new GameState();
    }
    return GameState.instance;
  }

  public powerWindowTimerMs = 0;

  public triggerPowerWindow(durationMs = 40000): void {
    this.powerWindowTimerMs = durationMs;
  }

  public updatePowerWindow(deltaMs: number): void {
    if (this.powerWindowTimerMs > 0) {
      this.powerWindowTimerMs = Math.max(0, this.powerWindowTimerMs - deltaMs);
    }
  }

  public getPowerScore(): number {
    let score = (this.level - 1) * 0.25;
    const utilityTomes = new Set<string>([
      'tome_speed',
      'tome_magnet',
      'tome_armor',
      'tome_hp_regen',
      'tome_lifesteal',
    ]);
    for (const [id, lvl] of this.activeUpgrades.entries()) {
      if (id.startsWith('evo_')) {
        score += 8.0; // Evolution represents massive power jump
      } else if (utilityTomes.has(id)) {
        score += lvl * 0.3;
      } else {
        score += lvl * 1.2;
      }
    }
    const multishotMult = this.playerModifiers.multishotCount > 1 ? (1 + (this.playerModifiers.multishotCount - 1) * 0.4) : 1;
    const combatMult = (1 + this.playerModifiers.damagePercentBonus * 0.5) * (1 + this.playerModifiers.attackSpeedBonus * 0.5) * multishotMult;
    score *= combatMult;
    return Math.max(1, Math.round(score * 10) / 10);
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
      healOnKillCooldownMs: 0,
      healOnKillTimerMs: 0,
      executeFodderChance: 0,
      berserkOnKillTimer: 0,
      lowHpDmgThreshold: 0.5,
      lowHpDmgBonus: 0,
      fireAuraLowHp: false,
      cheatDeathUsed: false,
      cheatDeathUnlocked: false,
      fatSpitScale: 1.0,
      extraRange: 0,
      magnetRadiusBonus: 0,
      attackAreaBonus: 0,
      moveSpeedBonus: 0,
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
      hasSlimeTrail: false,
      toiletLidLevel: 0,
      toiletLidBounces: 3,
      toiletLidSlimeTrail: false,

      damageReductionPercent: 0,

      // Global Tomes
      tomeQuantity: 0,
      tomeSpeed: 0,
      tomeAttackSpeed: 0,
      tomeArmor: 0,
      tomeHpRegen: 0,
      tomeLifesteal: 0,
      tomeMagnet: 0,
      tomeDamage: 0,
      tomeCrit: 0,
      tomeCritSize: 0,
      tomeArea: 0,

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

  private activateWeapon(upgradeId: string): void {
    this.activeUpgrades.set(upgradeId, 1);
    if (!this.selectedUpgrades.includes(upgradeId)) this.selectedUpgrades.push(upgradeId);
  }

  public applyStartingWeapon(startingWeaponId: string): void {
    switch (startingWeaponId) {
      case 'weapon_slime_spit':
        this.playerModifiers.slimeSpitLevel = 1;
        this.activateWeapon('wpn_slime_spit');
        break;
      case 'weapon_lace_whip':
        this.playerModifiers.laceWhipLevel = 1;
        this.activateWeapon('wpn_lace_whip');
        break;
      case 'weapon_carrot_barrage':
        this.playerModifiers.carrotBarrageLevel = 1;
        this.activateWeapon('wpn_carrot_barrage');
        break;
      case 'weapon_eggplant_roll':
        this.playerModifiers.eggplantRollLevel = 1;
        this.activateWeapon('wpn_eggplant_roll');
        break;
      case 'weapon_homing_daggers':
        this.playerModifiers.homingDaggersLevel = 1;
        this.playerModifiers.homingDaggersCount = 2;
        this.activateWeapon('wpn_homing_daggers');
        break;
      case 'weapon_mega_boot':
        this.playerModifiers.megaBootLevel = 1;
        this.activateWeapon('wpn_mega_boot');
        break;
      case 'weapon_lightning_zap':
        this.playerModifiers.lightningZapLevel = 1;
        this.playerModifiers.staticZapMax = 100;
        this.activateWeapon('wpn_lightning_zap');
        break;
      case 'weapon_acid_trail':
        this.playerModifiers.acidTrail = true;
        this.playerModifiers.acidTrailLevel = 1;
        this.activateWeapon('wpn_acid_trail');
        break;
      default:
        // Default to homing daggers if unknown
        this.playerModifiers.homingDaggersLevel = 1;
        this.playerModifiers.homingDaggersCount = 2;
        this.activateWeapon('wpn_homing_daggers');
        break;
    }
  }

  reset(): void {
    const saveManager = SaveManager.getInstance();
    this.maxWeaponSlots = saveManager.getMaxWeaponSlots();
    this.maxTomeSlots = saveManager.getMaxTomeSlots();
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
    this.powerWindowTimerMs = 0;
    this.pendingLevelUps = 0;
    this.rerollsRemaining = saveManager.getMaxRerolls();
    this.skipsRemaining = saveManager.getMaxSkips();
  }

  public getActiveWeapons(pool: UpgradeDefinition[]): string[] {
    const list: string[] = [];
    for (const [id, lvl] of this.activeUpgrades.entries()) {
      if (lvl > 0) {
        const isWeapon = pool.find((u) => u.id === id)?.category === 'weapon' || id.startsWith('evo_');
        if (isWeapon) list.push(id);
      }
    }
    return list;
  }

  public getActiveTomes(pool: UpgradeDefinition[]): string[] {
    const list: string[] = [];
    for (const [id, lvl] of this.activeUpgrades.entries()) {
      if (lvl > 0 && pool.find((u) => u.id === id)?.category === 'tome') {
        list.push(id);
      }
    }
    return list;
  }

  public isWeaponSlotsFull(pool: UpgradeDefinition[]): boolean {
    return this.getActiveWeapons(pool).length >= this.maxWeaponSlots;
  }

  public isTomeSlotsFull(pool: UpgradeDefinition[]): boolean {
    return this.getActiveTomes(pool).length >= this.maxTomeSlots;
  }

  /**
   * Continuous power curve progression calibrated for 10-12 min session:
   * XP(lvl) = Math.round(14 + Math.pow(lvl, 1.84) * 9.4)
   * - L1 -> L2: 23 XP
   * - Level 5 milestone: ~1:45 (291 cumulative XP)
   * - Level 15 milestone: ~5:20 (1,335 cumulative XP)
   * - Level 28-30 endgame: ~10:00 (full build maxed out)
   */
  public calculateXpForLevel(lvl: number): number {
    const n = Math.max(1, Math.floor(lvl));
    return Math.round(14 + Math.pow(n, 1.84) * 9.4);
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
    const isWpnFull = this.isWeaponSlotsFull(pool);
    const isTomeFull = this.isTomeSlotsFull(pool);

    for (const upg of normalMutations) {
      // Class exclusivity check
      if (upg.exclusiveHeroId) {
        const canonicalHeroId = this.currentHeroId === 'hero_worm' ? 'hero_vypolzok' : this.currentHeroId;
        if (upg.exclusiveHeroId !== canonicalHeroId) {
          continue;
        }
      }

      const currentLvl = this.activeUpgrades.get(upg.id) || 0;
      if (currentLvl >= upg.maxLevel) continue; // MAX level reached

      if (currentLvl === 0) {
        // New item: respect specific category slot cap
        if (upg.category === 'weapon' && isWpnFull) continue;
        if (upg.category === 'tome' && isTomeFull) continue;
        eligible.push({ upgrade: upg, levelToApply: 1 });
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
      if (upgrade.category === 'weapon' && levelToApply >= upgrade.maxLevel) {
        this.triggerPowerWindow(40000);
      }
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
