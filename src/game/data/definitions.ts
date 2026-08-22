import type { StatsData, StatsComponent } from '../entities/components/StatsComponent';
import type { HealthComponent } from '../entities/components/HealthComponent';

export interface HeroDefinition {
  id: string;
  name: string;
  description: string;
  textureKey: string;
  stats: StatsData;
  attackIntervalMs: number;
  attackRange: number;
  projectileSpeed: number;
  projectileSize: number;
  startingWeaponId: string;
}

export type EnemyArchetype = 'fodder' | 'swarmer' | 'sprinter' | 'tank' | 'exploder' | 'miniboss' | 'boss';

export interface EnemyDefinition {
  id: string;
  name: string;
  textureKey: string;
  stats: StatsData;
  xpReward: number;
  archetype: EnemyArchetype;
  size: number;
  mass?: number;
  explosionRadius?: number;
  explosionDamage?: number;
}

export interface WeaponDefinition {
  id: string;
  name: string;
  description: string;
  damage: number;
  attackIntervalMs: number;
  projectileSpeed: number;
  projectileTextureKey: string;
  range: number;
}

export interface PlayerModifiers {
  // 1. Двойной плевок
  doubleSpitChance: number; // 0 to 1
  multishotCount: number; // 1, 2, 3, 4
  bounceCount: number; // ricochets

  // 2. Быстрая слюна
  attackSpeedBonus: number; // % bonus
  burstFireCount: number; // 1, 2, 3

  // 3. Разбрызгивание
  splashRadius: number; // radius
  splashPercent: number; // damage ratio
  splashKnockback: boolean;
  splashStun: boolean;

  // 4. Ядовитая слюна
  poisonSalivaDmg: number; // dps
  poisonDurationMs: number;
  poisonExplodeOnDeath: boolean;
  poisonSpreadOnDeath: boolean;

  // 5. Липкая слизь
  slowPercent: number;
  slowDurationMs: number;
  spawnSlimePuddles: boolean;
  slimePuddleDps: number;

  // 6. Пробивной плевок
  pierceCount: number;
  fullDamagePierce: boolean;
  armorShred: number;

  // 7. Клыкастый плевок
  damagePercentBonus: number;
  critChance: number;
  critMultiplier: number;
  executeLowHpThreshold: number; // e.g. 0.15 for 15%

  // 8. Живучая кожа
  hpRegenPerSec: number;
  chitinShieldOnHit: boolean;

  // 9. Кровожадность
  healOnKill: number;
  executeFodderChance: number;
  berserkOnKillTimer: number;

  // 10. Горячая кровь
  lowHpDmgThreshold: number; // e.g. 0.50
  lowHpDmgBonus: number;
  fireAuraLowHp: boolean;
  cheatDeathUsed: boolean;
  cheatDeathUnlocked: boolean;

  // Trackers
  fatSpitScale: number;
  extraRange: number;
  wriggleDash: boolean;
  acidTrail: boolean;
}

export interface UpgradeLevelConfig {
  level: number;
  description: string;
  apply: (modifiers: PlayerModifiers, stats: StatsComponent, health: HealthComponent) => void;
}

export interface UpgradeDefinition {
  id: string;
  name: string;
  isConsumable?: boolean;
  iconKey?: string;
  maxLevel: number;
  levels: UpgradeLevelConfig[];
}
