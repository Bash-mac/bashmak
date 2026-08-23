# Rogue Core — Архитектура проекта

Технический фундамент для 2D Action-Roguelite игры на TypeScript, Phaser 3 и Vite.
Поддерживает работу в **обычном браузере** и **Telegram Mini App (TMA)** с единой кодовой базой.

---

## 1. Структура директорий

```text
src/
├── config/             # Конфигурации Phaser, размеры, физика
│   └── GameConfig.ts
├── platform/           # Изоляция платформенной специфики (Browser / TMA)
│   ├── PlatformAdapter.ts
│   ├── BrowserAdapter.ts
│   ├── TelegramAdapter.ts
│   └── index.ts
├── input/              # Абстрактный ввод (Десктоп + Тач-джойстик)
│   ├── IInputSource.ts
│   ├── KeyboardInputSource.ts
│   ├── VirtualJoystickInputSource.ts
│   └── InputManager.ts
├── game/
│   ├── core/           # Чистая доменная логика, шина событий, сохранения
│   │   ├── EventBus.ts
│   │   ├── GameState.ts
│   │   └── SaveManager.ts
│   ├── entities/       # Сущности и их компоненты (Composition)
│   │   ├── Entity.ts
│   │   └── components/
│   │       ├── StatsComponent.ts
│   │       └── HealthComponent.ts
│   ├── data/           # Data-driven контент (герои, враги, пассивки, мета)
│   │   ├── definitions.ts
│   │   ├── heroes.ts
│   │   ├── enemies.ts
│   │   ├── upgrades.ts
│   │   └── metaUpgrades.ts
│   ├── combat/         # Боевой движок и оружие (1 файл на 1 пушку)
│   │   ├── CombatSystem.ts
│   │   ├── WeaponManager.ts
│   │   └── weapons/
│   │       ├── IWeapon.ts
│   │       ├── HomingDaggersWeapon.ts
│   │       ├── BouncingBonesWeapon.ts
│   │       ├── LightningZapWeapon.ts
│   │       └── AcidTrailWeapon.ts
│   ├── ai/             # ИИ мобов, флокинг/разделение толпы, боссы
│   │   └── EnemyAISystem.ts
│   ├── loot/           # Спавн кристаллов XP, капель GOO, прогрессивный магнит
│   │   └── LootSystem.ts
│   ├── map/            # Генератор препятствий, бочек, алтарей
│   │   └── MapGenerator.ts
│   ├── spawning/       # Управление спавном и кривой популяции
│   │   └── SpawnManager.ts
│   └── scenes/         # Сцены Phaser (только тонкая оркестрация и визуал)
│       ├── BootScene.ts
│       ├── MenuScene.ts
│       ├── GameScene.ts
│       ├── UpgradesScene.ts
│       ├── ResultScene.ts
│       └── ui/
│           ├── HUD.ts
│           └── LevelUpModal.ts
└── main.ts             # Точка входа приложения
```

---

## 2. Ключевые слои и ответственность

### 2.1. Platform Adapters (`src/platform`)
- Единый интерфейс `IPlatformAdapter`.
- `TelegramPlatformAdapter` отвечает за `Telegram.WebApp.ready()`, `expand()`, `disableVerticalSwipes()` и тактильную отдачу (Haptic Feedback).
- `BrowserPlatformAdapter` обеспечивает запуск на десктопе/в обычном браузере.
- Игровое ядро **не зависит** от Telegram API напрямую.

### 2.2. Input Layer (`src/input`)
- `KeyboardInputSource` (WASD / стрелки) и `VirtualJoystickInputSource` (плавающий экранный джойстик) изолированы друг от друга.
- `InputManager` опрашивает активные источники и отдает в игру нормализованный вектор `getMovementVector(): { x, y }`.

### 2.3. Game Core & State (`src/game/core`)
- `GameState`: хранит доменные данные забега (время, убийства, опыт, уровень, счет) без привязки к спрайтам Phaser.
- `EventBus`: типизированная шина событий (`player:damaged`, `enemy:died`, `xp:gained`, `run:ended`).

### 2.4. Entity & Components (`src/game/entities`)
- Принцип: *Composition over Inheritance*.
- `Entity` объединяет `StatsComponent` (скорость, урон, броня) и `HealthComponent` (HP, живой/мертв), а также привязку к физическому телу Phaser.

### 2.5. Combat System (`src/game/combat`)
- Изолирована от UI и рендеринга.
- Чистый расчет формулы урона (`effectiveDamage = max(1, damage - armor)`), снятие HP и генерация событий смерти/начисления очков.

### 2.6. Phaser Scenes (`src/game/scenes`)
- `GameScene` **не является God-объектом**. Она выступает тонким оркестратором: связывает Phaser Arcade Physics, рендеринг, камеры, таймеры и доменные системы (`CombatSystem`, `SpawnManager`, `InputManager`).

---

## 3. Руководство по расширению

### Как добавить нового героя:
1. Откройте `src/game/data/heroes.ts`.
2. Создайте объект `HeroDefinition`:
   ```typescript
   export const TANK_HERO: HeroDefinition = {
     id: 'hero_tank',
     name: 'Juggernaut',
     description: 'High armor, slow movement.',
     textureKey: 'tex_hero_tank',
     stats: { maxHp: 200, speed: 160, damage: 15, armor: 4 },
     startingWeaponId: 'weapon_hammer',
   };
   ```
3. Зарегистрируйте его в `HEROES_REGISTRY`. Никаких правок в `GameScene` или `CombatSystem` не требуется.

### Как добавить нового врага:
1. Откройте `src/game/data/enemies.ts`.
2. Создайте объект `EnemyDefinition`:
   ```typescript
   export const FAST_ENEMY: EnemyDefinition = {
     id: 'enemy_runner',
     name: 'Runner Bug',
     textureKey: 'tex_enemy_runner',
     stats: { maxHp: 15, speed: 180, damage: 6, armor: 0 },
     xpReward: 8,
     aiBehavior: 'chase',
   };
   ```
3. Добавьте его в пул волн `SpawnManager`.

### Где будут Weapons / Abilities / Upgrades:
- Контракты уже объявлены в `src/game/data/definitions.ts` (`WeaponDefinition`, `UpgradeDefinition`).
- Реализации оружия и апгрейдов добавляются в `src/game/data/weapons.ts` и `src/game/data/upgrades.ts` как наборы модификаторов статов (`apply: (stats) => void`).

---

## 4. Архитектурные границы (Что нельзя делать)

1. **Запрещено** импортировать `Telegram.WebApp` в `GameScene` или `Entity` — используйте только `IPlatformAdapter`.
2. **Запрещено** обращаться к DOM напрямую из боевой логики или сущностей — изменения передаются через `EventBus` -> `HUD`.
3. **Запрещено** хардкодить типы врагов через `if (enemy.type === '...')` внутри сцен — используйте свойства `EnemyDefinition` и компоненты.
4. **Запрещено** хранить персистентное состояние игры внутри Phaser GameObjects.
