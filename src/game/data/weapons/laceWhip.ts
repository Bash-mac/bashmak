import type { UpgradeDefinition } from '../definitions';
import { WEAPON_IDS } from '../itemIds';

export const WPN_LACE_WHIP: UpgradeDefinition = {
  id: WEAPON_IDS.LACE_WHIP,
  name: 'Шнуровой Кнут',
  category: 'weapon',
  iconKey: 'icon_weapon_lace_whip',
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
      description: ' ДВОЙНОЙ ХЛЫСТ: Хлещет спереди и сзади одновременно!',
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
      description: ' СЕЙСМИЧЕСКИЙ КНУТ: Удары вызывают комиксные взрывы и оглушают цели!',
      apply: (mod) => {
        mod.laceWhipLevel = 5;
        mod.damagePercentBonus += 0.35;
        mod.splashPercent += 0.30;
      },
    },
  ],
};
