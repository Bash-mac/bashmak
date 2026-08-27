/**
 * itemIds.ts — Единый источник правды для всех ID предметов в игре.
 * Защищает от опечаток, коллизий и циклических зависимостей.
 */

export const WEAPON_IDS = {
  SLIME_SPIT: 'wpn_slime_spit',
  LACE_WHIP: 'wpn_lace_whip',
  CARROT_BARRAGE: 'wpn_carrot_barrage',
  EGGPLANT_ROLL: 'wpn_eggplant_roll',
  HOMING_DAGGERS: 'wpn_homing_daggers', // Орбитальные мухи
  MEGA_BOOT: 'wpn_mega_boot',
  LIGHTNING_ZAP: 'wpn_lightning_zap', // Чугунный люк
  ACID_TRAIL: 'wpn_acid_trail', // Дырявый носок
} as const;

export const TOME_IDS = {
  QUANTITY: 'tome_quantity', // «Двойной Зоб» (Количество снарядов)
  SPEED: 'tome_speed', // «Турбо-Кеды» (Скорость бега)
  ATTACK_SPEED: 'tome_attack_speed', // «Энергетик» (Скорость атак)
  MAGNET: 'tome_magnet', // «Липкая Жвачка» (Магнетизм / XP)
  DAMAGE: 'tome_damage', // «Слизь-Кола» (Чистый урон всего арсенала)
  CRIT: 'tome_crit', // «Выбитый Зуб» (Шанс и множитель крита)
  CRIT_SIZE: 'tome_damage', // Alias для совместимости
  ARMOR: 'tome_armor', // «Майка-Алкоголичка» (Броня / Защита)
  HP_REGEN: 'tome_hp_regen', // «Подорожник» (Регенерация HP)
  LIFESTEAL: 'tome_lifesteal', // «Пиявка» (Вампиризм / Хил за киллы)
  AREA: 'tome_area', // «Дальноплюй» (Радиус и область атак)
} as const;

export const CONSUMABLE_IDS = {
  HEAL: 'consumable_heal', // Аптечка-слизь
  BOMB: 'consumable_bomb', // Бомба-волна
  SCORE: 'consumable_score', // Мешок слизи
} as const;

export const EVOLUTION_IDS = {
  ACID_TSUNAMI: 'evo_acid_tsunami',
  TYPHOON_FLAIL: 'evo_typhoon_flail',
  GATLING_CARROT: 'evo_gatling_carrot',
  PLANETARY_ROLL: 'evo_planetary_roll',
} as const;

export type WeaponId = typeof WEAPON_IDS[keyof typeof WEAPON_IDS];
export type TomeId = typeof TOME_IDS[keyof typeof TOME_IDS];
export type ConsumableId = typeof CONSUMABLE_IDS[keyof typeof CONSUMABLE_IDS];
export type EvolutionId = typeof EVOLUTION_IDS[keyof typeof EVOLUTION_IDS];
export type ItemId = WeaponId | TomeId | ConsumableId | EvolutionId;
