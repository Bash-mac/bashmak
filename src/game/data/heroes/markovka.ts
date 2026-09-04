import type { HeroDefinition } from '../definitions';

/**
 * Морковка — скоростная стеклянная пушка.
 * Бросает морковки, набирает стаки скорости от убийств.
 */
export const MARKOVKA_HERO: HeroDefinition = {
  id: 'hero_markovka',
  name: 'Марковка',
  comicTitle: 'MARKOVKA',
  description: 'Стеклянная пушка. Быстрая, смертоносная, хрупкая. Убивай или умри.',
  lore: 'Генно-модифицированная морковка из заброшенной лаборатории. Скорость — её броня.',
  textureKey: 'markovka_idle_1',
  portraitKey: 'portrait_markovka',
  posterKey: 'hero_card_markovka',
  stats: {
    maxHp: 90,
    speed: 140,
    damage: 12,
    armor: 0,
    attackSpeed: 1.35,
  },
  attackIntervalMs: 680,
  attackRange: 340,
  projectileSpeed: 480,
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
