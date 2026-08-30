import type { EnemyDefinition } from '../definitions';

export const SPRINTER_BUG: EnemyDefinition = {
  id: 'enemy_sprinter',
  name: 'Турбо-Вошь',
  textureKey: 'tex_sprinter_run_1',
  animKey: 'anim_sprinter_run',
  archetype: 'sprinter',
  size: 14,
  displayScale: 0.24,
  mass: 1,
  stats: {
    maxHp: 14,
    speed: 130,
    damage: 6,
    armor: 0,
  },
  xpReward: 3,
};
