import type { EnemyDefinition } from '../definitions';

export const BOSS_KURGAN: EnemyDefinition = {
  id: 'boss_kurgan',
  name: 'Барон фон Канализиус',
  textureKey: 'tex_boss_run_1',
  animKey: 'anim_boss_run',
  archetype: 'boss',
  size: 46,
  displayScale: 0.72,
  mass: 15,
  stats: {
    maxHp: 1800,
    speed: 76,
    damage: 22,
    armor: 2,
  },
  xpReward: 100,
};
