import { GameState } from '../src/game/core/GameState';
import { FODDER_BAT, CRAWLER_SWARM, SPRINTER_BUG, ARMORED_SLUG, EXPLODER_SPORE, MINI_BOSS_ELITE, BOSS_KURGAN } from '../src/game/data/enemies';

const gs = GameState.getInstance();
gs.reset();

console.log('--- TESTING GAMESTATE PROGRESSION ---');
console.log('Initial level:', gs.level);
console.log('Initial nextLevelXp:', gs.nextLevelXp);
if (gs.nextLevelXp !== 5) {
  throw new Error(`Initial nextLevelXp must be 5, got ${gs.nextLevelXp}`);
}

// Test calculateXpForLevel
const expectedLevels: Record<number, number> = {
  1: 5,
  2: 13,
  3: 21,
  4: 29,
  5: 37,
  6: 57,
  15: 260,
  16: 293,
};

for (const [lvlStr, exp] of Object.entries(expectedLevels)) {
  const lvl = Number(lvlStr);
  const val = gs.calculateXpForLevel(lvl);
  console.log(`calculateXpForLevel(${lvl}) = ${val}, expected = ${exp}`);
  if (val !== exp) {
    throw new Error(`Mismatch for level ${lvl}: got ${val}, expected ${exp}`);
  }
}

// Test leveling via addXp
gs.addXp(5);
console.log(`After 5 XP: level = ${gs.level}, nextLevelXp = ${gs.nextLevelXp}, pendingLevelUps = ${gs.pendingLevelUps}`);
if (gs.level !== 2 || gs.nextLevelXp !== 13 || gs.pendingLevelUps !== 1) {
  throw new Error('Level up to 2 failed');
}

gs.addXp(13);
console.log(`After +13 XP: level = ${gs.level}, nextLevelXp = ${gs.nextLevelXp}, pendingLevelUps = ${gs.pendingLevelUps}`);
if (gs.level !== 3 || gs.nextLevelXp !== 21 || gs.pendingLevelUps !== 2) {
  throw new Error('Level up to 3 failed');
}

// Test multi-level jump
gs.reset();
gs.addXp(68); // L1->2 (5), L2->3 (13), L3->4 (21), L4->5 (29) = 68 total
console.log(`After 68 XP from reset: level = ${gs.level}, nextLevelXp = ${gs.nextLevelXp}, pending = ${gs.pendingLevelUps}`);
if (gs.level !== 5 || gs.nextLevelXp !== 37 || gs.pendingLevelUps !== 4) {
  throw new Error('Cumulative level up to 5 failed');
}

console.log('--- TESTING ENEMY XP REWARDS ---');
console.log('Fodder:', FODDER_BAT.xpReward);
console.log('Crawler:', CRAWLER_SWARM.xpReward);
console.log('Sprinter:', SPRINTER_BUG.xpReward);
console.log('Tank:', ARMORED_SLUG.xpReward);
console.log('Exploder:', EXPLODER_SPORE.xpReward);
console.log('Mini-boss:', MINI_BOSS_ELITE.xpReward);
console.log('Final Boss:', BOSS_KURGAN.xpReward);

if (FODDER_BAT.xpReward !== 1) throw new Error('Fodder XP reward mismatch');
if (CRAWLER_SWARM.xpReward !== 2) throw new Error('Crawler XP reward mismatch');
if (SPRINTER_BUG.xpReward !== 3) throw new Error('Sprinter XP reward mismatch');
if (ARMORED_SLUG.xpReward !== 8) throw new Error('Tank XP reward mismatch');
if (EXPLODER_SPORE.xpReward !== 4) throw new Error('Exploder XP reward mismatch');
if (MINI_BOSS_ELITE.xpReward !== 35) throw new Error('Mini-boss XP reward mismatch');
if (BOSS_KURGAN.xpReward !== 150) throw new Error('Final Boss XP reward mismatch');

console.log('--- ALL M1 PROGRESSION TESTS PASSED! ---');
