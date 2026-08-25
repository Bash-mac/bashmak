import type { EnemyDefinition } from '../definitions';

export const FODDER_BAT: EnemyDefinition = {
  id: 'enemy_fodder',
  name: 'Летучая Мышь',
  textureKey: 'tex_fodder',
  archetype: 'fodder',
  size: 12,
  mass: 1,
  stats: {
    maxHp: 6,
    speed: 115,
    damage: 4,
    armor: 0,
  },
  xpReward: 1,
};
