import type { HeroDefinition } from '../definitions';

/**
 * Морковка — скоростная стеклянная пушка.
 * Бросает морковки, набирает стаки скорости от убийств.
 */
export const MARKOVKA_HERO: HeroDefinition = {
  id: 'hero_markovka',
  name: 'Морковка',
  comicTitle: 'THE CARROT FURY',
  description: 'Стеклянная пушка. Быстрая, смертоносная, хрупкая. Убивай или умри.',
  lore: 'Генно-модифицированная морковка из заброшенной лаборатории. Скорость — её броня.',
  textureKey: 'markovka_idle_1',
  portraitKey: 'portrait_markovka',
  posterKey: 'hero_card_markovka',
  stats: {
    maxHp: 75,
    speed: 250,
    damage: 14,
    armor: 0,
    attackSpeed: 1.4,
  },
  attackIntervalMs: 550,
  attackRange: 340,
  projectileSpeed: 640,
  projectileSize: 8,
  startingWeaponId: 'weapon_carrot_barrage',
  trait: {
    id: 'trait_speed_thirst',
    name: 'Жажда скорости',
    comicTag: 'SPEED THIRST',
    description: 'Убийства дают стаки скорости. При 10 стаках — следующая атака наносит 2× урон.',
    apply: (modifiers) => {
      // Kill streak tracking initialized; runtime logic in GameScene
      modifiers.killStreakStacks = 0;
      modifiers.critChance += 0.05;
      modifiers.executeLowHpThreshold = 0.15;
    },
  },
};
