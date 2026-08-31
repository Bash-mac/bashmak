import Phaser from 'phaser';
import { SaveManager } from '../core/SaveManager';
import { AudioManager } from '../audio/AudioManager';
import { createPlatformAdapter } from '../../platform';
import { META_POWERUPS } from '../data/metaUpgrades';
const ORGAN_MAP: Record<string, { organ: string; sketch: string; plateDx: number; plateDy: number }> = {
  power_hp:           { organ: 'organ_skull',    sketch: 'sketch_skull',    plateDx:  0.0366, plateDy: 0.4034 },
  power_speed:        { organ: 'organ_lungs',     sketch: 'sketch_lungs',    plateDx: -0.0319, plateDy: 0.3977 },
  power_damage:       { organ: 'organ_muscle',    sketch: 'sketch_muscle',   plateDx: -0.0284, plateDy: 0.4050 },
  power_magnet:       { organ: 'organ_brain',     sketch: 'sketch_brain',    plateDx: -0.0070, plateDy: 0.4041 },
  power_greed:        { organ: 'organ_stomach',   sketch: 'sketch_stomach',  plateDx: -0.0774, plateDy: 0.4014 },
  power_regen:        { organ: 'organ_heart',     sketch: 'sketch_heart',    plateDx: -0.0164, plateDy: 0.4018 },
  power_revive:       { organ: 'organ_clone',     sketch: 'sketch_clone',    plateDx: -0.0355, plateDy: 0.3892 },
  power_weapon_slots: { organ: 'organ_tentacle',  sketch: 'sketch_tentacle', plateDx: -0.0169, plateDy: 0.4099 },
  power_tome_slots:   { organ: 'organ_bag',       sketch: 'sketch_bag',      plateDx:  0.0292, plateDy: 0.3808 },
};
const SLOTS = [
  { x: -310, y: 28, size:  95, alpha: 0.40, depth: 0 },
  { x: -160, y: 16, size: 135, alpha: 0.60, depth: 1 },
  { x:    0, y:  0, size: 185, alpha: 1.00, depth: 2 },
  { x:  160, y: 16, size: 135, alpha: 0.60, depth: 1 },
  { x:  310, y: 28, size:  95, alpha: 0.40, depth: 0 },
] as const;
type SlotRef = { container: Phaser.GameObjects.Container; img: Phaser.GameObjects.Image; price: Phaser.GameObjects.Text };
export class UpgradesScene extends Phaser.Scene {
  private save = SaveManager.getInstance();
  private audio = AudioManager.getInstance();
  private plat = createPlatformAdapter();
  private root!: Phaser.GameObjects.Container;
  private items = META_POWERUPS.filter(p => ORGAN_MAP[p.id]);
  private idx = 0;
  // Carousel
  private slots: SlotRef[] = [];
  private floatTw: Phaser.Tweens.Tween | null = null;
  // Clipboard refs
  private clipContainer!: Phaser.GameObjects.Container;
  private sketch!: Phaser.GameObjects.Image;
  private titleTx!: Phaser.GameObjects.Text;
  private levelLeftTx!: Phaser.GameObjects.Text;
  private levelRightTx!: Phaser.GameObjects.Text;
  private levelMaxTx!: Phaser.GameObjects.Text;
  private descTx!: Phaser.GameObjects.Text;
  private pips: Phaser.GameObjects.Image[] = [];
  private buyZone!: Phaser.GameObjects.Rectangle;
  private buyTx!: Phaser.GameObjects.Text;
  // Atmosphere & Parallax
  private bgImage!: Phaser.GameObjects.Image;
  private spores: { dot: Phaser.GameObjects.Arc; vx: number; vy: number }[] = [];
  private vatBubbles: { dot: Phaser.GameObjects.Arc; vy: number; startY: number }[] = [];
  private tgtParallaxX = 0;
  private tgtParallaxY = 0;
  private curParallaxX = 0;
  private curParallaxY = 0;
  private gooTx!: Phaser.GameObjects.Text;
  constructor() { super({ key: 'UpgradesScene' }); }
  create(): void {
    const W = 1280, H = 720;
    const width = this.scale.width, height = this.scale.height;
    this.ensureVfxTextures();
    // 1. Полноэкранный фон в режиме Cover
    const bgScale = Math.max(width / W, height / H);
    this.bgImage = this.add.image(width / 2, height / 2, 'lab_background').setDisplaySize(W * bgScale, H * bgScale);
    // 2. UI контейнер (1280x720)
    const uiScale = Math.min(width / W, height / H);
    this.root = this.add.container(width / 2, height / 2).setScale(uiScale);
    const onResize = (s: Phaser.Structs.Size) => {
      const newBgScale = Math.max(s.width / W, s.height / H);
      this.bgImage.setPosition(s.width / 2, s.height / 2).setDisplaySize(W * newBgScale, H * newBgScale);
      this.root.setPosition(s.width / 2, s.height / 2).setScale(Math.min(s.width / W, s.height / H));
    };
    this.scale.on('resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', onResize));
    // Микро-параллакс фона от мыши
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.tgtParallaxX = ((p.x - width / 2) / (width / 2)) * 6;
      this.tgtParallaxY = ((p.y - height / 2) / (height / 2)) * 4;
    });
    this.buildGodRays();
    this.buildDecor();
    this.buildCarousel();
    this.buildAtmosphere();
    this.buildClipboard();
    this.buildTerminal();
    this.buildArrows();
    this.refreshAll();
  }
  private ensureVfxTextures(): void {
    if (!this.textures.exists('vfx_soft_glow')) {
      const c = this.textures.createCanvas('vfx_soft_glow', 256, 256);
      if (c) {
        const ctx = c.getContext(), g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        g.addColorStop(0, 'rgba(74, 222, 128, 0.85)'); g.addColorStop(0.4, 'rgba(34, 197, 94, 0.45)'); g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256); c.refresh();
      }
    }
    if (!this.textures.exists('vfx_floor_glow')) {
      const c = this.textures.createCanvas('vfx_floor_glow', 256, 128);
      if (c) {
        const ctx = c.getContext(), g = ctx.createRadialGradient(128, 64, 0, 128, 64, 128);
        g.addColorStop(0, 'rgba(250, 204, 21, 0.7)'); g.addColorStop(0.6, 'rgba(202, 138, 4, 0.2)'); g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 128); c.refresh();
      }
    }
    if (!this.textures.exists('vfx_god_ray')) {
      const c = this.textures.createCanvas('vfx_god_ray', 256, 512);
      if (c) {
        const ctx = c.getContext(), g = ctx.createLinearGradient(0, 0, 0, 512);
        g.addColorStop(0, 'rgba(253, 224, 71, 0.35)'); g.addColorStop(0.5, 'rgba(163, 230, 53, 0.12)'); g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(90, 0); ctx.lineTo(166, 0); ctx.lineTo(256, 512); ctx.lineTo(0, 512); ctx.closePath(); ctx.fill(); c.refresh();
      }
    }
  }
  private buildGodRays(): void {
    const ray1 = this.add.image(40, -80, 'vfx_god_ray').setDisplaySize(280, 480).setBlendMode(Phaser.BlendModes.ADD).setAngle(-4).setAlpha(0.2);
    const ray2 = this.add.image(80, -80, 'vfx_god_ray').setDisplaySize(240, 480).setBlendMode(Phaser.BlendModes.ADD).setAngle(4).setAlpha(0.2);
    this.tweens.add({ targets: ray1, alpha: { from: 0.12, to: 0.32 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: ray2, alpha: { from: 0.28, to: 0.10 }, duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.root.add([ray1, ray2]);
  }
  private buildDecor(): void {
    const sign = this.add.image(-415, -345, 'lab_sign').setDisplaySize(315, 166).setOrigin(0.5, 0);
    this.tweens.add({ targets: sign, angle: { from: -0.6, to: 0.6 }, duration: 3800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.root.add(sign);
  }
  private buildCarousel(): void {
    const CX = 60, CY = 30;
    // Мягкое свечение на полу постамента
    const floorGlow = this.add.image(CX, CY + 80, 'vfx_floor_glow').setDisplaySize(240, 70).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.6);
    this.tweens.add({ targets: floorGlow, alpha: { from: 0.4, to: 0.75 }, scaleX: { from: 0.9, to: 1.15 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // Мягкая радиальная био-аура под парящим органом
    const aura = this.add.image(CX, CY + 25, 'vfx_soft_glow').setDisplaySize(250, 190).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5);
    this.tweens.add({ targets: aura, alpha: { from: 0.35, to: 0.70 }, scaleX: { from: 0.92, to: 1.25 }, scaleY: { from: 0.85, to: 1.15 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.root.add([floorGlow, aura]);
    this.slots = [];
    for (let i = 0; i < 5; i++) {
      const cfg = SLOTS[i];
      const offY = cfg.size * 0.388;
      const img = this.add.image(0, 0, 'organ_skull').setDisplaySize(cfg.size, cfg.size);
      const fSize = i === 2 ? '13px' : (i === 1 || i === 3 ? '10px' : '8px');
      const price = this.add.text(0, offY, '', { fontFamily: 'Gagalin, monospace', fontSize: fSize, color: '#facc15', stroke: '#1e0533', strokeThickness: 3 }).setOrigin(0.5);
      const container = this.add.container(CX + cfg.x, CY + cfg.y, [img, price]).setAlpha(cfg.alpha);
      if (i !== 2) {
        img.setInteractive({ useHandCursor: true });
        const dir = i - 2, alpha = cfg.alpha;
        img.on('pointerdown', () => { this.plat.vibrate(20); this.navigate(dir); });
        img.on('pointerover', () => container.setAlpha(Math.min(alpha + 0.25, 1)));
        img.on('pointerout',  () => container.setAlpha(alpha));
      }
      this.slots.push({ container, img, price });
      this.root.add(container);
    }
  }
  private buildAtmosphere(): void {
    this.spores = [];
    for (let i = 0; i < 24; i++) {
      const x = Phaser.Math.Between(-250, 370), y = Phaser.Math.Between(-320, 260);
      const r = Phaser.Math.FloatBetween(1.2, 2.6), col = i % 2 === 0 ? 0x86efac : 0xfde047;
      const dot = this.add.circle(x, y, r, col, Phaser.Math.FloatBetween(0.25, 0.75)).setBlendMode(Phaser.BlendModes.ADD);
      this.spores.push({ dot, vx: Phaser.Math.FloatBetween(15, 35), vy: Phaser.Math.FloatBetween(20, 45) });
      this.root.add(dot);
    }
    this.vatBubbles = [];
    for (let i = 0; i < 6; i++) {
      const dot = this.add.circle(Phaser.Math.Between(-610, -560), Phaser.Math.Between(-140, 80), Phaser.Math.FloatBetween(2, 4), 0x86efac, 0.6).setBlendMode(Phaser.BlendModes.ADD);
      this.vatBubbles.push({ dot, vy: Phaser.Math.FloatBetween(30, 60), startY: 80 });
      this.root.add(dot);
    }
  }
  private buildClipboard(): void {
    const CX = -415, CY = 20;
    const shadow = this.add.ellipse(10, 160, 240, 36, 0x000000, 0.4);
    const clip = this.add.image(0, 0, 'lab_clipboard').setDisplaySize(285, 376);
    this.titleTx = this.add.text(-4, -123, '', { fontFamily: 'Gagalin, monospace', fontSize: '15px', color: '#facc15', stroke: '#1e0533', strokeThickness: 3 }).setOrigin(0.5);
    this.sketch = this.add.image(0, -64, 'sketch_skull').setDisplaySize(158, 92).setAngle(-1.5);
    // Уровни: слева и справа от нарисованной стрелки (не перекрывают стрелку)
    this.levelLeftTx = this.add.text(-36, -5, '', { fontFamily: 'Gagalin, monospace', fontSize: '13px', color: '#ffffff', stroke: '#1e0533', strokeThickness: 3 }).setOrigin(0.5).setAngle(-2.5);
    this.levelRightTx = this.add.text(42, -5, '', { fontFamily: 'Gagalin, monospace', fontSize: '13px', color: '#ffffff', stroke: '#1e0533', strokeThickness: 3 }).setOrigin(0.5).setAngle(-2.5);
    this.levelMaxTx = this.add.text(3, -5, '', { fontFamily: 'Gagalin, monospace', fontSize: '13px', color: '#facc15', stroke: '#1e0533', strokeThickness: 3 }).setOrigin(0.5).setAngle(-2.5);
    this.pips = [];
    const rad = Phaser.Math.DegToRad(-2.5);
    for (let i = 0; i < 5; i++) {
      const dx = -40 + i * 20;
      const pip = this.add.image(dx * Math.cos(rad) + 4, 22 + dx * Math.sin(rad), 'pip_inactive').setDisplaySize(13, 13).setAngle(-2.5);
      this.pips.push(pip);
    }
    // Текст описания строго по центру серой металлической карточки
    this.descTx = this.add.text(10, 52, '', {
      fontFamily: 'Balsamiq Sans, monospace',
      fontSize: '11px',
      color: '#1c1917',
      align: 'center',
      wordWrap: { width: 148 },
    }).setOrigin(0.5, 0.5).setAngle(-2.5);
    const btnBaseY = 114;
    this.buyZone = this.add.rectangle(17, btnBaseY, 220, 44, 0x000000, 0).setAngle(-2.8).setInteractive({ useHandCursor: true });
    this.buyTx = this.add.text(17, btnBaseY, '', { fontFamily: 'Gagalin, monospace', fontSize: '14px', color: '#1c1917', stroke: '#ca8a04', strokeThickness: 1, wordWrap: { width: 200 }, align: 'center' }).setOrigin(0.5, 0.5).setAngle(-2.8);
    this.buyZone.on('pointerdown', () => { this.buyTx.y = btnBaseY + 2; this.onBuy(); });
    this.buyZone.on('pointerup',   () => { this.buyTx.y = btnBaseY; });
    this.buyZone.on('pointerout',  () => { this.buyTx.y = btnBaseY; this.buyTx.setScale(1); });
    this.buyZone.on('pointerover', () => this.buyTx.setScale(1.05));
    this.clipContainer = this.add.container(CX, CY, [
      shadow, clip, this.titleTx, this.sketch, this.levelLeftTx, this.levelRightTx, this.levelMaxTx, ...this.pips, this.descTx, this.buyZone, this.buyTx,
    ]);
    this.tweens.add({ targets: this.clipContainer, angle: { from: -0.3, to: 0.3 }, duration: 5500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.root.add(this.clipContainer);
  }
  private buildTerminal(): void {
    const gooBar = this.add.image(435, -280, 'lab_goo_bar').setDisplaySize(185, 48);
    this.gooTx = this.add.text(455, -280, '0', { fontFamily: 'Gagalin, monospace', fontSize: '18px', color: '#4ade80', stroke: '#052e16', strokeThickness: 3 }).setOrigin(0.5);
    const back = this.add.image(555, -280, 'lab_btn_back').setDisplaySize(44, 44).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => { this.plat.vibrate(30); this.scene.start('MenuScene'); });
    back.on('pointerover', () => back.setDisplaySize(48, 48));
    back.on('pointerout',  () => back.setDisplaySize(44, 44));
    this.root.add([gooBar, this.gooTx, back]);
  }
  private buildArrows(): void {
    const Y = 30, aW = 44, aH = 50;
    const left  = this.add.image(-250, Y, 'arrow_left_yellow').setDisplaySize(aW, aH).setInteractive({ useHandCursor: true });
    const right = this.add.image( 370, Y, 'arrow_right_yellow').setDisplaySize(aW, aH).setInteractive({ useHandCursor: true });
    [left, right].forEach(a => {
      a.on('pointerover', () => a.setDisplaySize(aW * 1.08, aH * 1.08));
      a.on('pointerout',  () => a.setDisplaySize(aW, aH));
    });
    left.on('pointerdown',  () => {
      this.plat.vibrate(20);
      this.tweens.add({ targets: left, displayWidth: aW * 0.85, displayHeight: aH * 0.85, duration: 60, yoyo: true, ease: 'Back.easeOut' });
      this.navigate(-1);
    });
    right.on('pointerdown', () => {
      this.plat.vibrate(20);
      this.tweens.add({ targets: right, displayWidth: aW * 0.85, displayHeight: aH * 0.85, duration: 60, yoyo: true, ease: 'Back.easeOut' });
      this.navigate(1);
    });
    this.root.add([left, right]);
  }
  private navigate(dir: number): void {
    const next = Phaser.Math.Clamp(this.idx + dir, 0, this.items.length - 1);
    if (next === this.idx) return;
    this.idx = next;
    this.audio.playMechanicalClank();
    this.audio.playPaperRustle();
    this.cameras.main.zoomTo(1.006, 50, 'Quad.easeOut', true, (_, progress) => {
      if (progress === 1) this.cameras.main.zoomTo(1.0, 70, 'Quad.easeIn');
    });
    this.tweens.add({ targets: this.clipContainer, scaleX: { from: 1.025, to: 1.0 }, scaleY: { from: 0.98, to: 1.0 }, duration: 200, ease: 'Back.easeOut' });
    this.sketch.setY(-74).setAlpha(0.2);
    this.tweens.add({ targets: this.sketch, y: -64, alpha: 1, duration: 200, ease: 'Back.easeOut' });
    this.refreshAll();
  }
  private refreshAll(): void {
    this.refreshCarousel();
    this.refreshDetail();
    this.gooTx.setText(`${this.save.getGoo()}`);
  }
  private refreshCarousel(): void {
    const CY = 30;
    if (this.floatTw) { this.floatTw.stop(); this.floatTw = null; }
    for (let slot = 0; slot < 5; slot++) {
      const itemIdx = this.idx + (slot - 2);
      const { container, img, price } = this.slots[slot];
      const cfg = SLOTS[slot];
      if (itemIdx < 0 || itemIdx >= this.items.length) {
        container.setVisible(false);
        continue;
      }
      container.setVisible(true).setAlpha(cfg.alpha);
      const item = this.items[itemIdx];
      const organDef = ORGAN_MAP[item.id];
      const level = this.save.getPowerUpLevel(item.id);
      const isMax = level >= item.maxLevel;
      const cost = item.getCost(level);
      const isSkull = organDef.organ === 'organ_skull';
      const oW = isSkull ? cfg.size * (410 / 616) : cfg.size;
      const plateDx = organDef.plateDx * oW;
      const plateDy = organDef.plateDy * cfg.size;
      img.setTexture(organDef.organ).setDisplaySize(oW, cfg.size);
      price.setPosition(plateDx, plateDy);
      price.setVisible(true).setText(isMax ? 'MAX' : `${cost}`).setColor(isMax ? '#4ade80' : '#facc15');
      if (slot === 2) {
        container.y = CY + SLOTS[2].y;
        container.angle = 0;
        this.floatTw = this.tweens.add({
          targets: container,
          y: CY + SLOTS[2].y - 10,
          angle: { from: -1.0, to: 1.0 },
          duration: 1700,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }
  }
  private refreshDetail(): void {
    const item = this.items[this.idx];
    if (!item) return;
    const level = this.save.getPowerUpLevel(item.id);
    const isMax = level >= item.maxLevel;
    const cost = item.getCost(level);
    const canBuy = !isMax && this.save.getGoo() >= cost;
    const sketchKey = ORGAN_MAP[item.id].sketch;
    this.sketch.setTexture(sketchKey);
    const frame = this.textures.getFrame(sketchKey);
    const aspect = frame && frame.height > 0 ? frame.width / frame.height : 1.5;
    let sW = 144, sH = sW / aspect;
    if (sH > 80) { sH = 80; sW = sH * aspect; }
    this.sketch.setDisplaySize(sW, sH);
    this.titleTx.setText(item.name.toUpperCase());
    if (isMax) {
      this.levelLeftTx.setVisible(false);
      this.levelRightTx.setVisible(false);
      this.levelMaxTx.setVisible(true).setText('МАКС. УРОВЕНЬ');
    } else {
      this.levelMaxTx.setVisible(false);
      this.levelLeftTx.setVisible(true).setText(`LVL ${level}`);
      this.levelRightTx.setVisible(true).setText(`LVL ${level + 1}`);
    }
    this.descTx.setText(item.description);
    for (let i = 0; i < this.pips.length; i++) {
      if (i >= item.maxLevel) { this.pips[i].setVisible(false); continue; }
      this.pips[i].setVisible(true).setTexture(i < level ? 'pip_active' : 'pip_inactive');
    }
    if (isMax) {
      this.buyTx.setText('МАКСИМУМ').setColor('#78716c').setStroke('#44403c', 1);
      this.buyZone.disableInteractive();
    } else if (canBuy) {
      this.buyTx.setText(`ПРОКАЧАТЬ (${cost} GOO)`).setColor('#1c1917').setStroke('#ca8a04', 1);
      this.buyZone.setInteractive({ useHandCursor: true });
    } else {
      this.buyTx.setText(`НУЖНО ${cost} GOO`).setColor('#991b1b').setStroke('#fca5a5', 1);
      this.buyZone.disableInteractive();
    }
  }
  private onBuy(): void {
    const item = this.items[this.idx];
    if (!item || !this.save.buyPowerUp(item.id)) return;
    this.audio.playUpgradeBuy();
    this.cameras.main.shake(90, 0.0035);
    this.plat.vibrate(60);
    this.tweens.add({ targets: this.buyTx, scaleX: 0.92, scaleY: 0.92, duration: 60, yoyo: true, ease: 'Back.easeOut' });
    this.popNotice(`${item.name} +1!`);
    this.refreshAll();
  }

  private popNotice(text: string): void {
    const n = this.add.text(80, -260, text, { fontFamily: 'Gagalin, monospace', fontSize: '24px', color: '#4ade80', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
    this.root.add(n);
    this.tweens.add({ targets: n, y: -310, alpha: { from: 1, to: 0 }, duration: 1300, onComplete: () => n.destroy() });
  }
  override update(time: number, delta: number): void {
    const dt = delta * 0.001;
    // Парящие токсичные споры в свете
    for (let i = 0; i < this.spores.length; i++) {
      const s = this.spores[i];
      s.dot.y -= s.vy * dt;
      s.dot.x += Math.sin(time * 0.0015 + i) * s.vx * dt;
      if (s.dot.y < -340) {
        s.dot.y = 260;
        s.dot.x = Phaser.Math.Between(-250, 370);
      }
    }
    // Пузырьки в колбе с жижей слева
    for (let i = 0; i < this.vatBubbles.length; i++) {
      const b = this.vatBubbles[i];
      b.dot.y -= b.vy * dt;
      if (b.dot.y < -140) {
        b.dot.y = b.startY;
        b.dot.x = Phaser.Math.Between(-610, -560);
      }
    }
    // Деликатный микро-параллакс фона (без смещения UI)
    this.curParallaxX += (this.tgtParallaxX - this.curParallaxX) * 0.04;
    this.curParallaxY += (this.tgtParallaxY - this.curParallaxY) * 0.04;
    const w = this.scale.width, h = this.scale.height;
    this.bgImage.setPosition(w / 2 - this.curParallaxX, h / 2 - this.curParallaxY);
  }
}
