import type { HeroDefinition } from '../definitions';
import { WORM_HERO } from './worm';
import { BASHMAK_HERO } from './bashmak';
import { MARKOVKA_HERO } from './markovka';
import { BAKLAZHAN_HERO } from './baklazhan';

export { WORM_HERO } from './worm';
export { BASHMAK_HERO } from './bashmak';
export { MARKOVKA_HERO } from './markovka';
export { BAKLAZHAN_HERO } from './baklazhan';

export const HEROES_REGISTRY: Record<string, HeroDefinition> = {
  [WORM_HERO.id]: WORM_HERO,
  [BASHMAK_HERO.id]: BASHMAK_HERO,
  [MARKOVKA_HERO.id]: MARKOVKA_HERO,
  [BAKLAZHAN_HERO.id]: BAKLAZHAN_HERO,
};

export const ALL_HEROES: HeroDefinition[] = [
  WORM_HERO,
  BASHMAK_HERO,
  MARKOVKA_HERO,
  BAKLAZHAN_HERO,
];

export const STARTER_HERO = WORM_HERO;

export function getHeroById(id: string): HeroDefinition {
  return HEROES_REGISTRY[id] || STARTER_HERO;
}
