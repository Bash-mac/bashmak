import type { UpgradeDefinition } from './definitions';

export const WORM_UPGRADES: UpgradeDefinition[] = [
  // =========================================================================
  // --- 👑 КЛАССОВЫЕ СИГНАТУРКИ (ДОСТУПНЫ ТОЛЬКО СВОЕМУ ГЕРОЮ) ---
  // =========================================================================

  // 1. Слизеплюй (Slime Spit) — Только Выползок
  {
    id: 'wpn_slime_spit',
    name: 'Слизеплюй',
    category: 'weapon',
    exclusiveHeroId: 'hero_worm',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'Минометный навес едкой кислоты. Замедляет врагов на 35% и создает кипящие лужи.',
        apply: (mod) => {
          mod.slimeSpitLevel = 1;
          mod.multishotCount = Math.max(mod.multishotCount, 1);
        },
      },
      {
        level: 2,
        description: 'Залп +1 сгусток слизи + урон кислоты +25%.',
        apply: (mod) => {
          mod.slimeSpitLevel = 2;
          mod.damagePercentBonus += 0.15;
        },
      },
      {
        level: 3,
        description: '★ ЕДКИЙ ЗАЛП: 3 сгустка слизи со 100% шансом создать лужи под врагами.',
        apply: (mod) => {
          mod.slimeSpitLevel = 3;
          mod.multishotCount += 1;
        },
      },
      {
        level: 4,
        description: 'Слизь пробивает первого врага (pierce +1) и увеличивает размер луж на 30%.',
        apply: (mod) => {
          mod.slimeSpitLevel = 4;
          mod.pierceCount += 1;
          mod.fatSpitScale += 0.3;
        },
      },
      {
        level: 5,
        description: '★ ТОКСИЧЕСКИЙ ГЕЙЗЕР: 5 огромных сгустков со взрывным кислотным сплэшем!',
        apply: (mod) => {
          mod.slimeSpitLevel = 5;
          mod.multishotCount += 2;
          mod.splashPercent += 0.40;
        },
      },
    ],
  },

  // 2. Шнуровой Кнут (Lace Whip) — Только Башмак
  {
    id: 'wpn_lace_whip',
    name: 'Шнуровой Кнут',
    category: 'weapon',
    exclusiveHeroId: 'hero_bashmak',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'Хлесткий свинг шнурком по дуге 180° перед собой с тяжелым отбрасыванием.',
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

  // 3. Морковный Град (Carrot Barrage) — Только Морковка
  {
    id: 'wpn_carrot_barrage',
    name: 'Морковный Град',
    category: 'weapon',
    exclusiveHeroId: 'hero_markovka',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'Морковка-бумеранг. Пробивает толпу, зависает и возвращается назад, нанося двойной урон.',
        apply: (mod) => {
          mod.carrotBarrageLevel = 1;
        },
      },
      {
        level: 2,
        description: 'Дальность полета бумеранга +25%, урон +20%.',
        apply: (mod) => {
          mod.carrotBarrageLevel = 2;
          mod.damagePercentBonus += 0.10;
        },
      },
      {
        level: 3,
        description: '★ МОРКОВНЫЙ ВЕЕР: Залп 3 бумерангов веером.',
        apply: (mod) => {
          mod.carrotBarrageLevel = 3;
        },
      },
      {
        level: 4,
        description: 'Морковки пробивают +2 дополнительных врагов насквозь.',
        apply: (mod) => {
          mod.carrotBarrageLevel = 4;
          mod.pierceCount += 2;
        },
      },
      {
        level: 5,
        description: '★ ЯРОСТНЫЙ ШКВАЛ: Залп 5 бумерангов с пилящим крит-уроном!',
        apply: (mod) => {
          mod.carrotBarrageLevel = 5;
          mod.critChance += 0.20;
        },
      },
    ],
  },

  // 4. Фиолетовый Шар (Eggplant Roll) — Только Баклажан
  {
    id: 'wpn_eggplant_roll',
    name: 'Фиолетовый Шар',
    category: 'weapon',
    exclusiveHeroId: 'hero_baklazhan',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'Бильярдный рикошет. Катящийся шар отскакивает между врагами 3 раза, сбивая с ног.',
        apply: (mod) => {
          mod.eggplantRollLevel = 1;
        },
      },
      {
        level: 2,
        description: 'Урон рикошета +30%, +1 дополнительный отскок.',
        apply: (mod) => {
          mod.eggplantRollLevel = 2;
          mod.damagePercentBonus += 0.15;
        },
      },
      {
        level: 3,
        description: '★ ТЯЖЕЛЫЙ БОУЛИНГ: 5 отскоков, радиус таранной волны +30%.',
        apply: (mod) => {
          mod.eggplantRollLevel = 3;
        },
      },
      {
        level: 4,
        description: 'Скорость качения +40%, перезарядка ускорена на 1.0 сек.',
        apply: (mod) => {
          mod.eggplantRollLevel = 4;
          mod.attackSpeedBonus += 0.20;
        },
      },
      {
        level: 5,
        description: '★ НЕОСТАНОВИМЫЙ ТАРАН: 7 рикошетов со взрывным расталкиванием толпы!',
        apply: (mod) => {
          mod.eggplantRollLevel = 5;
          mod.damagePercentBonus += 0.50;
        },
      },
    ],
  },

  // =========================================================================
  // --- 🌐 ОБЩИЙ НЕЙТРАЛЬНЫЙ АРСЕНАЛ (ДОСТУПЕН ВСЕМ ГЕРОЯМ) ---
  // =========================================================================

  // 5. Орбитальные Мухи (Orbiting Flies Shield)
  {
    id: 'wpn_homing_daggers',
    name: 'Орбитальные Мухи',
    category: 'weapon',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'Рой из 2 зеленых мух непрерывно кружится вокруг героя, создавая защитный щит.',
        apply: (mod) => {
          mod.homingDaggersLevel = 1;
          mod.homingDaggersCount = 2;
        },
      },
      {
        level: 2,
        description: '+1 муха в рой (всего 3), радиус орбиты +20%.',
        apply: (mod) => {
          mod.homingDaggersLevel = 2;
          mod.homingDaggersCount = 3;
        },
      },
      {
        level: 3,
        description: '★ ПИЛЯЩИЙ РОЙ: 4 мухи, скорость вращения увеличена на 50%.',
        apply: (mod) => {
          mod.homingDaggersLevel = 3;
          mod.homingDaggersCount = 4;
        },
      },
      {
        level: 4,
        description: '5 мух + контактный ядовитый DoT при касании врагов.',
        apply: (mod) => {
          mod.homingDaggersLevel = 4;
          mod.homingDaggersCount = 5;
          mod.splashPercent += 0.25;
        },
      },
      {
        level: 5,
        description: '★ РОЙ ТИТАНОВ: 7 бешеных мух, блокирующих сближение мобов!',
        apply: (mod) => {
          mod.homingDaggersLevel = 5;
          mod.homingDaggersCount = 7;
          mod.executeLowHpThreshold = 0.40;
        },
      },
    ],
  },

  // 6. Тяжёлый Башмак (Mega Boot Ground Slam)
  {
    id: 'wpn_mega_boot',
    name: 'Тяжёлый Башмак',
    category: 'weapon',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'С неба падает подошва 45-го размера с сейсмической волной по площади.',
        apply: (mod) => {
          mod.megaBootLevel = 1;
        },
      },
      {
        level: 2,
        description: 'Радиус сейсмической волны +25%, урон +35%.',
        apply: (mod) => {
          mod.megaBootLevel = 2;
        },
      },
      {
        level: 3,
        description: '★ ДВОЙНОЙ ТОПОТ: Падают два ботинка подряд!',
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
        description: '★ ТИТАНИЧЕСКИЙ ШЛЕПОК: Круговой сейсмический разлом на весь экран!',
        apply: (mod) => {
          mod.megaBootLevel = 5;
        },
      },
    ],
  },

  // 7. Чугунный Люк (Manhole Drop)
  {
    id: 'wpn_lightning_zap',
    name: 'Чугунный Люк',
    category: 'weapon',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'На голову сильнейшему врагу падает тяжелый чугунный люк с оглушением и критическим уроном.',
        apply: (mod) => {
          mod.lightningZapLevel = 1;
          mod.staticZapMax = 100;
        },
      },
      {
        level: 2,
        description: 'Частота падения люков +40%, урон +30%.',
        apply: (mod) => {
          mod.lightningZapLevel = 2;
          mod.staticZapMax = 70;
        },
      },
      {
        level: 3,
        description: '★ ЧУГУННЫЙ КОНТУЗ: Люк оглушает цель на 1.5 сек и замедляет мобов вокруг на 60%.',
        apply: (mod) => {
          mod.lightningZapLevel = 3;
          mod.slowPercent = Math.max(mod.slowPercent, 0.60);
          mod.slowDurationMs = 2500;
        },
      },
      {
        level: 4,
        description: 'Падает 2 люка одновременно + урон +60%.',
        apply: (mod) => {
          mod.lightningZapLevel = 4;
          mod.damagePercentBonus += 0.25;
        },
      },
      {
        level: 5,
        description: '★ ЛЮКОПАД: Непрерывный камнепад чугунных люков по всем элиткам каждые 1.5 сек!',
        apply: (mod) => {
          mod.lightningZapLevel = 5;
          mod.staticZapMax = 35;
        },
      },
    ],
  },

  // 8. Дырявый Носок (Stinky Sock DoT Aura)
  {
    id: 'wpn_acid_trail',
    name: 'Дырявый Носок',
    category: 'weapon',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'Засаленный носок испускает ядовитые зеленые волны удушающей вони вокруг героя.',
        apply: (mod) => {
          mod.acidTrail = true;
          mod.acidTrailLevel = 1;
          mod.acidTrailDps = 15;
        },
      },
      {
        level: 2,
        description: 'Радиус облака вони +50%, урон в секунду +40%.',
        apply: (mod) => {
          mod.acidTrailLevel = 2;
          mod.acidTrailDps += 10;
          mod.wriggleDash = true;
        },
      },
      {
        level: 3,
        description: '★ ТОКСИЧЕСКИЙ ШОК: Враги в облаке вони замедляются на 50%.',
        apply: (mod) => {
          mod.acidTrailLevel = 3;
          mod.slowPercent = Math.max(mod.slowPercent, 0.50);
        },
      },
      {
        level: 4,
        description: 'Урон вони +80%, радиус облака увеличен.',
        apply: (mod) => {
          mod.acidTrailLevel = 4;
          mod.acidTrailDps += 25;
        },
      },
      {
        level: 5,
        description: '★ ЯДОВИТАЯ АТАКА: Убитые в облаке враги взрываются токсичным газом!',
        apply: (mod) => {
          mod.acidTrailLevel = 5;
          mod.acidTrailDps += 50;
          mod.poisonExplodeOnDeath = true;
        },
      },
    ],
  },

  // =========================================================================
  // --- 📦 5 ПАССИВОК 90s GROSS-OUT (ДОСТУПНЫ ВСЕМ) ---
  // =========================================================================

  // 9. Двойной Зоб (Extra Gullet — Multishot / Amount)
  {
    id: 'tome_quantity',
    name: '«Двойной Зоб»',
    category: 'tome',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: '🌟 ГЛОБАЛЬНО: +1 дополнительный снаряд/объект ко ВСЕМУ оружию в арсенале.',
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
        description: '★ АБСОЛЮТНЫЙ ЗАЛП: +5 снарядов ко всем атакам + 25% урона всему арсеналу!',
        apply: (mod) => {
          mod.tomeQuantity = 5;
          mod.multishotCount += 1;
          mod.homingDaggersCount += 2;
          mod.damagePercentBonus += 0.25;
        },
      },
    ],
  },

  // 10. Турбо-Кеды (Turbo Keds — Speed / Attack Rate)
  {
    id: 'tome_speed',
    name: '«Турбо-Кеды»',
    category: 'tome',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: '🌟 ГЛОБАЛЬНО: Скорость бега +10%, темп всех атак +20%.',
        apply: (mod) => {
          mod.tomeSpeed = 1;
          mod.attackSpeedBonus += 0.20;
        },
      },
      {
        level: 2,
        description: 'Скорость атак +35%, скорость бега +15%.',
        apply: (mod) => {
          mod.tomeSpeed = 2;
          mod.attackSpeedBonus += 0.15;
        },
      },
      {
        level: 3,
        description: '★ ПУЛЕМЁТНЫЙ СТРИМ: Скорость атак +50% + очередь из 2 залпов.',
        apply: (mod) => {
          mod.tomeSpeed = 3;
          mod.attackSpeedBonus += 0.15;
          mod.burstFireCount = Math.max(mod.burstFireCount, 2);
        },
      },
      {
        level: 4,
        description: 'Скорость атак +65%, скорость бега +25%.',
        apply: (mod) => {
          mod.tomeSpeed = 4;
          mod.attackSpeedBonus += 0.15;
        },
      },
      {
        level: 5,
        description: '★ СВЕРХЗВУКОВОЙ ДРАЙВ: Скорость атак +85% + очередь из 3 залпов без пауз!',
        apply: (mod) => {
          mod.tomeSpeed = 5;
          mod.attackSpeedBonus += 0.20;
          mod.burstFireCount = Math.max(mod.burstFireCount, 3);
        },
      },
    ],
  },

  // 11. Липкая Жвачка (Sticky Gum — Magnet / XP)
  {
    id: 'tome_magnet',
    name: '«Липкая Жвачка»',
    category: 'tome',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'Радиус притягивания кристаллов и дропа +60%, получаемый опыт +15%.',
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
        description: 'Жвачка притягивает кристаллы со всей карты раз в 25 секунд.',
        apply: (mod) => {
          mod.tomeMagnet = 4;
          mod.extraRange += 100;
        },
      },
      {
        level: 5,
        description: '★ ВАКУУМНЫЙ СИНТЕЗ: Все кристаллы непрерывно летят к игроку + 50% бонус XP!',
        apply: (mod) => {
          mod.tomeMagnet = 5;
          mod.extraRange += 300;
        },
      },
    ],
  },

  // 12. Слизь-Кола (Slime Soda — Damage / Crit / Size)
  {
    id: 'tome_crit_size',
    name: '«Слизь-Кола»',
    category: 'tome',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'Урон всего арсенала +15%, шанс крита +15%, размер всех атак +25%.',
        apply: (mod) => {
          mod.tomeCritSize = 1;
          mod.damagePercentBonus += 0.15;
          mod.critChance += 0.15;
          mod.fatSpitScale += 0.25;
        },
      },
      {
        level: 2,
        description: 'Урон +25%, шанс крита +25%, множитель крит-урона 2.3×.',
        apply: (mod) => {
          mod.tomeCritSize = 2;
          mod.damagePercentBonus += 0.10;
          mod.critChance += 0.10;
          mod.critMultiplier = 2.3;
        },
      },
      {
        level: 3,
        description: '★ ТОТАЛЬНОЕ СОКРУШЕНИЕ: Шанс крита +35%, размер снарядов +50%.',
        apply: (mod) => {
          mod.tomeCritSize = 3;
          mod.damagePercentBonus += 0.15;
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

  // 13. Майка-Алкоголичка (Stained Tanktop — Armor / Vitality)
  {
    id: 'tome_vitality',
    name: '«Майка-Алкоголичка»',
    category: 'tome',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'Броня +1, регенерация +0.3 HP/сек.',
        apply: (mod) => {
          mod.hpRegenPerSec += 0.3;
          mod.armorShred += 1;
        },
      },
      {
        level: 2,
        description: 'Регенерация +0.5 HP/сек, вампиризм +0.2 HP за каждого убитого врага.',
        apply: (mod) => {
          mod.hpRegenPerSec += 0.2;
          mod.healOnKill += 0.2;
        },
      },
      {
        level: 3,
        description: '★ БРОНЕВАЯ ТКАНЬ: Макс. HP +30, снижение получаемого урона на 15%.',
        apply: (_mod, stats, health) => {
          stats.modifyMaxHp(30);
          health.heal(30);
        },
      },
      {
        level: 4,
        description: 'Броня +2, регенерация +0.8 HP/сек, вампиризм +0.4 HP за убийство.',
        apply: (mod) => {
          mod.hpRegenPerSec += 0.3;
          mod.healOnKill += 0.2;
        },
      },
      {
        level: 5,
        description: '★ ТИТАНОВАЯ ЗАКАЛКА: Броня +3, регенерация +1.2 HP/сек, поглощение 25% урона!',
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
