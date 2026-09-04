import type { GameState } from '../core/GameState';
import { WEAPON_IDS, TOME_IDS, EVOLUTION_IDS } from './itemIds';
import { BALANCE_CONFIG } from './balanceConfig';

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
  rowBgKey?: string;
  apply: (gameState: GameState) => void;
}

export const EVOLUTION_RECIPES: EvolutionRecipe[] = [
  // 1. Слизеплюй Lv8 + Фолиант Магнетизма Lv5 -> КИСЛОТНЫЙ ЦУНАМИ
  {
    id: EVOLUTION_IDS.ACID_TSUNAMI,
    name: 'Кислотный Цунами',
    comicTitle: 'ACID TSUNAMI',
    description: 'Плевок выпускает огромные токсичные волны слизи на весь экран с перманентным DoT и замедлением врагов на 60%!',
    baseWeaponId: WEAPON_IDS.SLIME_SPIT,
    baseWeaponName: 'Слизеплюй (Lv.8)',
    requiredTomeId: TOME_IDS.MAGNET,
    requiredTomeName: 'Липкая Жвачка (Lv.5)',
    iconKey: 'icon_evo_acid_tsunami',
    rowBgKey: 'grimoire_row_acid',
    apply: (gameState: GameState) => {
      const mod = gameState.playerModifiers;
      mod.isAcidTsunamiEvolved = true;
      mod.slimeSpitLevel = 9;
      mod.fatSpitScale += 0.8;
      mod.splashPercent += 0.60;
      mod.slowPercent = Math.max(mod.slowPercent, 0.60);
      gameState.activeUpgrades.delete(WEAPON_IDS.SLIME_SPIT);
      gameState.activeUpgrades.set(EVOLUTION_IDS.ACID_TSUNAMI, 1);
      gameState.triggerPowerWindow(10000);
    },
  },

  // 2. Шнуровой Кнут Lv5 + «Двойной Зоб» Lv5 -> ТИФОННЫЙ ЦЕП (скрыт)
  /*
  {
    id: EVOLUTION_IDS.TYPHOON_FLAIL,
    name: 'Тифонный Цеп',
    comicTitle: 'TYPHOON FLAIL',
    description: '4 стальных шнурка непрерывно вращаются на 360° вокруг Башмака, затягивая мобов в воронку и расплющивая их!',
    baseWeaponId: WEAPON_IDS.LACE_WHIP,
    baseWeaponName: 'Шнуровой Кнут (Lv.5)',
    requiredTomeId: TOME_IDS.QUANTITY,
    requiredTomeName: 'Двойной Зоб (Lv.5)',
    iconKey: 'icon_evo_typhoon_flail',
    rowBgKey: 'grimoire_row_electric',
    apply: (gameState: GameState) => {
      const mod = gameState.playerModifiers;
      mod.isTyphoonFlailEvolved = true;
      mod.laceWhipLevel = 6;
      mod.knockbackMultiplier += 1.0;
      gameState.activeUpgrades.delete(WEAPON_IDS.LACE_WHIP);
      gameState.activeUpgrades.set(EVOLUTION_IDS.TYPHOON_FLAIL, 1);
      gameState.triggerPowerWindow(10000);
    },
  },
  */

  // 3. Морковный Град Lv8 + «Энергетик» Lv5 -> ГАТЛИНГ-МОРКОВКА
  {
    id: EVOLUTION_IDS.GATLING_CARROT,
    name: 'Гатлинг-Морковка',
    comicTitle: 'GATLING CARROT',
    description: 'Лазерный шквал из сверхзвуковых бумерангов-пил со 100% шансом критического взрыва!',
    baseWeaponId: WEAPON_IDS.CARROT_BARRAGE,
    baseWeaponName: 'Морковный Град (Lv.8)',
    requiredTomeId: TOME_IDS.ATTACK_SPEED,
    requiredTomeName: 'Энергетик (Lv.5)',
    iconKey: 'icon_evo_gatling_carrot',
    rowBgKey: 'grimoire_row_fire',
    apply: (gameState: GameState) => {
      const mod = gameState.playerModifiers;
      mod.isGatlingCarrotEvolved = true;
      mod.carrotBarrageLevel = 9;
      gameState.activeUpgrades.delete(WEAPON_IDS.CARROT_BARRAGE);
      gameState.activeUpgrades.set(EVOLUTION_IDS.GATLING_CARROT, 1);
      gameState.triggerPowerWindow(10000);
    },
  },

  // 4. Фиолетовый Шар Lv5 + «Слизь-Кола» Lv5 -> ПЛАНЕТАРНЫЙ КАТАКЛИЗМ (скрыт)
  /*
  {
    id: EVOLUTION_IDS.PLANETARY_ROLL,
    name: 'Планетарный Катаклизм',
    comicTitle: 'PLANETARY ROLL',
    description: 'Баклажан превращается в колоссальную сферу-рикошет, сминающую боссов и вызывающую сейсмические взрывы на каждом метре!',
    baseWeaponId: WEAPON_IDS.EGGPLANT_ROLL,
    baseWeaponName: 'Фиолетовый Шар (Lv.5)',
    requiredTomeId: TOME_IDS.DAMAGE,
    requiredTomeName: 'Слизь-Кола (Lv.5)',
    iconKey: 'icon_evo_planetary_cataclysm',
    rowBgKey: 'grimoire_row_void',
    apply: (gameState: GameState) => {
      const mod = gameState.playerModifiers;
      mod.isPlanetaryRollEvolved = true;
      mod.eggplantRollLevel = 6;
      mod.splashRadius += 60;
      mod.splashKnockback = true;
      gameState.activeUpgrades.delete(WEAPON_IDS.EGGPLANT_ROLL);
      gameState.activeUpgrades.set(EVOLUTION_IDS.PLANETARY_ROLL, 1);
      gameState.triggerPowerWindow(10000);
    },
  },
  */
];

export function getReadyEvolution(gameState: GameState): EvolutionRecipe | null {
  for (const recipe of EVOLUTION_RECIPES) {
    if (gameState.activeUpgrades.has(recipe.id)) continue; // already evolved

    const weaponLvl = gameState.activeUpgrades.get(recipe.baseWeaponId) || 0;
    const tomeLvl = gameState.activeUpgrades.get(recipe.requiredTomeId) || 0;

    if (
      weaponLvl >= BALANCE_CONFIG.evolutions.requiredWeaponLevel &&
      tomeLvl >= BALANCE_CONFIG.evolutions.requiredTomeLevel
    ) {
      return recipe;
    }
  }
  return null;
}
