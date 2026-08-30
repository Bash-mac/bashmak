import type { EnemyDefinition } from '../definitions';

export const CRAWLER_SWARM: EnemyDefinition = {
  id: 'enemy_crawler',
  name: 'Тараканище',
  textureKey: 'tex_crawler_run_1',
  animKey: 'anim_crawler_run',
  archetype: 'swarmer',
  size: 18,
  displayScale: 0.28,
  mass: 2,
  stats: {
    maxHp: 24,
    speed: 60,
    damage: 6,
    armor: 0,
  },
  xpReward: 2,
};
