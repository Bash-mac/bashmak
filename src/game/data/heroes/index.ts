import type { HeroDefinition } from '../definitions';
import { WORM_HERO } from './worm';
import { BASHMAK_HERO } from './bashmak';
import { HERO_SLOT_3 } from './hero3';
import { HERO_SLOT_4 } from './hero4';

export { WORM_HERO } from './worm';
export { BASHMAK_HERO } from './bashmak';
export { HERO_SLOT_3 } from './hero3';
export { HERO_SLOT_4 } from './hero4';

export const HEROES_REGISTRY: Record<string, HeroDefinition> = {
  [WORM_HERO.id]: WORM_HERO,
  [BASHMAK_HERO.id]: BASHMAK_HERO,
  [HERO_SLOT_3.id]: HERO_SLOT_3,
  [HERO_SLOT_4.id]: HERO_SLOT_4,
};

export const ALL_HEROES: HeroDefinition[] = [
  WORM_HERO,
  BASHMAK_HERO,
  HERO_SLOT_3,
  HERO_SLOT_4,
];

export const STARTER_HERO = WORM_HERO;

export function getHeroById(id: string): HeroDefinition {
  return HEROES_REGISTRY[id] || STARTER_HERO;
}
