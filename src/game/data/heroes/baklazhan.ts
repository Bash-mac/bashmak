import type { HeroDefinition } from '../definitions';

/**
 * Баклажан — таран-разрушитель.
 * Катится шаром через врагов, набирает momentum при непрерывном беге.
 */
export const BAKLAZHAN_HERO: HeroDefinition = {
  id: 'hero_baklazhan',
  name: 'Баклажан',
  comicTitle: 'THE ROLLING THUNDER',
  description: 'Фиолетовый таран. Разгоняется и давит всё на пути.',
  lore: 'Мутировавший баклажан из заброшенного парника. Круглый, тяжёлый, неостановимый.',
  textureKey: 'pose_heavy_prep',
  portraitKey: 'face_furious',
  stats: {
    maxHp: 150,
    speed: 200,
    damage: 20,
    armor: 2,
    attackSpeed: 1.0,
  },
  attackIntervalMs: 1200,
  attackRange: 200,
  projectileSpeed: 450,
  projectileSize: 14,
  startingWeaponId: 'weapon_eggplant_roll',
  trait: {
    id: 'trait_momentum',
    name: 'Разбег',
    comicTag: 'ROLLING THUNDER',
    description: 'Непрерывный бег даёт до +40% скорости. Столкновение на скорости наносит ram-урон.',
    apply: (modifiers) => {
      // Momentum tracking initialized; runtime logic in GameScene
      modifiers.momentumSpeedBonus = 0;
      modifiers.damagePercentBonus += 0.10;
      modifiers.splashKnockback = true;
    },
  },
};
