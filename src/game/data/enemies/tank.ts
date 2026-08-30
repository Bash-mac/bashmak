import type { EnemyDefinition } from '../definitions';

export const ARMORED_SLUG: EnemyDefinition = {
  id: 'enemy_tank',
  name: 'Засорог',
  textureKey: 'tex_tank_run_1',
  animKey: 'anim_tank_run',
  archetype: 'tank',
  size: 26,
  displayScale: 0.38,
  mass: 5,
  stats: {
    maxHp: 65,
    speed: 45,
    damage: 12,
    armor: 1,
  },
  xpReward: 6,
};
