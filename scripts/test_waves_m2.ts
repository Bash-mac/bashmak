/**
 * Milestone M2 Wave Manager & Tension Rhythm ("Качели") Verification Script
 * Simulates 10-minute session + 2-minute overtime to verify:
 * 1. 80-second wave tension rhythm (Breather -> Buildup -> Peak Swarm -> Climax)
 * 2. Target population and spawn interval oscillations ("Качели")
 * 3. Directional swarm formations with predictive heading bias
 * 4. EventDirector milestone event anchors alignment
 */

// Headless Polyfill for Phaser in Node.js
const ctx = {
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
  createElement: () => ({ getContext: () => ctx }),
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

async function runSimulation() {
  const { SpawnManager, CYCLE_DURATION_SECONDS, PHASE_DURATIONS } = await import('../src/game/spawning/SpawnManager');
  const { EventDirector } = await import('../src/game/spawning/EventDirector');
  type EnemyScaling = import('../src/game/spawning/SpawnManager').EnemyScaling;
  type WavePhase = import('../src/game/spawning/SpawnManager').WavePhase;
  type EnemyDefinition = import('../src/game/data/definitions').EnemyDefinition;

  interface SimSpawnedEnemy {
    def: EnemyDefinition;
    x: number;
    y: number;
    scaling: EnemyScaling;
    isChampion: boolean;
    spawnTime: number;
  }

  interface SimSecondSample {
    second: number;
    minuteStr: string;
    cycleIndex: number;
    cycleTime: number;
    phase: WavePhase;
    targetPop: number;
    spawnInterval: number;
    squadSize: number;
    activeMobs: number;
    spawnsThisSecond: number;
    densityMultiplier: number;
  }

  const errors: string[] = [];
  const spawnedEnemies: SimSpawnedEnemy[] = [];
  const samples: SimSecondSample[] = [];

  let playerX = 1000;
  let playerY = 1000;
  let playerVx = 100; // Moving right at 100 px/s
  let playerVy = 0;
  let activeEnemyCount = 0;

  const spawnCallback = (def: EnemyDefinition, x: number, y: number, scaling: EnemyScaling, isChampion = false) => {
    spawnedEnemies.push({
      def,
      x,
      y,
      scaling: { ...scaling },
      isChampion,
      spawnTime: currentSimTime,
    });
    activeEnemyCount++;
  };

  const getPlayerPos = () => ({ x: playerX, y: playerY, vx: playerVx, vy: playerVy });
  const getViewportExtents = () => ({ halfW: 680, halfH: 400 });
  const getActiveEnemyCount = () => activeEnemyCount;
  const getPowerScore = () => 1.0 + (currentSimTime / 60) * 1.2; // Power score grows naturally with upgrades

  const spawnManager = new SpawnManager(
    getPlayerPos,
    spawnCallback,
    getViewportExtents,
    getActiveEnemyCount,
    getPowerScore
  );

  const eventDirector = new EventDirector();

  // Mock scene and context for EventDirector
  const mockScene: any = {
    cameras: {
      main: {
        width: 1280,
        height: 720,
        worldView: { x: playerX - 640, right: playerX + 640, y: playerY - 360, bottom: playerY + 360 },
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

  const mockAudio: any = {
    playLevelUp: () => {},
    playPlayerHurt: () => {},
  };

  const mockLootSystem: any = {
    spawnGem: () => {},
    spawnChest: () => {},
    spawnGoo: () => {},
  };

  const eventDirectorCtx = {
    scene: mockScene,
    spawnManager,
    lootSystem: mockLootSystem,
    audio: mockAudio,
    getPlayerPos: () => ({ x: playerX, y: playerY }),
  };

  let currentSimTime = 0;
  const totalSeconds = 720; // 12 minutes simulation (600s main + 120s overtime)
  const dtMs = 16.666; // 60 FPS update ticks

  console.log('=== STARTING 12-MINUTE WAVE RHYTHM SIMULATION ===\n');

  let spawnsInSecond = 0;
  let lastSampledSecond = -1;

  for (let t = 0; t <= totalSeconds; t += dtMs / 1000) {
    currentSimTime = t;
    const currentSecond = Math.floor(t);

    // Player moves around in circles / patrol
    const angle = t * 0.5;
    playerVx = Math.cos(angle) * 110;
    playerVy = Math.sin(angle) * 110;
    playerX += playerVx * (dtMs / 1000);
    playerY += playerVy * (dtMs / 1000);

    // Mobs naturally get eliminated by simulated player DPS (faster in early-mid game)
    if (activeEnemyCount > 0 && Math.random() < 0.25) {
      const killCount = Math.min(activeEnemyCount, Math.floor(1 + (t / 60) * 0.8));
      activeEnemyCount -= killCount;
    }

    const prevSpawnCount = spawnedEnemies.length;
    spawnManager.update(dtMs, currentSimTime);
    eventDirector.update(currentSimTime, eventDirectorCtx);
    const newSpawns = spawnedEnemies.length - prevSpawnCount;
    spawnsInSecond += newSpawns;

    if (currentSecond !== lastSampledSecond && currentSecond <= totalSeconds) {
      lastSampledSecond = currentSecond;
      const min = Math.floor(currentSecond / 60);
      const sec = currentSecond % 60;
      const minStr = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
      const phaseState = spawnManager.getPhaseState();

      samples.push({
        second: currentSecond,
        minuteStr: minStr,
        cycleIndex: phaseState.cycleIndex,
        cycleTime: Math.round(phaseState.cycleTime),
        phase: phaseState.phase,
        targetPop: spawnManager.getTargetPopulation(),
        spawnInterval: spawnManager.getSpawnInterval(),
        squadSize: spawnManager.getSquadSize(),
        activeMobs: activeEnemyCount,
        spawnsThisSecond: spawnsInSecond,
        densityMultiplier: Number(phaseState.densityMultiplier.toFixed(2)),
      });

      spawnsInSecond = 0;
    }
  }

  // --- ANALYSIS & VALIDATION ---

  console.log('--- SAMPLE SNAPSHOTS ACROSS 12-MINUTE SESSION ---');
  console.log('Time  | Cycle (Sec) | Phase       | DensityMult | TargetPop | SpawnInt | Squad');
  console.log('-------------------------------------------------------------------------');

  const snapshotSeconds = [
    5,   // Cycle 0: Breather
    30,  // Cycle 0: Buildup
    60,  // Cycle 0: Peak Swarm
    75,  // Cycle 0: Climax
    85,  // Cycle 1: Breather
    110, // Cycle 1: Buildup
    140, // Cycle 1: Peak Swarm
    155, // Cycle 1: Climax
    245, // Cycle 3: Breather
    270, // Cycle 3: Buildup
    300, // Cycle 3: Peak Swarm / MiniBoss
    390, // Cycle 4: Peak Swarm
    485, // Cycle 6: Breather
    530, // Cycle 6: Peak Swarm
    600, // Minute 10: Endgame Swarm
    700, // Minute 11:40 Overtime
  ];

  for (const s of snapshotSeconds) {
    const sample = samples.find((x) => x.second === s);
    if (sample) {
      console.log(
        `${sample.minuteStr.padEnd(5)} | C${sample.cycleIndex} (${sample.cycleTime.toString().padStart(2, '0')}s)    | ${sample.phase.padEnd(11)} | ${sample.densityMultiplier.toFixed(2).padEnd(11)} | ${sample.targetPop.toString().padEnd(9)} | ${sample.spawnInterval.toString().padEnd(8)}ms | ${sample.squadSize}`
      );
    }
  }

  console.log('\n--- VERIFYING CORE REQUIREMENTS ---');

  // Requirement 1: 80s Cycles with 4 distinct phases
  const cycle0Samples = samples.filter((s) => s.cycleIndex === 0);
  const distinctPhases = new Set(cycle0Samples.map((s) => s.phase));
  console.log(`[Check 1] Cycle 0 phases encountered: ${Array.from(distinctPhases).join(', ')}`);
  if (distinctPhases.size !== 4) {
    errors.push(`Cycle does not contain all 4 distinct phases! Found: ${Array.from(distinctPhases).join(', ')}`);
  } else {
    console.log('[PASS] All 4 phases (breather, buildup, peak_swarm, climax) successfully executed.');
  }

  // Requirement 2: Density and spawn interval oscillations ("Качели")
  let breatherDensityAvg = 0;
  let peakDensityAvg = 0;
  let breatherIntervalAvg = 0;
  let peakIntervalAvg = 0;
  let breatherCount = 0;
  let peakCount = 0;

  for (const s of samples) {
    if (s.phase === 'breather') {
      breatherDensityAvg += s.densityMultiplier;
      breatherIntervalAvg += s.spawnInterval;
      breatherCount++;
    } else if (s.phase === 'peak_swarm') {
      peakDensityAvg += s.densityMultiplier;
      peakIntervalAvg += s.spawnInterval;
      peakCount++;
    }
  }

  breatherDensityAvg /= Math.max(1, breatherCount);
  peakDensityAvg /= Math.max(1, peakCount);
  breatherIntervalAvg /= Math.max(1, breatherCount);
  peakIntervalAvg /= Math.max(1, peakCount);

  console.log(`[Check 2] Breather avg density mult: ${breatherDensityAvg.toFixed(2)}x, interval: ${Math.round(breatherIntervalAvg)}ms`);
  console.log(`[Check 2] Peak Swarm avg density mult: ${peakDensityAvg.toFixed(2)}x, interval: ${Math.round(peakIntervalAvg)}ms`);

  if (breatherDensityAvg < 0.45 || breatherDensityAvg > 0.60) {
    errors.push(`Breather density multiplier out of range (0.45-0.60): got ${breatherDensityAvg}`);
  }
  if (peakDensityAvg < 1.30 || peakDensityAvg > 1.60) {
    errors.push(`Peak Swarm density multiplier out of range (1.30-1.60): got ${peakDensityAvg}`);
  }
  if (breatherIntervalAvg <= peakIntervalAvg) {
    errors.push(`Breather spawn interval should be longer than Peak Swarm! Breather=${breatherIntervalAvg}ms, Peak=${peakIntervalAvg}ms`);
  }

  // Requirement 3: Smooth population curve scaling (early: 14 to late: 180-220+ peak)
  const earlyPop = samples.find((s) => s.second === 30)?.targetPop ?? 0;
  const midPop = samples.find((s) => s.second === 300)?.targetPop ?? 0;
  const lateBuildupPop = samples.find((s) => s.second === 600)?.targetPop ?? 0;
  const latePeakPop = samples.find((s) => s.second === 530)?.targetPop ?? 0;
  console.log(`[Check 3] Population progression: Early(0:30)=${earlyPop}, Mid(5:00)=${midPop}, Late-Buildup(10:00)=${lateBuildupPop}, Late-Peak(8:50)=${latePeakPop}`);

  if (earlyPop < 10 || earlyPop > 35) {
    errors.push(`Early population out of range: got ${earlyPop}`);
  }
  if (midPop < 70 || midPop > 160) {
    errors.push(`Mid population out of range: got ${midPop}`);
  }
  if (lateBuildupPop < 150 || lateBuildupPop > 250) {
    errors.push(`Late buildup population out of range (150-250): got ${lateBuildupPop}`);
  }
  if (latePeakPop < 180 || latePeakPop > 260) {
    errors.push(`Late peak population out of range (180-260): got ${latePeakPop}`);
  }

  // Requirement 4: Directional swarm charge with predictive heading bias
  const peakSpawns = spawnedEnemies.filter((e) => {
    const cycleTime = e.spawnTime % CYCLE_DURATION_SECONDS;
    return cycleTime >= PHASE_DURATIONS.breather + PHASE_DURATIONS.buildup &&
           cycleTime < PHASE_DURATIONS.breather + PHASE_DURATIONS.buildup + PHASE_DURATIONS.peak_swarm;
  });

  console.log(`[Check 4] Total enemies spawned during Peak Swarms: ${peakSpawns.length}`);
  if (peakSpawns.length === 0) {
    errors.push('No enemies spawned during peak swarm phases!');
  }

  // Geometric test of directional swarm formation
  const directTestSpawns: SimSpawnedEnemy[] = [];
  const directSpawnCallback = (def: EnemyDefinition, x: number, y: number, scaling: EnemyScaling, isChampion = false) => {
    directTestSpawns.push({ def, x, y, scaling, isChampion, spawnTime: 60 });
  };
  const testPlayerPos = { x: 500, y: 500, vx: 120, vy: 0 }; // Moving directly East
  const testManager = new SpawnManager(
    () => testPlayerPos,
    directSpawnCallback,
    getViewportExtents,
    () => 0,
    () => 1.0
  );
  // Trigger update at 60s (peak swarm phase)
  testManager.update(5000, 60);

  let frontConeCount = 0;
  for (const s of directTestSpawns) {
    const angle = Math.atan2(s.y - testPlayerPos.y, s.x - testPlayerPos.x);
    if (Math.abs(angle) < Math.PI / 3) {
      // Within +/- 60 degrees of heading (East / 0 rad)
      frontConeCount++;
    }
  }
  const frontRatio = frontConeCount / Math.max(1, directTestSpawns.length);
  console.log(`[Check 4b] Directional swarm front-heading ratio: ${(frontRatio * 100).toFixed(1)}% (${frontConeCount}/${directTestSpawns.length})`);
  if (frontRatio < 0.50) {
    errors.push(`Directional swarm front heading ratio should be >= 50%, got ${(frontRatio * 100).toFixed(1)}%`);
  }

  // Check EventDirector anchors
  console.log(`[Check 5] Triggered EventDirector events: ${Array.from(eventDirector.getTriggeredEvents()).join(', ')}`);
  const expectedEvents = ['event_pinata', 'event_stampede', 'event_toxic_surge', 'event_miniboss', 'event_kamikaze', 'event_boss'];
  for (const ev of expectedEvents) {
    if (!eventDirector.isEventTriggered(ev)) {
      errors.push(`EventDirector failed to trigger scheduled event: ${ev}`);
    }
  }

  const passed = errors.length === 0;
  if (passed) {
    console.log('\n>>> ALL MILICHECKS PASSED: Wave Manager & Tension Rhythm ("Качели") fully verified! <<<\n');
  } else {
    console.error('\n>>> VERIFICATION FAILED WITH ERRORS:');
    errors.forEach((e) => console.error(` - ${e}`));
    console.log('\n');
  }

  return { passed, errors, samples };
}

runSimulation().then((res) => {
  if (!res.passed) process.exit(1);
});
