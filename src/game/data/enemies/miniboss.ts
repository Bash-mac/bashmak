import type { EnemyDefinition } from '../definitions';

export const MINI_BOSS_ELITE: EnemyDefinition = {
  id: 'enemy_miniboss',
  name: 'Хрякоглот',
  textureKey: 'tex_miniboss_run_1',
  animKey: 'anim_miniboss_run',
  archetype: 'miniboss',
  size: 36,
  displayScale: 0.52,
  mass: 8,
  stats: {
    maxHp: 400,
    speed: 67,
    damage: 18,
    armor: 1,
  },
  xpReward: 35,
};
