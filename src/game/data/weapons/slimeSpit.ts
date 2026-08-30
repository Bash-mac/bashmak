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
      description: 'Минометный навес едкой кислоты. Замедляет врагов на 35% и наносит урон сплэшем.',
      apply: (mod) => {
        mod.slimeSpitLevel = 1;
        mod.multishotCount = Math.max(mod.multishotCount, 1);
      },
    },
    {
      level: 2,
      description: 'Залп +1 сгусток слизи (2 снаряда) + урон кислоты +25%.',
      apply: (mod) => {
        mod.slimeSpitLevel = 2;
        mod.multishotCount += 1;
        mod.damagePercentBonus += 0.25;
      },
    },
    {
      level: 3,
      description: 'ЕДКИЙ ЗАЛП: 3 сгустка слизи с увеличенной скоростью полета.',
      apply: (mod) => {
        mod.slimeSpitLevel = 3;
        mod.multishotCount += 1;
      },
    },
    {
      level: 4,
      description: 'Слизь пробивает первого врага (pierce +1) и увеличивает размер сгустков на 30%.',
      apply: (mod) => {
        mod.slimeSpitLevel = 4;
        mod.pierceCount += 1;
        mod.fatSpitScale += 0.3;
      },
    },
    {
      level: 5,
      description: 'ТОКСИЧЕСКИЙ ГЕЙЗЕР: 5 огромных сгустков со взрывным кислотным сплэшем!',
      apply: (mod) => {
        mod.slimeSpitLevel = 5;
        mod.multishotCount += 2;
        mod.splashPercent += 0.40;
      },
    },
  ],
};
