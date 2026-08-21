import type { StatsData } from '../entities/components/StatsComponent';

export interface HeroDefinition {
  id: string;
  name: string;
  description: string;
  textureKey: string;
  stats: StatsData;
  startingWeaponId: string;
}

export interface EnemyDefinition {
  id: string;
  name: string;
  textureKey: string;
  stats: StatsData;
  xpReward: number;
  aiBehavior: 'chase' | 'wander' | 'stationary';
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

export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  icon?: string;
  apply: (stats: StatsData) => void;
}
