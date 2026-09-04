import { GameState } from '../src/game/core/GameState';
import {
  FODDER_BAT,
  CRAWLER_SWARM,
  SPRINTER_BUG,
  ARMORED_SLUG,
  EXPLODER_SPORE,
  MINI_BOSS_ELITE,
  BOSS_KURGAN,
} from '../src/game/data/enemies';

let errors: string[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    errors.push(message);
    console.error(`[FAIL] ${message}`);
  }
}

console.log('=====================================================');
console.log(' FORENSIC AUDIT: MILESTONE M1 VERIFICATION SUITE');
console.log('=====================================================');

const gs = GameState.getInstance();
gs.reset();

// 1. Initial State Verification
console.log('\n--- 1. Initial GameState Verification ---');
assert(gs.level === 1, `Initial level must be 1, got ${gs.level}`);
assert(gs.currentXp === 0, `Initial currentXp must be 0, got ${gs.currentXp}`);
assert(gs.nextLevelXp === 23, `Initial nextLevelXp must be 23, got ${gs.nextLevelXp}`);
assert(gs.pendingLevelUps === 0, `Initial pendingLevelUps must be 0, got ${gs.pendingLevelUps}`);

// 2. Mathematical Verification of calculateXpForLevel
console.log('\n--- 2. Formula Math & Boundary Verification ---');

// Ground truth reference formula function (evaluated directly from mathematical specifications)
function refFormula(lvl: number): number {
  const n = Math.max(1, Math.floor(lvl));
  return Math.round(14 + Math.pow(n, 1.84) * 9.4);
}

// Compare calculateXpForLevel against reference formula for L1 to L1000
let prevVal = 0;
for (let lvl = 1; lvl <= 1000; lvl++) {
  const val = gs.calculateXpForLevel(lvl);
  const expected = refFormula(lvl);
  assert(
    val === expected,
    `calculateXpForLevel(${lvl}) mismatch: got ${val}, expected ${expected}`
  );
  assert(Number.isInteger(val), `calculateXpForLevel(${lvl}) is not an integer: ${val}`);
  assert(val > 0, `calculateXpForLevel(${lvl}) is not positive: ${val}`);
  assert(Number.isFinite(val), `calculateXpForLevel(${lvl}) is not finite: ${val}`);
  if (lvl > 1) {
    assert(val > prevVal, `Monotonicity failed at level ${lvl}: ${val} <= ${prevVal}`);
  }
  prevVal = val;
}

// Edge case inputs
assert(gs.calculateXpForLevel(0) === 23, 'calculateXpForLevel(0) must clamp to 23');
assert(gs.calculateXpForLevel(-100) === 23, 'calculateXpForLevel(-100) must clamp to 23');
assert(gs.calculateXpForLevel(3.2) === 85, 'calculateXpForLevel(3.2) must floor to L3 = 85');
assert(gs.calculateXpForLevel(15.8) === 1385, 'calculateXpForLevel(15.8) must floor to L15 = 1385');

// Cumulative XP calculations
function getCumXp(targetLvl: number): number {
  let sum = 0;
  for (let l = 1; l < targetLvl; l++) {
    sum += gs.calculateXpForLevel(l);
  }
  return sum;
}

const cumL2 = getCumXp(2);
const cumL5 = getCumXp(5);
const cumL6 = getCumXp(6);
const cumL15 = getCumXp(15);
const cumL16 = getCumXp(16);
const cumL28 = getCumXp(28);

console.log(`Cumulative to L2:  ${cumL2} (Expected: 23)`);
console.log(`Cumulative to L5:  ${cumL5} (Expected: 290)`);
console.log(`Cumulative to L6:  ${cumL6} (Expected: 486)`);
console.log(`Cumulative to L15: ${cumL15} (Expected: 6767)`);
console.log(`Cumulative to L16: ${cumL16} (Expected: 8152)`);
console.log(`Cumulative to L28: ${cumL28} (Expected: 40871)`);

assert(cumL2 === 23, `Cum L2 expected 23, got ${cumL2}`);
assert(cumL5 === 290, `Cum L5 expected 290, got ${cumL5}`);
assert(cumL6 === 486, `Cum L6 expected 486, got ${cumL6}`);
assert(cumL15 === 6767, `Cum L15 expected 6767, got ${cumL15}`);
assert(cumL16 === 8152, `Cum L16 expected 8152, got ${cumL16}`);
assert(cumL28 === 40871, `Cum L28 expected 40871, got ${cumL28}`);

// 3. Leveling Mechanics & Invariant Stress Testing
console.log('\n--- 3. Leveling Mechanics & Invariant Stress Testing ---');
gs.reset();

// Test exact single level jumps
gs.addXp(23);
assert(gs.level === 2 && gs.currentXp === 0 && gs.nextLevelXp === 48 && gs.pendingLevelUps === 1, 'L1->L2 transition failed');

gs.addXp(48);
assert(gs.level === 3 && gs.currentXp === 0 && gs.nextLevelXp === 85 && gs.pendingLevelUps === 2, 'L2->L3 transition failed');

gs.addXp(85);
assert(gs.level === 4 && gs.currentXp === 0 && gs.nextLevelXp === 134 && gs.pendingLevelUps === 3, 'L3->L4 transition failed');

gs.addXp(134);
assert(gs.level === 5 && gs.currentXp === 0 && gs.nextLevelXp === 196 && gs.pendingLevelUps === 4, 'L4->L5 transition failed');

gs.addXp(196);
assert(gs.level === 6 && gs.currentXp === 0 && gs.nextLevelXp === 268 && gs.pendingLevelUps === 5, 'L5->L6 transition failed');

// Multi-level jump test with remainder
gs.reset();
gs.addXp(100); // 23 (L2) + 48 (L3) = 71 -> remainder 29 at L3. Next requires 85.
assert(gs.level === 3, `Expected Level 3 after 100 XP, got ${gs.level}`);
assert(gs.currentXp === 29, `Expected currentXp = 29 after 100 XP, got ${gs.currentXp}`);
assert(gs.nextLevelXp === 85, `Expected nextLevelXp = 85 after 100 XP, got ${gs.nextLevelXp}`);
assert(gs.pendingLevelUps === 2, `Expected pendingLevelUps = 2 after 100 XP, got ${gs.pendingLevelUps}`);

// 100,000 Step Randomized Conservation Verification
console.log('\n--- 4. Conservation of XP Invariant (100,000 randomized steps) ---');
gs.reset();
let totalXpAdded = 0;
for (let step = 0; step < 100000; step++) {
  const xp = Math.floor(Math.random() * 200) + 1;
  totalXpAdded += xp;
  gs.addXp(xp);

  const cumToCurrent = getCumXp(gs.level);
  const totalAccounted = cumToCurrent + gs.currentXp;
  if (totalAccounted !== totalXpAdded) {
    assert(false, `Conservation failure at step ${step}: added ${totalXpAdded}, accounted ${totalAccounted}`);
    break;
  }
  if (gs.currentXp >= gs.nextLevelXp) {
    assert(false, `currentXp (${gs.currentXp}) >= nextLevelXp (${gs.nextLevelXp}) at step ${step}`);
    break;
  }
  if (gs.pendingLevelUps !== gs.level - 1) {
    assert(false, `pendingLevelUps (${gs.pendingLevelUps}) !== level - 1 (${gs.level - 1}) at step ${step}`);
    break;
  }
}

// 5. Enemy XP Rewards Verification
console.log('\n--- 5. Enemy XP Rewards Verification ---');
assert(FODDER_BAT.xpReward === 1, `FODDER_BAT.xpReward expected 1, got ${FODDER_BAT.xpReward}`);
assert(CRAWLER_SWARM.xpReward === 2, `CRAWLER_SWARM.xpReward expected 2, got ${CRAWLER_SWARM.xpReward}`);
assert(SPRINTER_BUG.xpReward === 3, `SPRINTER_BUG.xpReward expected 3, got ${SPRINTER_BUG.xpReward}`);
assert(ARMORED_SLUG.xpReward === 8, `ARMORED_SLUG.xpReward expected 8, got ${ARMORED_SLUG.xpReward}`);
assert(EXPLODER_SPORE.xpReward === 4, `EXPLODER_SPORE.xpReward expected 4, got ${EXPLODER_SPORE.xpReward}`);
assert(MINI_BOSS_ELITE.xpReward === 35, `MINI_BOSS_ELITE.xpReward expected 35, got ${MINI_BOSS_ELITE.xpReward}`);
assert(BOSS_KURGAN.xpReward === 150, `BOSS_KURGAN.xpReward expected 150, got ${BOSS_KURGAN.xpReward}`);

// Final Result Summary
console.log('\n=====================================================');
if (errors.length === 0) {
  console.log('>>> FORENSIC AUDIT PASS: 0 ERRORS DETECTED <<<');
} else {
  console.error(`>>> FORENSIC AUDIT FAIL: ${errors.length} ERRORS DETECTED <<<`);
  process.exit(1);
}
console.log('=====================================================');
