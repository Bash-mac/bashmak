import Phaser from 'phaser';
import { createPlatformAdapter } from '../../platform';
import { SaveManager } from '../core/SaveManager';
import { getHeroById } from '../data/heroes';
import { AudioManager } from '../audio/AudioManager';
import { GrimoireModal } from './ui/GrimoireModal';
import { HeroSelectModal } from './ui/HeroSelectModal';

export class MenuScene extends Phaser.Scene {
  private platform = createPlatformAdapter();
  private grimoireModal!: GrimoireModal;
  private heroSelectModal!: HeroSelectModal;
  private selectedHeroText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const user = this.platform.getUser();

    // 1. Cover Background (Fills 100% of any screen aspect ratio with zero black bars)
    const bgScale = Math.max(width / 1280, height / 720);
    const bg = this.add.image(width / 2, height / 2, 'menu_bg');
    bg.setScale(bgScale);

    // 2. Universal Scalable UI Container (Centered & fit to visible area)
    const uiScale = Math.min(width / 1280, height / 720);
    const uiContainer = this.add.container(width / 2, height / 2).setScale(uiScale);

    // Dynamic resize repositioning on phone rotation / viewport changes
    const onResize = (gameSize: Phaser.Structs.Size) => {
      const w = gameSize.width;
      const h = gameSize.height;
      const newBgScale = Math.max(w / 1280, h / 720);
      bg.setPosition(w / 2, h / 2).setScale(newBgScale);
      const newUiScale = Math.min(w / 1280, h / 720);
      uiContainer.setPosition(w / 2, h / 2).setScale(newUiScale);
    };
    this.scale.on('resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', onResize);
    });

    // Inside uiContainer, (0, 0) is the center of the 1280x720 canvas
    // Logo (Top Left with secret dev 3-tap trigger)
    const logo = this.add.image(-380, -255, 'menu_logo').setInteractive({ useHandCursor: true });
    logo.setScale(0.62);

    let logoClicks = 0;
    let logoTimer: any = null;
    logo.on('pointerdown', () => {
      this.platform.vibrate(20);
      logoClicks++;
      clearTimeout(logoTimer);
      logoTimer = setTimeout(() => { logoClicks = 0; }, 1400);

      if (logoClicks >= 3) {
        logoClicks = 0;
        (window as any).__DEV_HEROES__ = true;
        try { localStorage.setItem('dev_heroes_unlocked', 'true'); } catch (e) {}
        this.platform.vibrate(80);
        this.openHeroSelect();
      }
    });

    this.tweens.add({
      targets: logo,
      scaleX: 0.64,
      scaleY: 0.60,
      angle: { from: -1, to: 1 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 3. Central Characters
    const worm = this.add.image(160, 60, 'char_worm').setInteractive({ useHandCursor: true });
    worm.setScale(1.15);

    this.tweens.add({
      targets: worm,
      scaleY: 1.12,
      y: 66,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    worm.on('pointerdown', () => {
      this.platform.vibrate(30);
      this.tweens.add({
        targets: worm,
        scaleX: 1.25,
        scaleY: 0.95,
        duration: 100,
        yoyo: true,
        ease: 'Back.easeOut',
      });
    });

    // Punk Rat
    const ratX = -155;
    const ratY = 175;

    const ratShadow = this.add.ellipse(ratX, ratY + 70, 75, 18, 0x000000, 0.4);
    const rat = this.add.image(ratX, ratY, 'char_rat').setInteractive({ useHandCursor: true });
    rat.setScale(0.85);
    rat.setFlipX(true);

    this.tweens.add({
      targets: rat,
      angle: { from: -2, to: 2 },
      y: ratY - 3,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: ratShadow,
      scaleX: 1.08,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    rat.on('pointerdown', () => {
      this.platform.vibrate(30);
      this.tweens.add({
        targets: rat,
        scaleX: 0.95,
        scaleY: 0.70,
        duration: 90,
        yoyo: true,
      });
    });

    // 4. Modals
    this.grimoireModal = new GrimoireModal(this);
    this.heroSelectModal = new HeroSelectModal(this, (hero) => {
      if (this.selectedHeroText) {
        this.selectedHeroText.setText(`[ ${hero.name.toUpperCase()} ]`);
      }
    });

    const currentHero = getHeroById(SaveManager.getInstance().getSelectedHeroId());

    // 5. Vertical Button Stack (Left side)
    const buttonConfigs = [
      { key: 'btn_play', y: -125, scale: 0.62, action: () => this.startGame() },
      { key: 'btn_heroes', y: -65, scale: 0.62, action: () => this.openHeroSelect() },
      { key: 'btn_upgrades', y: -8, scale: 0.62, action: () => this.openUpgrades() },
      { key: 'btn_bestiary', y: 50, scale: 0.62, action: () => this.grimoireModal.show() },
      { key: 'btn_settings', y: 108, scale: 0.62, action: () => this.onButtonClick('Settings') },
      { key: 'btn_quit', y: 168, scale: 0.62, action: () => this.onButtonClick('Quit') },
    ];

    this.selectedHeroText = this.add.text(-380, -35, `[ ${currentHero.name} ]`, {
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#4ade80',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const buttons: Phaser.GameObjects.Image[] = [];
    buttonConfigs.forEach((cfg, idx) => {
      const btn = this.add.image(-380, cfg.y, cfg.key).setInteractive({ useHandCursor: true });
      btn.setScale(cfg.scale);

      const baseScale = cfg.scale;

      btn.on('pointerover', () => {
        this.tweens.add({
          targets: btn,
          scaleX: baseScale * 1.07,
          scaleY: baseScale * 1.07,
          angle: idx % 2 === 0 ? 1.5 : -1.5,
          duration: 120,
          ease: 'Back.easeOut',
        });
      });

      btn.on('pointerout', () => {
        this.tweens.add({
          targets: btn,
          scaleX: baseScale,
          scaleY: baseScale,
          angle: 0,
          duration: 120,
          ease: 'Quad.easeOut',
        });
      });

      btn.on('pointerdown', () => {
        AudioManager.getInstance().init();
        AudioManager.getInstance().playClick();
        this.platform.vibrate(30);
        this.tweens.add({
          targets: btn,
          scaleX: baseScale * 0.92,
          scaleY: baseScale * 0.92,
          duration: 70,
          yoyo: true,
          onComplete: () => {
            cfg.action();
          },
        });
      });

      buttons.push(btn);
    });

    // 5. Bottom UI
    const dailyGoo = this.add.image(-560, 288, 'daily_goo').setInteractive({ useHandCursor: true });
    dailyGoo.setScale(0.62);
    this.tweens.add({
      targets: dailyGoo,
      scaleX: 0.65,
      scaleY: 0.60,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const mission = this.add.image(-20, 298, 'mission_plank');
    mission.setScale(0.62);

    const social = this.add.image(525, 290, 'social_buttons').setInteractive({ useHandCursor: true });
    social.setScale(0.62);

    // Top Right Action Buttons
    const topIcons: Phaser.GameObjects.Image[] = [];
    const topButtonConfigs = [
      { key: 'icon_trophy', x: 520, action: () => this.onButtonClick('Leaderboard') },
      { key: 'icon_help', x: 580, action: () => this.onButtonClick('Help') },
    ];

    topButtonConfigs.forEach((cfg) => {
      const icon = this.add.image(cfg.x, -310, cfg.key).setInteractive({ useHandCursor: true });
      icon.setScale(0.62);

      icon.on('pointerover', () => {
        this.tweens.add({
          targets: icon,
          scaleX: 0.68,
          scaleY: 0.68,
          duration: 100,
          ease: 'Back.easeOut',
        });
      });

      icon.on('pointerout', () => {
        this.tweens.add({
          targets: icon,
          scaleX: 0.62,
          scaleY: 0.62,
          duration: 100,
        });
      });

      icon.on('pointerdown', () => {
        this.platform.vibrate(25);
        this.tweens.add({
          targets: icon,
          scaleX: 0.55,
          scaleY: 0.55,
          duration: 70,
          yoyo: true,
          onComplete: cfg.action,
        });
      });

      topIcons.push(icon);
    });

    // Top GOO Currency Badge
    const gooBank = SaveManager.getInstance().getGoo();
    const gooBadgeBg = this.add.rectangle(350, -310, 160, 38, 0x14532d, 0.9);
    gooBadgeBg.setStrokeStyle(2, 0x4ade80);
    const gooBadgeText = this.add.text(350, -310, `🧪 ${gooBank}`, {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#4ade80',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    uiContainer.add([
      logo,
      worm,
      ratShadow,
      rat,
      ...buttons,
      this.selectedHeroText,
      dailyGoo,
      mission,
      social,
      gooBadgeBg,
      gooBadgeText,
      ...topIcons,
    ]);

    // 6. Platform / User Info Watermark
    const platformText = this.platform.isTelegram
      ? `TMA: ${user?.firstName || 'Survivor'}`
      : 'Web: v0.1.0';

    this.add.text(width - 16, height - 12, platformText, {
      fontSize: '11px',
      color: '#64748b',
      fontFamily: 'monospace',
    }).setOrigin(1, 1);
  }

  private openHeroSelect(): void {
    this.platform.vibrate(30);
    this.heroSelectModal.show();
  }

  private openUpgrades(): void {
    this.platform.vibrate(30);
    this.scene.start('UpgradesScene');
  }

  private startGame(): void {
    this.platform.requestFullscreen?.();
    this.cameras.main.fade(300, 11, 14, 20, false, (_cam: any, progress: number) => {
      if (progress === 1) {
        this.scene.start('GameScene');
      }
    });
  }

  private onButtonClick(name: string): void {
    console.log(`[Menu] Clicked ${name}`);
  }
}
