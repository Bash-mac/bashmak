import puppeteer from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs';

const outDir = 'C:\\Users\\pupki\\.gemini\\antigravity\\brain\\72f849c7-8372-4238-aa13-af94a2c820b5\\gameplay_shots';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  console.log('Launching Puppeteer with Edge...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,720']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  page.on('console', msg => console.log(`[GAME LOG ${msg.type()}]: ${msg.text()}`));
  page.on('pageerror', err => console.log(`[GAME ERROR]: ${err.message}`));

  console.log('Navigating to http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/');
  await new Promise(r => setTimeout(r, 3500));

  await page.screenshot({ path: path.join(outDir, '01_main_menu.png') });
  console.log('Captured 01_main_menu.png');

  // Play button is at center (640, 360) + (-380, -125) = (260, 235)
  console.log('Clicking PLAY button at (260, 235)...');
  await page.mouse.click(260, 235);
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: path.join(outDir, '02_battlefield.png') });
  console.log('Captured 02_battlefield.png');

  // Active combat gameplay
  console.log('Simulating player movement and survival combat...');
  const keys = ['KeyD', 'KeyS', 'KeyA', 'KeyW'];
  for (let i = 0; i < 20; i++) {
    const k = keys[i % keys.length];
    await page.keyboard.down(k);

    // Aim around and click
    const angle = (i / 20) * Math.PI * 4;
    const mx = 640 + Math.cos(angle) * 200;
    const my = 360 + Math.sin(angle) * 150;
    await page.mouse.move(mx, my);
    await page.mouse.down();
    await new Promise(r => setTimeout(r, 300));
    await page.mouse.up();

    await page.keyboard.up(k);

    if (i % 5 === 0) {
      await page.screenshot({ path: path.join(outDir, `03_battle_combat_${i}.png`) });
    }
  }

  // Click potential upgrade card
  await page.mouse.click(640, 360);
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, '04_upgrade_or_action.png') });

  // Move 10 more seconds
  for (let i = 0; i < 8; i++) {
    await page.keyboard.down('KeyW');
    await page.keyboard.down('KeyD');
    await new Promise(r => setTimeout(r, 350));
    await page.keyboard.up('KeyW');
    await page.keyboard.up('KeyD');
  }

  await page.screenshot({ path: path.join(outDir, '05_gameplay_late.png') });
  console.log('Gameplay session complete!');
  await browser.close();
}

run().catch(err => {
  console.error('Puppeteer run error:', err);
  process.exit(1);
});
