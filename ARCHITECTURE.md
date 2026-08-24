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
│   │       ├── HomingDaggersWeapon.ts
│   │       ├── MegaBootWeapon.ts
│   │       ├── LightningZapWeapon.ts
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
│       ├── ResultScene.ts
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
- Любое новое оружие со снарядами спавнит пули **только через `ctx.projectilePool`**, а не через `scene.physics.add.sprite().destroy()`.

---

## 4. Архитектурные границы (Что нельзя делать)

1. **Запрещено** импортировать `Telegram.WebApp` в `GameScene` или `Entity` — используйте только `IPlatformAdapter`.
2. **Запрещено** обращаться к DOM напрямую из боевой логики или сущностей — изменения передаются через `EventBus` -> `HUD`.
3. **Запрещено** хардкодить типы врагов через `if (enemy.type === '...')` внутри сцен — используйте свойства `EnemyDefinition` и компоненты.
4. **Запрещено** хранить персистентное состояние игры внутри Phaser GameObjects.
5. **Запрещено** спавнить и уничтожать снаряды, лут или сплэши через `scene.add.sprite().destroy()` — использовать строго `ProjectilePool`, `LootSystem`, `DamageNumberPool` и `VfxPool`.

