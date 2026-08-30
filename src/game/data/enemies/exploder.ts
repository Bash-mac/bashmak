import type { EnemyDefinition } from '../definitions';

export const EXPLODER_SPORE: EnemyDefinition = {
  id: 'enemy_exploder',
  name: 'Гнилопуз',
  textureKey: 'tex_exploder_run_1',
  animKey: 'anim_exploder_run',
  archetype: 'exploder',
  size: 18,
  displayScale: 0.28,
  mass: 2,
  stats: {
    maxHp: 16,
    speed: 95,
    damage: 5,
    armor: 0,
  },
  explosionRadius: 55,
  explosionDamage: 12,
  xpReward: 4,
};
