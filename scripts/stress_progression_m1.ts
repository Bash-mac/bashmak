import { GameState } from '../src/game/core/GameState';
import { EventBus } from '../src/game/core/EventBus';
import {
  FODDER_BAT,
  CRAWLER_SWARM,
  SPRINTER_BUG,
  ARMORED_SLUG,
  EXPLODER_SPORE,
  MINI_BOSS_ELITE,
  BOSS_KURGAN,
} from '../src/game/data/enemies';

function runStressTests() {
  console.log('====================================================');
  console.log('  CHALLENGER 1: M1 PROGRESSION & ECONOMY STRESS TEST');
  console.log('====================================================\n');

  const gs = GameState.getInstance();
  let failureCount = 0;

  function assert(condition: boolean, msg: string) {
    if (!condition) {
      console.error(`[FAIL] ${msg}`);
      failureCount++;
    }
  }

  // -------------------------------------------------------------
  // 1. BOUNDARY TRANSITIONS, MONOTONICITY & HIGH LEVEL SCALING
  // -------------------------------------------------------------
  console.log('>>> 1. Testing Monotonicity, Boundaries, and Scaling (L1 -> L1000)...');

  let prevXp = 0;
  for (let lvl = 1; lvl <= 1000; lvl++) {
    const xp = gs.calculateXpForLevel(lvl);
    assert(Number.isInteger(xp), `calculateXpForLevel(${lvl}) must be an integer, got ${xp}`);
    assert(xp > 0, `calculateXpForLevel(${lvl}) must be positive, got ${xp}`);
    assert(Number.isFinite(xp), `calculateXpForLevel(${lvl}) must be finite, got ${xp}`);
    if (lvl > 1) {
      assert(
        xp > prevXp,
        `Monotonicity violation at L${lvl}: req(${lvl})=${xp} not strictly greater than req(${lvl - 1})=${prevXp}`
      );
    }
    prevXp = xp;
  }

  // Boundary inspection
  const xpL5 = gs.calculateXpForLevel(5);
  const xpL6 = gs.calculateXpForLevel(6);
  const xpL15 = gs.calculateXpForLevel(15);
  const xpL16 = gs.calculateXpForLevel(16);

  console.log(`- Boundary L5 -> L6:   L5=${xpL5}, L6=${xpL6} (delta: +${xpL6 - xpL5})`);
  console.log(`- Boundary L15 -> L16: L15=${xpL15}, L16=${xpL16} (delta: +${xpL16 - xpL15})`);

  assert(xpL5 === 37, `L5 req expected 37, got ${xpL5}`);
  assert(xpL6 === 57, `L6 req expected 57, got ${xpL6}`);
  assert(xpL15 === 260, `L15 req expected 260, got ${xpL15}`);
  assert(xpL16 === 293, `L16 req expected 293, got ${xpL16}`);
  assert(xpL6 > xpL5, `Boundary L5->L6 failed: ${xpL6} <= ${xpL5}`);
  assert(xpL16 > xpL15, `Boundary L15->L16 failed: ${xpL16} <= ${xpL15}`);

  // Large level scaling sanity checks
  const xpL30 = gs.calculateXpForLevel(30);
  const xpL50 = gs.calculateXpForLevel(50);
  const xpL100 = gs.calculateXpForLevel(100);
  console.log(`- Scaling sample: L30=${xpL30}, L50=${xpL50}, L100=${xpL100}`);
  assert(xpL30 > xpL16, 'L30 > L16');
  assert(xpL50 > xpL30, 'L50 > L30');
  assert(xpL100 > xpL50, 'L100 > L50');

  // Edge inputs to calculateXpForLevel
  assert(gs.calculateXpForLevel(0) === 5, 'calculateXpForLevel(0) should clamp to L1 (5)');
  assert(gs.calculateXpForLevel(-10) === 5, 'calculateXpForLevel(-10) should clamp to L1 (5)');
  assert(gs.calculateXpForLevel(3.7) === 21, 'calculateXpForLevel(3.7) should floor to L3 (21)');
  assert(gs.calculateXpForLevel(15.9) === 260, 'calculateXpForLevel(15.9) should floor to L15 (260)');

  // -------------------------------------------------------------
  // 2. CUMULATIVE XP VALIDATION
  // -------------------------------------------------------------
  console.log('\n>>> 2. Testing Cumulative XP Milestones...');

  // Cumulative XP needed to reach targetLevel from Level 1: sum_{l=1}^{targetLevel - 1} calculateXpForLevel(l)
  function getCumulativeXpToReach(targetLevel: number): number {
    let sum = 0;
    for (let l = 1; l < targetLevel; l++) {
      sum += gs.calculateXpForLevel(l);
    }
    return sum;
  }

  const cumL5 = getCumulativeXpToReach(5);
  const cumL14 = getCumulativeXpToReach(14);
  const cumL15 = getCumulativeXpToReach(15);
  const cumL25 = getCumulativeXpToReach(25);
  const cumL28 = getCumulativeXpToReach(28);
  const cumL30 = getCumulativeXpToReach(30);

  console.log(`- Cumulative XP to reach Level 5:  ${cumL5} (Target: 68)`);
  console.log(`- Cumulative XP to reach Level 14: ${cumL14} (Target: ~1200)`);
  console.log(`- Cumulative XP to reach Level 15: ${cumL15} (Target: ~1200-1400)`);
  console.log(`- Cumulative XP to reach Level 25: ${cumL25} (Target: ~6500-7500)`);
  console.log(`- Cumulative XP to reach Level 28: ${cumL28} (Near max-build)`);
  console.log(`- Cumulative XP to reach Level 30: ${cumL30} (Full endgame cap)`);

  assert(cumL5 === 68, `Level 5 cumulative XP must be 68, got ${cumL5}`);
  assert(
    cumL14 <= 1200 && cumL15 >= 1200,
    `Level 15 milestone (~1200 XP) must cross 1200 between L14 (${cumL14}) and L15 (${cumL15})`
  );
  assert(
    cumL25 >= 6000 && cumL30 <= 12000,
    `Late-game progression window (L25-L30) must span 6000..12000 XP`
  );

  // -------------------------------------------------------------
  // 3. 1,000,000 RANDOM XP ADDITIONS STRESS TEST
  // -------------------------------------------------------------
  console.log('\n>>> 3. Stress-testing addXp with 1,000,000 random XP additions...');

  gs.reset();
  let totalXpAdded = 0;
  const iterations = 1000000;
  const startTime = Date.now();

  // cumulativeReqCache[L] = exact sum of calculateXpForLevel(1..L-1) required to reach Level L
  const cumulativeReqCache: number[] = [0, 0]; // Index 0 unused, Index 1 = 0 XP to reach Level 1
  function getCachedCumulative(lvl: number): number {
    while (cumulativeReqCache.length <= lvl) {
      const curMaxLevel = cumulativeReqCache.length - 1;
      const nextReq = gs.calculateXpForLevel(curMaxLevel);
      cumulativeReqCache.push(cumulativeReqCache[curMaxLevel] + nextReq);
    }
    return cumulativeReqCache[lvl];
  }

  for (let i = 0; i < iterations; i++) {
    // Generate random XP: mix of common fodder (1..4), medium (8..35), boss (150), and large clusters (500..2000)
    let xpAmount = 1;
    const r = Math.random();
    if (r < 0.6) {
      xpAmount = Math.floor(Math.random() * 4) + 1; // 1..4
    } else if (r < 0.85) {
      xpAmount = Math.floor(Math.random() * 20) + 5; // 5..24
    } else if (r < 0.98) {
      xpAmount = Math.floor(Math.random() * 100) + 25; // 25..124
    } else {
      xpAmount = Math.floor(Math.random() * 2000) + 100; // 100..2099
    }

    totalXpAdded += xpAmount;
    gs.addXp(xpAmount);

    // Invariant check on periodic samples and final iterations
    if (i % 50000 === 0 || i === iterations - 1) {
      const cumRequired = getCachedCumulative(gs.level);
      const totalTracked = cumRequired + gs.currentXp;

      if (totalTracked !== totalXpAdded) {
        assert(
          false,
          `Conservation of XP broken at iter ${i}: totalAdded=${totalXpAdded}, cumReq(${gs.level})=${cumRequired}, currentXp=${gs.currentXp}, sum=${totalTracked}`
        );
      }
      if (gs.currentXp >= gs.nextLevelXp) {
        assert(
          false,
          `currentXp (${gs.currentXp}) >= nextLevelXp (${gs.nextLevelXp}) at iter ${i}, level ${gs.level}`
        );
      }
      if (gs.currentXp < 0) {
        assert(false, `currentXp < 0 (${gs.currentXp}) at iter ${i}`);
      }
      if (gs.nextLevelXp !== gs.calculateXpForLevel(gs.level)) {
        assert(
          false,
          `nextLevelXp (${gs.nextLevelXp}) != calculateXpForLevel(${gs.level}) at iter ${i}`
        );
      }
      if (gs.pendingLevelUps !== gs.level - 1) {
        assert(
          false,
          `pendingLevelUps (${gs.pendingLevelUps}) != level - 1 (${gs.level - 1}) at iter ${i}`
        );
      }
    }
  }

  const elapsedMs = Date.now() - startTime;
  console.log(`- 1,000,000 additions completed in ${elapsedMs}ms.`);
  console.log(`- Final State: Level ${gs.level}, CurrentXP: ${gs.currentXp}/${gs.nextLevelXp}, Pending LevelUps: ${gs.pendingLevelUps}, Total XP: ${totalXpAdded}`);

  const finalCum = getCachedCumulative(gs.level);
  assert(
    finalCum + gs.currentXp === totalXpAdded,
    `Final XP conservation failed: ${finalCum + gs.currentXp} vs ${totalXpAdded}`
  );
  assert(gs.currentXp < gs.nextLevelXp, `Final currentXp < nextLevelXp check failed`);
  assert(gs.pendingLevelUps === gs.level - 1, `Final pendingLevelUps check failed`);

  // -------------------------------------------------------------
  // 4. ADVERSARIAL EDGE CASES
  // -------------------------------------------------------------
  console.log('\n>>> 4. Testing Adversarial Edge Cases...');

  // A. Massive single addition (10,000,000 XP in one go)
  gs.reset();
  const megaXp = 10000000;
  gs.addXp(megaXp);
  const megaCum = getCachedCumulative(gs.level);
  console.log(`- Mega Jump (10,000,000 XP): Level ${gs.level}, XP ${gs.currentXp}/${gs.nextLevelXp}, Pending: ${gs.pendingLevelUps}`);
  assert(
    megaCum + gs.currentXp === megaXp,
    `Mega jump conservation failed: ${megaCum + gs.currentXp} != ${megaXp}`
  );
  assert(gs.currentXp < gs.nextLevelXp, 'Mega jump currentXp < nextLevelXp');

  // B. Exact boundary leveling
  gs.reset();
  // L1 requires 5
  gs.addXp(5);
  assert(gs.level === 2 && gs.currentXp === 0 && gs.nextLevelXp === 13, 'Exact boundary L1->L2 failed');
  // L2 requires 13
  gs.addXp(13);
  assert(gs.level === 3 && gs.currentXp === 0 && gs.nextLevelXp === 21, 'Exact boundary L2->L3 failed');
  // L3 requires 21
  gs.addXp(21);
  assert(gs.level === 4 && gs.currentXp === 0 && gs.nextLevelXp === 29, 'Exact boundary L3->L4 failed');
  // L4 requires 29
  gs.addXp(29);
  assert(gs.level === 5 && gs.currentXp === 0 && gs.nextLevelXp === 37, 'Exact boundary L4->L5 failed');
  // L5 requires 37
  gs.addXp(37);
  assert(gs.level === 6 && gs.currentXp === 0 && gs.nextLevelXp === 57, 'Exact boundary L5->L6 failed');

  // C. 0 XP addition
  const lvlBeforeZero = gs.level;
  const xpBeforeZero = gs.currentXp;
  gs.addXp(0);
  assert(gs.level === lvlBeforeZero && gs.currentXp === xpBeforeZero, 'addXp(0) corrupted state');

  // D. EventBus emission integrity
  gs.reset();
  let levelUpEventsCount = 0;
  let lastEmittedLevel = 0;
  let xpGainedEventsCount = 0;
  const bus = EventBus.getInstance();
  const unsubLevel = bus.on('player:levelUp', (data: { newLevel: number }) => {
    levelUpEventsCount++;
    lastEmittedLevel = data.newLevel;
  });
  const unsubXp = bus.on('xp:gained', () => {
    xpGainedEventsCount++;
  });

  // Add 68 XP (should level up from 1 to 5 -> 4 level up events: 2, 3, 4, 5)
  gs.addXp(68);
  assert(levelUpEventsCount === 4, `Expected 4 levelUp events, got ${levelUpEventsCount}`);
  assert(lastEmittedLevel === 5, `Expected lastEmittedLevel = 5, got ${lastEmittedLevel}`);
  assert(xpGainedEventsCount === 1, `Expected 1 xp:gained event, got ${xpGainedEventsCount}`);

  // E. GameOver suppression
  gs.endRun(false);
  const lvlAtGameOver = gs.level;
  const xpAtGameOver = gs.currentXp;
  gs.addXp(1000);
  assert(
    gs.level === lvlAtGameOver && gs.currentXp === xpAtGameOver,
    'addXp after gameOver must be ignored'
  );

  // -------------------------------------------------------------
  // 5. ENEMY DROP ECONOMY & GEM VALUE TIERS
  // -------------------------------------------------------------
  console.log('\n>>> 5. Testing Enemy XP Values & Economy...');
  assert(FODDER_BAT.xpReward === 1, `FODDER_BAT expected 1, got ${FODDER_BAT.xpReward}`);
  assert(CRAWLER_SWARM.xpReward === 2, `CRAWLER_SWARM expected 2, got ${CRAWLER_SWARM.xpReward}`);
  assert(SPRINTER_BUG.xpReward === 3, `SPRINTER_BUG expected 3, got ${SPRINTER_BUG.xpReward}`);
  assert(ARMORED_SLUG.xpReward === 8, `ARMORED_SLUG expected 8, got ${ARMORED_SLUG.xpReward}`);
  assert(EXPLODER_SPORE.xpReward === 4, `EXPLODER_SPORE expected 4, got ${EXPLODER_SPORE.xpReward}`);
  assert(MINI_BOSS_ELITE.xpReward === 35, `MINI_BOSS_ELITE expected 35, got ${MINI_BOSS_ELITE.xpReward}`);
  assert(BOSS_KURGAN.xpReward === 150, `BOSS_KURGAN expected 150, got ${BOSS_KURGAN.xpReward}`);

  console.log('\n====================================================');
  if (failureCount === 0) {
    console.log('  ALL STRESS TESTS PASSED WITH 0 FAILURES!');
  } else {
    console.error(`  STRESS TEST FAILED WITH ${failureCount} FAILURES!`);
  }
  console.log('====================================================');

  if (failureCount > 0) {
    process.exit(1);
  }
}

runStressTests();
