import type { HeroDefinition } from './definitions';

export const WORM_HERO: HeroDefinition = {
  id: 'hero_worm',
  name: 'Червяк',
  description: 'Мобильный survival-боец. Плюется липкой слизью и усиливается при непрерывном движении.',
  textureKey: 'pose_idle',
  stats: {
    maxHp: 100,
    speed: 220,
    damage: 11,
    armor: 0,
    attackSpeed: 1.3,
  },
  attackIntervalMs: 770, // 1 / 1.3 ≈ 0.77s
  attackRange: 180,
  projectileSpeed: 420,
  projectileSize: 7,
  startingWeaponId: 'weapon_slime_spit',
};

export const HEROES_REGISTRY: Record<string, HeroDefinition> = {
  [WORM_HERO.id]: WORM_HERO,
};

export const STARTER_HERO = WORM_HERO;
