export interface MetaPowerUpDefinition {
  id: string;
  name: string;
  comicName: string;
  description: string;
  icon: string;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  getCost: (currentLevel: number) => number;
  getBonusText: (currentLevel: number) => string;
}

export const META_POWERUPS: MetaPowerUpDefinition[] = [
  {
    id: 'power_hp',
    name: 'Толстая шкура',
    comicName: 'FAT SKIN',
    description: '+15 к максимальному здоровью за уровень.',
    icon: '',
    maxLevel: 5,
    baseCost: 100,
    costMultiplier: 1.5,
    getCost(lvl: number) {
      return Math.round(this.baseCost * Math.pow(this.costMultiplier, lvl));
    },
    getBonusText(lvl: number) {
      return `+${lvl * 15} Max HP`;
    },
  },
  {
    id: 'power_speed',
    name: 'Быстрые лапки',
    comicName: 'TURBO LEGS',
    description: '+6% к скорости перемещения за уровень.',
    icon: '',
    maxLevel: 5,
    baseCost: 120,
    costMultiplier: 1.6,
    getCost(lvl: number) {
      return Math.round(this.baseCost * Math.pow(this.costMultiplier, lvl));
    },
    getBonusText(lvl: number) {
      return `+${lvl * 6}% Скорость`;
    },
  },
  {
    id: 'power_damage',
    name: 'Тяжелый шлепок',
    comicName: 'HEAVY SLAP',
    description: '+8% ко всему наносимому урону за уровень.',
    icon: '',
    maxLevel: 5,
    baseCost: 150,
    costMultiplier: 1.7,
    getCost(lvl: number) {
      return Math.round(this.baseCost * Math.pow(this.costMultiplier, lvl));
    },
    getBonusText(lvl: number) {
      return `+${lvl * 8}% Урон`;
    },
  },
  {
    id: 'power_magnet',
    name: 'Сопливый магнит',
    comicName: 'SNOT MAGNET',
    description: '+25% к радиусу притягивания XP и GOO.',
    icon: '',
    maxLevel: 5,
    baseCost: 80,
    costMultiplier: 1.4,
    getCost(lvl: number) {
      return Math.round(this.baseCost * Math.pow(this.costMultiplier, lvl));
    },
    getBonusText(lvl: number) {
      return `+${lvl * 25}% Радиус`;
    },
  },
  {
    id: 'power_greed',
    name: 'Жадность',
    comicName: 'GOO GREED',
    description: '+15% к количеству выпадающего GOO в забегах.',
    icon: '',
    maxLevel: 5,
    baseCost: 100,
    costMultiplier: 1.5,
    getCost(lvl: number) {
      return Math.round(this.baseCost * Math.pow(this.costMultiplier, lvl));
    },
    getBonusText(lvl: number) {
      return `+${lvl * 15}% GOO`;
    },
  },
  {
    id: 'power_regen',
    name: 'Мутагенная регенерация',
    comicName: 'SLIME REGEN',
    description: 'Восстанавливает +0.5 HP в секунду за уровень.',
    icon: '',
    maxLevel: 3,
    baseCost: 250,
    costMultiplier: 2.0,
    getCost(lvl: number) {
      return Math.round(this.baseCost * Math.pow(this.costMultiplier, lvl));
    },
    getBonusText(lvl: number) {
      return `+${(lvl * 0.5).toFixed(1)} HP/сек`;
    },
  },
  {
    id: 'power_revive',
    name: 'Второе дыхание',
    comicName: 'SECOND CHANCE',
    description: '1 бесплатное воскрешение с 50% HP за забег.',
    icon: '',
    maxLevel: 1,
    baseCost: 600,
    costMultiplier: 1,
    getCost() {
      return this.baseCost;
    },
    getBonusText(lvl: number) {
      return lvl > 0 ? '1 Воскрешение' : 'Не куплено';
    },
  },
  {
    id: 'power_weapon_slots',
    name: 'Оружейный пояс',
    comicName: 'WEAPON SLOTS',
    description: '+1 дополнительный слот под активное оружие.',
    icon: '',
    maxLevel: 3,
    baseCost: 180,
    costMultiplier: 2.0,
    getCost(lvl: number) {
      return Math.round(this.baseCost * Math.pow(this.costMultiplier, lvl));
    },
    getBonusText(lvl: number) {
      return `Слотов оружия: ${2 + lvl} (макс. 5)`;
    },
  },
  {
    id: 'power_tome_slots',
    name: 'Сумка мутаций',
    comicName: 'TOME SLOTS',
    description: '+1 дополнительный слот под пассивные фолианты.',
    icon: '',
    maxLevel: 3,
    baseCost: 150,
    costMultiplier: 2.0,
    getCost(lvl: number) {
      return Math.round(this.baseCost * Math.pow(this.costMultiplier, lvl));
    },
    getBonusText(lvl: number) {
      return `Слотов томов: ${2 + lvl} (макс. 5)`;
    },
  },
];
