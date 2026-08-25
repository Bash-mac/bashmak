import type { EnemyDefinition } from '../definitions';

export const CRAWLER_SWARM: EnemyDefinition = {
  id: 'enemy_crawler',
  name: 'Ползун',
  textureKey: 'tex_crawler',
  archetype: 'swarmer',
  size: 16,
  mass: 2,
  stats: {
    maxHp: 18,
    speed: 85,
    damage: 6,
    armor: 0,
  },
  xpReward: 2,
};
