import type { HeroDefinition } from '../definitions';

export const WORM_HERO: HeroDefinition = {
  id: 'hero_worm',
  name: 'Червяк Тони',
  comicTitle: 'THE SLIME SLINGER',
  description: 'Мобильный survival-боец. Плюется липкой слизью и оставляет едкие лужи.',
  lore: 'Бывший дождевой червяк, упавший в чан с токсичными отходами канализации. Теперь полон ярости и слизи.',
  textureKey: 'tony_idle_1',
  portraitKey: 'tony_portrait',
  stats: {
    maxHp: 100,
    speed: 220,
    damage: 11,
    armor: 0,
    attackSpeed: 1.3,
  },
  attackIntervalMs: 770,
  attackRange: 280,
  projectileSpeed: 580,
  projectileSize: 7,
  startingWeaponId: 'weapon_homing_daggers',
  trait: {
    id: 'trait_wriggle',
    name: 'Извиватель',
    comicTag: 'WRIGGLE POWER',
    description: 'Регенерирует здоровье и оставляет токсичные лужи при непрерывном беге.',
    apply: (modifiers) => {
      modifiers.hpRegenPerSec += 0.5;
    },
  },
};
