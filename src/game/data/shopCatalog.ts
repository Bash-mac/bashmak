export interface ShopItemMock {
  id: string;
  name: string;
  category: string;
  description: string;
  stats: string;
  price: number;
  level: number;
  maxLevel: number;
  iconColor: number;
}

export const SHOP_MOCK_CATALOG: ShopItemMock[] = [
  { id: 'm1', category: 'МУТАЦИИ', name: 'ТОКСИЧНЫЙ СПРИНТ', description: 'Увеличивает базовую скорость передвижения по трубам.', stats: '+10% Скорость бега', price: 150, level: 1, maxLevel: 5, iconColor: 0x22c55e },
  { id: 'm2', category: 'МУТАЦИИ', name: 'БРОНЕЖЕЛУДОК', description: 'Переваривает токсичные отходы, повышая запас HP.', stats: '+20 Макс. HP', price: 200, level: 2, maxLevel: 5, iconColor: 0xef4444 },
  { id: 'm3', category: 'МУТАЦИИ', name: 'СЛИЗИСТАЯ РЕГЕНЕРАЦИЯ', description: 'Постепенно регенерирует здоровье во время забега.', stats: '+1.5 HP/сек', price: 350, level: 0, maxLevel: 3, iconColor: 0x06b6d4 },
  { id: 'm4', category: 'МУТАЦИИ', name: 'СПОРОВЫЙ МАГНИТ', description: 'Притягивает капли слизи и кристаллы с расстояния.', stats: '+35% Радиус сбора', price: 120, level: 3, maxLevel: 5, iconColor: 0xf59e0b },
  { id: 'm5', category: 'МУТАЦИИ', name: 'КИСЛОТНЫЙ ПУЛЬС', description: 'Ускоряет перезарядку и откат всех типов атак.', stats: '-8% Кулдаун атак', price: 500, level: 0, maxLevel: 4, iconColor: 0xa855f7 },
  { id: 'm6', category: 'МУТАЦИИ', name: 'ГЛАЗ МУТАЦИИ', description: 'Повышает шанс найти редкие усиленные трофеи.', stats: '+15% Удача', price: 400, level: 0, maxLevel: 3, iconColor: 0xec4899 },
];
