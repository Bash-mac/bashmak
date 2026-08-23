import type { HeroDefinition } from '../definitions';

/**
 * Слот для 3-го персонажа.
 * Заполни поля под своего героя (имя, спрайты, статы, трейт).
 */
export const HERO_SLOT_3: HeroDefinition = {
  id: 'hero_3',
  name: 'Мутант 3',
  comicTitle: 'UNKNOWN MUTANT',
  description: 'Зарезервированный слот под нового героя.',
  lore: 'Секретный обитатель канализации, ожидающий своего часа.',
  textureKey: 'pose_alert',
  portraitKey: 'face_angry',
  stats: {
    maxHp: 120,
    speed: 210,
    damage: 13,
    armor: 1,
    attackSpeed: 1.2,
  },
  attackIntervalMs: 830,
  attackRange: 240,
  projectileSpeed: 500,
  projectileSize: 8,
  startingWeaponId: 'weapon_lightning_zap',
  trait: {
    id: 'trait_slot_3',
    name: 'Скрытый потенциал',
    comicTag: 'MYSTERY POWER',
    description: 'Особый врожденный бонус персонажа.',
  },
};
