import type { HeroDefinition } from './definitions';

export const STARTER_HERO: HeroDefinition = {
  id: 'hero_starter',
  name: 'Scout',
  description: 'Balanced starting survivor with standard mobility.',
  textureKey: 'tex_hero',
  stats: {
    maxHp: 100,
    speed: 220,
    damage: 20,
    armor: 0,
    attackSpeed: 1.0,
  },
  startingWeaponId: 'weapon_blaster',
};

export const HEROES_REGISTRY: Record<string, HeroDefinition> = {
  [STARTER_HERO.id]: STARTER_HERO,
};
