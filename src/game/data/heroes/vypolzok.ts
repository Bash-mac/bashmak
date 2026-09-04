import type { HeroDefinition } from '../definitions';

export const VYPOLZOK_HERO: HeroDefinition = {
  id: 'hero_vypolzok',
  name: 'Выползок',
  comicTitle: 'VYPOLZOK',
  description: 'Юркий кайтер. Плюется токсичной слизью и ускоряется на своих дорожках.',
  lore: 'Бывший дождевой червяк, упавший в чан с токсичными отходами канализации. Теперь полон ярости и липкой слизи.',
  textureKey: 'vypolzok_idle_1',
  portraitKey: 'vypolzok_portrait',
  posterKey: 'hero_card_worm',
  stats: {
    maxHp: 100,
    speed: 140,
    damage: 12,
    armor: 0,
    attackSpeed: 1.25,
  },
  attackIntervalMs: 760,
  attackRange: 300,
  projectileSpeed: 390,
  projectileSize: 10,
  startingWeaponId: 'weapon_slime_spit',
  trait: {
    id: 'trait_slime_trail',
    name: 'Слизистый след',
    comicTag: 'SLIME HIGHWAY',
    description: 'При беге оставляет дорожку слизи. Выползок на ней ускоряется на +20%, а враги вязнут (-25% к скорости).',
    apply: (modifiers) => {
      modifiers.hasSlimeTrail = true;
      modifiers.hpRegenPerSec += 0.3;
    },
  },
};

// Backward-compatibility alias
export const WORM_HERO = VYPOLZOK_HERO;
