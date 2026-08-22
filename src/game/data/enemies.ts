import type { EnemyDefinition } from './definitions';

// 1. Летучая мышь / Мелочь (Fodder) — ваншотается, дает фан и поток опыта
export const FODDER_BAT: EnemyDefinition = {
  id: 'enemy_fodder',
  name: 'Летучая Мышь',
  textureKey: 'tex_fodder',
  archetype: 'fodder',
  size: 12,
  mass: 1,
  stats: {
    maxHp: 10,
    speed: 170,
    damage: 5,
    armor: 0,
  },
  xpReward: 2,
};

// 2. Ползун (Swarmer) — базовая плотная масса
export const CRAWLER_SWARM: EnemyDefinition = {
  id: 'enemy_crawler',
  name: 'Ползун',
  textureKey: 'tex_crawler',
  archetype: 'swarmer',
  size: 16,
  mass: 2,
  stats: {
    maxHp: 22,
    speed: 130,
    damage: 7,
    armor: 0,
  },
  xpReward: 4,
};

// 3. Спринтер (Fast Flanker) — быстрый жук, нападает с флангов
export const SPRINTER_BUG: EnemyDefinition = {
  id: 'enemy_sprinter',
  name: 'Спринтер',
  textureKey: 'tex_sprinter',
  archetype: 'sprinter',
  size: 12,
  mass: 1,
  stats: {
    maxHp: 10,
    speed: 205,
    damage: 6,
    armor: 0,
  },
  xpReward: 5,
};

// 4. Броневик / Таран (Armored Tank) — медленный, жирный, пробивает путь
export const ARMORED_SLUG: EnemyDefinition = {
  id: 'enemy_tank',
  name: 'Броневик',
  textureKey: 'tex_tank',
  archetype: 'tank',
  size: 24,
  mass: 5,
  stats: {
    maxHp: 75,
    speed: 80,
    damage: 15,
    armor: 1,
  },
  xpReward: 12,
};

// 5. Разрывник (Exploder) — при сближении шипит 1с (телеграф), затем бахает
export const EXPLODER_SPORE: EnemyDefinition = {
  id: 'enemy_exploder',
  name: 'Разрывник',
  textureKey: 'tex_exploder',
  archetype: 'exploder',
  size: 16,
  mass: 2,
  stats: {
    maxHp: 18,
    speed: 160,
    damage: 5,
    armor: 0,
  },
  explosionRadius: 80,
  explosionDamage: 22,
  xpReward: 6,
};

// 6. Элитный Мутант (Mini-Boss) — появляется на 5-й минуте
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
  xpReward: 45,
};

// 7. Финальный Босс — «Курган» (на 10-й минуте)
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
  xpReward: 150,
};

export const ENEMIES_REGISTRY: Record<string, EnemyDefinition> = {
  [FODDER_BAT.id]: FODDER_BAT,
  [CRAWLER_SWARM.id]: CRAWLER_SWARM,
  [SPRINTER_BUG.id]: SPRINTER_BUG,
  [ARMORED_SLUG.id]: ARMORED_SLUG,
  [EXPLODER_SPORE.id]: EXPLODER_SPORE,
  [MINI_BOSS_ELITE.id]: MINI_BOSS_ELITE,
  [BOSS_KURGAN.id]: BOSS_KURGAN,
};

export const DUMMY_ENEMY = CRAWLER_SWARM;
