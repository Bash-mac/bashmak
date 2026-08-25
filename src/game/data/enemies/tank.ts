import type { EnemyDefinition } from '../definitions';

export const ARMORED_SLUG: EnemyDefinition = {
  id: 'enemy_tank',
  name: 'Броневик',
  textureKey: 'tex_tank',
  archetype: 'tank',
  size: 24,
  mass: 5,
  stats: {
    maxHp: 65,
    speed: 65,
    damage: 12,
    armor: 1,
  },
  xpReward: 6,
};
