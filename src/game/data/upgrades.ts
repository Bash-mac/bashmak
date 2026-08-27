/**
 * upgrades.ts — Фасадный агрегатор всех игровых улучшений.
 * 
 * Архитектура модулей:
 * - src/game/data/weapons/     — Карточки прокачки оружия (1 файл = 1 оружие)
 * - src/game/data/tomes/       — Карточки пассивных тотемов (1 файл = 1 том)
 * - src/game/data/consumables/ — Одноразовые расходники (1 файл = 1 расходник)
 * - src/game/data/itemIds.ts   — Реестр уникальных ID предметов
 */

import type { UpgradeDefinition } from './definitions';
import { WEAPON_UPGRADES } from './weapons';
import { TOME_UPGRADES } from './tomes';
import { CONSUMABLE_UPGRADES } from './consumables';

// Реэкспорт списков по категориям
export { WEAPON_UPGRADES } from './weapons';
export { TOME_UPGRADES } from './tomes';
export { CONSUMABLE_UPGRADES } from './consumables';

// Обратная совместимость для WORM_UPGRADES
export const WORM_UPGRADES: UpgradeDefinition[] = [
  ...WEAPON_UPGRADES,
  ...TOME_UPGRADES,
];

// Главный пул всех доступных улучшений для LevelUpModal / GameState
export const ALL_UPGRADES: UpgradeDefinition[] = [
  ...WORM_UPGRADES,
  ...CONSUMABLE_UPGRADES,
];
