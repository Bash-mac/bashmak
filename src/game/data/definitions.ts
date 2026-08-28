import type { StatsData, StatsComponent } from '../entities/components/StatsComponent';
import type { HealthComponent } from '../entities/components/HealthComponent';

export interface HeroTrait {
  id: string;
  name: string;
  comicTag: string;
  description: string;
  apply?: (modifiers: PlayerModifiers, stats: StatsData) => void;
}

export interface HeroDefinition {
  id: string;
  name: string;
  comicTitle?: string;
  description: string;
  lore?: string;
  textureKey: string;
  portraitKey?: string;
  posterKey?: string;
  stats: StatsData;
  startingWeaponId: string;
  trait?: HeroTrait;
  attackIntervalMs?: number;
  attackRange?: number;
  projectileSpeed?: number;
  projectileSize?: number;
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
  animKey?: string;
  displayScale?: number;
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
  knockbackMultiplier: number;
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
  healOnKillCooldownMs: number;
  healOnKillTimerMs: number;
  executeFodderChance: number;
  berserkOnKillTimer: number;

  // 10. Горячая кровь
  lowHpDmgThreshold: number; // e.g. 0.50
  lowHpDmgBonus: number;
  fireAuraLowHp: boolean;
  cheatDeathUsed: boolean;
  cheatDeathUnlocked: boolean;

  // Trackers & Megabonk Weapons/Tomes
  fatSpitScale: number;
  extraRange: number;
  magnetRadiusBonus: number;
  attackAreaBonus: number;
  wriggleDash: boolean;
  acidTrail: boolean;

  // Active Weapons
  slimeSpitLevel: number;
  laceWhipLevel: number;
  carrotBarrageLevel: number;
  eggplantRollLevel: number;
  homingDaggersLevel: number;
  homingDaggersCount: number;
  megaBootLevel: number;
  lightningZapLevel: number;
  staticZapCharge: number;
  staticZapMax: number;
  acidTrailLevel: number;
  hasSlimeTrail: boolean;
  toiletLidLevel?: number;
  toiletLidBounces?: number;
  toiletLidSlimeTrail?: boolean;

  damageReductionPercent: number;

  // Global Tomes
  tomeQuantity: number;
  tomeSpeed: number;
  tomeAttackSpeed: number;
  tomeArmor: number;
  tomeHpRegen: number;
  tomeLifesteal: number;
  tomeMagnet: number;
  tomeDamage: number;
  tomeCrit: number;
  tomeCritSize: number;
  tomeArea: number;

  // Hero trait runtime state
  standStillTimerMs: number;
  standStillBonusActive: boolean;  // Bashmak: damage/armor boost when stationary
  killStreakStacks: number;         // Markovka: kill streak speed stacks
  killStreakTimerMs: number;
  momentumSpeedBonus: number;       // Baklazhan: bonus from continuous movement
  straightRunTimerMs: number;

  // Super Evolutions
  isAcidTsunamiEvolved: boolean;
  isTyphoonFlailEvolved: boolean;
  isGatlingCarrotEvolved: boolean;
  isPlanetaryRollEvolved: boolean;
}

export type UpgradeCategory = 'weapon' | 'tome' | 'consumable';

export interface UpgradeLevelConfig {
  level: number;
  description: string;
  apply: (modifiers: PlayerModifiers, stats: StatsComponent, health: HealthComponent) => void;
}

export interface UpgradeDefinition {
  id: string;
  name: string;
  category?: UpgradeCategory;
  isConsumable?: boolean;
  iconKey?: string;
  exclusiveHeroId?: string;
  maxLevel: number;
  levels: UpgradeLevelConfig[];
}
