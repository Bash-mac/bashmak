/**
 * BalanceConfig — Единый источник правды игрового баланса (Single Source of Truth)
 * Чистый TypeScript без зависимостей от Phaser / GameObjects.
 * Калиброван по математической модели калькулятора баланса.
 */

export interface WeaponLevelConfig {
  level: number;
  description: string;
  damage: number;
  cooldownMs: number;
  projectileCount?: number;
  pierce?: number;
  bounces?: number;
  radius?: number;
}

export interface WeaponBalanceDef {
  id: string;
  name: string;
  role: string;
  targetDpsAt230: number;
  maxLevel: number;
  levels: WeaponLevelConfig[];
}

export interface BalanceConfigType {
  powerCurve: Array<{ timeSec: number; targetDps: number; desc: string }>;
  meta: {
    startWeaponSlots: number;
    startTomeSlots: number;
    maxWeaponSlots: number;
    maxTomeSlots: number;
    slotUpgradeCosts: readonly number[];
    generalMutations: {
      baseCost: number;
      tierGrowthMultiplier: number;
    };
  };
  enemies: {
    basePlayerHp: number;
    swarmer: { damage: number; speed: number; maxHp: number; armor: number; xp: number };
    fodder: { damage: number; speed: number; maxHp: number; armor: number; xp: number };
    sprinter: { damage: number; speed: number; maxHp: number; armor: number; xp: number };
    tank: { damage: number; speed: number; maxHp: number; armor: number; xp: number };
    exploder: { damage: number; explosionDamage: number; explosionRadius: number; speed: number; maxHp: number; armor: number; xp: number };
  };
  bosses: {
    miniBoss: { spawnTimeSec: number; maxHp: number; damage: number; speed: number; armor: number; xp: number };
    elite: { spawnTimeSec: number; maxHp: number; damage: number; speed: number; armor: number; xp: number };
    leviathan: { spawnTimeSec: number; maxHp: number; damage: number; speed: number; armor: number; xp: number };
  };
  evolutions: {
    requiredWeaponLevel: number;
    requiredTomeLevel: number;
    acidTsunami: { dpsMultiplier: number; slowPercent: number };
    gatlingCarrot: { dpsMultiplier: number; critChance: number };
  };
  weapons: {
    slimeSpit: WeaponBalanceDef;
    carrotBarrage: WeaponBalanceDef;
    orbitingFlies: WeaponBalanceDef;
    piezoTaser: WeaponBalanceDef;
    acidTrail: WeaponBalanceDef;
    toiletLid: WeaponBalanceDef;
  };
}

export const BALANCE_CONFIG: BalanceConfigType = {
  // 1. Рубежи Power Curve (Таймлайн -> Целевой DPS)
  powerCurve: [
    { timeSec: 0,   targetDps: 10,  desc: 'Старт (1 стартовое оружие 1 ур.)' },
    { timeSec: 150, targetDps: 40,  desc: '2:30 (Бенчмарк 1 оружия 3-4 ур. + мини-босс)' },
    { timeSec: 300, targetDps: 100, desc: '5:00 (2-3 оружия 4-6 ур. или 1-я эволюция)' },
    { timeSec: 420, targetDps: 200, desc: '7:00 (Синергия 3-4 оружий + эволюция, элита)' },
    { timeSec: 600, targetDps: 450, desc: '10:00 (Полный билд 4+4, эволюции, Левиафан)' },
  ],

  // 2. Мета-прогресс и слоты (2+2 -> 4+4)
  meta: {
    startWeaponSlots: 2,
    startTomeSlots: 2,
    maxWeaponSlots: 5,
    maxTomeSlots: 5,
    slotUpgradeCosts: [350, 700, 1400], // 3-й слот = 350, 4-й слот = 700, 5-й слот = 1400
    generalMutations: {
      baseCost: 50,
      tierGrowthMultiplier: 1.35,
    },
  },

  // 3. Архетипы врагов (Отрегулировано для реального выживания и давления на игрока)
  enemies: {
    basePlayerHp: 100,
    swarmer: {
      damage: 6,
      speed: 80,
      maxHp: 24,
      armor: 0,
      xp: 2,
    },
    fodder: {
      damage: 6,
      speed: 92,
      maxHp: 18,
      armor: 0,
      xp: 1,
    },
    sprinter: {
      damage: 6,
      speed: 118,
      maxHp: 16,
      armor: 0,
      xp: 3,
    },
    tank: {
      damage: 16,
      speed: 52,
      maxHp: 58,
      armor: 2,
      xp: 8,
    },
    exploder: {
      damage: 6,
      explosionDamage: 18,
      explosionRadius: 55,
      speed: 85,
      maxHp: 22,
      armor: 0,
      xp: 4,
    },
  },

  // 4. Рубежные боссы (HP = Целевой DPS * Секунды DPS-чека)
  bosses: {
    miniBoss: {
      spawnTimeSec: 150, // 2:30
      maxHp: 480,        // 12 сек * 40 DPS
      damage: 16,
      speed: 68,
      armor: 1,
      xp: 45,
    },
    elite: {
      spawnTimeSec: 420, // 7:00
      maxHp: 3600,       // 18 сек * 200 DPS
      damage: 22,
      speed: 74,
      armor: 2,
      xp: 150,
    },
    leviathan: {
      spawnTimeSec: 600, // 10:00
      maxHp: 13500,      // 30 сек * 450 DPS
      damage: 28,
      speed: 78,
      armor: 3,
      xp: 400,
    },
  },

  // 5. Эволюции (порог: оружие 8 ур. + том 5 ур.)
  evolutions: {
    requiredWeaponLevel: 8,
    requiredTomeLevel: 5,
    acidTsunami: {
      dpsMultiplier: 1.6,
      slowPercent: 0.60,
    },
    gatlingCarrot: {
      dpsMultiplier: 2.0,
      critChance: 1.0,
    },
  },

  // 6. Баланс 6 активных оружий (уровни 1–8)
  weapons: {
    // 6.1. Слизеплюй (Выползок: контроль / сплэш / замедление, целевой DPS к 2:30 ~ 38)
    slimeSpit: {
      id: 'weapon_slime_spit',
      name: 'Слизеплюй',
      role: 'Control / Splash',
      targetDpsAt230: 38,
      maxLevel: 8,
      levels: [
        { level: 1, description: 'Плевок сгустком кислоты, создающий лужу замедления.', damage: 14, cooldownMs: 770, projectileCount: 1, radius: 28 },
        { level: 2, description: 'Урон плевка +20%, радиус лужи +15%.', damage: 17, cooldownMs: 740, projectileCount: 1, radius: 32 },
        { level: 3, description: 'ДВОЙНОЙ ПЛЕВОК: Выпускает 2 сгустка веером!', damage: 17, cooldownMs: 720, projectileCount: 2, radius: 32 },
        { level: 4, description: 'Урон +25%, замедление в луже усилено до 45%.', damage: 21, cooldownMs: 680, projectileCount: 2, radius: 36 },
        { level: 5, description: 'ТРОЙНОЙ ПЛЕВОК: Залп из 3 сгустков с пробитием цели!', damage: 21, cooldownMs: 650, projectileCount: 3, pierce: 1, radius: 36 },
        { level: 6, description: 'Урон +25%, скорость перезарядки +15%.', damage: 26, cooldownMs: 560, projectileCount: 3, pierce: 1, radius: 40 },
        { level: 7, description: 'Едкая кислота: лужи наносят периодический урон.', damage: 29, cooldownMs: 530, projectileCount: 3, pierce: 1, radius: 42 },
        { level: 8, description: 'ШКВАЛ СЛИЗИ: 4 сгустка с огромным радиусом луж!', damage: 32, cooldownMs: 490, projectileCount: 4, pierce: 2, radius: 48 },
      ],
    },

    // 6.2. Морковный Град (Морковка: чистый урон / бумеранги, целевой DPS к 2:30 ~ 44)
    carrotBarrage: {
      id: 'weapon_carrot_barrage',
      name: 'Морковный Град',
      role: 'Raw DPS / Pierce',
      targetDpsAt230: 44,
      maxLevel: 8,
      levels: [
        { level: 1, description: 'Веерный залп из 2 острых морковок-бумерангов.', damage: 10, cooldownMs: 710, projectileCount: 2, pierce: 2 },
        { level: 2, description: 'Урон морковок +20%, скорость полета +15%.', damage: 12, cooldownMs: 680, projectileCount: 2, pierce: 2 },
        { level: 3, description: 'ТРОЙНОЙ ЗАЛП: 3 морковки веером!', damage: 12, cooldownMs: 650, projectileCount: 3, pierce: 2 },
        { level: 4, description: 'Пробитие +1 враг, урон +20%.', damage: 15, cooldownMs: 620, projectileCount: 3, pierce: 3 },
        { level: 5, description: 'ШТУРМОВОЙ ВЕЕР: 4 морковки в залпе!', damage: 15, cooldownMs: 580, projectileCount: 4, pierce: 3 },
        { level: 6, description: 'Урон +25%, дальность полета +20%.', damage: 19, cooldownMs: 540, projectileCount: 4, pierce: 3 },
        { level: 7, description: 'ПЯТЕРНОЙ ЗАЛП: 5 пронзающих бумерангов!', damage: 19, cooldownMs: 500, projectileCount: 5, pierce: 4 },
        { level: 8, description: 'ГРАД ПИЛ: 6 морковок со сверлящим уроном!', damage: 24, cooldownMs: 460, projectileCount: 6, pierce: 4 },
      ],
    },

    // 6.3. Орбитальные Мухи (Общее: защитная аура в мили-зоне, целевой DPS к 2:30 ~ 38)
    orbitingFlies: {
      id: 'weapon_homing_daggers',
      name: 'Орбитальные Мухи',
      role: 'Defensive Aura / Melee',
      targetDpsAt230: 38,
      maxLevel: 8,
      levels: [
        { level: 1, description: '2 мухи вращаются вокруг персонажа, нанося контактный урон.', damage: 8, cooldownMs: 0, projectileCount: 2, radius: 110 },
        { level: 2, description: 'Скорость вращения +25%, урон +20%.', damage: 10, cooldownMs: 0, projectileCount: 2, radius: 110 },
        { level: 3, description: 'СТАЯ МУХ: +1 дополнительная муха (всего 3).', damage: 10, cooldownMs: 0, projectileCount: 3, radius: 115 },
        { level: 4, description: 'Радиус орбиты +20%, урон +25%.', damage: 13, cooldownMs: 0, projectileCount: 3, radius: 130 },
        { level: 5, description: 'РОЙ МУХ: +1 муха (всего 4), скорость вращения +20%.', damage: 13, cooldownMs: 0, projectileCount: 4, radius: 130 },
        { level: 6, description: 'Урон +30%, микро-отталкивание при касании.', damage: 17, cooldownMs: 0, projectileCount: 4, radius: 135 },
        { level: 7, description: 'ГУСТОЙ РОЙ: +1 муха (всего 5), радиус орбиты +15%.', damage: 17, cooldownMs: 0, projectileCount: 5, radius: 145 },
        { level: 8, description: 'АРМИЯ ПАРАЗИТОВ: 6 скоростных мух-мясорубок!', damage: 22, cooldownMs: 0, projectileCount: 6, radius: 150 },
      ],
    },

    // 6.4. Пьезо-Шокер (Общее: точечный бурст / стан молнией, целевой DPS к 2:30 ~ 42)
    piezoTaser: {
      id: 'weapon_lightning_zap',
      name: 'Пьезо-Шокер',
      role: 'Burst / Stun',
      targetDpsAt230: 42,
      maxLevel: 8,
      levels: [
        { level: 1, description: 'Бьет случайного врага электрическим разрядом со станом.', damage: 20, cooldownMs: 1200, projectileCount: 1 },
        { level: 2, description: 'Перезарядка ускорена на 15%, урон +20%.', damage: 24, cooldownMs: 1020, projectileCount: 1 },
        { level: 3, description: 'Дальность удара +25%, шанс крита разряда +15%.', damage: 28, cooldownMs: 950, projectileCount: 1 },
        { level: 4, description: 'ДВОЙНОЙ РАЗРЯД: Бьет сразу 2 цели!', damage: 28, cooldownMs: 900, projectileCount: 2 },
        { level: 5, description: 'Урон +25%, оглушение врагов продлено до 0.5 сек.', damage: 35, cooldownMs: 820, projectileCount: 2 },
        { level: 6, description: 'ТРОЙНОЙ РАЗРЯД: Бьет сразу 3 цели!', damage: 35, cooldownMs: 760, projectileCount: 3 },
        { level: 7, description: 'Урон +30%, перезарядка ускорена на 15%.', damage: 45, cooldownMs: 650, projectileCount: 3 },
        { level: 8, description: 'ТЕСЛА-ШТОРМ: 4 мощных молнии с цепным шоком!', damage: 55, cooldownMs: 550, projectileCount: 4 },
      ],
    },

    // 6.5. Кислотный След (Общее: кайтинг / лужи под ногами / DoT, целевой DPS к 2:30 ~ 36)
    acidTrail: {
      id: 'weapon_acid_trail',
      name: 'Кислотный След',
      role: 'Area Denial / DoT',
      targetDpsAt230: 36,
      maxLevel: 8,
      levels: [
        { level: 1, description: 'Периодически выбрасывает едкое облако вони вокруг персонажа.', damage: 8, cooldownMs: 800, radius: 130 },
        { level: 2, description: 'Радиус облака +15%, урон +20%.', damage: 10, cooldownMs: 760, radius: 145 },
        { level: 3, description: 'Токсичный пар: замедляет вошедших врагов на 40%.', damage: 12, cooldownMs: 720, radius: 150 },
        { level: 4, description: 'Радиус +20%, темп выброса облака +15%.', damage: 14, cooldownMs: 650, radius: 165 },
        { level: 5, description: 'Урон облака +30%, замедление продлено.', damage: 18, cooldownMs: 600, radius: 170 },
        { level: 6, description: 'Радиус +20%, урон +25%.', damage: 22, cooldownMs: 550, radius: 185 },
        { level: 7, description: 'Ядовитый смог: накладывает длительный урон ядом.', damage: 26, cooldownMs: 500, radius: 195 },
        { level: 8, description: 'ТОКСИЧЕСКИЙ АПОКАЛИПСИС: огромное ядовитое поле!', damage: 32, cooldownMs: 440, radius: 210 },
      ],
    },

    // 6.6. Крышка Унитаза (Общее: тяжелый бумеранг / отталкивание, целевой DPS к 2:30 ~ 40)
    toiletLid: {
      id: 'weapon_toilet_lid',
      name: 'Крышка от Унитаза',
      role: 'Burst / Knockback / Ricochet',
      targetDpsAt230: 40,
      maxLevel: 8,
      levels: [
        { level: 1, description: 'Тяжелая крышка летит во врагов и рикошетит 3 раза.', damage: 22, cooldownMs: 1150, projectileCount: 1, bounces: 3 },
        { level: 2, description: '+1 рикошет, урон +20%.', damage: 26, cooldownMs: 1100, projectileCount: 1, bounces: 4 },
        { level: 3, description: 'Скорость полета +25%, сильное отталкивание.', damage: 31, cooldownMs: 1050, projectileCount: 1, bounces: 4 },
        { level: 4, description: 'ДВОЙНОЙ ЗАПУСК: Вылетают 2 крышки сразу!', damage: 31, cooldownMs: 1000, projectileCount: 2, bounces: 4 },
        { level: 5, description: '+1 рикошет, урон +25%.', damage: 38, cooldownMs: 950, projectileCount: 2, bounces: 5 },
        { level: 6, description: 'ТРОЙНОЙ ЗАПУСК: 3 крышки в разные стороны!', damage: 38, cooldownMs: 900, projectileCount: 3, bounces: 5 },
        { level: 7, description: 'Скорость перезарядки +20%, урон +25%.', damage: 47, cooldownMs: 780, projectileCount: 3, bounces: 6 },
        { level: 8, description: 'САНТЕХНИЧЕСКИЙ АРМАГЕДДОН: 4 крышки с 7 рикошетами!', damage: 56, cooldownMs: 680, projectileCount: 4, bounces: 7 },
      ],
    },
  },
};
