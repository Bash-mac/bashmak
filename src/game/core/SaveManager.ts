import { META_POWERUPS } from '../data/metaUpgrades';
import type { StatsComponent } from '../entities/components/StatsComponent';
import type { HealthComponent } from '../entities/components/HealthComponent';
import type { PlayerModifiers } from '../data/definitions';

export interface SaveData {
  goo: number;
  powerUps: Record<string, number>;
  unlockedHeroIds: string[];
  stats: {
    totalRuns: number;
    totalKills: number;
    totalGooEarned: number;
    bestSurvivalTimeSec: number;
    bestKills: number;
    bestScore: number;
  };
}

const SAVE_KEY = 'bashmak_save_v1';

export class SaveManager {
  private static instance: SaveManager;
  private data: SaveData;

  private constructor() {
    this.data = this.load();
  }

  public static getInstance(): SaveManager {
    if (!SaveManager.instance) {
      SaveManager.instance = new SaveManager();
    }
    return SaveManager.instance;
  }

  private getDefaultData(): SaveData {
    return {
      goo: 0,
      powerUps: {},
      unlockedHeroIds: ['hero_worm'],
      stats: {
        totalRuns: 0,
        totalKills: 0,
        totalGooEarned: 0,
        bestSurvivalTimeSec: 0,
        bestKills: 0,
        bestScore: 0,
      },
    };
  }

  public load(): SaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...this.getDefaultData(),
          ...parsed,
          powerUps: parsed.powerUps || {},
          stats: {
            ...this.getDefaultData().stats,
            ...(parsed.stats || {}),
          },
        };
      }
    } catch (e) {
      console.warn('[SaveManager] Failed to read save from localStorage:', e);
    }
    return this.getDefaultData();
  }

  public save(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('[SaveManager] Failed to write save to localStorage:', e);
    }
  }

  public getGoo(): number {
    return this.data.goo;
  }

  public addGoo(amount: number): void {
    const validAmount = Math.max(0, Math.round(amount));
    this.data.goo += validAmount;
    this.data.stats.totalGooEarned += validAmount;
    this.save();
  }

  public spendGoo(amount: number): boolean {
    if (this.data.goo >= amount) {
      this.data.goo -= amount;
      this.save();
      return true;
    }
    return false;
  }

  public getPowerUpLevel(id: string): number {
    return this.data.powerUps[id] || 0;
  }

  public buyPowerUp(id: string): boolean {
    const def = META_POWERUPS.find((p) => p.id === id);
    if (!def) return false;

    const currentLvl = this.getPowerUpLevel(id);
    if (currentLvl >= def.maxLevel) return false;

    const cost = def.getCost(currentLvl);
    if (this.spendGoo(cost)) {
      this.data.powerUps[id] = currentLvl + 1;
      this.save();
      return true;
    }
    return false;
  }

  public getTotalSpentGoo(): number {
    let total = 0;
    for (const def of META_POWERUPS) {
      const lvl = this.getPowerUpLevel(def.id);
      for (let i = 0; i < lvl; i++) {
        total += def.getCost(i);
      }
    }
    return total;
  }

  public refundAll(): number {
    const refundAmount = this.getTotalSpentGoo();
    this.data.goo += refundAmount;
    this.data.powerUps = {};
    this.save();
    return refundAmount;
  }

  /**
   * Applies permanent powerups to the hero entity and run modifiers.
   */
  public applyToPlayerStats(
    baseStats: StatsComponent,
    healthComp: HealthComponent,
    modifiers: PlayerModifiers
  ): void {
    // 1. Max HP
    const hpLvl = this.getPowerUpLevel('power_hp');
    if (hpLvl > 0) {
      const bonusHp = hpLvl * 15;
      baseStats.maxHp += bonusHp;
      healthComp.maxHp += bonusHp;
      healthComp.currentHp = healthComp.maxHp;
    }

    // 2. Move Speed
    const speedLvl = this.getPowerUpLevel('power_speed');
    if (speedLvl > 0) {
      baseStats.speed = Math.round(baseStats.speed * (1 + speedLvl * 0.06));
    }

    // 3. Heavy Slap / Damage
    const dmgLvl = this.getPowerUpLevel('power_damage');
    if (dmgLvl > 0) {
      modifiers.damagePercentBonus += dmgLvl * 0.08;
    }

    // 4. Snot Magnet / Pickup Range
    const magnetLvl = this.getPowerUpLevel('power_magnet');
    if (magnetLvl > 0) {
      modifiers.tomeMagnet += magnetLvl * 0.25;
    }

    // 5. HP Regen
    const regenLvl = this.getPowerUpLevel('power_regen');
    if (regenLvl > 0) {
      modifiers.hpRegenPerSec += regenLvl * 0.5;
    }

    // 6. Second Chance / Revive
    const reviveLvl = this.getPowerUpLevel('power_revive');
    if (reviveLvl > 0) {
      modifiers.cheatDeathUnlocked = true;
      modifiers.cheatDeathUsed = false;
    }
  }

  public getGreedMultiplier(): number {
    const greedLvl = this.getPowerUpLevel('power_greed');
    return 1 + greedLvl * 0.15;
  }

  public recordRunResult(result: {
    timeSurvived: number;
    kills: number;
    score: number;
    gooEarned: number;
    won: boolean;
  }): void {
    this.data.stats.totalRuns += 1;
    this.data.stats.totalKills += result.kills;
    this.data.stats.bestSurvivalTimeSec = Math.max(
      this.data.stats.bestSurvivalTimeSec,
      result.timeSurvived
    );
    this.data.stats.bestKills = Math.max(this.data.stats.bestKills, result.kills);
    this.data.stats.bestScore = Math.max(this.data.stats.bestScore, result.score);
    this.addGoo(result.gooEarned);
  }
}
