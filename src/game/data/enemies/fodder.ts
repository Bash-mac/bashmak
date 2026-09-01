import type { EnemyDefinition } from '../definitions';

export const FODDER_BAT: EnemyDefinition = {
  id: 'enemy_fodder',
  name: 'Чпококрыл',
  textureKey: 'tex_fodder_run_1',
  animKey: 'anim_fodder_run',
  archetype: 'fodder',
  size: 14,
  displayScale: 0.24,
  mass: 1,
  stats: {
    maxHp: 8,
    speed: 90,
    damage: 3,
    armor: 0,
  },
  xpReward: 1,
};
