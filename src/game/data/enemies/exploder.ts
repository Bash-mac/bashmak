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
    speed: 130,
    damage: 5,
    armor: 0,
  },
  explosionRadius: 80,
  explosionDamage: 20,
  xpReward: 4,
};
