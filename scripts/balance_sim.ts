import { WORM_HERO } from '../src/game/data/heroes';
import { WORM_UPGRADES } from '../src/game/data/upgrades';
import {
  FODDER_BAT,
  CRAWLER_SWARM,
  SPRINTER_BUG,
  ARMORED_SLUG,
  EXPLODER_SPORE,
  MINI_BOSS_ELITE,
  BOSS_KURGAN,
} from '../src/game/data/enemies';
import type { EnemyDefinition, UpgradeDefinition, PlayerModifiers } from '../src/game/data/definitions';

function getDefaultModifiers(): PlayerModifiers {
  return {
    doubleSpitChance: 0,
    multishotCount: 1,
    bounceCount: 0,
    attackSpeedBonus: 0,
    burstFireCount: 1,
    splashRadius: 0,
    splashPercent: 0,
    splashKnockback: false,
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
    homingDaggersLevel: 1,
    homingDaggersCount: 3,
    bouncingBonesLevel: 0,
    bouncingBonesCount: 0,
    lightningZapLevel: 0,
    staticZapCharge: 0,
    staticZapMax: 100,
    acidTrailLevel: 0,
    acidTrailDps: 0,

    // Global Tomes
    tomeQuantity: 0,
    tomeSpeed: 0,
    tomeMagnet: 0,
    tomeCritSize: 0,
  };
}

interface SimEnemy {
  def: EnemyDefinition;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  x: number;
  y: number;
}

function runSingleMatch(
  strategy: 'random' | 'vypolzok_homing_spam' | 'tesla_zap' | 'tank_bones',
  config: {
    startHp: number;
    baseDmg: number;
    boneDmg: number;
    zapDmg: number;
    zapChargeRate: number;
    iframeDuration: number;
    miniBossHp: number;
    bossHp: number;
    mobHpRate: number;
    mobHpQuad: number;
    mobDmgRate: number;
    earlyMobCount: number;
  }
): {
  survivedSeconds: number;
  level: number;
  kills: number;
  deathReason: string;
} {
  let time = 0;
  const dt = 0.1;
  let playerHp = config.startHp;
  let maxHpDynamic = config.startHp;
  let playerLevel = 1;
  let currentXp = 0;
  let nextLevelXp = 16;
  let kills = 0;

  const mods = getDefaultModifiers();
  const activeSlots = new Map<string, number>();
  activeSlots.set('wpn_homing_daggers', 1); // Starting weapon slot

  const health = {
    heal: (val: number) => { playerHp = Math.min(maxHpDynamic, playerHp + val); },
  };
  const stats = {
    modifyMaxHp: (val: number) => { maxHpDynamic += val; playerHp += val; },
    maxHp: maxHpDynamic,
  };

  let px = 0;
  let py = 0;
  let enemies: SimEnemy[] = [];
  let attackTimer = 0;
  let boneTimer = 0;
  let staticZapCurrent = 0;
  let spawnTimer = 0;
  let miniBossSpawned = false;
  let bossSpawned = false;
  let iframeTimer = 0;

  while (time < 600 && playerHp > 0) {
    time += dt;
    const minutes = time / 60;

    if (mods.hpRegenPerSec > 0) {
      playerHp = Math.min(maxHpDynamic, playerHp + mods.hpRegenPerSec * dt);
    }
    if (iframeTimer > 0) iframeTimer -= dt;

    // 1. Spawning Logic
    const scaling = {
      hpMultiplier: 1 + config.mobHpRate * minutes + config.mobHpQuad * minutes * minutes,
      speedMultiplier: 1 + 0.04 * minutes,
      damageMultiplier: 1 + config.mobDmgRate * minutes,
    };

    if (minutes >= 5.0 && !miniBossSpawned) {
      miniBossSpawned = true;
      const angle = Math.random() * Math.PI * 2;
      enemies.push({
        def: MINI_BOSS_ELITE,
        hp: config.miniBossHp * scaling.hpMultiplier,
        maxHp: config.miniBossHp * scaling.hpMultiplier,
        speed: 115 * scaling.speedMultiplier,
        damage: 20 * scaling.damageMultiplier,
        x: px + Math.cos(angle) * 450,
        y: py + Math.sin(angle) * 450,
      });
    }

    if (minutes >= 10.0 && !bossSpawned) {
      bossSpawned = true;
      const angle = Math.random() * Math.PI * 2;
      enemies.push({
        def: BOSS_KURGAN,
        hp: config.bossHp * scaling.hpMultiplier,
        maxHp: config.bossHp * scaling.hpMultiplier,
        speed: 125 * scaling.speedMultiplier,
        damage: 25 * scaling.damageMultiplier,
        x: px + Math.cos(angle) * 550,
        y: py + Math.sin(angle) * 550,
      });
    }

    let targetPop = config.earlyMobCount;
    if (minutes < 1.0) targetPop = config.earlyMobCount;
    else if (minutes < 2.5) targetPop = 55;
    else if (minutes < 4.0) targetPop = 80;
    else if (minutes < 6.0) targetPop = 105;
    else targetPop = 135;

    spawnTimer += dt * 1000;
    if (spawnTimer >= 250 && enemies.length < targetPop) {
      spawnTimer = 0;
      let m_hp = 10, m_spd = 180, m_dmg = 6, m_xp = 1;
      const def = FODDER_BAT;

      if (minutes < 0.6) {
        if (Math.random() > 0.55) { m_hp = 24; m_spd = 135; m_dmg = 8; m_xp = 2; }
      } else if (minutes < 2.5) {
        const r = Math.random();
        if (r < 0.35) { m_hp = 10; m_spd = 180; m_dmg = 6; m_xp = 1; }
        else if (r < 0.70) { m_hp = 24; m_spd = 135; m_dmg = 8; m_xp = 2; }
        else { m_hp = 12; m_spd = 215; m_dmg = 7; m_xp = 2; }
      } else {
        const r = Math.random();
        if (r < 0.25) { m_hp = 10; m_spd = 180; m_dmg = 6; m_xp = 1; }
        else if (r < 0.50) { m_hp = 24; m_spd = 135; m_dmg = 8; m_xp = 2; }
        else if (r < 0.75) { m_hp = 12; m_spd = 215; m_dmg = 7; m_xp = 2; }
        else { m_hp = 85; m_spd = 85; m_dmg = 16; m_xp = 4; }
      }

      const angle = Math.random() * Math.PI * 2;
      const dist = 360 + Math.random() * 70;
      enemies.push({
        def,
        hp: m_hp * scaling.hpMultiplier,
        maxHp: m_hp * scaling.hpMultiplier,
        speed: m_spd * scaling.speedMultiplier,
        damage: m_dmg * scaling.damageMultiplier,
        x: px + Math.cos(angle) * dist,
        y: py + Math.sin(angle) * dist,
      });
    }

    // 2. Player Movement & Crowd Resistance
    let kiteDx = 0;
    let kiteDy = 0;
    let touchingCount = 0;
    for (const e of enemies) {
      const d = Math.hypot(px - e.x, py - e.y);
      if (d < 220 && d > 0) {
        kiteDx += (px - e.x) / d;
        kiteDy += (py - e.y) / d;
      }
      if (d < 35) touchingCount++;
    }
    const kiteLen = Math.hypot(kiteDx, kiteDy);
    let pSpeed = (210) * (mods.wriggleDash ? 1.25 : 1);
    if (touchingCount > 0) {
      pSpeed *= Math.max(0.50, 1 - touchingCount * 0.10);
    }

    if (kiteLen > 0) {
      px += (kiteDx / kiteLen) * pSpeed * dt;
      py += (kiteDy / kiteLen) * pSpeed * dt;

      // Charge Static Zap on movement
      if (mods.lightningZapLevel > 0) {
        staticZapCurrent += dt * 1000 * (config.zapChargeRate + (mods.lightningZapLevel - 1) * 0.008);
        if (staticZapCurrent >= (mods.staticZapMax || 100)) {
          staticZapCurrent = 0;
          const zapTargets = enemies.slice(0, 3 + mods.lightningZapLevel);
          for (const zt of zapTargets) {
            const zapDmg = Math.round(config.zapDmg * (1 + mods.damagePercentBonus) * (1 + mods.lightningZapLevel * 0.20));
            zt.hp -= zapDmg;
          }
        }
      }

      // Acid Trail
      if (mods.acidTrail) {
        for (const e of enemies) {
          if (Math.hypot(px - e.x, py - e.y) < 45) {
            const trailDmg = (mods.acidTrailDps || 12) * dt;
            e.hp -= trailDmg;
          }
        }
      }
    }

    // 3. Enemy Pursuit & Damage to player
    for (const e of enemies) {
      const d = Math.hypot(px - e.x, py - e.y);
      if (d > 10) {
        let effSpd = e.speed;
        if (mods.slowPercent > 0 && d < 120) effSpd *= (1 - mods.slowPercent);
        e.x += ((px - e.x) / d) * effSpd * dt;
        e.y += ((py - e.y) / d) * effSpd * dt;
      }

      if (d <= 22) {
        if (iframeTimer <= 0) {
          iframeTimer = config.iframeDuration;
          const netDamage = Math.max(1, e.damage - mods.armorShred);
          playerHp -= netDamage;
          if (playerHp <= 0 && mods.cheatDeathUnlocked && !mods.cheatDeathUsed) {
            mods.cheatDeathUsed = true;
            playerHp = maxHpDynamic * 0.5;
          }
        }
      }
    }

    // 4. Weapon 1: Wireless Homing Daggers (Distributed Multi-Target)
    const baseSpeed = 1.35 * (1 + mods.attackSpeedBonus);
    const interval = 1.0 / baseSpeed;
    attackTimer += dt;

    if (attackTimer >= interval && enemies.length > 0) {
      attackTimer = 0;
      enemies.sort((a, b) => Math.hypot(px - a.x, py - a.y) - Math.hypot(px - b.x, py - b.y));

      let baseDmg = config.baseDmg * (1 + mods.damagePercentBonus);
      if (mods.critChance > 0 && Math.random() < mods.critChance) {
        baseDmg *= mods.critMultiplier;
      }

      const totalDaggers = mods.homingDaggersCount * mods.burstFireCount;
      const pierce = 0.78 + (mods.pierceCount || 0) * 0.28;

      for (let i = 0; i < totalDaggers; i++) {
        const target = enemies[i % Math.min(enemies.length, 6)];
        if (target) {
          const dmg = baseDmg * pierce;
          target.hp -= dmg;

          if (mods.splashPercent > 0) {
            const splashDmg = dmg * mods.splashPercent;
            for (let s = 0; s < Math.min(4, enemies.length); s++) {
              if (enemies[s] !== target) {
                enemies[s].hp -= splashDmg;
              }
            }
          }
        }
      }
    }

    // 4.5 Weapon 2: Bouncing Bones (Multi-Target Ricochet)
    if (mods.bouncingBonesLevel > 0) {
      boneTimer += dt;
      const bInterval = 1.20 / (1 + mods.attackSpeedBonus * 0.7);
      if (boneTimer >= bInterval && enemies.length > 0) {
        boneTimer = 0;
        const count = Math.min(3, mods.bouncingBonesCount);
        const bounces = 2 + (mods.bounceCount || 0);
        const bDmg = 17.5 * (1 + mods.damagePercentBonus);

        for (let c = 0; c < count; c++) {
          for (let b = 0; b < bounces; b++) {
            const target = enemies[(c * bounces + b) % enemies.length];
            if (target) {
              target.hp -= bDmg;
            }
          }
        }
      }
    }

    // 5. Resolve Kills & XP
    const aliveEnemies: SimEnemy[] = [];
    for (const e of enemies) {
      if (e.hp <= 0) {
        kills += 1;
        const xp = e.def.id === 'enemy_fodder' ? 1 : 2;
        currentXp += xp;

        // 2.5% chance for dead enemy to drop a healing slime chunk (+12 HP)
        if (Math.random() < 0.025) {
          playerHp = Math.min(maxHpDynamic, playerHp + 12);
        }

        if (mods.healOnKill > 0) {
          playerHp = Math.min(maxHpDynamic, playerHp + mods.healOnKill * 0.15);
        }
      } else {
        aliveEnemies.push(e);
      }
    }
    enemies = aliveEnemies;

    // 6. Level Up Trigger
    while (currentXp >= nextLevelXp) {
      currentXp -= nextLevelXp;
      playerLevel += 1;
      nextLevelXp = Math.round(16 + Math.pow(playerLevel, 1.72) * 7.2);

      const pool = WORM_UPGRADES.filter((u) => {
        const cur = activeSlots.get(u.id) || 0;
        if (cur >= u.maxLevel) return false;
        if (activeSlots.size >= 4 && !activeSlots.has(u.id)) return false;
        return true;
      });

      let chosen: UpgradeDefinition | null = null;
      if (pool.length > 0) {
        if (strategy === 'vypolzok_homing_spam') {
          // Priority to slime spit, attack interval, attack speed, movement speed
          const spit = shopUpgrades.find((u) => u.id === 'weapon_slime_spit');
          const attackSpeed = shopUpgrades.find((u) => u.id === 'stat_attack_speed');
          const attackInterval = shopUpgrades.find((u) => u.id === 'stat_attack_interval');
          const moveSpeed = shopUpgrades.find((u) => u.id === 'stat_speed');

          if (spit) chosen = spit;
          else if (attackInterval) chosen = attackInterval;
          else if (attackSpeed) chosen = attackSpeed;
          else if (moveSpeed) chosen = moveSpeed;
        } else if (strategy === 'tesla_zap') {
          chosen = pool.find((u) => ['wpn_lightning_zap', 'wpn_acid_trail', 'tome_speed', 'tome_vitality'].includes(u.id)) || pool[0];
        } else if (strategy === 'tank_bones') {
          chosen = pool.find((u) => ['wpn_bouncing_bones', 'wpn_acid_trail', 'tome_vitality', 'tome_quantity', 'tome_crit_size'].includes(u.id)) || pool[0];
        } else {
          // 4th Archetype: Hybrid (Daggers + Acid Trail + Vitality + Quantity)
          chosen =
            pool.find((u) =>
              ['wpn_homing_daggers', 'wpn_acid_trail', 'tome_vitality', 'tome_quantity'].includes(u.id)
            ) || pool[0];
        }

        const nextLvl = (activeSlots.get(chosen.id) || 0) + 1;
        activeSlots.set(chosen.id, nextLvl);
        const lvlCfg = chosen.levels.find((l) => l.level === nextLvl) || chosen.levels[0];
        lvlCfg.apply(mods as any, stats as any, health as any);
      } else {
        playerHp = Math.min(maxHpDynamic, playerHp + 25);
      }
    }
  }

  let deathReason = 'Survived Full 10 Minutes! (Victory)';
  if (playerHp <= 0) {
    enemies.sort((a, b) => Math.hypot(px - a.x, py - a.y) - Math.hypot(px - b.x, py - b.y));
    deathReason = enemies[0]?.def.name || 'Swarmed by horde';
  }

  return {
    survivedSeconds: Math.round(time),
    level: playerLevel,
    kills,
    deathReason,
  };
}

export function runSimulationSuite(totalRuns = 1000) {
  const config = {
    startHp: 108,
    baseDmg: 11.8,
    boneDmg: 17.5,
    zapDmg: 11.5,
    zapChargeRate: 0.017,
    iframeDuration: 0.36,
    miniBossHp: 1750,
    bossHp: 4200,
    mobHpRate: 0.64,
    mobHpQuad: 0.026,
    mobDmgRate: 0.34,
    earlyMobCount: 26,
  };

  console.log(`\n=== 🧪 RUNNING CALIBRATED BALANCE SIMULATION (${totalRuns} RUNS) ===\n`);

  const strategies: Array<'random' | 'vypolzok_homing_spam' | 'tesla_zap' | 'tank_bones'> = [
    'random',
    'vypolzok_homing_spam',
    'tesla_zap',
    'tank_bones',
  ];

  const resultsByStrategy: Record<string, any[]> = {
    random: [],
    vypolzok_homing_spam: [],
    tesla_zap: [],
    tank_bones: [],
  };


  const runsPerStrategy = Math.floor(totalRuns / strategies.length);

  for (const strat of strategies) {
    for (let i = 0; i < runsPerStrategy; i++) {
      resultsByStrategy[strat].push(runSingleMatch(strat, config));
    }
  }

  console.log('| Strategy / Build         | Avg Survived Time | Avg Level | Avg Kills | Win Rate (10m) | Deaths 0-3m | Deaths 3-7m |');
  console.log('|--------------------------|-------------------|-----------|-----------|----------------|-------------|-------------|');

  for (const strat of strategies) {
    const runs = resultsByStrategy[strat];
    const avgTime = (runs.reduce((acc, r) => acc + r.survivedSeconds, 0) / runs.length).toFixed(1);
    const avgLevel = (runs.reduce((acc, r) => acc + r.level, 0) / runs.length).toFixed(1);
    const avgKills = Math.round(runs.reduce((acc, r) => acc + r.kills, 0) / runs.length);
    const wins = runs.filter((r) => r.survivedSeconds >= 600).length;
    const winRate = ((wins / runs.length) * 100).toFixed(1) + '%';
    const deathsEarly = ((runs.filter((r) => r.survivedSeconds < 180).length / runs.length) * 100).toFixed(1) + '%';
    const deathsMid = ((runs.filter((r) => r.survivedSeconds >= 180 && r.survivedSeconds < 420).length / runs.length) * 100).toFixed(1) + '%';

    console.log(
      `| ${strat.padEnd(24)} | ${(avgTime + 's').padEnd(17)} | ${avgLevel.padEnd(9)} | ${String(avgKills).padEnd(9)} | ${winRate.padEnd(14)} | ${deathsEarly.padEnd(11)} | ${deathsMid.padEnd(11)} |`
    );
  }

  console.log('\n=== ✅ SIMULATION COMPLETE ===\n');
}

runSimulationSuite(1000);
