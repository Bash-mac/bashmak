import type { UpgradeDefinition } from '../definitions';
import { WEAPON_IDS } from '../itemIds';

export const WPN_SLIME_SPIT: UpgradeDefinition = {
  id: WEAPON_IDS.SLIME_SPIT,
  name: 'Слизеплюй',
  category: 'weapon',
  iconKey: 'icon_weapon_slime_spit',
  exclusiveHeroId: 'hero_vypolzok',
  maxLevel: 5,
  levels: [
    {
      level: 1,
      description: 'Минометный навес едкой кислоты. Замедляет врагов на 25% и наносит урон сплэшем.',
      apply: (mod) => {
        mod.slimeSpitLevel = 1;
      },
    },
    {
      level: 2,
      description: 'ЕДКАЯ СЛИЗЬ: Урон кислоты +20% и увеличенный радиус взрыва.',
      apply: (mod) => {
        mod.slimeSpitLevel = 2;
        mod.damagePercentBonus += 0.20;
        mod.splashPercent += 0.25;
      },
    },
    {
      level: 3,
      description: 'ДВОЙНОЙ ЗАЛП: 2 сгустка слизи веером со скоростным разлётом.',
      apply: (mod) => {
        mod.slimeSpitLevel = 3;
      },
    },
    {
      level: 4,
      description: 'КИСЛОТНЫЙ ПРОБОЙ: Слизь пробивает первого врага (pierce +1) и увеличивает сгустки на 20%.',
      apply: (mod) => {
        mod.slimeSpitLevel = 4;
        mod.pierceCount += 1;
        mod.fatSpitScale += 0.2;
      },
    },
    {
      level: 5,
      description: 'ТОКСИЧЕСКИЙ ГЕЙЗЕР: 3 огромных сгустка со взрывным кислотным сплэшем!',
      apply: (mod) => {
        mod.slimeSpitLevel = 5;
        mod.splashPercent += 0.35;
      },
    },
  ],
};
