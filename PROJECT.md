# Project: Bashmak Survival Loop Balance Overhaul

## Architecture
- **Core State & Progression**: `src/game/core/GameState.ts` (`calculateXpForLevel`, `addXp`, `level`, `nextLevelXp`)
- **Loot & Economy**: `src/game/loot/LootSystem.ts` (90-gem condensation pool, magnet mechanics, gem value tiers)
- **Wave & Spawning Director**: `src/game/spawning/SpawnManager.ts` & `src/game/spawning/EventDirector.ts` (60–90s cyclical rhythm: Breather -> Build-up -> Swarm Peak -> Elite)
- **Enemy Archetypes & Stats**: `src/game/data/enemies/` (`FODDER_BAT`, `CRAWLER_SWARM`, `SPRINTER_BUG`, `ARMORED_SLUG`, `EXPLODER_SPORE`, `MINI_BOSS_ELITE`, `BOSS_KURGAN`)
- **Combat & Scaling**: `src/game/combat/CombatSystem.ts`, `src/game/combat/weapons/`
- **Validation & Simulation**: `scripts/simulate-balance.ts` (Headless 10-minute simulation verifying XP milestones, TTK, and wave dynamics)

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | F1: 3-Tier XP Progression | Piecewise `calculateXpForLevel` (L1-6 fast, L7-18 deliberate, L19-30 push, cap >9:00) | M1 | ORIGINAL_REQUEST §R1 |
| 2 | F2: XP Drop & Economy Tuning | Enemy XP drop values and 90-gem pool condensation tiers | M1 | ORIGINAL_REQUEST §R1 |
| 3 | F3: Wave Tension Rhythm ("Качели") | 60–90s cyclical wave director (Breather, Build-up, Swarm Peak, Elite) | M2 | ORIGINAL_REQUEST §R2 |
| 4 | F4: Directional Swarms & Formations | Directional charge and ring squeeze patterns with predictive bias | M2 | ORIGINAL_REQUEST §R2 |
| 5 | F5: Mob Stats & Archetype Tuning | Stats & physical properties for Fodder, Sprinter, Tank, Exploder, Miniboss, Boss | M3 | ORIGINAL_REQUEST §R3 |
| 6 | F6: Dynamic TTK & HP Scaling | Time/Power HP scaling keeping fodder TTK between 0.3s and 1.2s | M3 | ORIGINAL_REQUEST §R3 |
| 7 | F7: Automated Simulation Suite | Headless 10-minute simulation with milestone assertions and TTK logging | Test Track | ORIGINAL_REQUEST §R4 |
| 8 | F8: Full E2E & Adversarial Hardening | 100% pass across all weapon archetypes and adversarial edge cases | M4 | ORIGINAL_REQUEST Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| Test Track | E2E Testing Harness | Create `scripts/simulate-balance.ts` and `TEST_READY.md` | none | IN_PROGRESS |
| M1 | XP Progression & Economy | Implement 3-tier XP curve and drop values (`GameState.ts`, `LootSystem.ts`, `enemies/`) | none | DONE |
| M2 | Wave Manager & Tension Rhythm | Implement 60-90s cyclical phases & swarm formations (`SpawnManager.ts`, `EventDirector.ts`) | M1 | PLANNED |
| M3 | Mob Stats & TTK Scaling | Implement enemy stats, armor/mass, and dynamic scaling (`enemies/`, `SpawnManager.ts`) | M1, M2 | PLANNED |
| M4 | Final Integration & Hardening | Pass 100% of simulation tests across all archetypes + Tier 5 adversarial hardening | Test Track, M1, M2, M3 | PLANNED |

## Interface Contracts
### GameState ↔ LootSystem & UI
- `calculateXpForLevel(lvl: number): number`: Pure function returning exact XP required to advance from `lvl` to `lvl + 1`.
- `addXp(amount: number): boolean`: Accumulates XP, triggers level-up callback when threshold reached, updates `nextLevelXp`.
- `nextLevelXp`: Initialized to `calculateXpForLevel(1)` (= 5 XP).

### SpawnManager ↔ EventDirector
- `SpawnManager.update(time: number, delta: number, playerPos: Vec2, playerVelocity: Vec2)`:
  - Queries active wave phase from cycle time ($t \pmod{80\text{s}}$).
  - Adjusts target population and spawn interval based on micro-phase.
  - Triggers directional swarms and coordinates with `EventDirector`.

### CombatSystem ↔ EnemyPool & Weapons
- Base damage modified by armor: `effectiveDamage = Math.max(1, Math.round(baseDamage * (12 / (12 + targetArmor))))`.
- Enemy HP scaled by `timeHpFactor * powerHpFactor`.

## Code Layout
- `src/game/core/GameState.ts` — XP formulas and leveling logic
- `src/game/loot/LootSystem.ts` — XP gem spawning, values, condensation
- `src/game/spawning/SpawnManager.ts` — Spawning director, wave intervals, population curves
- `src/game/spawning/EventDirector.ts` — Timed event anchors, bosses, special formations
- `src/game/data/enemies/*.ts` — Enemy archetypes and base stat definitions
- `src/game/combat/CombatSystem.ts` — Combat damage and armor calculations
- `scripts/simulate-balance.ts` — Headless balance simulation and validation script
