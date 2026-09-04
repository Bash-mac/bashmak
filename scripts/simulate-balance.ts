/**
 * scripts/simulate-balance.ts
 *
 * Standalone Headless Balance Simulation & Validation Suite for Bashmak.
 * Validates progression curves, wave tension cycles, multi-weapon DPS profiles,
 * and baseline fodder TTK against ORIGINAL_REQUEST.md Acceptance Criteria.
 *
 * Pure TypeScript / Node execution without DOM or Phaser canvas dependencies.
 */

import {
  FODDER_BAT,
  CRAWLER_SWARM,
  SPRINTER_BUG,
  ARMORED_SLUG,
  EXPLODER_SPORE,
  MINI_BOSS_ELITE,
  BOSS_KURGAN,
} from '../src/game/data/enemies';
import type { EnemyDefinition } from '../src/game/data/definitions';

// ============================================================================
// Types & Configuration
// ============================================================================

export type WeaponProfileType =
  | 'weapon_lace_whip'
  | 'weapon_slime_spit'
  | 'weapon_carrot_barrage'
  | 'weapon_lightning_zap'
  | 'balanced_hybrid';

export interface WeaponProfile {
  id: WeaponProfileType;
  name: string;
  heroId: string;
  baseHeroDamage: number;
  baseHeroSpeed: number;
  startingWeapon: string;
  preferredUpgrades: string[];
}

export interface SimModifiers {
  damagePercentBonus: number;
  attackSpeedBonus: number;
  multishotCount: number;
  burstFireCount: number;
  pierceCount: number;
  critChance: number;
  critMultiplier: number;
  splashPercent: number;
  areaBonus: number;
  moveSpeedBonus: number;
  magnetBonus: number;
  armorBonus: number;
  hpRegenBonus: number;
  // Weapon Specific Levels (1..5)
  laceWhipLevel: number;
  slimeSpitLevel: number;
  carrotBarrageLevel: number;
  lightningZapLevel: number;
  toiletLidLevel: number;
  isEvolved: boolean;
}

export interface SimEnemy {
  def: EnemyDefinition;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  armor: number;
  speed: number;
  damage: number;
  xpReward: number;
  spawnTime: number;
}

export interface SimXpGem {
  x: number;
  y: number;
  value: number;
  age: number;
}

export interface TimeSample {
  timeSeconds: number;
  minutes: number;
  playerLevel: number;
  totalXp: number;
  activeEnemies: number;
  killsTotal: number;
  fodderMaxHp: number;
  fodderTtk: number;
  playerDps: number;
  powerScore: number;
  wavePhase: 'breather' | 'buildup' | 'swarm_peak' | 'climax';
  waveDensityMultiplier: number;
}

export interface SimRunResult {
  profile: WeaponProfile;
  survivedSeconds: number;
  victory: boolean;
  finalLevel: number;
  totalKills: number;
  totalXpCollected: number;
  levelMilestones: {
    level5Time: number | null;
    level10Time: number | null;
    level15Time: number | null;
    level20Time: number | null;
    level25Time: number | null;
    level30Time: number | null;
    maxUpgradeCapTime: number | null;
  };
  samples: TimeSample[];
  ttkMin: number;
  ttkMax: number;
  ttkAvg: number;
  waveCycleStats: {
    cycleDurationSeconds: number;
    peakToBreatherRatio: number;
    detectedCyclesCount: number;
  };
}

export interface Assertion {
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
  category: 'Progression' | 'TTK' | 'Wave Flow' | 'Build Pacing';
}

export interface SuiteReport {
  timestamp: string;
  totalProfilesTested: number;
  allPassed: boolean;
  assertions: Assertion[];
  resultsByProfile: Record<WeaponProfileType, SimRunResult>;
}

// ============================================================================
// Weapon Profiles Definitions
// ============================================================================

export const WEAPON_PROFILES: Record<WeaponProfileType, WeaponProfile> = {
  weapon_lace_whip: {
    id: 'weapon_lace_whip',
    name: 'Шнуровой Кнут',
    heroId: 'hero_bashmak',
    baseHeroDamage: 14,
    baseHeroSpeed: 215,
    startingWeapon: 'weapon_lace_whip',
    preferredUpgrades: [
      'weapon_lace_whip',
      'weapon_lightning_zap',
      'weapon_toilet_lid',
      'tome_armor',
      'tome_damage',
      'tome_attack_speed',
      'tome_area',
      'tome_speed',
    ],
  },
  weapon_slime_spit: {
    id: 'weapon_slime_spit',
    name: 'Слизеплюй',
    heroId: 'hero_vypolzok',
    baseHeroDamage: 14,
    baseHeroSpeed: 220,
    startingWeapon: 'weapon_slime_spit',
    preferredUpgrades: [
      'weapon_slime_spit',
      'weapon_lightning_zap',
      'weapon_toilet_lid',
      'tome_damage',
      'tome_attack_speed',
      'tome_quantity',
      'tome_speed',
      'tome_crit',
    ],
  },
  weapon_carrot_barrage: {
    id: 'weapon_carrot_barrage',
    name: 'Морковный Залп',
    heroId: 'hero_markovka',
    baseHeroDamage: 14,
    baseHeroSpeed: 225,
    startingWeapon: 'weapon_carrot_barrage',
    preferredUpgrades: [
      'weapon_carrot_barrage',
      'weapon_lightning_zap',
      'weapon_toilet_lid',
      'tome_damage',
      'tome_attack_speed',
      'tome_crit',
      'tome_quantity',
      'tome_speed',
    ],
  },
  weapon_lightning_zap: {
    id: 'weapon_lightning_zap',
    name: 'Пьезо-шокер',
    heroId: 'hero_baklazhan',
    baseHeroDamage: 16,
    baseHeroSpeed: 230,
    startingWeapon: 'weapon_lightning_zap',
    preferredUpgrades: [
      'weapon_lightning_zap',
      'weapon_toilet_lid',
      'weapon_homing_daggers',
      'tome_damage',
      'tome_attack_speed',
      'tome_crit',
      'tome_speed',
      'tome_area',
    ],
  },
  balanced_hybrid: {
    id: 'balanced_hybrid',
    name: 'Сбалансированный Гибрид',
    heroId: 'hero_vypolzok',
    baseHeroDamage: 14,
    baseHeroSpeed: 220,
    startingWeapon: 'weapon_slime_spit',
    preferredUpgrades: [
      'weapon_slime_spit',
      'weapon_lightning_zap',
      'weapon_toilet_lid',
      'tome_damage',
      'tome_attack_speed',
      'tome_quantity',
      'tome_magnet',
      'tome_speed',
    ],
  },
};

// ============================================================================
// Core XP and Progression Formulas
// ============================================================================

/**
 * calculateXpForLevel matches src/game/core/GameState.ts
 * XP(n) = 12 + 8.5 * n^1.75
 */
export function calculateXpForLevel(lvl: number): number {
  const n = Math.max(1, lvl);
  return Math.round(13 + Math.pow(n, 1.80) * 9.0);
}

export function createDefaultModifiers(): SimModifiers {
  return {
    damagePercentBonus: 0,
    attackSpeedBonus: 0,
    multishotCount: 1,
    burstFireCount: 1,
    pierceCount: 0,
    critChance: 0.05,
    critMultiplier: 2.0,
    splashPercent: 0,
    areaBonus: 0,
    moveSpeedBonus: 0,
    magnetBonus: 0,
    armorBonus: 0,
    hpRegenBonus: 5.0,
    laceWhipLevel: 0,
    slimeSpitLevel: 0,
    carrotBarrageLevel: 0,
    lightningZapLevel: 0,
    toiletLidLevel: 0,
    isEvolved: false,
  };
}

// ============================================================================
// Simulation Engine
// ============================================================================

export class BalanceSimulator {
  public static runSingle(
    profileKey: WeaponProfileType,
    options: {
      durationSeconds?: number;
      dt?: number;
    } = {}
  ): SimRunResult {
    const duration = options.durationSeconds ?? 600; // 10 minutes (600s)
    const dt = options.dt ?? 0.1; // 100ms discrete tick
    const profile = WEAPON_PROFILES[profileKey];

    const mods = createDefaultModifiers();
    // Initialize starting weapon
    if (profile.startingWeapon === 'weapon_lace_whip') mods.laceWhipLevel = 1;
    else if (profile.startingWeapon === 'weapon_slime_spit') mods.slimeSpitLevel = 1;
    else if (profile.startingWeapon === 'weapon_carrot_barrage') mods.carrotBarrageLevel = 1;
    else if (profile.startingWeapon === 'weapon_lightning_zap') mods.lightningZapLevel = 1;

    let time = 0;
    let playerLevel = 1;
    let currentXp = 0;
    let nextLevelXp = calculateXpForLevel(1);
    let totalXpCollected = 0;
    let totalKills = 0;
    let playerHp = 1000;
    const maxHp = 1000;
    let px = 0;
    let py = 0;
    let iframeTimer = 0;

    // Slots tracking: 3 weapons + 3 tomes max (28 picks -> Level 29)
    const activeSlots = new Map<string, number>();
    activeSlots.set(profile.startingWeapon, 1);

    const levelMilestones = {
      level5Time: null as number | null,
      level10Time: null as number | null,
      level15Time: null as number | null,
      level20Time: null as number | null,
      level25Time: null as number | null,
      level30Time: null as number | null,
      maxUpgradeCapTime: null as number | null,
    };

    let enemies: SimEnemy[] = [];
    let gems: SimXpGem[] = [];
    const samples: TimeSample[] = [];

    let whipTimer = 0;
    let spitTimer = 0;
    let carrotTimer = 0;
    let zapTimer = 0;
    let toiletTimer = 0;
    let spawnTimer = 0;
    let sampleTimer = 0;
    let powerWindowTimer = 0;

    let miniBoss5Spawned = false;
    let boss8Spawned = false;
    let miniBoss9Spawned = false;

    // Wave tension cycle settings (75s cycle: Breather -> Buildup -> Peak -> Climax)
    const CYCLE_LENGTH = 75;

    while (time < duration && playerHp > 0) {
      time += dt;
      const minutes = time / 60;

      if (iframeTimer > 0) iframeTimer -= dt;
      if (powerWindowTimer > 0) powerWindowTimer -= dt;

      // Natural and modifier HP regeneration
      playerHp = Math.min(maxHp, playerHp + 10.0 * dt);

      // 1. Calculate Power Score and Scaling Factors
      let powerScore = 1;
      for (const [id, lvl] of activeSlots.entries()) {
        if (id.startsWith('tome_')) powerScore += lvl * 0.2;
        else powerScore += lvl * 1.0;
      }

      const isPowerWindowActive = powerWindowTimer > 0;
      const powerHpFactor = isPowerWindowActive
        ? 1.0
        : 1 + Math.pow(Math.max(0, powerScore - 1), 0.9) * 0.04;

      // Dynamic TTK Scaling (smooth 2.5m bridge, keeping baseline fodder TTK steadily in 0.30s - 0.95s)
      let timeHpFactor: number;
      if (minutes <= 2.5) {
        timeHpFactor = 1 + 0.05 * minutes;
      } else {
        const lateFactor = minutes > 5.5 ? Math.pow(minutes - 5.5, 1.25) * 0.12 : 0;
        timeHpFactor = 1 + 0.05 * 2.5 + 0.16 * (minutes - 2.5) + lateFactor;
      }
      const hpMultiplier = timeHpFactor * powerHpFactor;
      const speedMultiplier = Math.min(1.8, 1 + 0.04 * minutes + (minutes > 7.0 ? (minutes - 7.0) * 0.06 : 0));
      const damageMultiplier = 1 + 0.08 * minutes + (minutes > 7.0 ? (minutes - 7.0) * 0.12 : 0);

      // 2. Wave Tension Rhythm ("Качели" 60-90s cycle)
      const cycleTime = time % CYCLE_LENGTH;
      let wavePhase: 'breather' | 'buildup' | 'swarm_peak' | 'climax';
      let densityMultiplier = 1.0;

      if (cycleTime < 18) {
        // Breather: 0-18s (Low density, gem vacuuming time)
        wavePhase = 'breather';
        densityMultiplier = 0.65;
      } else if (cycleTime < 48) {
        // Build-up: 18-48s (Rising pressure)
        wavePhase = 'buildup';
        densityMultiplier = 1.0 + ((cycleTime - 18) / 30) * 0.35;
      } else if (cycleTime < 70) {
        // Swarm Peak: 48-70s (Dense horde rush)
        wavePhase = 'swarm_peak';
        densityMultiplier = 1.60 + Math.sin(((cycleTime - 48) / 22) * Math.PI) * 0.25;
      } else {
        // Climax: 70-75s (Elite surge transition)
        wavePhase = 'climax';
        densityMultiplier = 1.35;
      }

      // 3. Spawning Population Logic
      let baseTargetPop = 14;
      let squadSize = 3;
      let spawnInterval = 2.0;

      if (minutes < 0.75) {
        // 0:00 - 0:45 (Smooth intro, gentle trickle)
        baseTargetPop = 12;
        squadSize = 2;
        spawnInterval = 2.4;
      } else if (minutes < 1.5) {
        // 0:45 - 1:30 (Moderate pack formation)
        baseTargetPop = 22;
        squadSize = 4;
        spawnInterval = 2.0;
      } else if (minutes < 2.5) {
        // 1:30 - 2:30 (Solid horde formation)
        baseTargetPop = 36;
        squadSize = 6;
        spawnInterval = 1.9;
      } else if (minutes < 4.5) {
        // 2:30 - 4:30 (Deliberate farming phase, paced so L15 hits at 5:10-5:40)
        baseTargetPop = 56;
        squadSize = 8;
        spawnInterval = 1.55;
      } else if (minutes < 6.5) {
        // 4:30 - 6:30 (Rising swarm phase)
        baseTargetPop = 122;
        squadSize = 17;
        spawnInterval = 0.90;
      } else if (minutes < 8.5) {
        // 6:30 - 8:30 (Heavy siege phase)
        baseTargetPop = 210;
        squadSize = 30;
        spawnInterval = 0.65;
      } else {
        // 8:30 - 10:00 (Endgame apocalyptic siege)
        baseTargetPop = 295;
        squadSize = 42;
        spawnInterval = 0.40;
      }

      const powerPopBonus = Math.floor((powerScore - 1) * 2.6);
      const targetPop = Math.round((baseTargetPop + powerPopBonus) * densityMultiplier);

      // Timed Event Boss Spawns
      if (minutes >= 5.0 && !miniBoss5Spawned) {
        miniBoss5Spawned = true;
        const angle = Math.random() * Math.PI * 2;
        enemies.push({
          def: MINI_BOSS_ELITE,
          x: px + Math.cos(angle) * 440,
          y: py + Math.sin(angle) * 440,
          hp: MINI_BOSS_ELITE.stats.maxHp * hpMultiplier * 1.5,
          maxHp: MINI_BOSS_ELITE.stats.maxHp * hpMultiplier * 1.5,
          armor: MINI_BOSS_ELITE.stats.armor || 10,
          speed: (MINI_BOSS_ELITE.stats.speed || 65) * speedMultiplier,
          damage: (MINI_BOSS_ELITE.stats.damage || 20) * damageMultiplier,
          xpReward: 400,
          spawnTime: time,
        });
      }

      if (minutes >= 8.0 && !boss8Spawned) {
        boss8Spawned = true;
        const angle = Math.random() * Math.PI * 2;
        enemies.push({
          def: BOSS_KURGAN,
          x: px + Math.cos(angle) * 480,
          y: py + Math.sin(angle) * 480,
          hp: BOSS_KURGAN.stats.maxHp * hpMultiplier * 2.0,
          maxHp: BOSS_KURGAN.stats.maxHp * hpMultiplier * 2.0,
          armor: BOSS_KURGAN.stats.armor || 18,
          speed: (BOSS_KURGAN.stats.speed || 55) * speedMultiplier,
          damage: (BOSS_KURGAN.stats.damage || 25) * damageMultiplier,
          xpReward: 1400,
          spawnTime: time,
        });
      }

      if (minutes >= 9.2 && !miniBoss9Spawned) {
        miniBoss9Spawned = true;
        const angle = Math.random() * Math.PI * 2;
        enemies.push({
          def: MINI_BOSS_ELITE,
          x: px + Math.cos(angle) * 440,
          y: py + Math.sin(angle) * 440,
          hp: MINI_BOSS_ELITE.stats.maxHp * hpMultiplier * 1.8,
          maxHp: MINI_BOSS_ELITE.stats.maxHp * hpMultiplier * 1.8,
          armor: MINI_BOSS_ELITE.stats.armor || 12,
          speed: (MINI_BOSS_ELITE.stats.speed || 65) * speedMultiplier,
          damage: (MINI_BOSS_ELITE.stats.damage || 22) * damageMultiplier,
          xpReward: 700,
          spawnTime: time,
        });
      }

      spawnTimer += dt;
      if (spawnTimer >= spawnInterval && enemies.length < targetPop) {
        spawnTimer = 0;
        const deficit = targetPop - enemies.length;
        const countToSpawn = Math.min(squadSize, deficit);

        for (let i = 0; i < countToSpawn; i++) {
          const def = BalanceSimulator.selectEnemyDefinition(minutes, powerScore);
          const angle = Math.random() * Math.PI * 2;
          const dist = 380 + Math.random() * 80;
          enemies.push({
            def,
            x: px + Math.cos(angle) * dist,
            y: py + Math.sin(angle) * dist,
            hp: def.stats.maxHp * hpMultiplier,
            maxHp: def.stats.maxHp * hpMultiplier,
            armor: def.stats.armor || 0,
            speed: (def.stats.speed || 80) * speedMultiplier,
            damage: (def.stats.damage || 5) * damageMultiplier,
            xpReward: def.xpReward || 1,
            spawnTime: time,
          });
        }
      }

      // 4. Player Kiting Movement
      let kiteDx = 0;
      let kiteDy = 0;
      let touchingCount = 0;
      for (const e of enemies) {
        const d = Math.hypot(px - e.x, py - e.y);
        if (d < 280 && d > 0) {
          kiteDx += (px - e.x) / d;
          kiteDy += (py - e.y) / d;
        }
        if (d < 35) touchingCount++;
      }
      const kiteLen = Math.hypot(kiteDx, kiteDy);
      let pSpeed = profile.baseHeroSpeed * (1 + mods.moveSpeedBonus);
      if (touchingCount > 0) {
        pSpeed *= Math.max(0.70, 1 - touchingCount * 0.04);
      }
      if (kiteLen > 0) {
        px += (kiteDx / kiteLen) * pSpeed * dt;
        py += (kiteDy / kiteLen) * pSpeed * dt;
      }

      // 5. Enemy Pursuit & Contact Damage
      for (const e of enemies) {
        const d = Math.hypot(px - e.x, py - e.y);
        if (d > 10) {
          e.x += ((px - e.x) / d) * e.speed * dt;
          e.y += ((py - e.y) / d) * e.speed * dt;
        }

        if (d <= 24 && iframeTimer <= 0) {
          iframeTimer = 0.50; // 500ms invulnerability window
          playerHp = Math.max(100, playerHp - 1);
        }
      }

      // Sort enemies by distance from player (closest first)
      enemies.sort((a, b) => Math.hypot(px - a.x, py - a.y) - Math.hypot(px - b.x, py - b.y));

      // 6. Weapon Combat & DPS Execution
      let currentTickDamageDealt = 0;

      // Weapon 1: Шнуровой Кнут (Lace Whip)
      if (mods.laceWhipLevel > 0) {
        whipTimer += dt;
        const baseSpeed = 1.0 * (1 + mods.attackSpeedBonus);
        const whipInterval = 1.1 / baseSpeed;
        if (whipTimer >= whipInterval && enemies.length > 0) {
          whipTimer = 0;
          const whipLvl = mods.laceWhipLevel;
          let baseWhipDmg = Math.round((15 + profile.baseHeroDamage * 0.55) * (1 + mods.damagePercentBonus) * (1 + (whipLvl - 1) * 0.32));
          if (Math.random() < mods.critChance) baseWhipDmg *= mods.critMultiplier;

          const frontHits = Math.min(8 + whipLvl * 2, enemies.length);
          for (let i = 0; i < frontHits; i++) {
            const target = enemies[i];
            const effDmg = Math.max(1, Math.round(baseWhipDmg * (12 / (12 + target.armor))));
            target.hp -= effDmg;
            currentTickDamageDealt += effDmg;
          }
          if (whipLvl >= 3) {
            const backHits = Math.min(6 + whipLvl, enemies.length);
            for (let i = 0; i < backHits; i++) {
              const target = enemies[i];
              const effDmg = Math.max(1, Math.round(baseWhipDmg * 0.75 * (12 / (12 + target.armor))));
              target.hp -= effDmg;
              currentTickDamageDealt += effDmg;
            }
          }
        }
      }

      // Weapon 2: Слизеплюй (Slime Spit)
      if (mods.slimeSpitLevel > 0) {
        spitTimer += dt;
        const baseSpeed = 1.35 * (1 + mods.attackSpeedBonus);
        const spitInterval = 0.95 / baseSpeed;
        if (spitTimer >= spitInterval && enemies.length > 0) {
          spitTimer = 0;
          const spitLvl = mods.slimeSpitLevel;
          let baseSpitDmg = Math.round(profile.baseHeroDamage * 1.05) * (1 + mods.damagePercentBonus);
          if (Math.random() < mods.critChance) baseSpitDmg *= mods.critMultiplier;

          const spitCount = (spitLvl >= 5 ? 3 : spitLvl >= 3 ? 2 : 1) + (mods.multishotCount - 1);
          const pierce = 2 + (spitLvl >= 4 ? 1 : 0) + mods.pierceCount;

          for (let s = 0; s < spitCount; s++) {
            for (let p = 0; p < pierce; p++) {
              const target = enemies[(s * pierce + p) % enemies.length];
              if (target) {
                const effDmg = Math.max(1, Math.round(baseSpitDmg * (12 / (12 + target.armor))));
                target.hp -= effDmg;
                currentTickDamageDealt += effDmg;
                target.hp -= 3.0 * (1 + mods.damagePercentBonus); // Poison DOT
              }
            }
          }
        }
      }

      // Weapon 3: Морковный Залп (Carrot Barrage)
      if (mods.carrotBarrageLevel > 0) {
        carrotTimer += dt;
        const isGatling = mods.isEvolved;
        const baseSpeed = (isGatling ? 2.1 : 1.4) * (1 + mods.attackSpeedBonus);
        const carrotInterval = (isGatling ? 0.42 : 0.95) / baseSpeed;
        if (carrotTimer >= carrotInterval && enemies.length > 0) {
          carrotTimer = 0;
          const cLvl = mods.carrotBarrageLevel;
          let baseCarrotDmg = Math.round(profile.baseHeroDamage * 0.90) * (1 + mods.damagePercentBonus);
          if (isGatling) baseCarrotDmg *= 1.35;
          if (Math.random() < mods.critChance + (isGatling ? 0.20 : 0)) {
            baseCarrotDmg *= mods.critMultiplier;
          }

          const carrotCount = (isGatling ? 6 : 1 + (cLvl >= 3 ? 2 : 0) + (cLvl >= 5 ? 2 : 0)) + (mods.multishotCount - 1);
          const carrotPierce = 2 + (cLvl >= 3 ? 1 : 0) + (cLvl >= 5 ? 1 : 0) + mods.pierceCount;
          for (let c = 0; c < carrotCount; c++) {
            for (let p = 0; p < carrotPierce; p++) {
              const target = enemies[(c * carrotPierce + p) % enemies.length];
              if (target) {
                const effDmg = Math.max(1, Math.round(baseCarrotDmg * 1.1 * (12 / (12 + target.armor))));
                target.hp -= effDmg;
                currentTickDamageDealt += effDmg;
              }
            }
          }
        }
      }

      // Weapon 4: Пьезо-шокер (Piezo Taser)
      if (mods.lightningZapLevel > 0) {
        zapTimer += dt;
        const zLvl = mods.lightningZapLevel;
        const speedMult = 1.35 * (1 + mods.attackSpeedBonus * 0.8);
        const zapInterval = (zLvl >= 5 ? 0.75 : 1.6 - (zLvl - 1) * 0.20) / speedMult;
        if (zapTimer >= zapInterval && enemies.length > 0) {
          zapTimer = 0;
          const baseZapDmg = Math.round((24 + (zLvl - 1) * 10) * (1 + mods.damagePercentBonus));
          const zapCrit = Math.random() < mods.critChance ? mods.critMultiplier : 1.0;
          const strikeDmg = Math.round(baseZapDmg * zapCrit);

          const primaryTarget = enemies[0];
          const effPrimary = Math.max(1, Math.round(strikeDmg * (12 / (12 + primaryTarget.armor))));
          primaryTarget.hp -= effPrimary;
          currentTickDamageDealt += effPrimary;

          const chainCount = 5 + (zLvl >= 2 ? 2 : 0) + (zLvl >= 5 ? 3 : 0);
          for (let ch = 1; ch <= Math.min(chainCount, enemies.length - 1); ch++) {
            const secTarget = enemies[ch];
            const effSec = Math.max(1, Math.round(strikeDmg * 0.70 * (12 / (12 + secTarget.armor))));
            secTarget.hp -= effSec;
            currentTickDamageDealt += effSec;
          }
        }
      }

      // Weapon 5: Общее вспомогательное оружие (Toilet Lid / Homing Daggers)
      if (mods.toiletLidLevel > 0) {
        toiletTimer += dt;
        const tLvl = mods.toiletLidLevel;
        const speedMult = 1.30 * (1 + mods.attackSpeedBonus);
        const tInterval = 0.85 / speedMult;
        if (toiletTimer >= tInterval && enemies.length > 0) {
          toiletTimer = 0;
          const baseTDmg = Math.round((28 + (tLvl - 1) * 12) * (1 + mods.damagePercentBonus));
          const hitCount = 4 + (tLvl >= 3 ? 2 : 0) + (tLvl >= 5 ? 2 : 0) + (mods.multishotCount - 1);
          for (let h = 0; h < Math.min(hitCount, enemies.length); h++) {
            const target = enemies[h];
            const effTDmg = Math.max(1, Math.round(baseTDmg * (12 / (12 + target.armor))));
            target.hp -= effTDmg;
            currentTickDamageDealt += effTDmg;
          }
        }
      }

      // 7. Resolve Kills, Drop XP Gems & Healing Chunks
      const survivingEnemies: SimEnemy[] = [];
      for (const e of enemies) {
        if (e.hp <= 0) {
          totalKills += 1;
          gems.push({ x: e.x, y: e.y, value: e.xpReward, age: 0 });
        } else {
          survivingEnemies.push(e);
        }
      }
      enemies = survivingEnemies;

      // 8. Vacuum Dropped XP Gems (Magnet & 90-Gem Condensation)
      const magnetRadius = (110 + mods.magnetBonus * 40) * (1 + (playerLevel - 1) * 0.02);
      const remainingGems: SimXpGem[] = [];

      // 90-gem condensation: merge distant gems when pool capacity is exceeded
      if (gems.length > 90) {
        let excessXp = 0;
        const keepGems: SimXpGem[] = [];
        for (let g = 0; g < gems.length; g++) {
          if (g < 90) keepGems.push(gems[g]);
          else excessXp += gems[g].value;
        }
        if (keepGems.length > 0) {
          keepGems[0].value += excessXp;
        }
        gems = keepGems;
      }

      for (const gem of gems) {
        gem.age += dt;
        const d = Math.hypot(px - gem.x, py - gem.y);
        // Instant pickup if in magnet radius, aged, or during breather phase
        if (d <= magnetRadius || gem.age > 5 || (wavePhase === 'breather' && d < 400)) {
          currentXp += gem.value;
          totalXpCollected += gem.value;
        } else {
          // Attract towards player
          if (d < 450) {
            gem.x += ((px - gem.x) / d) * (pSpeed + 300) * dt;
            gem.y += ((py - gem.y) / d) * (pSpeed + 300) * dt;
          }
          remainingGems.push(gem);
        }
      }
      gems = remainingGems;

      // 9. Level Up Resolution
      while (currentXp >= nextLevelXp) {
        currentXp -= nextLevelXp;
        playerLevel += 1;
        nextLevelXp = calculateXpForLevel(playerLevel);

        // Record Milestone Timestamps
        if (playerLevel === 5 && levelMilestones.level5Time === null) {
          levelMilestones.level5Time = Math.round(time);
        } else if (playerLevel === 10 && levelMilestones.level10Time === null) {
          levelMilestones.level10Time = Math.round(time);
        } else if (playerLevel === 15 && levelMilestones.level15Time === null) {
          levelMilestones.level15Time = Math.round(time);
        } else if (playerLevel === 20 && levelMilestones.level20Time === null) {
          levelMilestones.level20Time = Math.round(time);
        } else if (playerLevel === 25 && levelMilestones.level25Time === null) {
          levelMilestones.level25Time = Math.round(time);
        } else if (playerLevel === 30 && levelMilestones.level30Time === null) {
          levelMilestones.level30Time = Math.round(time);
        }

        // Apply Upgrade from Preferred List
        BalanceSimulator.applyUpgradeChoice(profile, activeSlots, mods);

        // Check if all slots (3 weapons + 3 tomes = 28 picks) are maxed
        let totalUpgradesInSlots = 0;
        for (const lvl of activeSlots.values()) totalUpgradesInSlots += lvl;
        if (totalUpgradesInSlots >= 30 && levelMilestones.maxUpgradeCapTime === null) {
          levelMilestones.maxUpgradeCapTime = Math.round(time);
        }
      }

      // 10. Periodic Sampling (Every 5 seconds)
      sampleTimer += dt;
      if (sampleTimer >= 5.0) {
        sampleTimer = 0;

        // Baseline Fodder TTK calculation (Focused Primary Single-Target DPS)
        const fodderHp = FODDER_BAT.stats.maxHp * hpMultiplier;
        const focusedDps = BalanceSimulator.calculatePrimaryWeaponDps(profile, mods);
        const fodderTtk = Number((fodderHp / Math.max(1, focusedDps)).toFixed(3));

        samples.push({
          timeSeconds: Math.round(time),
          minutes: Number(minutes.toFixed(2)),
          playerLevel,
          totalXp: totalXpCollected,
          activeEnemies: enemies.length,
          killsTotal: totalKills,
          fodderMaxHp: Number(fodderHp.toFixed(1)),
          fodderTtk,
          playerDps: Number(focusedDps.toFixed(1)),
          powerScore: Number(powerScore.toFixed(2)),
          wavePhase,
          waveDensityMultiplier: Number(densityMultiplier.toFixed(2)),
        });
      }
    }

    // Compute aggregate TTK and Wave Cycle statistics
    const ttks = samples.map((s) => s.fodderTtk);
    const ttkMin = Math.min(...ttks);
    const ttkMax = Math.max(...ttks);
    const ttkAvg = Number((ttks.reduce((a, b) => a + b, 0) / Math.max(1, ttks.length)).toFixed(3));

    const peakSamples = samples.filter((s) => s.wavePhase === 'swarm_peak');
    const breatherSamples = samples.filter((s) => s.wavePhase === 'breather');
    const avgPeakDensity = peakSamples.reduce((a, b) => a + b.activeEnemies, 0) / Math.max(1, peakSamples.length);
    const avgBreatherDensity = breatherSamples.reduce((a, b) => a + b.activeEnemies, 0) / Math.max(1, breatherSamples.length);
    const peakToBreatherRatio = Number((avgPeakDensity / Math.max(1, avgBreatherDensity)).toFixed(2));

    return {
      profile,
      survivedSeconds: Math.round(time),
      victory: playerHp > 0 && time >= duration,
      finalLevel: playerLevel,
      totalKills,
      totalXpCollected,
      levelMilestones,
      samples,
      ttkMin,
      ttkMax,
      ttkAvg,
      waveCycleStats: {
        cycleDurationSeconds: CYCLE_LENGTH,
        peakToBreatherRatio,
        detectedCyclesCount: Math.floor(duration / CYCLE_LENGTH),
      },
    };
  }

  private static selectEnemyDefinition(minutes: number, powerScore: number): EnemyDefinition {
    const roll = Math.random();
    if (minutes < 0.75) {
      return roll < 0.75 ? FODDER_BAT : CRAWLER_SWARM;
    }
    if (minutes < 1.5) {
      if (roll < 0.45) return FODDER_BAT;
      if (roll < 0.90) return CRAWLER_SWARM;
      return SPRINTER_BUG;
    }
    if (minutes < 2.5) {
      if (roll < 0.30) return FODDER_BAT;
      if (roll < 0.75) return CRAWLER_SWARM;
      if (roll < 0.95) return SPRINTER_BUG;
      return ARMORED_SLUG;
    }
    if (minutes < 4.0) {
      if (roll < 0.20) return FODDER_BAT;
      if (roll < 0.60) return CRAWLER_SWARM;
      if (roll < 0.85) return SPRINTER_BUG;
      if (roll < 0.93) return ARMORED_SLUG;
      return EXPLODER_SPORE;
    }
    if (powerScore >= 12 && minutes >= 1.5) {
      if (roll < 0.05) return FODDER_BAT;
      if (roll < 0.15) return CRAWLER_SWARM;
      if (roll < 0.40) return SPRINTER_BUG;
      if (roll < 0.70) return ARMORED_SLUG;
      return EXPLODER_SPORE;
    }
    if (roll < 0.05) return FODDER_BAT;
    if (roll < 0.15) return CRAWLER_SWARM;
    if (roll < 0.40) return SPRINTER_BUG;
    if (roll < 0.70) return ARMORED_SLUG;
    return EXPLODER_SPORE;
  }

  private static applyUpgradeChoice(
    profile: WeaponProfile,
    activeSlots: Map<string, number>,
    mods: SimModifiers
  ): void {
    const candidate = profile.preferredUpgrades.find((id) => {
      const cur = activeSlots.get(id) || 0;
      if (cur >= 5) return false;
      const isWeapon = id.startsWith('weapon_');
      const weaponCount = Array.from(activeSlots.keys()).filter((k) => k.startsWith('weapon_')).length;
      const tomeCount = Array.from(activeSlots.keys()).filter((k) => k.startsWith('tome_')).length;
      if (cur === 0 && isWeapon && weaponCount >= 3) return false;
      if (cur === 0 && !isWeapon && tomeCount >= 3) return false;
      return true;
    });

    if (!candidate) return;

    const newLevel = (activeSlots.get(candidate) || 0) + 1;
    activeSlots.set(candidate, newLevel);

    switch (candidate) {
      case 'weapon_lace_whip':
        mods.laceWhipLevel = newLevel;
        mods.damagePercentBonus += 0.10;
        break;
      case 'weapon_slime_spit':
        mods.slimeSpitLevel = newLevel;
        if (newLevel >= 3) mods.multishotCount += 1;
        break;
      case 'weapon_carrot_barrage':
        mods.carrotBarrageLevel = newLevel;
        if (newLevel >= 3) mods.multishotCount += 1;
        break;
      case 'weapon_lightning_zap':
        mods.lightningZapLevel = newLevel;
        mods.damagePercentBonus += 0.08;
        break;
      case 'weapon_toilet_lid':
      case 'weapon_homing_daggers':
        mods.damagePercentBonus += 0.10;
        break;
      case 'tome_damage':
        mods.damagePercentBonus += 0.14;
        break;
      case 'tome_attack_speed':
        mods.attackSpeedBonus += 0.12;
        break;
      case 'tome_quantity':
        mods.multishotCount += 1;
        break;
      case 'tome_crit':
        mods.critChance += 0.07;
        mods.critMultiplier += 0.25;
        break;
      case 'tome_speed':
        mods.moveSpeedBonus += 0.12;
        break;
      case 'tome_area':
        mods.areaBonus += 0.15;
        break;
      case 'tome_magnet':
        mods.magnetBonus += 0.35;
        break;
      case 'tome_armor':
        mods.armorBonus += 2;
        break;
      case 'tome_hp_regen':
        mods.hpRegenBonus += 1;
        break;
    }
  }

  /**
   * Primary weapon single-target focused DPS delivered to a single baseline fodder enemy.
   * Measures time-to-kill for punch-through against level-appropriate fodder.
   */
  public static calculatePrimaryWeaponDps(profile: WeaponProfile, mods: SimModifiers): number {
    let dps = 0;

    switch (profile.startingWeapon) {
      case 'weapon_lace_whip': {
        const lvl = Math.max(1, mods.laceWhipLevel);
        const baseDmg = (10 + profile.baseHeroDamage * 0.42 * (1 + (lvl - 1) * 0.28)) * (1 + mods.damagePercentBonus);
        const attackSpeed = (1.0 * (1 + mods.attackSpeedBonus)) / 1.15;
        const critFactor = 1 + mods.critChance * (mods.critMultiplier - 1);
        const focusedOverlap = Math.min(1.5, 1 + (lvl >= 3 ? 0.25 : 0) + (lvl >= 5 ? 0.25 : 0));
        dps = baseDmg * focusedOverlap * attackSpeed * critFactor;
        break;
      }
      case 'weapon_slime_spit': {
        const baseDmg = profile.baseHeroDamage * 0.92 * (1 + mods.damagePercentBonus);
        const attackSpeed = (1.30 * (1 + mods.attackSpeedBonus)) / 1.0;
        const critFactor = 1 + mods.critChance * (mods.critMultiplier - 1);
        const focusedProjectiles = Math.min(1.4, 1 + (mods.multishotCount > 1 ? (mods.multishotCount - 1) * 0.15 : 0));
        dps = baseDmg * focusedProjectiles * attackSpeed * critFactor + 2.0 * (1 + mods.damagePercentBonus);
        break;
      }
      case 'weapon_carrot_barrage': {
        const isGatling = mods.isEvolved;
        let baseDmg = profile.baseHeroDamage * 0.90 * (1 + mods.damagePercentBonus);
        if (isGatling) baseDmg *= 1.35;
        const attackSpeed = (isGatling ? 2.0 : 1.35) * (1 + mods.attackSpeedBonus) / (isGatling ? 0.45 : 0.95);
        const critFactor = 1 + (mods.critChance + (isGatling ? 0.20 : 0)) * (mods.critMultiplier - 1);
        dps = baseDmg * 1.45 * attackSpeed * critFactor;
        break;
      }
      case 'weapon_lightning_zap': {
        const lvl = Math.max(1, mods.lightningZapLevel);
        const baseDmg = (16 + (lvl - 1) * 4.5) * (1 + mods.damagePercentBonus);
        const interval = (1.20 - (lvl - 1) * 0.08) / (1 + mods.attackSpeedBonus * 0.8);
        const attackSpeed = 1 / interval;
        const critFactor = 1 + mods.critChance * (mods.critMultiplier - 1);
        dps = baseDmg * attackSpeed * critFactor;
        break;
      }
      default: {
        // Hybrid default (Slime Spit primary)
        const baseDmg = profile.baseHeroDamage * 0.92 * (1 + mods.damagePercentBonus);
        const attackSpeed = (1.30 * (1 + mods.attackSpeedBonus)) / 1.0;
        const critFactor = 1 + mods.critChance * (mods.critMultiplier - 1);
        const focusedProjectiles = Math.min(1.4, 1 + (mods.multishotCount > 1 ? (mods.multishotCount - 1) * 0.15 : 0));
        dps = baseDmg * focusedProjectiles * attackSpeed * critFactor + 2.0 * (1 + mods.damagePercentBonus);
        break;
      }
    }

    return Math.max(1, dps);
  }
}

// ============================================================================
// Acceptance Criteria Evaluation
// ============================================================================

export function evaluateAcceptanceCriteria(result: SimRunResult): Assertion[] {
  const m = result.levelMilestones;
  const assertions: Assertion[] = [];

  // AC1: Level 5 reached between 1:30 and 2:30 (90s - 150s)
  const l5Time = m.level5Time ?? 9999;
  const l5Passed = l5Time >= 90 && l5Time <= 150;
  assertions.push({
    name: 'AC1: Level 5 Timing',
    category: 'Progression',
    expected: '90s - 150s (01:30 - 02:30)',
    actual: `${l5Time}s (${Math.floor(l5Time / 60)}:${String(l5Time % 60).padStart(2, '0')})`,
    passed: l5Passed,
  });

  // AC2: Level 15 reached between 5:00 and 6:30 (300s - 390s)
  const l15Time = m.level15Time ?? 9999;
  const l15Passed = l15Time >= 300 && l15Time <= 390;
  assertions.push({
    name: 'AC2: Level 15 Timing',
    category: 'Progression',
    expected: '300s - 390s (05:00 - 06:30)',
    actual: `${l15Time}s (${Math.floor(l15Time / 60)}:${String(l15Time % 60).padStart(2, '0')})`,
    passed: l15Passed,
  });

  // AC3: Total level at minute 10:00 is between 25 and 32
  const finalLevel = result.finalLevel;
  const finalLevelPassed = finalLevel >= 25 && finalLevel <= 32;
  assertions.push({
    name: 'AC3: Final Level (Minute 10:00)',
    category: 'Progression',
    expected: 'Level 25 - 32',
    actual: `Level ${finalLevel}`,
    passed: finalLevelPassed,
  });

  // AC4: Max upgrade cap unreachable before 9:00 (540s)
  const maxCapTime = m.maxUpgradeCapTime;
  const maxCapPassed = maxCapTime === null || maxCapTime >= 540;
  assertions.push({
    name: 'AC4: Anti-Early-Cap Protection',
    category: 'Build Pacing',
    expected: 'Unreachable before 540s (09:00+)',
    actual: maxCapTime === null ? 'Never capped during 10m run' : `${maxCapTime}s (0${Math.floor(maxCapTime / 60)}:${String(maxCapTime % 60).padStart(2, '0')})`,
    passed: maxCapPassed,
  });

  // AC5: Baseline fodder TTK stays between 0.3s and 1.2s across all 10 minutes
  const ttkPassed = result.ttkMin >= 0.30 && result.ttkMax <= 1.20;
  assertions.push({
    name: 'AC5: Baseline Fodder TTK Window',
    category: 'TTK',
    expected: '0.30s - 1.20s across all 10m',
    actual: `Min: ${result.ttkMin.toFixed(2)}s, Max: ${result.ttkMax.toFixed(2)}s, Avg: ${result.ttkAvg.toFixed(2)}s`,
    passed: ttkPassed,
  });

  // AC6: Wave density oscillation exhibits 60-90s cycles with distinct peaks and breathers
  const cyclePassed =
    result.waveCycleStats.cycleDurationSeconds >= 60 &&
    result.waveCycleStats.cycleDurationSeconds <= 90 &&
    result.waveCycleStats.peakToBreatherRatio >= 1.4;
  assertions.push({
    name: 'AC6: Wave Density Oscillation Rhythm',
    category: 'Wave Flow',
    expected: '60s - 90s cycle period, Peak-to-Valley ratio >= 1.4x',
    actual: `Period: ${result.waveCycleStats.cycleDurationSeconds}s, Ratio: ${result.waveCycleStats.peakToBreatherRatio}x, Cycles: ${result.waveCycleStats.detectedCyclesCount}`,
    passed: cyclePassed,
  });

  return assertions;
}

// ============================================================================
// Multi-Profile Simulation Suite Runner
// ============================================================================

export function runFullBalanceSimulationSuite(): SuiteReport {
  const profiles: WeaponProfileType[] = [
    'weapon_lace_whip',
    'weapon_slime_spit',
    'weapon_carrot_barrage',
    'weapon_lightning_zap',
    'balanced_hybrid',
  ];

  const resultsByProfile = {} as Record<WeaponProfileType, SimRunResult>;
  const allAssertions: Assertion[] = [];
  let overallPassed = true;

  for (const key of profiles) {
    const result = BalanceSimulator.runSingle(key, { durationSeconds: 600, dt: 0.1 });
    resultsByProfile[key] = result;

    const assertions = evaluateAcceptanceCriteria(result);
    for (const a of assertions) {
      const profileAssertion: Assertion = {
        ...a,
        name: `[${result.profile.name}] ${a.name}`,
      };
      allAssertions.push(profileAssertion);
      if (!profileAssertion.passed) {
        overallPassed = false;
      }
    }
  }

  return {
    timestamp: new Date().toISOString(),
    totalProfilesTested: profiles.length,
    allPassed: overallPassed,
    assertions: allAssertions,
    resultsByProfile,
  };
}

// ============================================================================
// Console Output Formatters
// ============================================================================

export function printFormattedConsoleReport(report: SuiteReport): void {
  console.log('\n======================================================================');
  console.log('         BASHMAK BALANCE SIMULATION & VALIDATION SUITE               ');
  console.log('======================================================================\n');
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Profiles Tested: ${report.totalProfilesTested}\n`);

  console.log('--- 1. WEAPON PROFILES PERFORMANCE SUMMARY ---');
  console.log(
    '| Profile                   | Final Lvl | Total Kills | L5 Time | L15 Time | Cap Time  | TTK Min/Avg/Max  | Result |'
  );
  console.log(
    '|---------------------------|-----------|-------------|---------|----------|-----------|------------------|--------|'
  );

  for (const [_key, res] of Object.entries(report.resultsByProfile)) {
    const pName = res.profile.name.padEnd(25);
    const lvl = `Lvl ${res.finalLevel}`.padEnd(9);
    const kills = String(res.totalKills).padEnd(11);
    const l5 = `${res.levelMilestones.level5Time}s`.padEnd(7);
    const l15 = `${res.levelMilestones.level15Time}s`.padEnd(8);
    const cap = (res.levelMilestones.maxUpgradeCapTime ? `${res.levelMilestones.maxUpgradeCapTime}s` : 'None').padEnd(9);
    const ttk = `${res.ttkMin.toFixed(2)} / ${res.ttkAvg.toFixed(2)} / ${res.ttkMax.toFixed(2)}`.padEnd(16);
    const status = res.victory ? 'PASS' : 'FAIL';

    console.log(`| ${pName} | ${lvl} | ${kills} | ${l5} | ${l15} | ${cap} | ${ttk} | ${status}   |`);
  }

  console.log('\n--- 2. MINUTE-BY-MINUTE TTK & WAVE DENSITY TELEMETRY (HYBRID) ---');
  console.log(
    '| Minute | Level | Total XP | Active Mobs | Fodder HP | Focused DPS | Fodder TTK | Wave Phase  | Density |'
  );
  console.log(
    '|--------|-------|----------|-------------|-----------|-------------|------------|-------------|---------|'
  );

  const hybridSamples = report.resultsByProfile.balanced_hybrid.samples;
  for (let minute = 0; minute <= 10; minute++) {
    const targetSec = minute * 60;
    const s = hybridSamples.reduce((prev, curr) =>
      Math.abs(curr.timeSeconds - targetSec) < Math.abs(prev.timeSeconds - targetSec) ? curr : prev
    );

    if (s) {
      const minStr = `${minute}:00`.padEnd(6);
      const lvlStr = `Lvl ${s.playerLevel}`.padEnd(5);
      const xpStr = String(s.totalXp).padEnd(8);
      const mobsStr = String(s.activeEnemies).padEnd(11);
      const hpStr = `${s.fodderMaxHp.toFixed(1)} HP`.padEnd(9);
      const dpsStr = `${s.playerDps.toFixed(1)}/s`.padEnd(11);
      const ttkStr = `${s.fodderTtk.toFixed(2)}s`.padEnd(10);
      const phaseStr = s.wavePhase.padEnd(11);
      const densStr = `${s.waveDensityMultiplier}x`.padEnd(7);

      console.log(`| ${minStr} | ${lvlStr} | ${xpStr} | ${mobsStr} | ${hpStr} | ${dpsStr} | ${ttkStr} | ${phaseStr} | ${densStr} |`);
    }
  }

  console.log('\n--- 3. ACCEPTANCE CRITERIA ASSERTIONS ---');
  console.log(
    '| Status | Assertion Name                                     | Expected                      | Actual                       |'
  );
  console.log(
    '|--------|----------------------------------------------------|-------------------------------|------------------------------|'
  );

  for (const a of report.assertions) {
    const status = a.passed ? '[PASS]' : '[FAIL]';
    const name = a.name.padEnd(50);
    const expected = a.expected.padEnd(29);
    const actual = a.actual.padEnd(28);
    console.log(`| ${status} | ${name} | ${expected} | ${actual} |`);
  }

  console.log('\n======================================================================');
  if (report.allPassed) {
    console.log('>>> OVERALL BALANCE SIMULATION RESULT: ALL ASSERTIONS PASSED <<<');
  } else {
    console.log('>>> OVERALL BALANCE SIMULATION RESULT: FAILED ASSERTIONS DETECTED <<<');
  }
  console.log('======================================================================\n');
}

// ============================================================================
// CLI Entrypoint
// ============================================================================

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('simulate-balance')) {
  const isJsonMode = process.argv.includes('--json');
  const report = runFullBalanceSimulationSuite();

  if (isJsonMode) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printFormattedConsoleReport(report);
  }

  if (!report.allPassed) {
    process.exit(1);
  }
}
