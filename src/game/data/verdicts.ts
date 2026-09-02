import { WEAPON_IDS, TOME_IDS, EVOLUTION_IDS } from './itemIds';

export interface RunSnapshot {
  heroId: string;
  runTime: number; // in seconds
  kills: number;
  gooCollected: number;
  score: number;
  level: number;
  isRecord: boolean;
  won: boolean;
  upgrades: Set<string>;
}

export interface VerdictVariant {
  diagnosisTitle: string; // Штамп диагноза на бланке
  fiascoReason: string;   // Причина фиаско в таблице
  verdict: string;        // Главный вердикт
  shareMessage: string;   // Текст вызова для Telegram
}

export interface VerdictRule {
  id: string;
  priority: number;
  match: (s: RunSnapshot) => boolean;
  variants: VerdictVariant[];
}

export const VERDICT_RULES: VerdictRule[] = [
  // 1. ПОБЕДА ИЛИ АБСОЛЮТНЫЙ РЕКОРД (Priority: 100)
  {
    id: 'record_win',
    priority: 100,
    match: (s) => s.won || s.isRecord,
    variants: [
      {
        diagnosisTitle: 'РЕКОРД СЕКТОРА ПОБИТ!',
        fiascoReason: 'ВЫЖИЛ И УНИЖАЛ',
        verdict: 'РЕКОРД КОЛЛЕКТОРА ПОБИТ',
        shareMessage: 'Я разнес канализацию и поставил новый рекорд! Попробуй побить мой счет!',
      },
      {
        diagnosisTitle: 'ГРОЗА ТАРАКАНОВ',
        fiascoReason: 'ПОЛНАЯ ДОМИНАЦИЯ',
        verdict: 'ЛЕГЕНДА ТРУЩОБ',
        shareMessage: 'Мой забег вошел в историю сточных вод! Сможешь продержаться дольше?',
      },
      {
        diagnosisTitle: 'СЛИЗНЯКИ КАПИТУЛИРОВАЛИ',
        fiascoReason: 'ЧИСТКА КАНАЛИЗАЦИИ',
        verdict: 'АБСОЛЮТНЫЙ ЧЕМПИОН',
        shareMessage: 'Новый рекорд района взят! Слабо повторить мой триумф?',
      },
    ],
  },

  // 2. ЭВОЛЮЦИИ ОРУЖИЯ (Priority: 80)
  {
    id: 'evo_gatling_carrot',
    priority: 80,
    match: (s) => s.upgrades.has(EVOLUTION_IDS.GATLING_CARROT),
    variants: [
      {
        diagnosisTitle: 'ПЕРЕДОЗ КАРОТИНОМ',
        fiascoReason: 'ГАТЛИНГ-РИКОШЕТ',
        verdict: 'СТРЕЛОК-МУТАНТ',
        shareMessage: 'Собрал Гатлинг-Морковку и устроил свинцово-овощной ад! Попробуй обойти меня!',
      },
      {
        diagnosisTitle: 'ВЗРЫВ БОТВЫ',
        fiascoReason: 'СЛИШКОМ МНОГО ПУЛЬ',
        verdict: 'ПУЛЕМЕТНЫЙ БЕСПРЕДЕЛ',
        shareMessage: 'Моя морковка строчила быстрее пулемета! Рискнешь переплюнуть мой счет?',
      },
    ],
  },
  {
    id: 'evo_acid_tsunami',
    priority: 80,
    match: (s) => s.upgrades.has(EVOLUTION_IDS.ACID_TSUNAMI),
    variants: [
      {
        diagnosisTitle: 'ЗАТОПИЛ САМ СЕБЯ',
        fiascoReason: 'КИСЛОТНЫЙ ПОТОП',
        verdict: 'ТОКСИЧНЫЙ ФОНТАН',
        shareMessage: 'Залил всю карту токсичным цунами, но стоки не выдержали! Побей мой счет!',
      },
      {
        diagnosisTitle: 'РАСТВОРЕН В СОБСТВЕННОЙ ЖИЖЕ',
        fiascoReason: 'ПЕРЕБОР С КИСЛОТОЙ',
        verdict: 'ЖИДКИЙ ТЕРМИНАТОР',
        shareMessage: 'Собрал Кислотное Цунами и растворил пол-города! Твой черед пробовать!',
      },
    ],
  },
  {
    id: 'evo_typhoon_flail',
    priority: 80,
    match: (s) => s.upgrades.has(EVOLUTION_IDS.TYPHOON_FLAIL),
    variants: [
      {
        diagnosisTitle: 'ЗАПУТАЛСЯ В ШНУРКАХ',
        fiascoReason: 'ВИХРЕВОЙ ЗАХЛЕСТ',
        verdict: 'ШНУРОВОЙ УРАГАН',
        shareMessage: 'Крутил Тайфун-Кнут со скоростью света, пока шнурки не связались! Попробуй побить!',
      },
      {
        diagnosisTitle: 'УДАРИЛ САМ СЕБЯ С РАЗМАХУ',
        fiascoReason: 'ШНУРОВОЙ БУМЕРАНГ',
        verdict: 'МАСТЕР САМОПОРКИ',
        shareMessage: 'Тайфун-Кнут косил врагов сотнями! Докажи, что сможешь круче!',
      },
    ],
  },
  {
    id: 'evo_planetary_roll',
    priority: 80,
    match: (s) => s.upgrades.has(EVOLUTION_IDS.PLANETARY_ROLL),
    variants: [
      {
        diagnosisTitle: 'СОШЕЛ С ОРБИТЫ',
        fiascoReason: 'МЯСНОЙ БОУЛИНГ',
        verdict: 'СИЛА ТЯЖЕСТИ',
        shareMessage: 'Раздавил целую армию планетарным перекатом! Попробуй продержаться дольше!',
      },
    ],
  },

  // 3. РАННЯЯ СМЕРТЬ / ПОЗОР СПИДРАНА (Priority: 70)
  {
    id: 'early_death_shame',
    priority: 70,
    match: (s) => s.runTime < 45,
    variants: [
      {
        diagnosisTitle: 'САМОЛИКВИДАЦИЯ ОТ ИСПУГА',
        fiascoReason: 'УМЕР В ПЕРВОЙ ЛУЖЕ',
        verdict: 'СКИЛЛ НЕ ОБНАРУЖЕН',
        shareMessage: 'Сдох на первых секундах забега. Докажи, что ты не больший лузер - побей мой позор!',
      },
      {
        diagnosisTitle: 'НЕ ДОЖИЛ ДО ОБЕДА',
        fiascoReason: 'РАЗМАЗАН ПЕРВЫМ МОБОМ',
        verdict: 'БЫСТРЫЙ КОРМ',
        shareMessage: 'Мой забег длился меньше минуты. Сможешь протянуть хотя бы две?',
      },
      {
        diagnosisTitle: 'ОСТУПИЛСЯ НА СТАРТЕ',
        fiascoReason: 'СПОТКНУЛСЯ О ТРУБУ',
        verdict: 'СКОРОПОСТИЖНЫЙ ФИНИШ',
        shareMessage: 'Позорный слив за полминуты! Попробуй показать, как надо играть!',
      },
    ],
  },

  // 4. ТУРБО-КЕДЫ / СКОРОСТЬ (Priority: 60)
  {
    id: 'speed_freak',
    priority: 60,
    match: (s) => s.upgrades.has(TOME_IDS.SPEED) && (s.heroId === 'hero_markovka' || s.kills > 80),
    variants: [
      {
        diagnosisTitle: 'ВРЕЗАЛСЯ В БЕТОН НА ФОРСАЖЕ',
        fiascoReason: 'ОТКАЗАЛИ ТОРМОЗА',
        verdict: 'СВЕРХЗВУКОВОЙ ТАРАН',
        shareMessage: 'Разогнался в Турбо-Кедах так, что пробил стену лбом! Побей мою безумную скорость!',
      },
      {
        diagnosisTitle: 'РАСПЫЛЕНИЕ НА ПОВОРОТЕ',
        fiascoReason: 'ЗАНЕСЛО В СТОК',
        verdict: 'СЛИШКОМ БЫСТРЫЙ',
        shareMessage: 'Летел на бешеных скоростях, пока не встретил тупик! Сможешь управиться лучше?',
      },
    ],
  },

  // 5. ОРБИТАЛЬНЫЕ МУХИ (Priority: 55)
  {
    id: 'fly_swarm',
    priority: 55,
    match: (s) => s.upgrades.has(WEAPON_IDS.HOMING_DAGGERS),
    variants: [
      {
        diagnosisTitle: 'ЗАДОХНУЛСЯ В СОБСТВЕННОМ РОЮ',
        fiascoReason: 'УКУШЕН МУХАМИ',
        verdict: 'ПОВЕЛИТЕЛЬ ПОМОЙКИ',
        shareMessage: 'Развел рой канализационных мух размером с дом! Рискнешь повторить мой билд?',
      },
    ],
  },

  // 6. ПЬЕЗО-ШОКЕР / ЭЛЕКТРИЧЕСТВО (Priority: 55)
  {
    id: 'lightning_zap',
    priority: 55,
    match: (s) => s.upgrades.has(WEAPON_IDS.LIGHTNING_ZAP),
    variants: [
      {
        diagnosisTitle: 'ЗАМЫКАНИЕ В СЫРОСТИ',
        fiascoReason: 'СУНУЛ ПАЛЬЦЫ В РОЗЕТКУ',
        verdict: 'ПЕРЕГОРЕЛ ПРЕДОХРАНИТЕЛЬ',
        shareMessage: 'Шокер искрил на всю канализацию, пока не замкнуло! Попробуй побить мой результат!',
      },
    ],
  },

  // 7. ЖАДНОСТЬ К СЛИЗИ / МАГНЕТИЗМ (Priority: 50)
  {
    id: 'goo_greed',
    priority: 50,
    match: (s) => s.gooCollected > 250 || s.upgrades.has(TOME_IDS.MAGNET),
    variants: [
      {
        diagnosisTitle: 'УМЕР ОТ ЖАДНОСТИ',
        fiascoReason: 'ПОГОНЯ ЗА СЛИЗЬЮ',
        verdict: 'УТОНУЛ В ЗОЛОТЕ',
        shareMessage: 'Греб слизь полными карманами, пока толпа не настигла! Докажи, что ты не такой жадный!',
      },
      {
        diagnosisTitle: 'НАБИЛ КАРМАНЫ ДО СМЕРТИ',
        fiascoReason: 'ПЕРЕГРУЗ ЛУТОМ',
        verdict: 'СЛИЗНЯК-ПЛЮШКИН',
        shareMessage: 'Собрал гору слизи, но не унес! Попробуй вынести больше!',
      },
    ],
  },

  // 8. ОРДА И МАССОВЫЕ КИЛЛЫ (Priority: 45)
  {
    id: 'kill_spree',
    priority: 45,
    match: (s) => s.kills > 180,
    variants: [
      {
        diagnosisTitle: 'РАЗМАЗАН ТОЛПОЙ ПО СТЕНЕ',
        fiascoReason: 'ПЕРЕДОЗ ОРДОЙ',
        verdict: 'МЯСНОЙ БОЕЦ',
        shareMessage: 'Уложил целую армию мутантов, но они задавили числом! Побей мой килл-стрик!',
      },
      {
        diagnosisTitle: 'ПОГРЕБЕН ПОД ТРУПАМИ ВРАГОВ',
        fiascoReason: 'КОНЧИЛИСЬ ПАТРОНЫ',
        verdict: 'ГЕРОЙ КАНАЛИЗАЦИИ',
        shareMessage: 'Уничтожил сотни тварей перед смертью! Попробуй убить больше!',
      },
    ],
  },

  // 9. ВЫПОЛЗОК СПЕЦИФИКА (Priority: 40)
  {
    id: 'hero_vypolzok',
    priority: 40,
    match: (s) => s.heroId === 'hero_vypolzok',
    variants: [
      {
        diagnosisTitle: 'ПОХМЕЛЬНЫЙ ОБМОРОК',
        fiascoReason: 'ЗАКОНЧИЛАСЬ ГАЗИРОВКА',
        verdict: 'СЛАКЕР НА ПЕНСИИ',
        shareMessage: 'Мой Выползок скользил на пузе до последнего! Побей мой счет в стоках!',
      },
      {
        diagnosisTitle: 'ПЕРЕПИЛ ТОКСИЧНОЙ КОЛЫ',
        fiascoReason: 'ОТРЫЖКА КИСЛОТОЙ',
        verdict: 'ГНИЛОЙ ГУРМАН',
        shareMessage: 'Выползок пал в неравном бою с похмельем! Сможешь сыграть достойнее?',
      },
    ],
  },

  // 10. МОРКОВКА СПЕЦИФИКА (Priority: 40)
  {
    id: 'hero_markovka',
    priority: 40,
    match: (s) => s.heroId === 'hero_markovka',
    variants: [
      {
        diagnosisTitle: 'ПАНК-РОК НЕ ПРОЩАЕТ ОШИБОК',
        fiascoReason: 'БЕЗДУМНЫЙ НАБЕГ',
        verdict: 'БЕШЕНАЯ БОТВА',
        shareMessage: 'Морковка влетела в толпу с хищным оскалом! Попробуй побить мой счет!',
      },
      {
        diagnosisTitle: 'СЛОМАЛА ИРОКЕЗ О ТАРАКАНА',
        fiascoReason: 'АГРЕССИВНЫЙ РАШ',
        verdict: 'УЛИЧНЫЙ БУНТАРЬ',
        shareMessage: 'Морковка устроила дебош в канализации! Рискни повторить мой результат!',
      },
    ],
  },
];

export const FALLBACK_VERDICT_VARIANTS: VerdictVariant[] = [
  {
    diagnosisTitle: 'РАЗОБРАН НА СУВЕНИРЫ',
    fiascoReason: 'ЛОБОВОЙ ТАРАН',
    verdict: 'СКИЛЛ НЕ ОБНАРУЖЕН',
    shareMessage: 'Канализация оказалась сильнее меня. Докажи, что ты играешь лучше - побей мой счет!',
  },
  {
    diagnosisTitle: 'ЗАТОПТАН ПЛАНКТОНОМ',
    fiascoReason: 'СТАЯ МЕЛКИХ ТВАРЕЙ',
    verdict: 'ПИЩА ДЛЯ СТОКОВ',
    shareMessage: 'Толпа тварей пустила меня на фарш! Попробуй продержаться дольше!',
  },
  {
    diagnosisTitle: 'СДАЛСЯ НА МИЛОСТЬ МУТАНТОВ',
    fiascoReason: 'НЕХВАТКА КИСЛОРОДА',
    verdict: 'ОТХОДЫ ПРОИЗВОДСТВА',
    shareMessage: 'Забег окончен плачевно. Сможешь показать настоящий скилл?',
  },
];
