import type { EnemyDefinition } from '../definitions';

export const SPRINTER_BUG: EnemyDefinition = {
  id: 'enemy_sprinter',
  name: 'Спринтер',
  textureKey: 'tex_sprinter',
  archetype: 'sprinter',
  size: 12,
  mass: 1,
  stats: {
    maxHp: 10,
    speed: 175,
    damage: 6,
    armor: 0,
  },
  xpReward: 3,
};
