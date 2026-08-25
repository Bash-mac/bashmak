import type { EnemyDefinition } from '../definitions';

export const EXPLODER_SPORE: EnemyDefinition = {
  id: 'enemy_exploder',
  name: 'Разрывник',
  textureKey: 'tex_exploder',
  archetype: 'exploder',
  size: 16,
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
