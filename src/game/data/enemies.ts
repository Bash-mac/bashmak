import type { EnemyDefinition } from './definitions';

export const DUMMY_ENEMY: EnemyDefinition = {
  id: 'enemy_dummy',
  name: 'Training Drone',
  textureKey: 'tex_enemy',
  stats: {
    maxHp: 30,
    speed: 100,
    damage: 10,
    armor: 0,
  },
  xpReward: 5,
  aiBehavior: 'chase',
};

export const ENEMIES_REGISTRY: Record<string, EnemyDefinition> = {
  [DUMMY_ENEMY.id]: DUMMY_ENEMY,
};
