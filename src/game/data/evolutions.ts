import type { GameState } from '../core/GameState';

export interface EvolutionRecipe {
  id: string;
  name: string;
  comicTitle: string;
  description: string;
  baseWeaponId: string;
  baseWeaponName: string;
  requiredTomeId: string;
  requiredTomeName: string;
  iconKey?: string;
  apply: (gameState: GameState) => void;
}

export const EVOLUTION_RECIPES: EvolutionRecipe[] = [
  // 1. Слизеплюй Lv5 + Фолиант Магнетизма Lv5 -> КИСЛОТНЫЙ ЦУНАМИ
  {
    id: 'evo_acid_tsunami',
    name: 'Кислотный Цунами',
    comicTitle: '★ ACID TSUNAMI ★',
    description: 'Плевок выпускает огромные токсичные волны слизи на весь экран с перманентным DoT и замедлением врагов на 60%!',
    baseWeaponId: 'wpn_slime_spit',
    baseWeaponName: 'Слизеплюй (Lv.5)',
    requiredTomeId: 'tome_magnet',
    requiredTomeName: 'Фолиант Магнетизма (Lv.5)',
    apply: (gameState: GameState) => {
      const mod = gameState.playerModifiers;
      mod.isAcidTsunamiEvolved = true;
      mod.slimeSpitLevel = 6;
      mod.multishotCount += 3;
      mod.fatSpitScale += 0.8;
      mod.damagePercentBonus += 0.50;
      mod.splashPercent += 0.60;
      mod.slowPercent = Math.max(mod.slowPercent, 0.60);
      gameState.activeUpgrades.set('evo_acid_tsunami', 1);
    },
  },

  // 2. Шнуровой Кнут Lv5 + Фолиант Количества Lv5 -> ТИФОННЫЙ ЦЕП
  {
    id: 'evo_typhoon_flail',
    name: 'Тифонный Цеп',
    comicTitle: '★ TYPHOON FLAIL ★',
    description: '4 стальных шнурка непрерывно вращаются на 360° вокруг Башмака, затягивая мобов в воронку и расплющивая их!',
    baseWeaponId: 'wpn_lace_whip',
    baseWeaponName: 'Шнуровой Кнут (Lv.5)',
    requiredTomeId: 'tome_quantity',
    requiredTomeName: 'Фолиант Количества (Lv.5)',
    apply: (gameState: GameState) => {
      const mod = gameState.playerModifiers;
      mod.isTyphoonFlailEvolved = true;
      mod.laceWhipLevel = 6;
      mod.damagePercentBonus += 0.60;
      mod.attackSpeedBonus += 0.40;
      mod.knockbackMultiplier += 1.0;
      gameState.activeUpgrades.set('evo_typhoon_flail', 1);
    },
  },

  // 3. Морковный Град Lv5 + Фолиант Скорости Lv5 -> ГАТЛИНГ-МОРКОВКА
  {
    id: 'evo_gatling_carrot',
    name: 'Гатлинг-Морковка',
    comicTitle: '★ GATLING CARROT ★',
    description: 'Лазерный шквал из 20 сверхзвуковых пробивающих морковок в секунду со 100% шансом критического взрыва!',
    baseWeaponId: 'wpn_carrot_barrage',
    baseWeaponName: 'Морковный Град (Lv.5)',
    requiredTomeId: 'tome_speed',
    requiredTomeName: 'Фолиант Скорости (Lv.5)',
    apply: (gameState: GameState) => {
      const mod = gameState.playerModifiers;
      mod.isGatlingCarrotEvolved = true;
      mod.carrotBarrageLevel = 6;
      mod.attackSpeedBonus += 0.80;
      mod.pierceCount += 3;
      mod.critChance += 0.25;
      mod.damagePercentBonus += 0.40;
      gameState.activeUpgrades.set('evo_gatling_carrot', 1);
    },
  },

  // 4. Фиолетовый Шар Lv5 + Фолиант Силы Lv5 -> ПЛАНЕТАРНЫЙ КАТАКЛИЗМ
  {
    id: 'evo_planetary_roll',
    name: 'Планетарный Катаклизм',
    comicTitle: '★ PLANETARY ROLL ★',
    description: 'Баклажан превращается в колоссальную сферу, сминающую боссов и вызывающую сейсмические взрывы на каждом метре!',
    baseWeaponId: 'wpn_eggplant_roll',
    baseWeaponName: 'Фиолетовый Шар (Lv.5)',
    requiredTomeId: 'tome_crit_size',
    requiredTomeName: 'Фолиант Силы (Lv.5)',
    apply: (gameState: GameState) => {
      const mod = gameState.playerModifiers;
      mod.isPlanetaryRollEvolved = true;
      mod.eggplantRollLevel = 6;
      mod.damagePercentBonus += 0.80;
      mod.splashRadius += 60;
      mod.splashKnockback = true;
      gameState.activeUpgrades.set('evo_planetary_roll', 1);
    },
  },
];

export function getReadyEvolution(gameState: GameState): EvolutionRecipe | null {
  for (const recipe of EVOLUTION_RECIPES) {
    if (gameState.activeUpgrades.has(recipe.id)) continue; // already evolved

    const weaponLvl = gameState.activeUpgrades.get(recipe.baseWeaponId) || 0;
    const tomeLvl = gameState.activeUpgrades.get(recipe.requiredTomeId) || 0;

    if (weaponLvl >= 5 && tomeLvl >= 5) {
      return recipe;
    }
  }
  return null;
}
