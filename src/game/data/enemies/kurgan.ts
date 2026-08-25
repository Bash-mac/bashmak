import type { EnemyDefinition } from '../definitions';

export const BOSS_KURGAN: EnemyDefinition = {
  id: 'boss_kurgan',
  name: 'Курган',
  textureKey: 'tex_boss_kurgan',
  archetype: 'boss',
  size: 40,
  mass: 15,
  stats: {
    maxHp: 1100,
    speed: 120,
    damage: 22,
    armor: 2,
  },
  xpReward: 100,
};
