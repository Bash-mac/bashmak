import type { HeroDefinition } from '../definitions';
import { VYPOLZOK_HERO } from './vypolzok';
// import { BASHMAK_HERO } from './bashmak';
import { MARKOVKA_HERO } from './markovka';
// import { BAKLAZHAN_HERO } from './baklazhan';

export { VYPOLZOK_HERO, WORM_HERO } from './vypolzok';
// export { BASHMAK_HERO } from './bashmak';
export { MARKOVKA_HERO } from './markovka';
// export { BAKLAZHAN_HERO } from './baklazhan';

export const HEROES_REGISTRY: Record<string, HeroDefinition> = {
  [VYPOLZOK_HERO.id]: VYPOLZOK_HERO,
  hero_worm: VYPOLZOK_HERO, // Backward-compat for existing saves
  // [BASHMAK_HERO.id]: BASHMAK_HERO,
  [MARKOVKA_HERO.id]: MARKOVKA_HERO,
  // [BAKLAZHAN_HERO.id]: BAKLAZHAN_HERO,
};

export const ALL_HEROES: HeroDefinition[] = [
  VYPOLZOK_HERO,
  // BASHMAK_HERO,
  MARKOVKA_HERO,
  // BAKLAZHAN_HERO,
];

export const STARTER_HERO = VYPOLZOK_HERO;

export function getHeroById(id: string): HeroDefinition {
  return HEROES_REGISTRY[id] || STARTER_HERO;
}
