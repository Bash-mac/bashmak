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

async function run() {
  const { default: Phaser } = await import('phaser');
  const { LootSystem } = await import('../src/game/loot/LootSystem');
  const { GameState } = await import('../src/game/core/GameState');
  const {
    FODDER_BAT,
    CRAWLER_SWARM,
    SPRINTER_BUG,
    ARMORED_SLUG,
    EXPLODER_SPORE,
    MINI_BOSS_ELITE,
    BOSS_KURGAN,
  } = await import('../src/game/data/enemies');

  // Mock MockSprite and MockPhysicsScene
  class MockSprite {
    public x = 0;
    public y = 0;
    public scaleX = 1;
    public scaleY = 1;
    public active = true;
    public visible = true;
    public textureKey = '';
    public tint: number | null = null;
    public depth = 0;
    public body = {
      enable: true,
      stop: () => {},
      setCircle: (_r: number, _ox: number, _oy: number) => {},
    };
    private data: Record<string, any> = {};

    constructor(x = 0, y = 0, texture = '') {
      this.x = x;
      this.y = y;
      this.textureKey = texture;
    }

    setScale(s: number) {
      this.scaleX = s;
      this.scaleY = s;
      return this;
    }
    setCircle(_r: number, _ox?: number, _oy?: number) {
      return this;
    }
    setDepth(d: number) {
      this.depth = d;
      return this;
    }
    setData(k: string, v: any) {
      this.data[k] = v;
      return this;
    }
    getData(k: string) {
      return this.data[k];
    }
    clearTint() {
      this.tint = null;
      return this;
    }
    setTint(t: number) {
      this.tint = t;
      return this;
    }
    setTexture(t: string) {
      this.textureKey = t;
      return this;
    }
    setPosition(x: number, y: number) {
      this.x = x;
      this.y = y;
      return this;
    }
    setActive(a: boolean) {
      this.active = a;
      return this;
    }
    setVisible(v: boolean) {
      this.visible = v;
      return this;
    }
    setVelocity(_vx: number, _vy: number) {
      return this;
    }
    destroy() {
      this.active = false;
    }
  }

  class MockGroup {
    private children: MockSprite[] = [];

    create(x = 0, y = 0, texture = ''): MockSprite {
      const s = new MockSprite(x, y, texture);
      this.children.push(s);
      return s;
    }

    getChildren(): MockSprite[] {
      return this.children;
    }
  }

  function createMockScene(): Phaser.Scene {
    const tweens = {
      killTweensOf: (_target: any) => {},
      add: (_config: any) => ({}),
    };

    const physics = {
      add: {
        group: () => new MockGroup(),
      },
    };

    return {
      tweens,
      physics,
    } as unknown as Phaser.Scene;
  }

  console.log('===============================================================');
  console.log('  CHALLENGER 2: EMPIRICAL LOOT CONDENSATION & XP TIERS TEST');
  console.log('===============================================================\n');

  let failureCount = 0;

  function assert(cond: boolean, msg: string) {
    if (!cond) {
      console.error(`[FAIL] ${msg}`);
      failureCount++;
    }
  }

  // -------------------------------------------------------------
  // 1. XP TIER VISUALS VALIDATION (<5, 5-14, 15-49, 50+)
  // -------------------------------------------------------------
  console.log('>>> 1. Testing XP Tier Visual Mapping Rules...');
  const scene = createMockScene();
  const loot = new LootSystem(scene);

  const applyTier = (loot as any).applyGemVisualTier.bind(loot);

  // Helper to test tier output
  function testTierVisual(val: number, expectedTexture: string, expectedTint: number | null, expectedScale: number) {
    const gem = new MockSprite(0, 0, 'drop_xp_small');
    applyTier(gem, val);
    const tintMatch = expectedTint === null ? gem.tint === null : gem.tint === expectedTint;
    const texMatch = gem.textureKey === expectedTexture;
    const scaleMatch = Math.abs(gem.scaleX - expectedScale) < 0.001;

    assert(
      texMatch && tintMatch && scaleMatch,
      `Visual tier mismatch for XP ${val}: tex=${gem.textureKey} (exp ${expectedTexture}), tint=${gem.tint?.toString(16)} (exp ${expectedTint?.toString(16)}), scale=${gem.scaleX} (exp ${expectedScale})`
    );
  }

  // Tier 1: < 5 XP -> Small, No Tint (Green), Scale 0.24
  testTierVisual(1, 'drop_xp_small', null, 0.24);
  testTierVisual(2, 'drop_xp_small', null, 0.24);
  testTierVisual(3, 'drop_xp_small', null, 0.24);
  testTierVisual(4, 'drop_xp_small', null, 0.24);

  // Tier 2: 5 - 14 XP -> Big, No Tint (Blue), Scale 0.28
  testTierVisual(5, 'drop_xp_big', null, 0.28);
  testTierVisual(8, 'drop_xp_big', null, 0.28);
  testTierVisual(10, 'drop_xp_big', null, 0.28);
  testTierVisual(14, 'drop_xp_big', null, 0.28);

  // Tier 3: 15 - 49 XP -> Big, Purple (0xa855f7), Scale 0.34
  testTierVisual(15, 'drop_xp_big', 0xa855f7, 0.34);
  testTierVisual(35, 'drop_xp_big', 0xa855f7, 0.34);
  testTierVisual(40, 'drop_xp_big', 0xa855f7, 0.34);
  testTierVisual(49, 'drop_xp_big', 0xa855f7, 0.34);

  // Tier 4: 50+ XP -> Big, Golden (0xfacc15), Scale 0.40
  testTierVisual(50, 'drop_xp_big', 0xfacc15, 0.40);
  testTierVisual(150, 'drop_xp_big', 0xfacc15, 0.40);
  testTierVisual(500, 'drop_xp_big', 0xfacc15, 0.40);
  testTierVisual(10000, 'drop_xp_big', 0xfacc15, 0.40);

  console.log('  [PASS] Visual tiers strictly conform to (<5 green, 5-14 blue, 15-49 purple, 50+ golden).');

  // -------------------------------------------------------------
  // 2. ENEMY ARCHETYPES XP VALUE & TIER VERIFICATION
  // -------------------------------------------------------------
  console.log('\n>>> 2. Validating Enemy Archetypes & Champions against XP Tiers...');

  const archetypes = [
    { name: 'FODDER_BAT', def: FODDER_BAT, expectedXp: 1, expectedTier: 'Tier 1 (<5, Green)' },
    { name: 'CRAWLER_SWARM', def: CRAWLER_SWARM, expectedXp: 2, expectedTier: 'Tier 1 (<5, Green)' },
    { name: 'SPRINTER_BUG', def: SPRINTER_BUG, expectedXp: 3, expectedTier: 'Tier 1 (<5, Green)' },
    { name: 'EXPLODER_SPORE', def: EXPLODER_SPORE, expectedXp: 4, expectedTier: 'Tier 1 (<5, Green)' },
    { name: 'ARMORED_SLUG', def: ARMORED_SLUG, expectedXp: 8, expectedTier: 'Tier 2 (5-14, Blue)' },
    { name: 'MINI_BOSS_ELITE', def: MINI_BOSS_ELITE, expectedXp: 35, expectedTier: 'Tier 3 (15-49, Purple)' },
    { name: 'BOSS_KURGAN', def: BOSS_KURGAN, expectedXp: 150, expectedTier: 'Tier 4 (50+, Golden)' },
  ];

  for (const a of archetypes) {
    assert(a.def.xpReward === a.expectedXp, `${a.name} xpReward mismatch: got ${a.def.xpReward}, exp ${a.expectedXp}`);
    console.log(`- ${a.name.padEnd(16)}: ${a.def.xpReward} XP -> ${a.expectedTier}`);

    // Test champion 5x variant
    const champXp = a.def.xpReward * 5;
    let champTier = '';
    if (champXp >= 50) champTier = 'Tier 4 (50+, Golden)';
    else if (champXp >= 15) champTier = 'Tier 3 (15-49, Purple)';
    else if (champXp >= 5) champTier = 'Tier 2 (5-14, Blue)';
    else champTier = 'Tier 1 (<5, Green)';
    console.log(`  └─ Champion (5x): ${champXp} XP -> ${champTier}`);
  }

  // -------------------------------------------------------------
  // 3. GEM VALUE CONDENSATION SIMULATION (100+ GEMS)
  // -------------------------------------------------------------
  console.log('\n>>> 3. Testing Gem Value Condensation Simulation (100 -> 500 -> 2,000 gems)...');

  // Fresh LootSystem instance
  const simScene = createMockScene();
  const simLoot = new LootSystem(simScene);

  const playerX = 0;
  const playerY = 0;

  let totalSpawnedXp = 0;

  function getGroundXp(): number {
    const activeGems = (simLoot.gemsGroup.getChildren() as MockSprite[]).filter((g) => g.active);
    let sum = 0;
    for (const g of activeGems) {
      sum += (g.getData('xpValue') as number) || 0;
    }
    return sum;
  }

  function getActiveCount(): number {
    return (simLoot as any).gemPool.activeCount;
  }

  // Step A: Spawn 90 gems (fill capacity)
  for (let i = 0; i < 90; i++) {
    const x = (Math.random() - 0.5) * 600;
    const y = (Math.random() - 0.5) * 600;
    const val = (i % 4) + 1; // 1..4 XP
    totalSpawnedXp += val;
    simLoot.spawnGem(x, y, val, playerX, playerY);

    assert(getActiveCount() === i + 1, `Active count after ${i + 1} spawns should be ${i + 1}, got ${getActiveCount()}`);
  }

  assert(getActiveCount() === 90, `At capacity, active count must be 90, got ${getActiveCount()}`);
  assert(getGroundXp() === totalSpawnedXp, `Ground XP (${getGroundXp()}) must equal total spawned XP (${totalSpawnedXp})`);

  console.log(`- Pre-condensation (90 gems): Active = ${getActiveCount()}, Ground XP = ${getGroundXp()}`);

  // Step B: Spawn 10 more gems (total 100 spawns) -> Triggers condensation
  for (let i = 90; i < 100; i++) {
    const x = (Math.random() - 0.5) * 800;
    const y = (Math.random() - 0.5) * 800;
    const val = 1;
    totalSpawnedXp += val;
    simLoot.spawnGem(x, y, val, playerX, playerY);

    const active = getActiveCount();
    assert(active <= 90, `Active gems count exceeded 90: got ${active}`);
    const groundXp = getGroundXp();
    assert(groundXp === totalSpawnedXp, `XP LEAK DETECTED at spawn ${i + 1}: ground=${groundXp}, spawned=${totalSpawnedXp}`);
  }

  console.log(`- Post-100 spawns: Active = ${getActiveCount()} (<= 90), Ground XP = ${getGroundXp()} (Spawned = ${totalSpawnedXp})`);

  // Step C: Massive 2,000 gem spawns with varying drop values and moving player
  console.log('- Running 2,000 continuous random spawns with moving player...');
  let currPlayerX = 0;
  let currPlayerY = 0;

  for (let i = 100; i < 2100; i++) {
    // Player moves around
    currPlayerX += (Math.random() - 0.5) * 20;
    currPlayerY += (Math.random() - 0.5) * 20;

    // Enemy spawn position relative to player
    const dist = 50 + Math.random() * 500;
    const angle = Math.random() * Math.PI * 2;
    const gx = currPlayerX + Math.cos(angle) * dist;
    const gy = currPlayerY + Math.sin(angle) * dist;

    // Random enemy drop (1, 2, 3, 4, 8, 35, 150)
    const enemyTypes = [1, 1, 1, 2, 2, 3, 4, 8, 35, 150];
    const val = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
    totalSpawnedXp += val;

    simLoot.spawnGem(gx, gy, val, currPlayerX, currPlayerY);

    const active = getActiveCount();
    if (active > 90) {
      assert(false, `Active count ${active} > 90 at spawn ${i}`);
    }

    if (i % 200 === 0) {
      const groundXp = getGroundXp();
      assert(
        groundXp === totalSpawnedXp,
        `XP conservation failed at iteration ${i}: ground=${groundXp}, totalSpawned=${totalSpawnedXp}`
      );
    }
  }

  const finalGroundXp = getGroundXp();
  const finalActive = getActiveCount();
  console.log(`- After 2,100 spawns: Active = ${finalActive}/90, Ground XP = ${finalGroundXp}, Total Spawned = ${totalSpawnedXp}`);
  assert(finalActive <= 90, `Final active count ${finalActive} <= 90`);
  assert(finalGroundXp === totalSpawnedXp, `Final ground XP ${finalGroundXp} == total spawned ${totalSpawnedXp}`);

  // -------------------------------------------------------------
  // 4. CONDENSATION GEOMETRY & MERGE DESTINATION VERIFICATION
  // -------------------------------------------------------------
  console.log('\n>>> 4. Testing Distance Targeting & Visual Tier Upgrades During Merge...');

  const geomScene = createMockScene();
  const geomLoot = new LootSystem(geomScene);

  // Spawn 90 gems in a line from x = 10 to 900 at y = 0. Player at (0, 0)
  for (let i = 1; i <= 90; i++) {
    geomLoot.spawnGem(i * 10, 0, 1, 0, 0);
  }

  // Closest gem is at x=10 (dist=10), farthest gem is at x=900 (dist=900)
  assert((geomLoot as any).gemPool.activeCount === 90, 'Active count should be 90');

  // Spawn a 91st gem at x=500 with value 10
  geomLoot.spawnGem(500, 0, 10, 0, 0);

  // Farthest gem (x=900, val=1) should be released.
  // Closest gem (x=10, val=1) should receive: 1 (original) + 1 (from farthest) + 10 (from new) = 12 XP.
  const activeGemsAfterMerge = (geomLoot.gemsGroup.getChildren() as MockSprite[]).filter((g) => g.active);
  const gemAt10 = activeGemsAfterMerge.find((g) => g.x === 10);
  const gemAt900 = activeGemsAfterMerge.find((g) => g.x === 900);

  assert(gemAt900 === undefined, 'Farthest gem at x=900 was not released');
  assert(gemAt10 !== undefined, 'Closest gem at x=10 must exist');
  assert(gemAt10?.getData('xpValue') === 12, `Closest gem XP should be 12, got ${gemAt10?.getData('xpValue')}`);
  // 12 XP is Tier 2 (5-14) -> drop_xp_big, no tint, scale 0.28
  assert(gemAt10?.textureKey === 'drop_xp_big', `Closest gem texture should be drop_xp_big, got ${gemAt10?.textureKey}`);
  assert(gemAt10?.tint === null, `Closest gem tint should be null, got ${gemAt10?.tint}`);
  assert(Math.abs((gemAt10?.scaleX || 0) - 0.28) < 0.001, `Closest gem scale should be 0.28, got ${gemAt10?.scaleX}`);

  console.log('  [PASS] Farthest gem accurately pruned and merged into closest gem with correct visual tier promotion (Tier 1 -> Tier 2).');

  // Merge further to reach Tier 3 (15-49) and Tier 4 (50+)
  // Add 10 more XP to trigger Tier 3
  geomLoot.spawnGem(500, 0, 10, 0, 0); // now count was 89 -> became 90 (no merge yet)
  geomLoot.spawnGem(500, 0, 10, 0, 0); // count was 90 -> merges farthest (x=890) into x=10
  // x=10 gets: 12 + 1 (from 890) + 10 = 23 XP (Tier 3: Purple, scale 0.34)
  assert(gemAt10?.getData('xpValue') === 23, `Expected 23 XP at x=10, got ${gemAt10?.getData('xpValue')}`);
  assert(gemAt10?.textureKey === 'drop_xp_big', 'Texture drop_xp_big');
  assert(gemAt10?.tint === 0xa855f7, `Tint expected 0xa855f7 (Purple), got ${gemAt10?.tint?.toString(16)}`);
  assert(Math.abs((gemAt10?.scaleX || 0) - 0.34) < 0.001, `Scale expected 0.34, got ${gemAt10?.scaleX}`);
  console.log('  [PASS] Tier 3 (Purple 0xa855f7, scale 0.34) visual confirmed at 23 XP.');

  // Push to Tier 4 (50+)
  geomLoot.spawnGem(500, 0, 30, 0, 0); // 89 -> 90
  geomLoot.spawnGem(500, 0, 30, 0, 0); // merges farthest (x=880) into x=10 -> 23 + 1 + 30 = 54 XP
  assert(gemAt10?.getData('xpValue') === 54, `Expected 54 XP at x=10, got ${gemAt10?.getData('xpValue')}`);
  assert(gemAt10?.textureKey === 'drop_xp_big', 'Texture drop_xp_big');
  assert(gemAt10?.tint === 0xfacc15, `Tint expected 0xfacc15 (Golden), got ${gemAt10?.tint?.toString(16)}`);
  assert(Math.abs((gemAt10?.scaleX || 0) - 0.40) < 0.001, `Scale expected 0.40, got ${gemAt10?.scaleX}`);
  console.log('  [PASS] Tier 4 (Golden 0xfacc15, scale 0.40) visual confirmed at 54 XP.');

  // -------------------------------------------------------------
  // 5. FULL GAMEPLAY REPLAY & VACUUM INVARIANT
  // -------------------------------------------------------------
  console.log('\n>>> 5. Testing Full Economy Replay & GameState Vacuum Invariant...');

  const e2eScene = createMockScene();
  const e2eLoot = new LootSystem(e2eScene);
  const gs = GameState.getInstance();
  gs.reset();

  let totalSimulatedXp = 0;
  // Simulate 3,000 kills
  for (let k = 0; k < 3000; k++) {
    const enemyXp = (k % 50 === 0) ? 35 : (k % 10 === 0 ? 8 : (k % 3 === 0 ? 2 : 1));
    totalSimulatedXp += enemyXp;
    e2eLoot.spawnGem((Math.random() - 0.5) * 1000, (Math.random() - 0.5) * 1000, enemyXp, 0, 0);

    // Periodically vacuum all gems
    if (k % 250 === 0 && k > 0) {
      const active = (e2eLoot.gemsGroup.getChildren() as MockSprite[]).filter((g) => g.active);
      for (const gem of active) {
        const xp = gem.getData('xpValue') as number;
        gs.addXp(xp);
        e2eLoot.releaseGem(gem as any);
      }
    }
  }

  // Final complete vacuum
  const remainingGems = (e2eLoot.gemsGroup.getChildren() as MockSprite[]).filter((g) => g.active);
  for (const gem of remainingGems) {
    const xp = gem.getData('xpValue') as number;
    gs.addXp(xp);
    e2eLoot.releaseGem(gem as any);
  }

  // Calculate total XP tracked in GameState
  let cumGsXp = 0;
  for (let l = 1; l < gs.level; l++) {
    cumGsXp += gs.calculateXpForLevel(l);
  }
  cumGsXp += gs.currentXp;

  console.log(`- End-of-Run Summary: Total Spawned = ${totalSimulatedXp}, Total in GameState = ${cumGsXp}, Final Level = ${gs.level}`);
  assert(cumGsXp === totalSimulatedXp, `E2E Vacuum XP conservation failed: ${cumGsXp} != ${totalSimulatedXp}`);
  assert((e2eLoot as any).gemPool.activeCount === 0, 'All gems should be released after vacuum');

  // -------------------------------------------------------------
  // 6. ADVERSARIAL STRESS TESTS
  // -------------------------------------------------------------
  console.log('\n>>> 6. Adversarial Edge Case Testing...');

  // A. Undefined player coordinates fallback
  const advScene = createMockScene();
  const advLoot = new LootSystem(advScene);

  // Fill up to 90
  for (let i = 0; i < 90; i++) {
    advLoot.spawnGem(i, 0, 1, 0, 0);
  }
  // Spawn 91st gem with undefined player coords (should fallback to regular get without crash)
  advLoot.spawnGem(100, 0, 5, undefined, undefined);
  assert((advLoot as any).gemPool.activeCount === 91, 'Fallback without player coords handled safely');

  // B. Single gem on ground when merge called
  advLoot.clear();
  advLoot.spawnGem(50, 50, 10, 0, 0);
  // Force merge with 1 gem active
  (advLoot as any).mergeDistantGem(5, 0, 0);
  const remaining1 = (advLoot.gemsGroup.getChildren() as MockSprite[]).filter((g) => g.active);
  assert(remaining1.length === 1, `Expected 1 gem remaining, got ${remaining1.length}`);
  assert(remaining1[0].getData('xpValue') === 15, `Expected single gem value 15, got ${remaining1[0].getData('xpValue')}`);

  console.log('\n===============================================================');
  if (failureCount === 0) {
    console.log('  ALL CHALLENGER 2 LOOT & ECONOMY TESTS PASSED (0 ERRORS)!');
  } else {
    console.error(`  TEST FAILED WITH ${failureCount} FAILURES!`);
  }
  console.log('===============================================================');

  if (failureCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Unhandled error in test:', err);
  process.exit(1);
});
