/**
 * Adversarial Stress Test Suite for Milestone M2 (Wave Manager & Tension Rhythm)
 * Simulates 4 comprehensive 720-second (12-minute) profiles:
 * 1. Standing Still (vx=0, vy=0)
 * 2. Circular Kiting (continuous angular velocity)
 * 3. Straight Sprint (high velocity cardinal dashing)
 * 4. Erratic Zig-Zag (rapid velocity flipping and direction changes)
 * 
 * Verifies:
 * - 60-90s Cyclical tension rhythm ("Качели") across all 9 cycles per profile
 * - Density multiplier bounds (breather vs peak)
 * - Spawn interval bounds (breather >= peak)
 * - Safe target population progression (< 300 max pool limit)
 * - Safe off-screen spawning geometry (never within viewport)
 * - Directional swarm heading biases
 * - EventDirector event trigger precision
 */

// Headless polyfills for Phaser
const canvasMock = {
  fillStyle: '',
  getImageData: () => ({ data: [0, 0, 0, 0] }),
  putImageData: () => {},
  createImageData: () => ({ data: [0, 0, 0, 0] }),
  fillRect: () => {},
};
(global as any).window = {
  cordova: undefined,
  addEventListener: () => {},
  removeEventListener: () => {},
  focus: () => {},
};
(global as any).document = {
  createElement: () => ({ getContext: () => canvasMock }),
  documentElement: {},
};
(global as any).localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};
try {
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent: 'node', maxTouchPoints: 0 },
    configurable: true,
  });
} catch {}
(global as any).Image = class {};
(global as any).HTMLCanvasElement = class {};
(global as any).HTMLVideoElement = class {};
(global as any).HTMLImageElement = class {};

interface SpawnRecord {
  defId: string;
  archetype: string;
  x: number;
  y: number;
  playerX: number;
  playerY: number;
  playerVx: number;
  playerVy: number;
  distFromPlayer: number;
  time: number;
  cycleIndex: number;
  phase: string;
  isChampion: boolean;
  isOnScreen: boolean;
}

interface ProfileResult {
  name: string;
  totalSpawns: number;
  cycleCount: number;
  cyclePhasesVerified: boolean;
  onScreenSpawnsCount: number;
  maxTargetPop: number;
  minTargetPop: number;
  maxActiveMobs: number;
  avgBreatherDensity: number;
  avgPeakDensity: number;
  avgBreatherInterval: number;
  avgPeakInterval: number;
  directionalFrontRatio: number;
  eventsTriggered: string[];
  errors: string[];
}

async function runAdversarialStressSuite() {
  const { SpawnManager, CYCLE_DURATION_SECONDS, PHASE_DURATIONS } = await import('../src/game/spawning/SpawnManager');
  const { EventDirector } = await import('../src/game/spawning/EventDirector');
  type EnemyDefinition = import('../src/game/data/definitions').EnemyDefinition;
  type EnemyScaling = import('../src/game/spawning/SpawnManager').EnemyScaling;

  console.log('================================================================');
  console.log(' EMPIRICAL CHALLENGER: MILESTONE M2 STRESS TEST HARNESS (4x720s)');
  console.log('================================================================\n');

  const viewportHalfW = 680;
  const viewportHalfH = 400;
  const totalSimSeconds = 720;
  const dtMs = 16.666; // 60 FPS
  const numCyclesExpected = Math.floor(totalSimSeconds / CYCLE_DURATION_SECONDS); // 9 cycles

  const movementProfiles = [
    {
      name: 'Standing Still (Zero Velocity)',
      updatePos: (t: number, p: { x: number; y: number; vx: number; vy: number }) => {
        p.vx = 0;
        p.vy = 0;
      },
    },
    {
      name: 'Circular Kiting (Radius 250, 110 px/s)',
      updatePos: (t: number, p: { x: number; y: number; vx: number; vy: number }) => {
        const omega = 0.45;
        p.vx = -Math.sin(omega * t) * 110;
        p.vy = Math.cos(omega * t) * 110;
        p.x += p.vx * (dtMs / 1000);
        p.y += p.vy * (dtMs / 1000);
      },
    },
    {
      name: 'Straight Sprint (240 px/s Dash & Cardinal Turns)',
      updatePos: (t: number, p: { x: number; y: number; vx: number; vy: number }) => {
        const segment = Math.floor(t / 15) % 4;
        const speed = 240;
        if (segment === 0) { p.vx = speed; p.vy = 0; }
        else if (segment === 1) { p.vx = 0; p.vy = speed; }
        else if (segment === 2) { p.vx = -speed; p.vy = 0; }
        else { p.vx = 0; p.vy = -speed; }
        p.x += p.vx * (dtMs / 1000);
        p.y += p.vy * (dtMs / 1000);
      },
    },
    {
      name: 'Erratic Zig-Zag (Rapid High-Frequency Jitter)',
      updatePos: (t: number, p: { x: number; y: number; vx: number; vy: number }) => {
        const freqX = Math.sin(t * 4.2);
        const freqY = Math.cos(t * 3.7);
        p.vx = freqX * 180;
        p.vy = freqY * 180;
        p.x += p.vx * (dtMs / 1000);
        p.y += p.vy * (dtMs / 1000);
      },
    },
  ];

  const allProfileResults: ProfileResult[] = [];
  let globalSuitePassed = true;

  for (const profile of movementProfiles) {
    console.log(`>>> Running Profile: ${profile.name} (720s, 43,200 ticks)...`);
    const errors: string[] = [];
    const spawns: SpawnRecord[] = [];

    const player = { x: 1000, y: 1000, vx: 0, vy: 0 };
    let activeMobCount = 0;
    let maxObservedActiveMobs = 0;
    let maxTargetPopObserved = 0;
    let minTargetPopObserved = Infinity;

    // Track cycle stats
    const cyclePhaseRecord: Map<number, Set<string>> = new Map();
    for (let c = 0; c < numCyclesExpected; c++) {
      cyclePhaseRecord.set(c, new Set());
    }

    const spawnCb = (def: EnemyDefinition, x: number, y: number, _scaling: EnemyScaling, isChampion = false) => {
      const dx = Math.abs(x - player.x);
      const dy = Math.abs(y - player.y);
      const dist = Math.hypot(x - player.x, y - player.y);
      const currentPhase = spawnMgr.getCurrentPhase();
      const phaseState = spawnMgr.getPhaseState();

      // On-screen check: if x is within [playerX - halfW, playerX + halfW] AND y is within [playerY - halfH, playerY + halfH]
      const isOnScreen = dx < viewportHalfW && dy < viewportHalfH;

      spawns.push({
        defId: def.id,
        archetype: def.archetype,
        x,
        y,
        playerX: player.x,
        playerY: player.y,
        playerVx: player.vx,
        playerVy: player.vy,
        distFromPlayer: dist,
        time: simTime,
        cycleIndex: phaseState.cycleIndex,
        phase: currentPhase,
        isChampion,
        isOnScreen,
      });

      activeMobCount++;
    };

    const spawnMgr = new SpawnManager(
      () => ({ x: player.x, y: player.y, vx: player.vx, vy: player.vy }),
      spawnCb,
      () => ({ halfW: viewportHalfW, halfH: viewportHalfH }),
      () => activeMobCount,
      () => 1.0 + (simTime / 60) * 1.15
    );

    const eventDir = new EventDirector();
    const mockScene: any = {
      cameras: {
        main: {
          width: 1280,
          height: 720,
          worldView: { x: player.x - 640, right: player.x + 640, y: player.y - 360, bottom: player.y + 360 },
        },
      },
      add: {
        rectangle: () => ({ setStrokeStyle: () => {}, setDepth: () => {}, destroy: () => {}, setName: () => {} }),
        circle: () => ({ setStrokeStyle: () => {}, setDepth: () => {}, destroy: () => {} }),
        sprite: () => ({ setScale: () => {}, setDepth: () => {}, play: () => {}, destroy: () => {} }),
        container: () => ({ setScrollFactor: () => {}, setDepth: () => {}, add: () => {}, setPosition: () => {}, setScale: () => {}, setVisible: () => {}, setAlpha: () => {}, getByName: () => null }),
        triangle: () => ({ setStrokeStyle: () => {}, setFillStyle: () => {}, setRotation: () => {} }),
        text: () => ({ setOrigin: () => {}, setScrollFactor: () => {}, setDepth: () => {}, setText: () => {}, setColor: () => {} }),
      },
      tweens: {
        add: () => ({}),
        killTweensOf: () => {},
      },
      time: {
        delayedCall: (_ms: number, fn: () => void) => fn(),
      },
      anims: {
        exists: () => false,
      },
    };

    const eventCtx = {
      scene: mockScene,
      spawnManager: spawnMgr,
      lootSystem: { spawnGem: () => {}, spawnChest: () => {}, spawnGoo: () => {} } as any,
      audio: { playLevelUp: () => {}, playPlayerHurt: () => {} } as any,
      getPlayerPos: () => ({ x: player.x, y: player.y }),
    };

    let simTime = 0;
    let breatherDensitySum = 0;
    let breatherDensityCount = 0;
    let peakDensitySum = 0;
    let peakDensityCount = 0;

    let breatherIntervalSum = 0;
    let breatherIntervalCount = 0;
    let peakIntervalSum = 0;
    let peakIntervalCount = 0;

    // Simulation loop
    for (let t = 0; t <= totalSimSeconds; t += dtMs / 1000) {
      simTime = t;
      profile.updatePos(simTime, player);

      // Simulate player DPS / kills (realistic kill curve)
      if (activeMobCount > 0) {
        // Player kills proportional to weapons power
        const killRate = 0.2 + (simTime / 60) * 0.12;
        if (Math.random() < killRate) {
          const kills = Math.min(activeMobCount, Math.floor(1 + Math.random() * (1 + (simTime / 60) * 1.4)));
          activeMobCount -= kills;
        }
      }

      spawnMgr.update(dtMs, simTime);
      eventDir.update(simTime, eventCtx);

      const phaseState = spawnMgr.getPhaseState();
      const targetPop = spawnMgr.getTargetPopulation();
      const spawnInt = spawnMgr.getSpawnInterval();

      // Record cycle phase presence
      if (phaseState.cycleIndex < numCyclesExpected) {
        cyclePhaseRecord.get(phaseState.cycleIndex)?.add(phaseState.phase);
      }

      if (targetPop > maxTargetPopObserved) maxTargetPopObserved = targetPop;
      if (targetPop < minTargetPopObserved) minTargetPopObserved = targetPop;
      if (activeMobCount > maxObservedActiveMobs) maxObservedActiveMobs = activeMobCount;

      if (phaseState.phase === 'breather') {
        breatherDensitySum += phaseState.densityMultiplier;
        breatherDensityCount++;
        breatherIntervalSum += spawnInt;
        breatherIntervalCount++;
      } else if (phaseState.phase === 'peak_swarm') {
        peakDensitySum += phaseState.densityMultiplier;
        peakDensityCount++;
        peakIntervalSum += spawnInt;
        peakIntervalCount++;
      }

      // Check sanity: no NaN or Infinity
      if (Number.isNaN(targetPop) || !Number.isFinite(targetPop) || targetPop <= 0) {
        errors.push(`Invalid target population at t=${t.toFixed(1)}s: ${targetPop}`);
      }
      if (Number.isNaN(spawnInt) || !Number.isFinite(spawnInt) || spawnInt <= 0) {
        errors.push(`Invalid spawn interval at t=${t.toFixed(1)}s: ${spawnInt}`);
      }
    }

    // Post-simulation validations for this profile
    const onScreenSpawns = spawns.filter((s) => s.isOnScreen);
    if (onScreenSpawns.length > 0) {
      errors.push(`Detected ${onScreenSpawns.length} ON-SCREEN enemy spawns! (First at t=${onScreenSpawns[0].time.toFixed(1)}s, pos=(${onScreenSpawns[0].x.toFixed(0)}, ${onScreenSpawns[0].y.toFixed(0)}), player=(${onScreenSpawns[0].playerX.toFixed(0)}, ${onScreenSpawns[0].playerY.toFixed(0)}))`);
    }

    // Check all 9 cycles for 4 distinct phases
    let allCyclesHave4Phases = true;
    for (let c = 0; c < numCyclesExpected; c++) {
      const phases = cyclePhaseRecord.get(c);
      if (!phases || phases.size !== 4) {
        allCyclesHave4Phases = false;
        errors.push(`Cycle ${c} missing phases! Found: ${phases ? Array.from(phases).join(', ') : 'none'}`);
      }
    }

    // Density averages
    const avgBreatherDensity = breatherDensitySum / Math.max(1, breatherDensityCount);
    const avgPeakDensity = peakDensitySum / Math.max(1, peakDensityCount);
    const avgBreatherInt = breatherIntervalSum / Math.max(1, breatherIntervalCount);
    const avgPeakInt = peakIntervalSum / Math.max(1, peakIntervalCount);

    if (avgBreatherDensity < 0.45 || avgBreatherDensity > 0.60) {
      errors.push(`Breather density average (${avgBreatherDensity.toFixed(2)}) outside [0.45, 0.60]`);
    }
    if (avgPeakDensity < 1.30 || avgPeakDensity > 1.60) {
      errors.push(`Peak density average (${avgPeakDensity.toFixed(2)}) outside [1.30, 1.60]`);
    }
    if (avgBreatherInt <= avgPeakInt) {
      errors.push(`Breather spawn interval (${avgBreatherInt.toFixed(0)}ms) must be longer than peak interval (${avgPeakInt.toFixed(0)}ms)`);
    }

    // Safe Pool Limits Check
    if (maxTargetPopObserved > 300) {
      errors.push(`Max target population (${maxTargetPopObserved}) exceeds safe pool limit of 300!`);
    }
    if (minTargetPopObserved < 6) {
      errors.push(`Min target population (${minTargetPopObserved}) is suspiciously low (< 6)`);
    }

    // Directional Swarm Heading Analysis (for moving profiles)
    let directionalFrontRatio = 1.0;
    if (Math.hypot(player.vx, player.vy) > 20) {
      const peakDirectionalSpawns = spawns.filter((s) => s.phase === 'peak_swarm');
      let frontCount = 0;
      for (const s of peakDirectionalSpawns) {
        const moveAngle = Math.atan2(s.playerVy, s.playerVx);
        const spawnAngle = Math.atan2(s.y - s.playerY, s.x - s.playerX);
        let diff = Math.abs(spawnAngle - moveAngle);
        while (diff > Math.PI) diff = Math.abs(diff - 2 * Math.PI);
        if (diff <= Math.PI / 3) {
          frontCount++;
        }
      }
      directionalFrontRatio = frontCount / Math.max(1, peakDirectionalSpawns.length);
      if (peakDirectionalSpawns.length > 50 && directionalFrontRatio < 0.45) {
        errors.push(`Directional swarm front bias too weak: ${(directionalFrontRatio * 100).toFixed(1)}% (expected >= 45%)`);
      }
    }

    const eventsList = Array.from(eventDir.getTriggeredEvents());
    const expectedEvents = ['event_pinata', 'event_stampede', 'event_toxic_surge', 'event_miniboss', 'event_kamikaze', 'event_boss'];
    for (const exp of expectedEvents) {
      if (!eventDir.isEventTriggered(exp)) {
        errors.push(`Missing event trigger: ${exp}`);
      }
    }

    const result: ProfileResult = {
      name: profile.name,
      totalSpawns: spawns.length,
      cycleCount: numCyclesExpected,
      cyclePhasesVerified: allCyclesHave4Phases,
      onScreenSpawnsCount: onScreenSpawns.length,
      maxTargetPop: maxTargetPopObserved,
      minTargetPop: minTargetPopObserved,
      maxActiveMobs: maxObservedActiveMobs,
      avgBreatherDensity,
      avgPeakDensity,
      avgBreatherInterval: avgBreatherInt,
      avgPeakInterval: avgPeakInt,
      directionalFrontRatio,
      eventsTriggered: eventsList,
      errors,
    };

    allProfileResults.push(result);

    console.log(`  - Total Spawns: ${spawns.length}`);
    console.log(`  - 9 Cycles 4-Phase Integrity: ${allCyclesHave4Phases ? 'PASS' : 'FAIL'}`);
    console.log(`  - On-Screen Spawns: ${onScreenSpawns.length}`);
    console.log(`  - Target Pop: [Min: ${minTargetPopObserved}, Max: ${maxTargetPopObserved}] (Safe < 300)`);
    console.log(`  - Density Oscillations: Breather=${avgBreatherDensity.toFixed(2)}x (${Math.round(avgBreatherInt)}ms) <---> Peak=${avgPeakDensity.toFixed(2)}x (${Math.round(avgPeakInt)}ms)`);
    console.log(`  - Front Intercept Bias: ${(directionalFrontRatio * 100).toFixed(1)}%`);
    console.log(`  - EventDirector Anchors: ${eventsList.length}/6 triggered`);
    if (errors.length > 0) {
      console.log(`  - ERRORS FOUND:`);
      errors.forEach((e) => console.log(`    * ${e}`));
      globalSuitePassed = false;
    } else {
      console.log(`  - Profile Status: PASSED\n`);
    }
  }

  // --- ADDITIONAL ADVERSARIAL STRESS TESTS ---
  console.log('>>> Running Adversarial Edge-Case Tests:');

  // Edge Test 1: Repositioning Wrap-Around Bounds
  console.log('  [Edge 1] Reposition Wrap-Around Position Bounds...');
  const dummyPlayer = { x: 5000, y: 5000, vx: 150, vy: 0 };
  const repMgr = new SpawnManager(
    () => dummyPlayer,
    () => {},
    () => ({ halfW: 680, halfH: 400 }),
    () => 0,
    () => 1.0
  );
  let repInsideScreenCount = 0;
  for (let i = 0; i < 500; i++) {
    const pos = repMgr.getRepositionPosition();
    const dx = Math.abs(pos.x - dummyPlayer.x);
    const dy = Math.abs(pos.y - dummyPlayer.y);
    if (dx < 680 && dy < 400) {
      repInsideScreenCount++;
    }
  }
  console.log(`  [Edge 1 Result] Repositioning off-screen violations: ${repInsideScreenCount}/500`);
  if (repInsideScreenCount > 0) {
    globalSuitePassed = false;
    console.error('  FAIL: Reposition placed mob inside screen viewport!');
  }

  // Edge Test 2: Stationary Repositioning Angle Distribution
  console.log('  [Edge 2] Stationary Repositioning Angle Distribution...');
  dummyPlayer.vx = 0;
  dummyPlayer.vy = 0;
  let stationaryInsideScreenCount = 0;
  for (let i = 0; i < 500; i++) {
    const pos = repMgr.getRepositionPosition();
    const dx = Math.abs(pos.x - dummyPlayer.x);
    const dy = Math.abs(pos.y - dummyPlayer.y);
    if (dx < 680 && dy < 400) {
      stationaryInsideScreenCount++;
    }
  }
  console.log(`  [Edge 2 Result] Stationary reposition off-screen violations: ${stationaryInsideScreenCount}/500`);
  if (stationaryInsideScreenCount > 0) {
    globalSuitePassed = false;
    console.error('  FAIL: Stationary reposition placed mob inside screen viewport!');
  }

  // Edge Test 3: Extreme Overtime / Extended Session (> 30 minutes)
  console.log('  [Edge 3] Extreme Overtime Session (t = 1800s / 30 min)...');
  repMgr.update(16.666, 1800);
  const overtimePhase = repMgr.getPhaseState();
  const overtimePop = repMgr.getTargetPopulation();
  const overtimeInterval = repMgr.getSpawnInterval();
  console.log(`  [Edge 3 Result] 30-min CycleIndex=${overtimePhase.cycleIndex}, Phase=${overtimePhase.phase}, Pop=${overtimePop}, Interval=${overtimeInterval}ms`);
  if (overtimePhase.cycleIndex !== 22) {
    console.error(`  FAIL: Expected cycle 22 at 1800s, got ${overtimePhase.cycleIndex}`);
    globalSuitePassed = false;
  }
  if (overtimePop < 150 || overtimePop > 300) {
    console.error(`  FAIL: Expected overtime population between 150 and 300, got ${overtimePop}`);
    globalSuitePassed = false;
  }

  // Summary Verdict
  console.log('\n================================================================');
  console.log(`FINAL STRESS SUITE VERDICT: ${globalSuitePassed ? 'APPROVED (100% PASS)' : 'CHANGES REQUESTED'}`);
  console.log('================================================================\n');

  return { passed: globalSuitePassed, allProfileResults };
}

runAdversarialStressSuite().then((res) => {
  if (!res.passed) process.exit(1);
});
