import type { EnemyDefinition } from '../definitions';
import { FODDER_BAT } from './fodder';
import { CRAWLER_SWARM } from './crawler';
import { SPRINTER_BUG } from './sprinter';
import { ARMORED_SLUG } from './tank';
import { EXPLODER_SPORE } from './exploder';
import { MINI_BOSS_ELITE } from './miniboss';
import { BOSS_KURGAN } from './kurgan';

export * from './fodder';
export * from './crawler';
export * from './sprinter';
export * from './tank';
export * from './exploder';
export * from './miniboss';
export * from './kurgan';

export const ENEMIES_REGISTRY: Record<string, EnemyDefinition> = {
  [FODDER_BAT.id]: FODDER_BAT,
  [CRAWLER_SWARM.id]: CRAWLER_SWARM,
  [SPRINTER_BUG.id]: SPRINTER_BUG,
  [ARMORED_SLUG.id]: ARMORED_SLUG,
  [EXPLODER_SPORE.id]: EXPLODER_SPORE,
  [MINI_BOSS_ELITE.id]: MINI_BOSS_ELITE,
  [BOSS_KURGAN.id]: BOSS_KURGAN,
};

export const ALL_ENEMIES: EnemyDefinition[] = [
  FODDER_BAT,
  CRAWLER_SWARM,
  SPRINTER_BUG,
  ARMORED_SLUG,
  EXPLODER_SPORE,
  MINI_BOSS_ELITE,
  BOSS_KURGAN,
];

export const DUMMY_ENEMY = CRAWLER_SWARM;

export function getEnemyById(id: string): EnemyDefinition {
  return ENEMIES_REGISTRY[id] || DUMMY_ENEMY;
}
