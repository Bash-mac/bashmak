import type { HeroDefinition } from '../definitions';

/**
 * Слот для 4-го персонажа.
 * Заполни поля под своего героя (имя, спрайты, статы, трейт).
 */
export const HERO_SLOT_4: HeroDefinition = {
  id: 'hero_4',
  name: 'Мутант 4',
  comicTitle: 'UNKNOWN MUTANT',
  description: 'Зарезервированный слот под нового героя.',
  lore: 'Секретный обитатель канализации, ожидающий своего часа.',
  textureKey: 'pose_heavy_prep',
  portraitKey: 'face_furious',
  stats: {
    maxHp: 90,
    speed: 250,
    damage: 15,
    armor: 0,
    attackSpeed: 1.4,
  },
  attackIntervalMs: 700,
  attackRange: 260,
  projectileSpeed: 550,
  projectileSize: 9,
  startingWeaponId: 'weapon_acid_trail',
  trait: {
    id: 'trait_slot_4',
    name: 'Скрытый потенциал',
    comicTag: 'MYSTERY POWER',
    description: 'Особый врожденный бонус персонажа.',
  },
};
