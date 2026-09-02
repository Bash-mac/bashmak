/**
 * Milestone M2 Forensic Integrity & Adversarial Audit Test Suite
 * Independently verifies:
 * 1. Dynamic math continuity across 80-second cycles (Breather, Buildup, Peak Swarm, Climax)
 * 2. Zero-Allocation memory compliance (reusable singletons/structs)
 * 3. Velocity lead vector geometry & heading distributions
 * 4. Extreme inputs & boundary conditions resilience
 * 5. EventDirector timeline anchor triggers & reset behavior
 */

// Headless polyfills
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

async function runForensicAuditSuite() {
  const { SpawnManager, CYCLE_DURATION_SECONDS, PHASE_DURATIONS } = await import('../src/game/spawning/SpawnManager');
  const { EventDirector } = await import('../src/game/spawning/EventDirector');
  const { GameState } = await import('../src/game/core/GameState');

  const violations: string[] = [];

  console.log('=== FORENSIC INTEGRITY AUDIT SUITE (MILESTONE M2) ===\n');

  // --- CHECK 1: MATHEMATICAL CONTINUITY & DYNAMIC MULTIPLIERS ---
  console.log('[Check 1] Verifying Dynamic Wave Math Continuity & Multipliers...');
  let playerPos = { x: 0, y: 0, vx: 0, vy: 0 };
  let spawned: any[] = [];
  const sm = new SpawnManager(
    () => playerPos,
    (def, x, y, scaling, isChamp) => {
      spawned.push({ def, x, y, scaling: { ...scaling }, isChamp });
    },
    () => ({ halfW: 680, halfH: 400 }),
    () => 0,
    () => 1.0
  );

  for (let s = 0; s <= 800; s += 0.5) {
    const p = sm.calculateWavePhase(s);
    const cycleTime = s % CYCLE_DURATION_SECONDS;

    if (cycleTime < 18) {
      if (p.phase !== 'breather') violations.push(`s=${s}: expected breather, got ${p.phase}`);
      if (p.densityMultiplier < 0.479 || p.densityMultiplier > 0.561) violations.push(`s=${s}: breather density out of bounds: ${p.densityMultiplier}`);
    } else if (cycleTime < 48) {
      if (p.phase !== 'buildup') violations.push(`s=${s}: expected buildup, got ${p.phase}`);
      if (p.densityMultiplier < 0.799 || p.densityMultiplier > 1.051) violations.push(`s=${s}: buildup density out of bounds: ${p.densityMultiplier}`);
    } else if (cycleTime < 72) {
      if (p.phase !== 'peak_swarm') violations.push(`s=${s}: expected peak_swarm, got ${p.phase}`);
      if (p.densityMultiplier < 1.349 || p.densityMultiplier > 1.551) violations.push(`s=${s}: peak density out of bounds: ${p.densityMultiplier}`);
    } else {
      if (p.phase !== 'climax') violations.push(`s=${s}: expected climax, got ${p.phase}`);
      if (p.densityMultiplier !== 1.20) violations.push(`s=${s}: climax density expected 1.20, got ${p.densityMultiplier}`);
    }
  }
  console.log('  -> Mathematical phase continuity and bounds verified across 800 seconds (1600 samples).');

  // --- CHECK 2: ZERO-ALLOCATION ARCHITECTURE ---
  console.log('[Check 2] Verifying Zero-Allocation Reusability...');
  const ref1 = sm.calculateWavePhase(10);
  const ref2 = sm.calculateWavePhase(30);
  if (ref1 !== ref2) violations.push('calculateWavePhase allocated a new object reference.');
  
  const v1 = sm.getViewport();
  const v2 = sm.getViewport();
  if (v1 !== v2) violations.push('getViewport allocated a new object reference.');

  const p1 = sm.getScreenPerimeterPosition();
  const p2 = sm.getScreenPerimeterPosition();
  if (p1 !== p2) violations.push('getScreenPerimeterPosition allocated a new object reference.');

  const r1 = sm.getRepositionPosition();
  const r2 = sm.getRepositionPosition();
  if (r1 !== r2) violations.push('getRepositionPosition allocated a new object reference.');
  console.log('  -> Zero-Allocation compliance verified (currentPhaseState, cachedViewport, scratchPos are reused).');

  // --- CHECK 3: VELOCITY LEAD VECTOR & HEADING DISTRIBUTION ---
  console.log('[Check 3] Verifying Velocity Lead Vector & Directional Heading...');
  playerPos = { x: 1000, y: 1000, vx: 150, vy: 0 };
  spawned = [];
  sm.update(10000, 60);

  let frontCount = 0;
  for (const s of spawned) {
    const angle = Math.atan2(s.y - playerPos.y, s.x - playerPos.x);
    if (Math.abs(angle) < Math.PI / 3) frontCount++;
  }
  const frontRatio = frontCount / Math.max(1, spawned.length);
  console.log(`  -> Directional swarm front intercept ratio: ${(frontRatio * 100).toFixed(1)}% (Target >= 50%)`);
  if (frontRatio < 0.50) violations.push(`Front intercept ratio too low: ${frontRatio}`);

  // --- CHECK 4: RESILIENCE UNDER EXTREME BOUNDARIES ---
  console.log('[Check 4] Testing Resilience Under Extreme Adversarial Inputs...');
  try {
    playerPos = { x: -999999, y: -999999, vx: -5000, vy: -5000 };
    sm.update(10000, 7200);
    sm.update(0, 0);
    sm.update(100000, 50);
    console.log('  -> Handled negative coordinates, 5000px/s speed, 2-hour runtime, and 0/100000ms delta cleanly.');
  } catch (e: any) {
    violations.push(`Crashed on extreme inputs: ${e.message}`);
  }

  // --- CHECK 5: EVENTDIRECTOR INTEGRITY ---
  console.log('[Check 5] Verifying EventDirector Timelines & Resets...');
  const ed = new EventDirector();
  const mockCtx: any = {
    scene: {
      cameras: { main: { width: 1280, height: 720, worldView: { x: 0, y: 0, right: 1280, bottom: 720 } } },
      add: {
        rectangle: () => ({ setStrokeStyle: () => {}, setDepth: () => {}, destroy: () => {}, setName: () => {} }),
        circle: () => ({ setStrokeStyle: () => {}, setDepth: () => {}, destroy: () => {} }),
        sprite: () => ({ setScale: () => {}, setDepth: () => {}, play: () => {}, destroy: () => {} }),
        container: () => ({ setScrollFactor: () => {}, setDepth: () => {}, add: () => {}, setPosition: () => {}, setScale: () => {}, setVisible: () => {}, setAlpha: () => {}, getByName: () => null, destroy: () => {} }),
        triangle: () => ({ setStrokeStyle: () => {}, setFillStyle: () => {}, setRotation: () => {} }),
        text: () => ({ setOrigin: () => {}, setScrollFactor: () => {}, setDepth: () => {}, setText: () => {}, setColor: () => {} }),
      },
      tweens: { add: () => ({}), killTweensOf: () => {} },
      time: { delayedCall: (_ms: number, fn: () => void) => fn() },
      anims: { exists: () => false },
    },
    spawnManager: sm,
    lootSystem: { spawnGem: () => {}, spawnChest: () => {}, spawnGoo: () => {} },
    audio: { playLevelUp: () => {}, playPlayerHurt: () => {} },
    getPlayerPos: () => ({ x: 0, y: 0 }),
  };

  const anchorTimes = [90, 180, 270, 300, 390, 480];
  for (const t of anchorTimes) {
    ed.update(t, mockCtx);
  }
  const triggered = ed.getTriggeredEvents();
  console.log(`  -> Triggered anchor events (${triggered.size}/6): ${Array.from(triggered).join(', ')}`);
  if (triggered.size !== 6) violations.push(`Expected 6 triggered events, got ${triggered.size}`);

  ed.reset();
  if (ed.getTriggeredEvents().size !== 0) violations.push('EventDirector reset failed to clear triggered events.');

  console.log('\n=================================================');
  if (violations.length === 0) {
    console.log('>>> VERDICT: CLEAN — ALL FORENSIC INTEGRITY CHECKS PASSED <<<');
  } else {
    console.log('>>> VERDICT: INTEGRITY VIOLATION <<<');
    violations.forEach((v) => console.error(` [FAIL] ${v}`));
    process.exit(1);
  }
}

runForensicAuditSuite();
