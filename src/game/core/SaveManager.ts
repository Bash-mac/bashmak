import { META_POWERUPS } from '../data/metaUpgrades';
import { BALANCE_CONFIG } from '../data/balanceConfig';
import type { StatsComponent } from '../entities/components/StatsComponent';
import type { HealthComponent } from '../entities/components/HealthComponent';
import type { PlayerModifiers } from '../data/definitions';
import { GameApiClient } from '../../api/GameApiClient';
import type { ServerPlayerProfile } from '../../api/types';

export interface SaveData {
  goo: number;
  powerUps: Record<string, number>;
  unlockedHeroIds: string[];
  selectedHeroId: string;
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
  private apiClient: GameApiClient;
  private activeRunId: string | null = null;
  public lastRunWasRecord = false;

  private constructor() {
    this.apiClient = GameApiClient.getInstance();
    this.data = this.load();
  }

  public static getInstance(): SaveManager {
    if (!SaveManager.instance) {
      SaveManager.instance = new SaveManager();
    }
    return SaveManager.instance;
  }

  /**
   * Hydrate state from server if authenticated.
   */
  public async syncWithServer(): Promise<void> {
    try {
      if (this.apiClient.isAuthenticated()) {
        const profile = await this.apiClient.fetchProfile();
        this.hydrateFromProfile(profile);
      }
    } catch (e) {
      console.warn('[SaveManager] Server sync failed, using local cache:', e);
    }
  }

  public hydrateFromProfile(profile: ServerPlayerProfile): void {
    this.data = {
      goo: profile.goo,
      powerUps: { ...profile.powerUps },
      unlockedHeroIds: [...profile.unlockedHeroIds],
      selectedHeroId: profile.selectedHeroId,
      stats: {
        totalRuns: profile.stats.totalRuns,
        totalKills: profile.stats.totalKills,
        totalGooEarned: profile.stats.totalGooEarned,
        bestSurvivalTimeSec: profile.stats.bestSurvivalTimeSec,
        bestKills: profile.stats.bestKills,
        bestScore: profile.stats.bestScore,
      },
    };
    this.save();
  }

  private getDefaultData(): SaveData {
    return {
      goo: 0,
      powerUps: {},
      unlockedHeroIds: ['hero_vypolzok', 'hero_markovka'],
      selectedHeroId: 'hero_vypolzok',
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
        let selected = parsed.selectedHeroId || 'hero_vypolzok';
        if (selected === 'hero_worm' || selected === 'hero_bashmak' || selected === 'hero_baklazhan') {
          selected = 'hero_vypolzok';
        }

        let unlocked: string[] = (parsed.unlockedHeroIds || ['hero_vypolzok', 'hero_markovka'])
          .filter((id: string) => id !== 'hero_bashmak' && id !== 'hero_baklazhan');
        if (unlocked.includes('hero_worm') && !unlocked.includes('hero_vypolzok')) {
          unlocked = unlocked.map((id: string) => (id === 'hero_worm' ? 'hero_vypolzok' : id));
        }
        if (!unlocked.includes('hero_vypolzok')) unlocked.unshift('hero_vypolzok');
        if (!unlocked.includes('hero_markovka')) unlocked.push('hero_markovka');

        return {
          ...this.getDefaultData(),
          ...parsed,
          selectedHeroId: selected,
          unlockedHeroIds: unlocked,
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

  public getSelectedHeroId(): string {
    const id = this.data.selectedHeroId || 'hero_vypolzok';
    if (id === 'hero_worm' || id === 'hero_bashmak' || id === 'hero_baklazhan') return 'hero_vypolzok';
    return id;
  }

  public setSelectedHeroId(id: string): void {
    const canonical = id === 'hero_worm' ? 'hero_vypolzok' : id;
    this.data.selectedHeroId = canonical;
    this.save();
    if (this.apiClient.isAuthenticated()) {
      this.apiClient.selectHero(canonical).then((res) => {
        if (res.profile) this.hydrateFromProfile(res.profile);
      }).catch((err) => console.warn('[SaveManager] selectHero server failed:', err));
    }
  }

  public isHeroUnlocked(id: string): boolean {
    const canonical = id === 'hero_worm' ? 'hero_vypolzok' : id;
    return this.data.unlockedHeroIds?.includes(canonical) ?? false;
  }

  public unlockHero(id: string): void {
    const canonical = id === 'hero_worm' ? 'hero_vypolzok' : id;
    if (!this.data.unlockedHeroIds) {
      this.data.unlockedHeroIds = ['hero_vypolzok'];
    }
    if (!this.data.unlockedHeroIds.includes(canonical)) {
      this.data.unlockedHeroIds.push(canonical);
      this.save();
      if (this.apiClient.isAuthenticated()) {
        this.apiClient.unlockHero(canonical).then((res) => {
          if (res.profile) this.hydrateFromProfile(res.profile);
        }).catch((err) => console.warn('[SaveManager] unlockHero server failed:', err));
      }
    }
  }

  public getUnlockedHeroIds(): string[] {
    return this.data.unlockedHeroIds || ['hero_vypolzok'];
  }

  public getPowerUpLevel(id: string): number {
    return this.data.powerUps[id] || 0;
  }

  public getMaxWeaponSlots(): number {
    return Math.min(BALANCE_CONFIG.meta.maxWeaponSlots, BALANCE_CONFIG.meta.startWeaponSlots + this.getPowerUpLevel('power_weapon_slots'));
  }

  public getMaxTomeSlots(): number {
    return Math.min(BALANCE_CONFIG.meta.maxTomeSlots, BALANCE_CONFIG.meta.startTomeSlots + this.getPowerUpLevel('power_tome_slots'));
  }

  public getMaxRerolls(): number {
    return Math.min(5, 2 + this.getPowerUpLevel('power_rerolls'));
  }

  public getMaxSkips(): number {
    return Math.min(5, 2 + this.getPowerUpLevel('power_skips'));
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

      if (this.apiClient.isAuthenticated()) {
        this.apiClient.buyPowerUp(id).then((res) => {
          if (res.profile) this.hydrateFromProfile(res.profile);
        }).catch((err) => {
          console.warn('[SaveManager] buyPowerUp server rejected, resyncing:', err);
          this.syncWithServer();
        });
      }
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

    if (this.apiClient.isAuthenticated()) {
      this.apiClient.refundAllPowerUps().then((res) => {
        if (res.profile) this.hydrateFromProfile(res.profile);
      }).catch((err) => {
        console.warn('[SaveManager] refundAll server rejected, resyncing:', err);
        this.syncWithServer();
      });
    }
    return refundAmount;
  }

  public async startRunSession(heroId: string): Promise<string | null> {
    if (this.apiClient.isAuthenticated()) {
      try {
        const res = await this.apiClient.startRun(heroId);
        this.activeRunId = res.runId;
        return res.runId;
      } catch (err) {
        console.warn('[SaveManager] startRun server failed:', err);
      }
    }
    this.activeRunId = `local_run_${Date.now()}`;
    return this.activeRunId;
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
    const runId = this.activeRunId || `run_${Date.now()}`;
    this.activeRunId = null;

    const prevBestTime = this.data.stats.bestSurvivalTimeSec || 0;
    this.lastRunWasRecord = prevBestTime > 0 ? (result.timeSurvived > prevBestTime) : (result.timeSurvived >= 120);

    this.data.stats.totalRuns += 1;
    this.data.stats.totalKills += result.kills;
    this.data.stats.bestSurvivalTimeSec = Math.max(
      prevBestTime,
      result.timeSurvived
    );
    this.data.stats.bestKills = Math.max(this.data.stats.bestKills, result.kills);
    this.data.stats.bestScore = Math.max(this.data.stats.bestScore, result.score);
    this.addGoo(result.gooEarned);

    if (this.apiClient.isAuthenticated()) {
      this.apiClient.finishRun({
        runId,
        timeSurvived: result.timeSurvived,
        kills: result.kills,
        score: result.score,
        gooEarned: result.gooEarned,
        won: result.won,
      }).then((res) => {
        if (res.profile) this.hydrateFromProfile(res.profile);
      }).catch((err) => {
        console.warn('[SaveManager] finishRun server sync failed:', err);
      });
    }
  }
}
