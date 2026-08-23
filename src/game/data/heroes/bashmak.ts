import type { HeroDefinition } from '../definitions';

export const BASHMAK_HERO: HeroDefinition = {
  id: 'hero_bashmak',
  name: 'Башмак',
  comicTitle: 'THE MIGHTY BOOT',
  description: 'Тяжёлый бичеватель. Хлещет шнурком и давит врагов сейсмическими ударами.',
  lore: 'Легендарный армейский ботинок 45-го размера, оживленный радиоактивным мутагеном. Ненавидит грязь, обожает топтать.',
  textureKey: 'pose_idle',
  portraitKey: 'face_smug',
  stats: {
    maxHp: 180,
    speed: 170,
    damage: 18,
    armor: 3,
    attackSpeed: 1.0,
  },
  attackIntervalMs: 1100,
  attackRange: 200,
  projectileSpeed: 450,
  projectileSize: 12,
  startingWeaponId: 'weapon_lace_whip',
  trait: {
    id: 'trait_heavy_step',
    name: 'Тяжёлая поступь',
    comicTag: 'STAND YOUR GROUND',
    description: 'При стоянии на месте получает +50% к урону и +2 к броне. Медленно разгоняется после остановки.',
    apply: (modifiers, stats) => {
      // Base armor bonus (always active)
      stats.armor = (stats.armor ?? 0) + 2;
      // standStillBonusActive is toggled at runtime in GameScene
      modifiers.standStillBonusActive = false;
      modifiers.damagePercentBonus += 0.10;
    },
  },
};
