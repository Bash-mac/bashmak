import type { UpgradeDefinition } from '../definitions';
import { WEAPON_IDS } from '../itemIds';

export const WPN_ACID_TRAIL: UpgradeDefinition = {
  id: WEAPON_IDS.ACID_TRAIL,
  name: 'Дырявый Носок',
  category: 'weapon',
  iconKey: 'icon_weapon_acid_trail',
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
};
