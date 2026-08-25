import type { EnemyDefinition } from '../definitions';

export const MINI_BOSS_ELITE: EnemyDefinition = {
  id: 'enemy_miniboss',
  name: 'Элитный Мутант',
  textureKey: 'tex_miniboss',
  archetype: 'miniboss',
  size: 30,
  mass: 8,
  stats: {
    maxHp: 400,
    speed: 110,
    damage: 18,
    armor: 1,
  },
  xpReward: 30,
};
