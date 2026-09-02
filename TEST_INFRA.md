# E2E Test Infra: Bashmak Balance Validation

## Test Philosophy
- Opaque-box, headless simulation derived directly from user requirements (`ORIGINAL_REQUEST.md`).
- Mathematically validates session pacing, level progression timing, mob density oscillation, and TTK metrics over 10–12 minute runs without requiring a browser or Phaser canvas.

## Feature Inventory & Test Coverage
| # | Feature | Source | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Cross-Feature) | Tier 4 (Workloads) |
|---|---------|--------|:-----------------:|:-----------------:|:---------------------:|:------------------:|
| 1 | XP Progression (L1-6, L12-18, L25-30) | §R1 | 5 | 5 | ✓ | ✓ |
| 2 | Anti-Power-Cap (Cap unreachable <9:00) | §R1 | 5 | 5 | ✓ | ✓ |
| 3 | Wave Tension Rhythm (60–90s cycle) | §R2 | 5 | 5 | ✓ | ✓ |
| 4 | Directional Swarms & Formations | §R2 | 5 | 5 | ✓ | ✓ |
| 5 | Mob Stats & Archetypes (Fodder, Tank, Sprinter) | §R3 | 5 | 5 | ✓ | ✓ |
| 6 | Dynamic TTK (0.3s–1.2s fodder punch-through) | §R3 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **Script**: `scripts/simulate-balance.ts`
- **Invocation**: `npx tsx scripts/simulate-balance.ts`
- **Output**: JSON & formatted console report with timestamps, levels, TTK ratios, and pass/fail assertions.

## Acceptance Criteria Thresholds
- Level 5 reached between 1:30 and 2:30.
- Level 15 reached between 5:00 and 6:30.
- Level 25–32 reached at 10:00.
- Build upgrade max-cap unreachable before 9:00.
- Fodder TTK stays within 0.3s–1.2s across all 10 minutes.
- Wave density oscillates cyclically with peaks and valleys every 60–90s.
- TypeScript compiler and architecture linter pass with exit code 0.
