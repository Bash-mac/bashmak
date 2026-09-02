import { GameState } from '../src/game/core/GameState';
import { EventBus } from '../src/game/core/EventBus';

const gs = GameState.getInstance();
const bus = EventBus.getInstance();

console.log('=== 1. EDGE CASES: calculateXpForLevel ===');
const testCases: [number, string][] = [
  [0, 'Level 0 (should clamp to Level 1: 5 XP)'],
  [-5, 'Level -5 (should clamp to Level 1: 5 XP)'],
  [-9999, 'Level -9999 (should clamp to Level 1: 5 XP)'],
  [1.2, 'Level 1.2 (floor to 1: 5 XP)'],
  [5.8, 'Level 5.8 (floor to 5: 37 XP)'],
  [15.9, 'Level 15.9 (floor to 15: 260 XP)'],
  [16.1, 'Level 16.1 (floor to 16: 293 XP)'],
  [100, 'Level 100 (>100 scale test)'],
  [200, 'Level 200 (>100 scale test)'],
  [1000, 'Level 1000 (>100 scale test)'],
];

for (const [lvl, desc] of testCases) {
  const xp = gs.calculateXpForLevel(lvl);
  console.log(`calculateXpForLevel(${lvl}) = ${xp} | ${desc}`);
  if (isNaN(xp) || !isFinite(xp) || xp <= 0) {
    throw new Error(`Invalid XP value ${xp} for level ${lvl}`);
  }
}

console.log('\n=== 2. MONOTONICITY & CONTINUITY CHECK (L1 to L500) ===');
let prev = 0;
for (let l = 1; l <= 500; l++) {
  const req = gs.calculateXpForLevel(l);
  if (req <= prev) {
    throw new Error(`Monotonicity failed at level ${l}: ${req} <= previous ${prev}`);
  }
  prev = req;
}
console.log('Monotonicity verified for levels 1 to 500: PASS');

console.log('\n=== 3. MASSIVE XP IN SINGLE FRAME ===');
gs.reset();
let levelUpCount = 0;
let lastLevelEmitted = 0;
let xpGainedCount = 0;

bus.on('player:levelUp', (data: { newLevel: number }) => {
  levelUpCount++;
  lastLevelEmitted = data.newLevel;
});

bus.on('xp:gained', () => {
  xpGainedCount++;
});

const MASSIVE_XP = 100000; // 100,000 XP in 1 frame
console.log(`Adding ${MASSIVE_XP} XP in single call...`);
gs.addXp(MASSIVE_XP);

console.log(`Final State: Level = ${gs.level}, currentXp = ${gs.currentXp}, nextLevelXp = ${gs.nextLevelXp}`);
console.log(`Pending Level Ups: ${gs.pendingLevelUps}`);
console.log(`LevelUp events emitted: ${levelUpCount}, Last level emitted: ${lastLevelEmitted}`);
console.log(`XpGained events emitted: ${xpGainedCount}`);

if (gs.level !== lastLevelEmitted) {
  throw new Error(`Last level emitted (${lastLevelEmitted}) does not match gs.level (${gs.level})`);
}
if (gs.pendingLevelUps !== gs.level - 1) {
  throw new Error(`Expected pendingLevelUps = ${gs.level - 1}, got ${gs.pendingLevelUps}`);
}
if (xpGainedCount !== 1) {
  throw new Error(`Expected exactly 1 xp:gained event, got ${xpGainedCount}`);
}

// Verify mathematical conservation of XP
let totalCost = 0;
for (let l = 1; l < gs.level; l++) {
  totalCost += gs.calculateXpForLevel(l);
}
const totalAccounted = totalCost + gs.currentXp;
console.log(`Total XP input: ${MASSIVE_XP}, Total XP accounted (levels + current): ${totalAccounted}`);
if (totalAccounted !== MASSIVE_XP) {
  throw new Error(`XP conservation failed! Input: ${MASSIVE_XP}, Accounted: ${totalAccounted}`);
}

console.log('\n=== 4. ZERO / NEGATIVE XP & GAME OVER BEHAVIOR ===');
gs.reset();
const initialXp = gs.currentXp;
const initialLvl = gs.level;

// Add 0 XP
gs.addXp(0);
if (gs.currentXp !== initialXp || gs.level !== initialLvl) {
  throw new Error('addXp(0) modified state unexpectedly');
}

// End run and try adding XP
gs.endRun();
gs.addXp(5000);
if (gs.level !== initialLvl) {
  throw new Error('addXp after endRun should be ignored');
}

console.log('\n=== ALL ADVERSARIAL TESTS PASSED! ===');
