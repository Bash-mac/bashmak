import type { HeroDefinition } from '../definitions';

export const BASHMAK_HERO: HeroDefinition = {
  id: 'hero_bashmak',
  name: 'Башмак',
  comicTitle: 'THE MIGHTY BOOT',
  description: 'Тяжелый несокрушимый танк. Огромный запас прочности и сокрушительные пинки по площади.',
  lore: 'Легендарный армейский ботинок 45-го размера, оживленный радиоактивным мутагеном. Ненавидит грязь, обожает топтать.',
  textureKey: 'pose_idle',
  portraitKey: 'face_smug',
  stats: {
    maxHp: 180,
    speed: 190,
    damage: 18,
    armor: 4,
    attackSpeed: 1.0,
  },
  attackIntervalMs: 1000,
  attackRange: 200,
  projectileSpeed: 450,
  projectileSize: 12,
  startingWeaponId: 'weapon_bouncing_bones',
  trait: {
    id: 'trait_heavy_step',
    name: 'Тяжелая поступь',
    comicTag: 'SEISMIC STOMP',
    description: '+4 к броне и повышенный сплэш-урон при низком здоровье.',
    apply: (modifiers, stats) => {
      stats.armor = (stats.armor ?? 0) + 4;
      modifiers.damagePercentBonus += 0.15;
    },
  },
};
