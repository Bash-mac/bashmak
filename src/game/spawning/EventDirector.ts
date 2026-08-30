import Phaser from 'phaser';
import type { SpawnManager } from './SpawnManager';
import type { LootSystem } from '../loot/LootSystem';
import type { AudioManager } from '../audio/AudioManager';
import {
  CRAWLER_SWARM,
  SPRINTER_BUG,
  ARMORED_SLUG,
  EXPLODER_SPORE,
} from '../data/enemies';

export interface EventDirectorContext {
  scene: Phaser.Scene;
  spawnManager: SpawnManager;
  lootSystem: LootSystem;
  audio: AudioManager;
  getPlayerPos: () => { x: number; y: number };
}

export class EventDirector {
  private triggeredEvents = new Set<string>();
  private bannerText?: Phaser.GameObjects.Text;
  private bannerContainer?: Phaser.GameObjects.Container;

  public reset(): void {
    this.triggeredEvents.clear();
    this.bannerContainer?.destroy();
    this.bannerContainer = undefined;
    this.bannerText = undefined;
  }

  public update(runTimeSeconds: number, ctx: EventDirectorContext): void {
    // 1. 01:30 (90s): Golden Piñata Runner
    if (runTimeSeconds >= 90 && !this.triggeredEvents.has('event_pinata')) {
      this.triggeredEvents.add('event_pinata');
      this.triggerGoldenRunner(ctx);
    }

    // 2. 03:00 (180s): Stampede Wall
    if (runTimeSeconds >= 180 && !this.triggeredEvents.has('event_stampede')) {
      this.triggeredEvents.add('event_stampede');
      this.triggerStampedeWall(ctx);
    }

    // 3. 04:30 (270s): Toxic Hazard Surge
    if (runTimeSeconds >= 270 && !this.triggeredEvents.has('event_toxic_surge')) {
      this.triggeredEvents.add('event_toxic_surge');
      this.triggerToxicSurge(ctx);
    }

    // 4. 05:00 (300s): Mini-Boss
    if (runTimeSeconds >= 300 && !this.triggeredEvents.has('event_miniboss')) {
      this.triggeredEvents.add('event_miniboss');
      this.showEventBanner(ctx.scene, 'БОСС: ХРЯКОГЛОТ!', '#f59e0b', 3000);
      ctx.audio.playLevelUp();
    }

    // 5. 06:30 (390s): Kamikaze Exploder Swarm
    if (runTimeSeconds >= 390 && !this.triggeredEvents.has('event_kamikaze')) {
      this.triggeredEvents.add('event_kamikaze');
      this.triggerKamikazeStorm(ctx);
    }

    // 6. 08:00 (480s): Final Boss
    if (runTimeSeconds >= 480 && !this.triggeredEvents.has('event_boss')) {
      this.triggeredEvents.add('event_boss');
      this.showEventBanner(ctx.scene, 'БОСС: БАРОН ФОН КАНАЛИЗИУС!', '#ef4444', 4000);
      ctx.audio.playLevelUp();
    }
  }

  private triggerGoldenRunner(ctx: EventDirectorContext): void {
    this.showEventBanner(ctx.scene, 'ЗОЛОТОЙ БЕГЛЕЦ: ДОГОНИ И УНИЧТОЖЬ!', '#facc15', 3500);
    ctx.audio.playLevelUp();

    const p = ctx.getPlayerPos();
    const angle = Math.random() * Math.PI * 2;
    const dist = 320;
    const x = p.x + Math.cos(angle) * dist;
    const y = p.y + Math.sin(angle) * dist;

    // Direct spawn of high-speed golden sprinter
    ctx.spawnManager.spawnDirect(SPRINTER_BUG, x, y, { hpMultiplier: 2.2, speedMultiplier: 1.15, damageMultiplier: 0.5 }, true);
  }

  private triggerStampedeWall(ctx: EventDirectorContext): void {
    this.showEventBanner(ctx.scene, 'МАРШ ОРДЫ: ПРОБЕЙ КОРИДОР!', '#ef4444', 3500);
    ctx.audio.playPlayerHurt();

    const p = ctx.getPlayerPos();
    const { halfW, halfH } = ctx.spawnManager.getViewport();
    const isHorizontal = Math.random() < 0.5;
    const count = 16;
    const margin = 120;

    if (isHorizontal) {
      const fromLeft = Math.random() < 0.5;
      const startX = fromLeft ? p.x - (halfW + margin) : p.x + (halfW + margin);
      const spanH = halfH * 2.2;
      const stepY = spanH / count;
      for (let i = 0; i < count; i++) {
        const y = p.y - spanH / 2 + i * stepY;
        const def = i % 4 === 0 ? ARMORED_SLUG : CRAWLER_SWARM;
        ctx.spawnManager.spawnDirect(def, startX + (Math.random() - 0.5) * 30, y);
      }
    } else {
      const fromTop = Math.random() < 0.5;
      const startY = fromTop ? p.y - (halfH + margin) : p.y + (halfH + margin);
      const spanW = halfW * 2.2;
      const stepX = spanW / count;
      for (let i = 0; i < count; i++) {
        const x = p.x - spanW / 2 + i * stepX;
        const def = i % 4 === 0 ? ARMORED_SLUG : CRAWLER_SWARM;
        ctx.spawnManager.spawnDirect(def, x, startY + (Math.random() - 0.5) * 30);
      }
    }
  }

  private triggerToxicSurge(ctx: EventDirectorContext): void {
    this.showEventBanner(ctx.scene, 'ПРОРЫВ КАНАЛИЗАЦИИ: КИСЛОТНЫЕ ГЕЙЗЕРЫ!', '#84cc16', 3500);
    const p = ctx.getPlayerPos();

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 140 + Math.random() * 180;
      const gx = p.x + Math.cos(angle) * dist;
      const gy = p.y + Math.sin(angle) * dist;

      const warn = ctx.scene.add.circle(gx, gy, 38, 0x84cc16, 0.25);
      warn.setStrokeStyle(2, 0x4ade80, 0.8);
      warn.setDepth(2);

      ctx.scene.tweens.add({
        targets: warn,
        alpha: { from: 0.2, to: 0.8 },
        scale: { from: 0.8, to: 1.2 },
        duration: 400,
        yoyo: true,
        repeat: 4,
        onComplete: () => {
          warn.destroy();
          const acid = ctx.scene.add.sprite(gx, gy, 'tex_acid_pool');
          acid.setScale(0.85);
          acid.setDepth(3);
          if (ctx.scene.anims.exists('vfx_anim_acid_pool')) acid.play('vfx_anim_acid_pool');
          ctx.scene.time.delayedCall(8000, () => {
            ctx.scene.tweens.add({
              targets: acid,
              alpha: 0,
              duration: 500,
              onComplete: () => acid.destroy(),
            });
          });
        },
      });
    }
  }

  private triggerKamikazeStorm(ctx: EventDirectorContext): void {
    this.showEventBanner(ctx.scene, 'КРАСНАЯ ТРЕВОГА: ШТОРМ ТУРБО-ВШЕЙ!', '#ef4444', 3500);
    ctx.audio.playPlayerHurt();

    const p = ctx.getPlayerPos();
    const { maxRadius } = ctx.spawnManager.getViewport();
    const count = 16;
    const angleStep = (Math.PI * 2) / count;

    for (let i = 0; i < count; i++) {
      const angle = i * angleStep + (Math.random() - 0.5) * 0.2;
      const dist = maxRadius + 80;
      const x = p.x + Math.cos(angle) * dist;
      const y = p.y + Math.sin(angle) * dist;
      // Only 2 exploders at opposing sides; rest are high-speed sprinters
      const def = i === 0 || i === 8 ? EXPLODER_SPORE : SPRINTER_BUG;
      ctx.spawnManager.spawnDirect(def, x, y, { speedMultiplier: 1.15 });
    }
  }

  public showEventBanner(scene: Phaser.Scene, text: string, color = '#facc15', durationMs = 3000): void {
    const width = scene.cameras.main.width;

    if (!this.bannerContainer) {
      this.bannerContainer = scene.add.container(width / 2, 100);
      this.bannerContainer.setScrollFactor(0);
      this.bannerContainer.setDepth(1000);

      const bg = scene.add.rectangle(0, 0, 680, 50, 0x000000, 0.85);
      bg.setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(color).color, 0.9);
      bg.setName('banner_bg');

      this.bannerText = scene.add.text(0, 0, text, {
        fontFamily: 'Gagalin, sans-serif',
        fontSize: '22px',
        color,
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
      }).setOrigin(0.5);

      this.bannerContainer.add([bg, this.bannerText]);
    } else {
      this.bannerContainer.setPosition(width / 2, 100);
      this.bannerContainer.setVisible(true);
      this.bannerContainer.setAlpha(1);
      if (this.bannerText) {
        this.bannerText.setText(text);
        this.bannerText.setColor(color);
      }
      const bg = this.bannerContainer.getByName('banner_bg') as Phaser.GameObjects.Rectangle | null;
      if (bg) bg.setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(color).color, 0.9);
    }

    this.bannerContainer.setScale(0.2);
    scene.tweens.killTweensOf(this.bannerContainer);
    scene.tweens.add({
      targets: this.bannerContainer,
      scaleX: 1.0,
      scaleY: 1.0,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        scene.time.delayedCall(durationMs - 500, () => {
          if (this.bannerContainer) {
            scene.tweens.add({
              targets: this.bannerContainer,
              alpha: 0,
              y: 70,
              duration: 400,
              onComplete: () => {
                this.bannerContainer?.setVisible(false);
              },
            });
          }
        });
      },
    });
  }
}
