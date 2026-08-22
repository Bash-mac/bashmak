import type { UpgradeDefinition } from './definitions';

export const WORM_UPGRADES: UpgradeDefinition[] = [
  // 1. Двойной плевок (More projectiles & ricochet)
  {
    id: 'upg_double_spit',
    name: 'Двойной плевок',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'Шанс 35% выпустить дополнительный 2-й снаряд.',
        apply: (mod) => {
          mod.doubleSpitChance = 0.35;
          mod.multishotCount = 2;
        },
      },
      {
        level: 2,
        description: 'Шанс 70% выпустить дополнительный 2-й снаряд.',
        apply: (mod) => {
          mod.doubleSpitChance = 0.70;
        },
      },
      {
        level: 3,
        description: '★ ВЕЕРНЫЙ ЗАЛП: Теперь ВСЕГДА вылетает 3 снаряда веером!',
        apply: (mod) => {
          mod.doubleSpitChance = 1.0;
          mod.multishotCount = 3;
        },
      },
      {
        level: 4,
        description: 'Снаряды веера отскакивают 1 раз от стен и врагов.',
        apply: (mod) => {
          mod.bounceCount = 1;
        },
      },
      {
        level: 5,
        description: '★ ТРОЙНОЙ РИКОШЕТ: 4 снаряда в веере + 2 рикошета!',
        apply: (mod) => {
          mod.multishotCount = 4;
          mod.bounceCount = 2;
        },
      },
    ],
  },

  // 2. Быстрая слюна (Attack Speed & Burst streams)
  {
    id: 'upg_fast_saliva',
    name: 'Быстрая слюна',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'Скорость атаки +15%.',
        apply: (mod) => {
          mod.attackSpeedBonus += 0.15;
        },
      },
      {
        level: 2,
        description: 'Скорость атаки +30%.',
        apply: (mod) => {
          mod.attackSpeedBonus += 0.15;
        },
      },
      {
        level: 3,
        description: '★ ДВОЙНОЙ ОЧЕРЕДНОЙ ВЫСТРЕЛ: Выпускает 2 плевка дуплетом.',
        apply: (mod) => {
          mod.attackSpeedBonus += 0.10;
          mod.burstFireCount = 2;
        },
      },
      {
        level: 4,
        description: 'Скорость атаки +60%, очередь из 2 быстро следующих плевков.',
        apply: (mod) => {
          mod.attackSpeedBonus += 0.20;
        },
      },
      {
        level: 5,
        description: '★ ПУЛЕМЕТНЫЙ ПОТОК: Очередь из 3 плевков +90% к скорости!',
        apply: (mod) => {
          mod.attackSpeedBonus += 0.30;
          mod.burstFireCount = 3;
        },
      },
    ],
  },

  // 3. Разбрызгивание (AoE Splash & Knockback/Stun)
  {
    id: 'upg_splash',
    name: 'Разбрызгивание',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'Попадание наносит 20% урона по области в радиусе 30.',
        apply: (mod) => {
          mod.splashRadius = 30;
          mod.splashPercent = 0.20;
        },
      },
      {
        level: 2,
        description: 'Урон по области 30%, радиус 40.',
        apply: (mod) => {
          mod.splashRadius = 40;
          mod.splashPercent = 0.30;
        },
      },
      {
        level: 3,
        description: '★ УДАРНАЯ ВОЛНА: Взрыв сплэша отталкивает всех врагов!',
        apply: (mod) => {
          mod.splashRadius = 50;
          mod.splashPercent = 0.40;
          mod.splashKnockback = true;
        },
      },
      {
        level: 4,
        description: 'Урон по области 50%, радиус 60.',
        apply: (mod) => {
          mod.splashRadius = 60;
          mod.splashPercent = 0.50;
        },
      },
      {
        level: 5,
        description: '★ КИСЛОТНЫЙ ДЕТОНАТОР: 65% урон по области (радиус 75) + Оглушение!',
        apply: (mod) => {
          mod.splashRadius = 75;
          mod.splashPercent = 0.65;
          mod.splashStun = true;
        },
      },
    ],
  },

  // 4. Ядовитая слюна (DoT & Poison Explosion)
  {
    id: 'upg_poison_saliva',
    name: 'Ядовитая слюна',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'Наккладывает яд (4 урона/сек в течение 3 сек).',
        apply: (mod) => {
          mod.poisonSalivaDmg = 4;
          mod.poisonDurationMs = 3000;
        },
      },
      {
        level: 2,
        description: 'Урон яда 8 урона/сек.',
        apply: (mod) => {
          mod.poisonSalivaDmg = 8;
        },
      },
      {
        level: 3,
        description: '★ ЧУМНОЙ ВЗРЫВ: При смерти от яда враг взрывается ядовитым облаком!',
        apply: (mod) => {
          mod.poisonSalivaDmg = 14;
          mod.poisonExplodeOnDeath = true;
        },
      },
      {
        level: 4,
        description: 'Урон яда 20 урона/сек, длительность 4 сек.',
        apply: (mod) => {
          mod.poisonSalivaDmg = 20;
          mod.poisonDurationMs = 4000;
        },
      },
      {
        level: 5,
        description: '★ ЭПИДЕМИЯ: Яд 30 dps + взрывы передают яд соседним врагам!',
        apply: (mod) => {
          mod.poisonSalivaDmg = 30;
          mod.poisonDurationMs = 5000;
          mod.poisonSpreadOnDeath = true;
        },
      },
    ],
  },

  // 5. Липкая слизь (Slow & Slime Puddles)
  {
    id: 'upg_sticky_slime',
    name: 'Липкая слизь',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'Замедляет врага на 20% на 2 сек.',
        apply: (mod) => {
          mod.slowPercent = 0.20;
          mod.slowDurationMs = 2000;
        },
      },
      {
        level: 2,
        description: 'Замедление 35% на 2.5 сек.',
        apply: (mod) => {
          mod.slowPercent = 0.35;
          mod.slowDurationMs = 2500;
        },
      },
      {
        level: 3,
        description: '★ СЛИЗИСТЫЙ СЛЕД: При попадании под врагом остается лужа слизи!',
        apply: (mod) => {
          mod.slowPercent = 0.50;
          mod.spawnSlimePuddles = true;
          mod.slimePuddleDps = 4;
        },
      },
      {
        level: 4,
        description: 'Замедление 65%, лужи слизи живут дольше.',
        apply: (mod) => {
          mod.slowPercent = 0.65;
          mod.slimePuddleDps = 8;
        },
      },
      {
        level: 5,
        description: '★ ТОКСИЧНАЯ СМОЛА: Замедление 80% + лужи наносят 14 DPS!',
        apply: (mod) => {
          mod.slowPercent = 0.80;
          mod.slimePuddleDps = 14;
        },
      },
    ],
  },

  // 6. Пробивной плевок (Pierce & Armor Shred)
  {
    id: 'upg_pierce_spit',
    name: 'Пробивной плевок',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'Снаряд пробивает 1 дополнительную цель насквозь.',
        apply: (mod) => {
          mod.pierceCount = 1;
        },
      },
      {
        level: 2,
        description: 'Пробивает до 2 дополнительных целей.',
        apply: (mod) => {
          mod.pierceCount = 2;
        },
      },
      {
        level: 3,
        description: '★ СКВОЗНОЙ ПРОБОЙ: Пробивает до 4 целей БЕЗ потери урона!',
        apply: (mod) => {
          mod.pierceCount = 4;
          mod.fullDamagePierce = true;
        },
      },
      {
        level: 4,
        description: 'Пробивает до 6 целей и снижает броню врага на 2.',
        apply: (mod) => {
          mod.pierceCount = 6;
          mod.armorShred = 2;
        },
      },
      {
        level: 5,
        description: '★ РЕЛЬСОТРОН: Бесконечное пробитие обычных врагов!',
        apply: (mod) => {
          mod.pierceCount = 99;
          mod.armorShred = 4;
        },
      },
    ],
  },

  // 7. Клыкастый плевок (Base Damage & Crits)
  {
    id: 'upg_fang_spit',
    name: 'Клыкастый плевок',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'Базовый урон +20%.',
        apply: (mod) => {
          mod.damagePercentBonus += 0.20;
        },
      },
      {
        level: 2,
        description: 'Базовый урон +45%.',
        apply: (mod) => {
          mod.damagePercentBonus += 0.25;
        },
      },
      {
        level: 3,
        description: '★ КРИТИЧЕСКИЙ КЛЫК: 25% шанс критического удара (2.5x урон).',
        apply: (mod) => {
          mod.damagePercentBonus += 0.20;
          mod.critChance = 0.25;
          mod.critMultiplier = 2.5;
        },
      },
      {
        level: 4,
        description: 'Урон +110%, Крит-шанс 40%.',
        apply: (mod) => {
          mod.damagePercentBonus += 0.25;
          mod.critChance = 0.40;
        },
      },
      {
        level: 5,
        description: '★ КАЗНЬ КЛИНОМ: Урон +150%, Крит 50% + мгновенный разрыв врагов <15% HP!',
        apply: (mod) => {
          mod.damagePercentBonus += 0.40;
          mod.critChance = 0.50;
          mod.executeLowHpThreshold = 0.15;
        },
      },
    ],
  },

  // 8. Живучая кожа (Max HP & Regeneration)
  {
    id: 'upg_tough_skin',
    name: 'Живучая кожа',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'Максимальное здоровье +25 HP (лечит +25 HP).',
        apply: (_mod, stats, health) => {
          stats.modifyMaxHp(25);
          health.heal(25);
        },
      },
      {
        level: 2,
        description: 'Максимальное здоровье +50 HP.',
        apply: (_mod, stats, health) => {
          stats.modifyMaxHp(25);
          health.heal(25);
        },
      },
      {
        level: 3,
        description: '★ РЕГЕНЕРАЦИЯ ТКАНЕЙ: Восстанавливает +0.5 HP каждую секунду.',
        apply: (mod, stats, health) => {
          stats.modifyMaxHp(25);
          health.heal(25);
          mod.hpRegenPerSec = 0.5;
        },
      },
      {
        level: 4,
        description: 'Макс HP +100, Регенерация +1.0 HP/сек.',
        apply: (mod, stats, health) => {
          stats.modifyMaxHp(25);
          health.heal(25);
          mod.hpRegenPerSec = 1.0;
        },
      },
      {
        level: 5,
        description: '★ ТИТАНОВЫЙ ПАНЦИРЬ: Реген +2.0 HP/сек + щит при ударе!',
        apply: (mod, stats, health) => {
          stats.modifyMaxHp(25);
          health.heal(25);
          mod.hpRegenPerSec = 2.0;
          mod.chitinShieldOnHit = true;
        },
      },
    ],
  },

  // 9. Кровожадность (Lifesteal & Berserk)
  {
    id: 'upg_bloodthirst',
    name: 'Кровожадность',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'Каждое убийство врага восстанавливает +0.5 HP.',
        apply: (mod) => {
          mod.healOnKill += 0.5;
        },
      },
      {
        level: 2,
        description: 'Лечение +1.0 HP за убийство.',
        apply: (mod) => {
          mod.healOnKill += 0.5;
        },
      },
      {
        level: 3,
        description: '★ КРОВОЖАДНЫЙ КУС: Лечение +1.5 HP + 10% шанс разрыва мелочи.',
        apply: (mod) => {
          mod.healOnKill += 0.5;
          mod.executeFodderChance = 0.10;
        },
      },
      {
        level: 4,
        description: 'Лечение +2.0 HP за убийство, 15% шанс разрыва мелочи.',
        apply: (mod) => {
          mod.healOnKill += 0.5;
          mod.executeFodderChance = 0.15;
        },
      },
      {
        level: 5,
        description: '★ БЕРСЕРК: Лечение +2.5 HP + 20% шанс разрыва мелочи!',
        apply: (mod) => {
          mod.healOnKill += 0.5;
          mod.executeFodderChance = 0.20;
          mod.berserkOnKillTimer = 2000;
        },
      },
    ],
  },

  // 10. Горячая кровь (Low HP Rage & Aura)
  {
    id: 'upg_hot_blood',
    name: 'Горячая кровь',
    maxLevel: 5,
    levels: [
      {
        level: 1,
        description: 'Урон +30%, когда HP ниже 50%.',
        apply: (mod) => {
          mod.lowHpDmgThreshold = 0.50;
          mod.lowHpDmgBonus = 0.30;
        },
      },
      {
        level: 2,
        description: 'Урон +60%, когда HP ниже 50%.',
        apply: (mod) => {
          mod.lowHpDmgBonus = 0.60;
        },
      },
      {
        level: 3,
        description: '★ ОГНЕННАЯ АУРА: При HP < 30% излучает обжигающую ауру вокруг червя!',
        apply: (mod) => {
          mod.lowHpDmgBonus = 1.0;
          mod.fireAuraLowHp = true;
        },
      },
      {
        level: 4,
        description: 'Урон +150% при низком HP, радиус ауры увеличен.',
        apply: (mod) => {
          mod.lowHpDmgBonus = 1.50;
        },
      },
      {
        level: 5,
        description: '★ ВТОРОЕ ДЫХАНИЕ: Урон +220% при HP < 50% + 1 раз спасает от смерти!',
        apply: (mod) => {
          mod.lowHpDmgBonus = 2.20;
          mod.cheatDeathUnlocked = true;
        },
      },
    ],
  },

  // Consumables (offered when maxed out)
  {
    id: 'upg_heal_pack',
    name: 'Аптечная жижа',
    isConsumable: true,
    maxLevel: 99,
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
    id: 'upg_score_pack',
    name: 'Мешок хлама',
    isConsumable: true,
    maxLevel: 99,
    levels: [
      {
        level: 1,
        description: 'Дает +150 бонусных очков.',
        apply: () => {
          // Score bonus added directly in GameState
        },
      },
    ],
  },
];
