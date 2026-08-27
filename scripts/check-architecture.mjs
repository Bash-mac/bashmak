import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = path.resolve('src');
let errors = [];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').length;
  const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');

  // 1. Scene size limit
  if (relPath.startsWith('src/game/scenes/') && !relPath.includes('/ui/')) {
    // BootScene has lots of asset preload, limit 500. Other scenes <= 380.
    const limit = relPath.includes('BootScene') ? 500 : 380;
    if (lines > limit) {
      errors.push(`❌ [SIZE] Scene '${relPath}' exceeds limit: ${lines}/${limit} lines.`);
    }
  }

  // 2. Core domain isolation: No Phaser imports in src/game/core/
  if (relPath.startsWith('src/game/core/')) {
    if (/from\s+['"]phaser['"]/i.test(content) || /import\s+Phaser/i.test(content)) {
      errors.push(`❌ [LAYER] Domain core file '${relPath}' must NOT import Phaser. Keep core pure TypeScript!`);
    }
  }

  // 3. Platform isolation: No Telegram API calls outside src/platform/
  if (!relPath.startsWith('src/platform/')) {
    if (/window\.Telegram/i.test(content) || /Telegram\.WebApp/i.test(content)) {
      errors.push(`❌ [PLATFORM] Telegram API used in '${relPath}'. Use PlatformAdapter instead!`);
    }
  }

  // 4. Weapons must implement IWeapon
  if (relPath.startsWith('src/game/combat/weapons/') && !relPath.endsWith('IWeapon.ts')) {
    if (!content.includes('implements IWeapon') && !content.includes('IWeapon')) {
      errors.push(`❌ [WEAPON] Weapon file '${relPath}' must implement IWeapon interface.`);
    }
  }

  // 5. Zero-Allocation in update(): No GameObject creation or removeAll(true) inside update methods
  if (relPath.startsWith('src/game/') && (relPath.includes('scenes/') || relPath.includes('combat/') || relPath.includes('traits/') || relPath.includes('ui/'))) {
    // Check for removeAll(true) anywhere in update or HUD methods
    if (relPath.includes('HUD.ts') && content.includes('removeAll(true)')) {
      errors.push(`❌ [PERF/GC] 'removeAll(true)' is forbidden in '${relPath}'. Pre-allocate UI elements!`);
    }

    // Check for scene.add inside update methods
    const methodRegex = /(?:override\s+)?(?:public\s+|private\s+)?(?:update[A-Za-z0-9_]*)\s*\([^)]*\)[^{]*\{([\s\S]*?)(?=\n\s*(?:override\s+|public\s+|private\s+|protected\s+|\/\/\/|\}))/g;
    let match;
    while ((match = methodRegex.exec(content)) !== null) {
      const body = match[1];
      if (/(\.add\.(?:text|graphics|sprite|image|container)\()/.test(body) && !relPath.includes('MapGenerator') && !relPath.includes('HeroFactory') && !relPath.includes('EnemyFactory')) {
        errors.push(`❌ [PERF/GC] Direct GameObject allocation detected inside update loop in '${relPath}'. Use ObjectPool or pre-allocate in constructor!`);
      }
      if (/removeAll\(\s*true\s*\)/.test(body)) {
        errors.push(`❌ [PERF/GC] 'removeAll(true)' inside update method in '${relPath}'. Use cached text/graphics!`);
      }
    }
  }

  // 6. UI Viewport Standard: Modals must not clamp scale to 1.0 (prevents tiny UI on desktop)
  if (relPath.startsWith('src/game/scenes/ui/') && relPath.endsWith('Modal.ts')) {
    if (/Math\.min\(\s*1(?:\.0)?\s*,/.test(content)) {
      errors.push(`❌ [UI/SCALE] Scale clamping 'Math.min(1.0, ...)' found in '${relPath}'. Use un-clamped Virtual Viewport scaling!`);
    }
  }
}


function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
      checkFile(fullPath);
    }
  }
}

console.log('🔍 Проверка архитектурных границ проекта (ARCHITECTURE.md)...');
scanDir(SRC_DIR);

if (errors.length > 0) {
  console.error('\n🚨 НАЙДЕНЫ НАРУШЕНИЯ АРХИТЕКТУРЫ:');
  errors.forEach((err) => console.error(err));
  console.error('\nИсправьте нарушения согласно правилам в ARCHITECTURE.md перед сборкой!\n');
  process.exit(1);
} else {
  console.log('✅ Все архитектурные границы соблюдены (сцены, ядро, платформы, оружие).\n');
}
