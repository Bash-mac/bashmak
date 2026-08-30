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
    maxHp: 9,
    speed: 80,
    damage: 4,
    armor: 0,
  },
  xpReward: 1,
};
