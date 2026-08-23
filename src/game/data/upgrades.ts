import type { UpgradeDefinition } from './definitions';

export const WORM_UPGRADES: UpgradeDefinition[] = [
  // ==========================================
  // --- ⚔️ ACTIVE WEAPONS (АРСЕНАЛ ОРУЖИЯ) ---
  // ==========================================

  // 0. Слизеплюй (Slime Spit)
  {
    id: 'wpn_slime_spit',
    name: 'Слизеплюй',
    category: 'weapon',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'Плевок сгустком едкой слизи. Замедляет врагов на 35% и оставляет лужи на полу.',
        apply: (mod) => {
          mod.slimeSpitLevel = 1;
          mod.multishotCount = Math.max(mod.multishotCount, 1);
        },
      },
      {
        level: 2,
        description: 'Залп +1 сгусток слизи + урон +25%.',
        apply: (mod) => {
          mod.slimeSpitLevel = 2;
          mod.damagePercentBonus += 0.15;
        },
      },
      {
        level: 3,
        description: '★ ЕДКИЙ ЗАЛП: 3 сгустка слизи с гарантированным созданием кислоты под врагами.',
        apply: (mod) => {
          mod.slimeSpitLevel = 3;
          mod.multishotCount += 1;
        },
      },
      {
        level: 4,
        description: 'Слизь пробивает первого врага насквозь (pierce +1) и увеличивает размер луж.',
        apply: (mod) => {
          mod.slimeSpitLevel = 4;
          mod.pierceCount += 1;
          mod.fatSpitScale += 0.3;
        },
      },
      {
        level: 5,
        description: '★ ТОКСИЧЕСКИЙ ГЕЙЗЕР: 5 огромных сгустков со 100% шансом вызвать кислотный взрыв!',
        apply: (mod) => {
          mod.slimeSpitLevel = 5;
          mod.multishotCount += 2;
          mod.splashPercent += 0.40;
        },
      },
    ],
  },

  // 0.1 Шнуровой Кнут (Lace Whip)
  {
    id: 'wpn_lace_whip',
    name: 'Шнуровой Кнут',
    category: 'weapon',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'Хлесткий удар шнурком по дуге 180° перед собой с мощным отбрасыванием.',
        apply: (mod) => {
          mod.laceWhipLevel = 1;
        },
      },
      {
        level: 2,
        description: 'Урон +30%, радиус дуги взмаха +20%.',
        apply: (mod) => {
          mod.laceWhipLevel = 2;
          mod.damagePercentBonus += 0.15;
        },
      },
      {
        level: 3,
        description: '★ ДВОЙНОЙ ХЛЫСТ: Хлещет спереди и сзади одновременно!',
        apply: (mod) => {
          mod.laceWhipLevel = 3;
        },
      },
      {
        level: 4,
        description: 'Урон +40%, сила отбрасывания врагов +50%.',
        apply: (mod) => {
          mod.laceWhipLevel = 4;
          mod.knockbackMultiplier += 0.5;
        },
      },
      {
        level: 5,
        description: '★ СЕЙСМИЧЕСКИЙ КНУТ: Удары вызывают комиксные взрывы и оглушают цели!',
        apply: (mod) => {
          mod.laceWhipLevel = 5;
          mod.damagePercentBonus += 0.35;
          mod.splashPercent += 0.30;
        },
      },
    ],
  },

  // 0.2 Морковный Град (Carrot Barrage)
  {
    id: 'wpn_carrot_barrage',
    name: 'Морковный Град',
    category: 'weapon',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'Залп 2 острых морковок. Каждая пробивает 1 врага насквозь.',
        apply: (mod) => {
          mod.carrotBarrageLevel = 1;
        },
      },
      {
        level: 2,
        description: 'Скорость полета морковок +25%, урон +20%.',
        apply: (mod) => {
          mod.carrotBarrageLevel = 2;
          mod.damagePercentBonus += 0.10;
        },
      },
      {
        level: 3,
        description: '★ МОРКОВНЫЙ ВЕЕР: Залп 3 морковок за выстрел.',
        apply: (mod) => {
          mod.carrotBarrageLevel = 3;
        },
      },
      {
        level: 4,
        description: 'Морковки пробивают +1 дополнительного врага насквозь.',
        apply: (mod) => {
          mod.carrotBarrageLevel = 4;
          mod.pierceCount += 1;
        },
      },
      {
        level: 5,
        description: '★ ЯРОСТНЫЙ ШКВАЛ: Залп 5 пробивающих морковок с повышенным шансом крита!',
        apply: (mod) => {
          mod.carrotBarrageLevel = 5;
          mod.critChance += 0.15;
        },
      },
    ],
  },

  // 0.3 Фиолетовый Шар (Eggplant Roll)
  {
    id: 'wpn_eggplant_roll',
    name: 'Фиолетовый Шар',
    category: 'weapon',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'Периодический рывок-перекат в неуязвимости со сбиванием врагов с ног.',
        apply: (mod) => {
          mod.eggplantRollLevel = 1;
        },
      },
      {
        level: 2,
        description: 'Урон тарана +30%, сила отбрасывания врагов +40%.',
        apply: (mod) => {
          mod.eggplantRollLevel = 2;
          mod.damagePercentBonus += 0.15;
        },
      },
      {
        level: 3,
        description: '★ ТЯЖЕЛЫЙ БОУЛИНГ: Длительность переката увеличена, радиус тарана +25%.',
        apply: (mod) => {
          mod.eggplantRollLevel = 3;
        },
      },
      {
        level: 4,
        description: 'Перезарядка переката сокращена на 1.0 сек.',
        apply: (mod) => {
          mod.eggplantRollLevel = 4;
          mod.attackSpeedBonus += 0.20;
        },
      },
      {
        level: 5,
        description: '★ НЕОСТАНОВИМЫЙ ТАРАН: Перекат наносит двойной урон и расплющивает толпы!',
        apply: (mod) => {
          mod.eggplantRollLevel = 5;
          mod.damagePercentBonus += 0.50;
        },
      },
    ],
  },

  // 1. Самонаводящиеся иглы (Wireless Needles / Daggers)
  {
    id: 'wpn_homing_daggers',
    name: 'Иглы-самонаводки',
    category: 'weapon',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'Самонаводящиеся костяные иглы. Базовый залп: 2 иглы (100% авто-попадание).',
        apply: (mod) => {
          mod.homingDaggersLevel = 1;
          mod.homingDaggersCount = 2;
        },
      },
      {
        level: 2,
        description: 'Залп 3 иглы + скорость полета +30%.',
        apply: (mod) => {
          mod.homingDaggersLevel = 2;
          mod.homingDaggersCount = 3;
        },
      },
      {
        level: 3,
        description: '★ ПРОБИВНОЙ ЗАЛП: Залп 4 иглы, каждая прошивает 1 врага насквозь.',
        apply: (mod) => {
          mod.homingDaggersLevel = 3;
          mod.homingDaggersCount = 4;
          mod.pierceCount += 1;
        },
      },
      {
        level: 4,
        description: 'Залп 5 игл + микро-взрыв яда при каждом попадании.',
        apply: (mod) => {
          mod.homingDaggersLevel = 4;
          mod.homingDaggersCount = 5;
          mod.splashPercent += 0.25;
        },
      },
      {
        level: 5,
        description: '★ ВЕЕРНЫЙ РОЙ: 7 самонаводящихся игл со 100% шансом крита по целям с <40% HP!',
        apply: (mod) => {
          mod.homingDaggersLevel = 5;
          mod.homingDaggersCount = 7;
          mod.executeLowHpThreshold = 0.40;
        },
      },
    ],
  },

  // 2. Тяжёлый Башмак (Mega Boot / Stomp)
  {
    id: 'wpn_mega_boot',
    name: 'Тяжёлый Башмак',
    category: 'weapon',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'Сокрушительный пинок перед героем (радиус 75px, урон 35, сильное отбрасывание).',
        apply: (mod) => {
          mod.megaBootLevel = 1;
        },
      },
      {
        level: 2,
        description: 'Радиус удара +25%, урон +35%.',
        apply: (mod) => {
          mod.megaBootLevel = 2;
        },
      },
      {
        level: 3,
        description: '★ ДВОЙНОЙ ТОПОТ: Башмак бьет одновременно спереди и сзади героя!',
        apply: (mod) => {
          mod.megaBootLevel = 3;
        },
      },
      {
        level: 4,
        description: 'Урон +40%, перезарядка удара ускорена на 20%.',
        apply: (mod) => {
          mod.megaBootLevel = 4;
        },
      },
      {
        level: 5,
        description: '★ ТИТАНИЧЕСКИЙ ШЛЕПОК: Круговой разлом на 360° с удвоенным радиусом и сокрушительным импактом!',
        apply: (mod) => {
          mod.megaBootLevel = 5;
        },
      },
    ],
  },

  // 3. Статический разрядник (Static Zap / Lightning)
  {
    id: 'wpn_lightning_zap',
    name: 'Электро-разрядник',
    category: 'weapon',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'Бег заряжает статику. При 100% выпускает цепную молнию по 3 целям.',
        apply: (mod) => {
          mod.lightningZapLevel = 1;
          mod.staticZapMax = 100;
        },
      },
      {
        level: 2,
        description: 'Скорость накопления статики +40%, цепь поражает 5 целей.',
        apply: (mod) => {
          mod.lightningZapLevel = 2;
          mod.staticZapMax = 70;
        },
      },
      {
        level: 3,
        description: '★ ШОКОВЫЙ ПАРАЛИЧ: Молния замедляет поражённых врагов на 60%.',
        apply: (mod) => {
          mod.lightningZapLevel = 3;
          mod.slowPercent = Math.max(mod.slowPercent, 0.60);
          mod.slowDurationMs = 2500;
        },
      },
      {
        level: 4,
        description: 'Цепь поражает 8 целей + урон электричества +60%.',
        apply: (mod) => {
          mod.lightningZapLevel = 4;
          mod.damagePercentBonus += 0.25;
        },
      },
      {
        level: 5,
        description: '★ БУРЯ ТЕСЛА: Непрерывные молнии бьют каждые 1.5 секунды во всех направлениях!',
        apply: (mod) => {
          mod.lightningZapLevel = 5;
          mod.staticZapMax = 35;
        },
      },
    ],
  },

  // 4. Токсичный след (Slime Trail)
  {
    id: 'wpn_acid_trail',
    name: 'Токсичный след',
    category: 'weapon',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'При движении червяк оставляет за собой едкий след слизи (урон в секунду).',
        apply: (mod) => {
          mod.acidTrail = true;
          mod.acidTrailLevel = 1;
          mod.acidTrailDps = 15;
        },
      },
      {
        level: 2,
        description: 'Ширина следа +50%, игрок разгоняется на своём следе на +25% скорости.',
        apply: (mod) => {
          mod.acidTrailLevel = 2;
          mod.acidTrailDps += 10;
          mod.wriggleDash = true;
        },
      },
      {
        level: 3,
        description: '★ КИСЛОТНЫЙ КЛЕЙ: Враги на следе слизи замедляются на 50%.',
        apply: (mod) => {
          mod.acidTrailLevel = 3;
          mod.slowPercent = Math.max(mod.slowPercent, 0.50);
        },
      },
      {
        level: 4,
        description: 'Урон следа +80%, длительность луж увеличена до 5 секунд.',
        apply: (mod) => {
          mod.acidTrailLevel = 4;
          mod.acidTrailDps += 25;
        },
      },
      {
        level: 5,
        description: '★ ЕДКИЙ ПОТОП: След вспыхивает зеленым огнем при контакте, нанося 300% урона!',
        apply: (mod) => {
          mod.acidTrailLevel = 5;
          mod.acidTrailDps += 50;
          mod.poisonExplodeOnDeath = true;
        },
      },
    ],
  },

  // ==========================================
  // --- 📜 GLOBAL TOMES (ФОЛИАНТЫ-МНОЖИТЕЛИ) ---
  // ==========================================

  // 5. Фолиант Количества (Tome of Quantity)
  {
    id: 'tome_quantity',
    name: 'Фолиант Количества',
    category: 'tome',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: '🌟 ГЛОБАЛЬНО: +1 дополнительный снаряд ко ВСЕМУ оружию в арсенале.',
        apply: (mod) => {
          mod.tomeQuantity = 1;
          mod.multishotCount += 1;
          mod.homingDaggersCount += 1;
        },
      },
      {
        level: 2,
        description: '🌟 ГЛОБАЛЬНО: +2 дополнительных снаряда ко ВСЕМУ оружию.',
        apply: (mod) => {
          mod.tomeQuantity = 2;
          mod.multishotCount += 1;
          mod.homingDaggersCount += 1;
        },
      },
      {
        level: 3,
        description: '🌟 ГЛОБАЛЬНО: +3 дополнительных снаряда ко ВСЕМУ оружию.',
        apply: (mod) => {
          mod.tomeQuantity = 3;
          mod.multishotCount += 1;
          mod.homingDaggersCount += 1;
        },
      },
      {
        level: 4,
        description: '🌟 ГЛОБАЛЬНО: +4 дополнительных снаряда ко ВСЕМУ оружию.',
        apply: (mod) => {
          mod.tomeQuantity = 4;
          mod.multishotCount += 1;
          mod.homingDaggersCount += 1;
        },
      },
      {
        level: 5,
        description: '★ АБСОЛЮТНЫЙ ЗАЛП: +5 снарядов ко всем пушкам + 25% урона всему арсеналу!',
        apply: (mod) => {
          mod.tomeQuantity = 5;
          mod.multishotCount += 1;
          mod.homingDaggersCount += 2;
          mod.damagePercentBonus += 0.25;
        },
      },
    ],
  },

  // 6. Фолиант Скорострельности (Tome of Cadence)
  {
    id: 'tome_speed',
    name: 'Фолиант Скорости',
    category: 'tome',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: '🌟 ГЛОБАЛЬНО: Скорость атаки ВСЕХ видов оружия +20%.',
        apply: (mod) => {
          mod.tomeSpeed = 1;
          mod.attackSpeedBonus += 0.20;
        },
      },
      {
        level: 2,
        description: 'Скорость атаки всего арсенала +35%.',
        apply: (mod) => {
          mod.tomeSpeed = 2;
          mod.attackSpeedBonus += 0.15;
        },
      },
      {
        level: 3,
        description: '★ ПУЛЕМЁТНЫЙ СТРИМ: Скорость атаки +50% + очередь из 2 залпов.',
        apply: (mod) => {
          mod.tomeSpeed = 3;
          mod.attackSpeedBonus += 0.15;
          mod.burstFireCount = Math.max(mod.burstFireCount, 2);
        },
      },
      {
        level: 4,
        description: 'Скорость атаки +65%.',
        apply: (mod) => {
          mod.tomeSpeed = 4;
          mod.attackSpeedBonus += 0.15;
        },
      },
      {
        level: 5,
        description: '★ ШТОРМОВОЙ ТЕМП: Скорость атаки +85% + очередь из 3 залпов без пауз!',
        apply: (mod) => {
          mod.tomeSpeed = 5;
          mod.attackSpeedBonus += 0.20;
          mod.burstFireCount = Math.max(mod.burstFireCount, 3);
        },
      },
    ],
  },

  // 7. Фолиант Магнетизма и Опыта (Tome of Magnetism)
  {
    id: 'tome_magnet',
    name: 'Фолиант Магнетизма',
    category: 'tome',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'Радиус авто-магнита опыта +60%, получаемый опыт +15%.',
        apply: (mod) => {
          mod.tomeMagnet = 1;
          mod.extraRange += 80;
        },
      },
      {
        level: 2,
        description: 'Радиус авто-магнита +120%, получаемый опыт +30%.',
        apply: (mod) => {
          mod.tomeMagnet = 2;
          mod.extraRange += 80;
        },
      },
      {
        level: 3,
        description: '★ ГИПЕР-ПЫЛЕСОС: Радиус авто-магнита +200% (+2% за каждый уровень игрока).',
        apply: (mod) => {
          mod.tomeMagnet = 3;
          mod.extraRange += 100;
        },
      },
      {
        level: 4,
        description: 'Магнит притягивает кристаллы со всей карты раз в 25 секунд.',
        apply: (mod) => {
          mod.tomeMagnet = 4;
          mod.extraRange += 100;
        },
      },
      {
        level: 5,
        description: '★ ВАКУУМНЫЙ СИНТЕЗ: Все кристаллы на карте непрерывно летят к игроку + 50% бонус XP!',
        apply: (mod) => {
          mod.tomeMagnet = 5;
          mod.extraRange += 300;
        },
      },
    ],
  },

  // 8. Фолиант Разрушения и Размера (Tome of Devastation)
  {
    id: 'tome_crit_size',
    name: 'Фолиант Разрушения',
    category: 'tome',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'Шанс крита +15%, размер всех снарядов и взрывов +25%.',
        apply: (mod) => {
          mod.tomeCritSize = 1;
          mod.critChance += 0.15;
          mod.fatSpitScale += 0.25;
        },
      },
      {
        level: 2,
        description: 'Шанс крита +25%, множитель крит-урона 2.3×.',
        apply: (mod) => {
          mod.tomeCritSize = 2;
          mod.critChance += 0.10;
          mod.critMultiplier = 2.3;
        },
      },
      {
        level: 3,
        description: '★ ТОТАЛЬНОЕ СОКРУШЕНИЕ: Шанс крита +35%, размер снарядов +50%.',
        apply: (mod) => {
          mod.tomeCritSize = 3;
          mod.critChance += 0.10;
          mod.fatSpitScale += 0.25;
        },
      },
      {
        level: 4,
        description: 'Шанс крита +45%, множитель крит-урона 2.7×.',
        apply: (mod) => {
          mod.tomeCritSize = 4;
          mod.critChance += 0.10;
          mod.critMultiplier = 2.7;
        },
      },
      {
        level: 5,
        description: '★ ГИГАНТСКИЙ АПОКАЛИПСИС: Шанс крита +60%, множитель 3.2×, двойной радиус всех атак!',
        apply: (mod) => {
          mod.tomeCritSize = 5;
          mod.critChance += 0.15;
          mod.critMultiplier = 3.2;
          mod.fatSpitScale += 0.5;
        },
      },
    ],
  },

  // 9. Фолиант Живучести (Tome of Vitality)
  {
    id: 'tome_vitality',
    name: 'Фолиант Живучести',
    category: 'tome',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'Регенерация +0.2 HP/сек, Броня +1.',
        apply: (mod) => {
          mod.hpRegenPerSec += 0.2;
          mod.armorShred += 1;
        },
      },
      {
        level: 2,
        description: 'Регенерация +0.4 HP/сек, вампиризм +0.2 HP за каждого убитого врага.',
        apply: (mod) => {
          mod.hpRegenPerSec += 0.2;
          mod.healOnKill += 0.2;
        },
      },
      {
        level: 3,
        description: '★ ХИТИНОВЫЙ ПАНЦИРЬ: Макс. HP +20, снижение урона на 15%.',
        apply: (_mod, stats, health) => {
          stats.modifyMaxHp(20);
          health.heal(20);
        },
      },
      {
        level: 4,
        description: 'Регенерация +0.7 HP/сек, вампиризм +0.4 HP за убийство.',
        apply: (mod) => {
          mod.hpRegenPerSec += 0.3;
          mod.healOnKill += 0.2;
        },
      },
      {
        level: 5,
        description: '★ БЕССМЕРТИЕ ТИТАНА: Регенерация +1.1 HP/сек, поглощение 25% урона в толпе.',
        apply: (mod) => {
          mod.hpRegenPerSec += 0.4;
          mod.armorShred += 2;
        },
      },
    ],
  },
];

export const CONSUMABLE_UPGRADES: UpgradeDefinition[] = [
  {
    id: 'consumable_heal',
    name: 'Аптечка-слизь',
    isConsumable: true,
    maxLevel: 999,
    levels: [
      {
        level: 1,
        description: 'Мгновенно восстанавливает +35 HP.',
        apply: (_mod, _stats, health) => {
          health.heal(35);
        },
      },
    ],
  },
  {
    id: 'consumable_bomb',
    name: 'Бомба-волна',
    isConsumable: true,
    maxLevel: 999,
    levels: [
      {
        level: 1,
        description: 'Вызывает ударную волну, наносящую 120 урона всем врагам на экране.',
        apply: (mod) => {
          mod.splashPercent += 0.5;
        },
      },
    ],
  },
  {
    id: 'consumable_score',
    name: 'Мешок слизи',
    isConsumable: true,
    maxLevel: 999,
    levels: [
      {
        level: 1,
        description: 'Добавляет +250 бонусных очков выживания.',
        apply: (_mod, _stats, _health) => {},
      },
    ],
  },
];

export const ALL_UPGRADES: UpgradeDefinition[] = [...WORM_UPGRADES, ...CONSUMABLE_UPGRADES];
