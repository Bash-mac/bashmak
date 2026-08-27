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
│   ├── core/           # Чистая доменная логика (Pure TS, БЕЗ импортов Phaser)
│   │   ├── EventBus.ts
│   │   ├── GameState.ts
│   │   └── SaveManager.ts
│   ├── pools/          # Пул объектов для 60 FPS (ObjectPool.ts)
│   │   └── ObjectPool.ts
│   ├── entities/       # Сущности и их компоненты (Composition)
│   │   ├── Entity.ts
│   │   └── components/
│   │       ├── StatsComponent.ts
│   │       └── HealthComponent.ts
│   ├── data/           # Data-driven контент (герои, враги, пассивки, эволюции)
│   │   ├── definitions.ts
│   │   ├── evolutions.ts
│   │   ├── heroes/
│   │   ├── enemies.ts
│   │   ├── upgrades.ts
│   │   └── metaUpgrades.ts
│   ├── combat/         # Боевой движок, пулы пуль/урона и оружие
│   │   ├── CombatSystem.ts
│   │   ├── CollisionManager.ts
│   │   ├── ProjectilePool.ts
│   │   ├── DamageNumberPool.ts
│   │   ├── VfxPool.ts
│   │   ├── WeaponManager.ts
│   │   └── weapons/
│   │       ├── IWeapon.ts
│   │       ├── SlimeSpitWeapon.ts
│   │       ├── LaceWhipWeapon.ts
│   │       ├── CarrotBarrageWeapon.ts
│   │       ├── EggplantRollWeapon.ts
│   │       ├── OrbitingFliesWeapon.ts
│   │       ├── MegaBootWeapon.ts
│   │       ├── ManholeDropWeapon.ts
│   │       └── AcidTrailWeapon.ts
│   ├── audio/          # Звуковой движок (Web Audio API procedural synth)
│   │   └── AudioManager.ts
│   ├── traits/         # Трейты персонажей
│   │   └── HeroTraitSystem.ts
│   ├── ai/             # ИИ мобов, флокинг/разделение толпы, боссы
│   │   └── EnemyAISystem.ts
│   ├── loot/           # Спавн кристаллов XP, капель GOO, прогрессивный магнит
│   │   └── LootSystem.ts
│   ├── map/            # Генератор препятствий, бочек, алтарей, лужи
│   │   ├── MapGenerator.ts
│   │   └── HazardSystem.ts
│   ├── spawning/       # Управление спавном и кривой популяции
│   │   ├── SpawnManager.ts
│   │   └── EnemyFactory.ts
│   └── scenes/         # Сцены Phaser (только тонкая оркестрация и визуал)
│       ├── BootScene.ts
│       ├── MenuScene.ts
│       ├── GameScene.ts
│       ├── UpgradesScene.ts
│       └── ui/
│           ├── HUD.ts
│           ├── LevelUpModal.ts
│           ├── GrimoireModal.ts
│           ├── HeroSelectModal.ts
│           └── GameOverModal.ts
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

### 2.7. Pooling & High-Load Architecture (`src/game/pools`, `src/game/combat`)
- Все высоконагруженные короткоживущие объекты (снаряды, кристаллы опыта, капли GOO, сплэши урона, всплывающие цифры) управляются через `ObjectPool<T>`.
- Снаряды спавнятся через `ProjectilePool.getProjectile()`, возвращаются по таймеру или коллизии через `releaseProjectile()`.
- Кристаллы опыта управляются через `LootSystem` с жестким ограничением в 90 штук и автослиянием (Gem Merging) дальних кристаллов.
- Всплывающий урон использует `DamageNumberPool`.

---

## 3. Руководство по расширению

### 4 Канонических Героя игры:
- **`Vypolzok`** (`src/game/data/heroes/vypolzok.ts`, id: `hero_vypolzok`) — Слизеплюй & Слизистый след.
- **`Baklazhan`** (`src/game/data/heroes/baklazhan.ts`, id: `hero_baklazhan`) — Фиолетовый шар & Разбег.
- **`Bashmak`** (`src/game/data/heroes/bashmak.ts`, id: `hero_bashmak`) — Шнуровой кнут & Тяжёлая поступь.
- **`Markovka`** (`src/game/data/heroes/markovka.ts`, id: `hero_markovka`) — Морковный град & Жажда скорости.

### Как добавить нового героя:
1. Создайте файл `src/game/data/heroes/<имя>.ts`.
2. Экспортируйте объект `HeroDefinition`:
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
3. Зарегистрируйте его в `HEROES_REGISTRY` в `src/game/data/heroes/index.ts`. Никаких правок в `GameScene` или `CombatSystem` не требуется.

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

### Где находятся Weapons / Abilities / Upgrades:
- Контракты объявлены в `src/game/data/definitions.ts` (`WeaponDefinition`, `UpgradeDefinition`).
- Реализации оружия находятся в `src/game/combat/weapons/` (1 файл = 1 класс, реализующий интерфейс `IWeapon`).
- Базовые данные и параметры прокачки объявляются в `src/game/data/weapons/` и `src/game/data/upgrades.ts`.
- Любое новое оружие со снарядами спавнит пули **только через `ctx.projectilePool`**, а всплывающий урон через `ctx.damageNumbers`.

---

## 4. Архитектурные границы (Что нельзя делать)

1. **Запрещено** импортировать `Telegram.WebApp` в `GameScene` или `Entity` — используйте только `IPlatformAdapter`.
2. **Запрещено** обращаться к DOM напрямую из боевой логики или сущностей — изменения передаются через `EventBus` -> `HUD`.
3. **Запрещено** хардкодить типы врагов через `if (enemy.type === '...')` внутри сцен — используйте свойства `EnemyDefinition` и компоненты.
4. **Запрещено** хранить персистентное состояние игры внутри Phaser GameObjects.
5. **Запрещено** спавнить и уничтожать снаряды, лут или сплэши через `scene.add.sprite().destroy()` — использовать строго `ProjectilePool`, `LootSystem`, `DamageNumberPool` и `VfxPool`.
6. **Запрещено** создавать GameObjects (`scene.add.*`), уничтожать контейнеры через `removeAll(true)` или аллоцировать новые объекты внутри методов `update()` — соблюдать Zero-Allocation в тике.
7. **Запрещено** верстать UI/модалки в абсолютных пикселях под конкретный экран или использовать `if (width < 700)` — весь UI верстается ТОЛЬКО под единый Virtual Viewport (база `1280x720` в Landscape) внутри контейнера с масштабом `Math.min(width / 1280, height / 720)`. Запрещено зажимать масштаб через `Math.min(1.0, ...)`.

---

## 5. Стандарт верстки UI (Virtual Viewport 1280x720)

Все модальные окна, оверлеи и меню реализуются по единому стандарту:
1. **Базовый виртуальный холст**: 1280 × 720 (Landscape).
2. **Фоновый оверлей (Dark Backdrop)**: создается на реальные `width, height` камеры (`setDepth(10000)`).
3. **Корневой UI-контейнер**: центрируется в `(width / 2, height / 2)` и масштабируется:
   ```typescript
   const virtualW = 1280;
   const virtualH = 720;
   const modalScale = Math.min((width * 0.96) / virtualW, (height * 0.96) / virtualH);
   const modalContainer = this.scene.add.container(width / 2, height / 2).setScale(modalScale);
   ```
4. **Координаты внутри контейнера**: все элементы (заголовки, плашки, кнопки) верстаются относительно `(0, 0)` центра или фиксированных оффсетов виртуального разрешения. Это гарантирует 100% идентичность и на смартфоне в Telegram (390-430px), и на мониторах Full HD / 2K / 4K.

