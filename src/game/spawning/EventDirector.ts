import Phaser from 'phaser';
import type { SpawnManager } from './SpawnManager';
import type { LootSystem } from '../loot/LootSystem';
import type { AudioManager } from '../audio/AudioManager';
import {
  SPRINTER_BUG,
  ARMORED_SLUG,
  EXPLODER_SPORE,
  MINI_BOSS_ELITE,
  BOSS_KURGAN,
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
  private bannerContainer?: Phaser.GameObjects.Container;
  private bannerText?: Phaser.GameObjects.Text;

  // Off-screen Target Tracker Arrow
  private trackerContainer?: Phaser.GameObjects.Container;
  private trackerArrow?: Phaser.GameObjects.Triangle;
  private trackerText?: Phaser.GameObjects.Text;
  private trackedTarget?: { getPos: () => { x: number; y: number }; isAlive: () => boolean; color: number };

  public reset(): void {
    this.triggeredEvents.clear();
    this.bannerContainer?.destroy();
    this.bannerContainer = undefined;
    this.bannerText = undefined;
    this.trackerContainer?.destroy();
    this.trackerContainer = undefined;
    this.trackedTarget = undefined;
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

    // 4. 05:00 (300s): Mini-Boss (Хрякоглот)
    if (runTimeSeconds >= 300 && !this.triggeredEvents.has('event_miniboss')) {
      this.triggeredEvents.add('event_miniboss');
      this.triggerMiniBoss(ctx);
    }

    // 5. 06:30 (390s): Fast Sprinter Swarm
    if (runTimeSeconds >= 390 && !this.triggeredEvents.has('event_kamikaze')) {
      this.triggeredEvents.add('event_kamikaze');
      this.triggerSprinterSwarm(ctx);
    }

    // 6. 08:00 (480s): Final Boss (Барон фон Канализиус)
    if (runTimeSeconds >= 480 && !this.triggeredEvents.has('event_boss')) {
      this.triggeredEvents.add('event_boss');
      this.triggerFinalBoss(ctx);
    }

    // Update Off-Screen Arrow Tracker
    this.updateTargetTracker(ctx);
  }

  private triggerGoldenRunner(ctx: EventDirectorContext): void {
    this.showEventBanner(ctx.scene, 'ЗОЛОТОЙ БЕГЛЕЦ: ДОГОНИ И УНИЧТОЖЬ!', '#facc15', 4000);
    ctx.audio.playLevelUp();

    const p = ctx.getPlayerPos();
    const angle = Math.random() * Math.PI * 2;
    const dist = 320;
    const x = p.x + Math.cos(angle) * dist;
    const y = p.y + Math.sin(angle) * dist;

    // Direct spawn of high-speed golden sprinter
    ctx.spawnManager.spawnDirect(SPRINTER_BUG, x, y, { hpMultiplier: 3.5, speedMultiplier: 1.25, damageMultiplier: 0.5 }, true);

    // Find the spawned champion entity
    ctx.scene.time.delayedCall(50, () => {
      const enemies = (ctx.scene as any).enemiesMap as Map<string, any> | undefined;
      if (!enemies) return;
      for (const e of enemies.values()) {
        if (e.isChampion && e.definition?.id === SPRINTER_BUG.id && !e.sprite?.getData('isRunnerConfigured')) {
          e.sprite?.setData('isRunnerConfigured', true);
          e.sprite?.setData('isRunner', true);
          e.sprite?.setScale(0.55); // 2.5x larger than normal sprinter
          e.sprite?.setTint(0xfacc15);

          // Golden pulsing halo
          ctx.scene.tweens.add({
            targets: e.sprite,
            scaleX: 0.62,
            scaleY: 0.62,
            duration: 350,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });

          // Set tracker
          this.trackedTarget = {
            getPos: () => ({ x: e.x, y: e.y }),
            isAlive: () => e.isAlive && e.health.currentHp > 0,
            color: 0xfacc15,
          };
          break;
        }
      }
    });
  }

  private triggerStampedeWall(ctx: EventDirectorContext): void {
    this.showEventBanner(ctx.scene, 'ПРОРЫВ ОРДЫ: УЙДИ С ПОЛОСЫ!', '#ef4444', 3500);
    ctx.audio.playPlayerHurt();

    const p = ctx.getPlayerPos();
    const { halfW, halfH } = ctx.spawnManager.getViewport();
    const isHorizontal = Math.random() < 0.5;
    const count = 12;
    const margin = 120;

    // 1. Red warning corridor telegraph
    const warnRect = ctx.scene.add.rectangle(
      isHorizontal ? p.x : p.x,
      isHorizontal ? p.y : p.y,
      isHorizontal ? halfW * 2.2 : 160,
      isHorizontal ? 160 : halfH * 2.2,
      0xef4444,
      0.18
    );
    warnRect.setStrokeStyle(3, 0xef4444, 0.7);
    warnRect.setDepth(2);

    ctx.scene.tweens.add({
      targets: warnRect,
      alpha: { from: 0.1, to: 0.45 },
      duration: 250,
      yoyo: true,
      repeat: 4,
      onComplete: () => warnRect.destroy(),
    });

    // 2. Delayed charge in organic V-wedge formation
    ctx.scene.time.delayedCall(1200, () => {
      if (isHorizontal) {
        const fromLeft = Math.random() < 0.5;
        const dirVx = fromLeft ? 1 : -1;
        const spanH = halfH * 1.8;
        const stepY = spanH / count;

        for (let i = 0; i < count; i++) {
          const wedgeOffset = Math.abs(i - count / 2) * 35;
          const startX = fromLeft
            ? p.x - (halfW + margin) - wedgeOffset
            : p.x + (halfW + margin) + wedgeOffset;
          const y = p.y - spanH / 2 + i * stepY + (Math.random() - 0.5) * 15;
          const def = i === 3 || i === 8 ? EXPLODER_SPORE : ARMORED_SLUG;
          ctx.spawnManager.spawnDirect(def, startX, y, { hpMultiplier: 1.6, speedMultiplier: 1.0 });
        }

        ctx.scene.time.delayedCall(50, () => {
          const enemies = (ctx.scene as any).enemiesMap as Map<string, any> | undefined;
          if (!enemies) return;
          for (const e of enemies.values()) {
            if ((e.definition?.id === ARMORED_SLUG.id || e.definition?.id === EXPLODER_SPORE.id) && !e.sprite?.getData('stampedeDir')) {
              e.sprite?.setData('stampedeDir', { vx: dirVx, vy: 0 });
              e.sprite?.setData('stampedeSpeedMult', 0.85 + Math.random() * 0.3);
            }
          }
        });
      } else {
        const fromTop = Math.random() < 0.5;
        const dirVy = fromTop ? 1 : -1;
        const spanW = halfW * 1.8;
        const stepX = spanW / count;

        for (let i = 0; i < count; i++) {
          const wedgeOffset = Math.abs(i - count / 2) * 35;
          const startY = fromTop
            ? p.y - (halfH + margin) - wedgeOffset
            : p.y + (halfH + margin) + wedgeOffset;
          const x = p.x - spanW / 2 + i * stepX + (Math.random() - 0.5) * 15;
          const def = i === 3 || i === 8 ? EXPLODER_SPORE : ARMORED_SLUG;
          ctx.spawnManager.spawnDirect(def, x, startY, { hpMultiplier: 1.6, speedMultiplier: 1.0 });
        }

        ctx.scene.time.delayedCall(50, () => {
          const enemies = (ctx.scene as any).enemiesMap as Map<string, any> | undefined;
          if (!enemies) return;
          for (const e of enemies.values()) {
            if ((e.definition?.id === ARMORED_SLUG.id || e.definition?.id === EXPLODER_SPORE.id) && !e.sprite?.getData('stampedeDir')) {
              e.sprite?.setData('stampedeDir', { vx: 0, vy: dirVy });
              e.sprite?.setData('stampedeSpeedMult', 0.85 + Math.random() * 0.3);
            }
          }
        });
      }
    });
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

  private triggerMiniBoss(ctx: EventDirectorContext): void {
    this.showEventBanner(ctx.scene, 'БОСС: ХРЯКОГЛОТ!', '#f59e0b', 3500);
    ctx.audio.playLevelUp();

    const p = ctx.getPlayerPos();
    const angle = Math.random() * Math.PI * 2;
    const dist = 420;
    const bx = p.x + Math.cos(angle) * dist;
    const by = p.y + Math.sin(angle) * dist;

    ctx.spawnManager.spawnDirect(MINI_BOSS_ELITE, bx, by, { hpMultiplier: 1.8, speedMultiplier: 1.0 });

    // Escort units
    for (let i = 0; i < 4; i++) {
      const ea = angle + ((i - 1.5) * 0.35);
      ctx.spawnManager.spawnDirect(ARMORED_SLUG, p.x + Math.cos(ea) * (dist + 40), p.y + Math.sin(ea) * (dist + 40));
    }

    ctx.scene.time.delayedCall(50, () => {
      const enemies = (ctx.scene as any).enemiesMap as Map<string, any> | undefined;
      if (!enemies) return;
      for (const e of enemies.values()) {
        if (e.definition?.archetype === 'miniboss' && e.isAlive) {
          this.trackedTarget = {
            getPos: () => ({ x: e.x, y: e.y }),
            isAlive: () => e.isAlive && e.health.currentHp > 0,
            color: 0xf59e0b,
          };
          break;
        }
      }
    });
  }

  private triggerSprinterSwarm(ctx: EventDirectorContext): void {
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
      const def = i === 0 || i === 8 ? EXPLODER_SPORE : SPRINTER_BUG;
      ctx.spawnManager.spawnDirect(def, x, y, { speedMultiplier: 1.15 });
    }
  }

  private triggerFinalBoss(ctx: EventDirectorContext): void {
    this.showEventBanner(ctx.scene, 'БОСС: БАРОН ФОН КАНАЛИЗИУС!', '#ef4444', 4000);
    ctx.audio.playLevelUp();

    const p = ctx.getPlayerPos();
    const angle = Math.random() * Math.PI * 2;
    const dist = 450;
    const bx = p.x + Math.cos(angle) * dist;
    const by = p.y + Math.sin(angle) * dist;

    ctx.spawnManager.spawnDirect(BOSS_KURGAN, bx, by, { hpMultiplier: 2.5, speedMultiplier: 1.0 });

    ctx.scene.time.delayedCall(50, () => {
      const enemies = (ctx.scene as any).enemiesMap as Map<string, any> | undefined;
      if (!enemies) return;
      for (const e of enemies.values()) {
        if (e.definition?.archetype === 'boss' && e.isAlive) {
          this.trackedTarget = {
            getPos: () => ({ x: e.x, y: e.y }),
            isAlive: () => e.isAlive && e.health.currentHp > 0,
            color: 0xef4444,
          };
          break;
        }
      }
    });
  }

  private updateTargetTracker(ctx: EventDirectorContext): void {
    if (!this.trackedTarget || !this.trackedTarget.isAlive()) {
      if (this.trackerContainer) {
        this.trackerContainer.setVisible(false);
      }
      this.trackedTarget = undefined;
      return;
    }

    const scene = ctx.scene;
    const cam = scene.cameras.main;
    const targetPos = this.trackedTarget.getPos();
    const p = ctx.getPlayerPos();

    // Check if target is inside camera viewport
    const viewLeft = cam.worldView.x + 40;
    const viewRight = cam.worldView.right - 40;
    const viewTop = cam.worldView.y + 40;
    const viewBottom = cam.worldView.bottom - 40;

    const isInsideView =
      targetPos.x >= viewLeft &&
      targetPos.x <= viewRight &&
      targetPos.y >= viewTop &&
      targetPos.y <= viewBottom;

    if (isInsideView) {
      if (this.trackerContainer) this.trackerContainer.setVisible(false);
      return;
    }

    if (!this.trackerContainer) {
      this.trackerContainer = scene.add.container(0, 0);
      this.trackerContainer.setScrollFactor(0);
      this.trackerContainer.setDepth(999);

      // Pointer triangle
      this.trackerArrow = scene.add.triangle(0, 0, 0, -12, 14, 12, -14, 12, this.trackedTarget.color);
      this.trackerArrow.setStrokeStyle(2, 0xffffff, 0.9);

      this.trackerText = scene.add.text(0, 20, '', {
        fontFamily: 'Gagalin, sans-serif',
        fontSize: '14px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
        align: 'center',
      }).setOrigin(0.5);

      this.trackerContainer.add([this.trackerArrow, this.trackerText]);
    }

    this.trackerContainer.setVisible(true);
    if (this.trackerArrow) this.trackerArrow.setFillStyle(this.trackedTarget.color);

    // Calculate angle from player to target
    const angle = Phaser.Math.Angle.Between(p.x, p.y, targetPos.x, targetPos.y);
    const screenW = cam.width;
    const screenH = cam.height;
    const pad = 45;

    // Position indicator at screen edge
    const screenCenterX = screenW / 2;
    const screenCenterY = screenH / 2;
    const rayX = Math.cos(angle);
    const rayY = Math.sin(angle);

    const scaleX = (screenCenterX - pad) / Math.abs(rayX || 0.001);
    const scaleY = (screenCenterY - pad) / Math.abs(rayY || 0.001);
    const minScale = Math.min(scaleX, scaleY);

    const indicatorX = screenCenterX + rayX * minScale;
    const indicatorY = screenCenterY + rayY * minScale;

    this.trackerContainer.setPosition(indicatorX, indicatorY);
    if (this.trackerArrow) this.trackerArrow.setRotation(angle + Math.PI / 2);

    const distMeters = Math.round(Phaser.Math.Distance.Between(p.x, p.y, targetPos.x, targetPos.y) / 20);
    if (this.trackerText) this.trackerText.setText(`${distMeters}м`);
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
