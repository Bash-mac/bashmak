import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Menu Assets
    this.load.image('menu_bg', '/assets/menu/bg_sewer.webp');
    this.load.image('menu_logo', '/assets/menu/logo.webp');
    this.load.image('btn_play', '/assets/menu/btn_play.webp');
    this.load.image('btn_heroes', '/assets/menu/btn_heroes.webp');
    this.load.image('btn_upgrades', '/assets/menu/btn_upgrades.webp');
    this.load.image('btn_bestiary', '/assets/menu/btn_bestiary.webp');
    this.load.image('btn_settings', '/assets/menu/btn_settings.webp');
    this.load.image('btn_quit', '/assets/menu/btn_quit.webp');
    this.load.image('daily_goo', '/assets/menu/daily_goo.webp');
    this.load.image('mission_plank', '/assets/menu/mission_plank.webp');
    this.load.image('icon_trophy', '/assets/menu/icon_trophy.webp');
    this.load.image('icon_help', '/assets/menu/icon_help.webp');
    this.load.image('icon_gear', '/assets/menu/icon_gear.webp');
    this.load.image('social_buttons', '/assets/menu/social_buttons.webp');
    this.load.image('char_worm', '/assets/menu/char_worm.webp');
    this.load.image('char_rat', '/assets/menu/char_rat.webp');

    // Bashmak Poses
    this.load.image('pose_idle', '/assets/sprites/poses/pose_idle.png');
    this.load.image('pose_run', '/assets/sprites/poses/pose_run.png');
    this.load.image('pose_attack', '/assets/sprites/poses/pose_attack.png');
    this.load.image('pose_ranged_spit', '/assets/sprites/poses/pose_ranged_spit.png');
    this.load.image('pose_heavy_prep', '/assets/sprites/poses/pose_heavy_prep.png');
    this.load.image('pose_ultimate', '/assets/sprites/poses/pose_ultimate.png');
    this.load.image('pose_damaged', '/assets/sprites/poses/pose_damaged.png');
    this.load.image('pose_alert', '/assets/sprites/poses/pose_alert.png');

    // Bashmak Expressions for HUD & Modals
    this.load.image('face_happy', '/assets/sprites/expressions/face_happy.png');
    this.load.image('face_bored', '/assets/sprites/expressions/face_bored.png');
    this.load.image('face_smug', '/assets/sprites/expressions/face_smug.png');
    this.load.image('face_angry', '/assets/sprites/expressions/face_angry.png');
    this.load.image('face_injured', '/assets/sprites/expressions/face_injured.png');
    this.load.image('face_terrified', '/assets/sprites/expressions/face_terrified.png');
    this.load.image('face_furious', '/assets/sprites/expressions/face_furious.png');
    this.load.image('face_victorious', '/assets/sprites/expressions/face_victorious.png');

    // Vypolzok (Tony) New 90s Gross-Out Assets & UI
    this.load.image('vypolzok_portrait', '/assets/sprites/vypolzok/ui/portrait_vypolzok.webp');
    this.load.image('tony_portrait', '/assets/sprites/vypolzok/ui/portrait_vypolzok.webp');
    this.load.image('hud_face_smug', '/assets/sprites/vypolzok/ui/hud_face_smug.webp');
    this.load.image('hud_face_bored', '/assets/sprites/vypolzok/ui/hud_face_bored.webp');
    this.load.image('hud_face_injured', '/assets/sprites/vypolzok/ui/hud_face_injured.webp');
    this.load.image('icon_slime_spit', '/assets/sprites/vypolzok/ui/icon_slime_spit.webp');
    this.load.image('icon_trait_trail', '/assets/sprites/vypolzok/ui/icon_trait_trail.webp');

    // Vypolzok Character Sprites
    for (let i = 1; i <= 4; i++) {
      this.load.image(`vypolzok_idle_${i}`, `/assets/sprites/vypolzok/idle/idle_${i}.webp`);
      this.load.image(`tony_idle_${i}`, `/assets/sprites/vypolzok/idle/idle_${i}.webp`);
      this.load.image(`vypolzok_spit_${i}`, `/assets/sprites/vypolzok/spit/spit_${i}.webp`);
      this.load.image(`tony_spit_${i}`, `/assets/sprites/vypolzok/spit/spit_${i}.webp`);
      this.load.image(`vypolzok_hurt_${i}`, `/assets/sprites/vypolzok/hurt/hurt_${i}.webp`);
      this.load.image(`tony_hurt_${i}`, `/assets/sprites/vypolzok/hurt/hurt_${i}.webp`);
    }
    for (let i = 1; i <= 5; i++) {
      this.load.image(`vypolzok_run_${i}`, `/assets/sprites/vypolzok/run/run_${i}.webp`);
      this.load.image(`vypolzok_dead_${i}`, `/assets/sprites/vypolzok/dead/dead_${i}.webp`);
      this.load.image(`tony_dead_${i}`, `/assets/sprites/vypolzok/dead/dead_${i}.webp`);
    }
    // Backward compatibility aliases for run
    this.load.image('tony_run_1', '/assets/sprites/vypolzok/run/run_1.webp');
    this.load.image('tony_run_2', '/assets/sprites/vypolzok/run/run_2.webp');
    this.load.image('tony_run_3', '/assets/sprites/vypolzok/run/run_3.webp');

    // VFX Sprites
    for (let i = 1; i <= 4; i++) {
      this.load.image(`vfx_acid_pool_${i}`, `/assets/sprites/vypolzok/vfx/acid_pool/acid_pool_${i}.webp`);
      this.load.image(`vfx_impact_splat_${i}`, `/assets/sprites/vypolzok/vfx/impact_splat/impact_splat_${i}.webp`);
    }
    for (let i = 1; i <= 5; i++) {
      this.load.image(`vfx_slime_trail_${i}`, `/assets/sprites/vypolzok/vfx/slime_trail/slime_trail_${i}.webp`);
    }
    for (let i = 1; i <= 9; i++) {
      this.load.image(`vfx_spit_proj_${i}`, `/assets/sprites/vypolzok/vfx/spit_proj/spit_proj_${i}.webp`);
    }

    // Default primary projectile texture
    this.load.image('tex_homing_dagger', '/assets/sprites/vypolzok/vfx/spit_proj/spit_proj_1.webp');
    this.load.image('tex_acid_pool', '/assets/sprites/vypolzok/vfx/acid_pool/acid_pool_1.webp');

    // Combat FX
    this.load.image('fx_slime', '/assets/sprites/poses/fx_slime.png');
    this.load.image('fx_impact', '/assets/sprites/poses/fx_impact.png');
    this.load.image('fx_poison', '/assets/sprites/poses/fx_poison.png');

    // Map Floor Tiles & Decals
    this.load.image('tex_floor', '/assets/sprites/map/tex_floor.webp');
    this.load.image('floor_cracked', '/assets/sprites/map/floor_cracked.webp');
    this.load.image('floor_sewage', '/assets/sprites/map/floor_sewage.webp');
    this.load.image('floor_rusted', '/assets/sprites/map/floor_rusted.webp');
    this.load.image('floor_graffiti', '/assets/sprites/map/floor_graffiti.webp');

    // Map Architecture & Interactive Props
    this.load.image('tex_prop_pillar', '/assets/sprites/map/props/tex_prop_pillar.webp');
    this.load.image('tex_prop_barrel', '/assets/sprites/map/props/tex_prop_barrel.webp');
    this.load.image('tex_prop_shrine', '/assets/sprites/map/props/tex_prop_shrine.webp');
    this.load.image('prop_manhole', '/assets/sprites/map/props/prop_manhole.webp');
    this.load.image('prop_grate', '/assets/sprites/map/props/prop_grate.webp');
    this.load.image('prop_valve', '/assets/sprites/map/props/prop_valve.webp');
    this.load.image('prop_slime_source', '/assets/sprites/map/props/prop_slime_source.webp');
  }

  create(): void {
    this.createPlaceholderTextures();
    this.createVypolzokAnimations();
    this.scene.start('MenuScene');
  }

  private createVypolzokAnimations(): void {
    // 1. Idle (drinking soda, scratching belly, smug grin)
    const idleFrames = [
      { key: 'vypolzok_idle_1' },
      { key: 'vypolzok_idle_2' },
      { key: 'vypolzok_idle_3' },
      { key: 'vypolzok_idle_4' },
      { key: 'vypolzok_idle_3' },
      { key: 'vypolzok_idle_2' },
    ];
    this.anims.create({
      key: 'vypolzok_anim_idle',
      frames: idleFrames,
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: 'tony_anim_idle',
      frames: idleFrames,
      frameRate: 6,
      repeat: -1,
    });

    // 2. Run (slimy drag racing squash & stretch)
    const runFrames = [
      { key: 'vypolzok_run_1' },
      { key: 'vypolzok_run_2' },
      { key: 'vypolzok_run_3' },
      { key: 'vypolzok_run_4' },
      { key: 'vypolzok_run_5' },
    ];
    this.anims.create({
      key: 'vypolzok_anim_run',
      frames: runFrames,
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'tony_anim_run',
      frames: runFrames,
      frameRate: 10,
      repeat: -1,
    });

    // 3. Spit / Attack (mouth open 180°, huge blast)
    const spitFrames = [
      { key: 'vypolzok_spit_1' },
      { key: 'vypolzok_spit_2' },
      { key: 'vypolzok_spit_3' },
      { key: 'vypolzok_spit_4' },
    ];
    this.anims.create({
      key: 'vypolzok_anim_spit',
      frames: spitFrames,
      frameRate: 14,
      repeat: 0,
    });
    this.anims.create({
      key: 'tony_anim_spit',
      frames: spitFrames,
      frameRate: 14,
      repeat: 0,
    });

    // 4. Hurt (bulging eyes, dislocated jaw)
    const hurtFrames = [
      { key: 'vypolzok_hurt_1' },
      { key: 'vypolzok_hurt_2' },
      { key: 'vypolzok_hurt_3' },
      { key: 'vypolzok_hurt_4' },
    ];
    this.anims.create({
      key: 'vypolzok_anim_hurt',
      frames: hurtFrames,
      frameRate: 12,
      repeat: 0,
    });
    this.anims.create({
      key: 'tony_anim_hurt',
      frames: hurtFrames,
      frameRate: 12,
      repeat: 0,
    });

    // 5. Dead (splat into slime + soda can)
    const deadFrames = [
      { key: 'vypolzok_dead_1' },
      { key: 'vypolzok_dead_2' },
      { key: 'vypolzok_dead_3' },
      { key: 'vypolzok_dead_4' },
      { key: 'vypolzok_dead_5' },
    ];
    this.anims.create({
      key: 'vypolzok_anim_dead',
      frames: deadFrames,
      frameRate: 8,
      repeat: 0,
    });
    this.anims.create({
      key: 'tony_anim_dead',
      frames: deadFrames,
      frameRate: 8,
      repeat: 0,
    });

    // 6. VFX: Acid Pool Bubbling
    this.anims.create({
      key: 'vfx_anim_acid_pool',
      frames: [
        { key: 'vfx_acid_pool_1' },
        { key: 'vfx_acid_pool_2' },
        { key: 'vfx_acid_pool_3' },
        { key: 'vfx_acid_pool_4' },
      ],
      frameRate: 8,
      repeat: -1,
    });

    // 7. VFX: Impact Splat Explosion
    this.anims.create({
      key: 'vfx_anim_impact_splat',
      frames: [
        { key: 'vfx_impact_splat_1' },
        { key: 'vfx_impact_splat_2' },
        { key: 'vfx_impact_splat_3' },
        { key: 'vfx_impact_splat_4' },
      ],
      frameRate: 14,
      repeat: 0,
    });

    // 8. VFX: Spit Projectile Flight Animation
    this.anims.create({
      key: 'vfx_anim_spit_proj',
      frames: [
        { key: 'vfx_spit_proj_1' },
        { key: 'vfx_spit_proj_2' },
        { key: 'vfx_spit_proj_3' },
        { key: 'vfx_spit_proj_4' },
        { key: 'vfx_spit_proj_5' },
        { key: 'vfx_spit_proj_6' },
        { key: 'vfx_spit_proj_7' },
        { key: 'vfx_spit_proj_8' },
        { key: 'vfx_spit_proj_9' },
      ],
      frameRate: 16,
      repeat: -1,
    });
  }

  private createPlaceholderTextures(): void {
    // 1. Hero: Worm (Pink with cartoon eyes and bandana)
    const wormGfx = this.make.graphics({ x: 0, y: 0 });
    wormGfx.fillStyle(0xf472b6, 1);
    wormGfx.fillCircle(18, 18, 16);
    wormGfx.lineStyle(3, 0x831843, 1);
    wormGfx.strokeCircle(18, 18, 16);
    wormGfx.fillStyle(0x0284c7, 1);
    wormGfx.fillRect(4, 4, 28, 8);
    wormGfx.fillStyle(0xffffff, 1);
    wormGfx.fillCircle(22, 14, 5);
    wormGfx.fillCircle(22, 22, 5);
    wormGfx.fillStyle(0x0f172a, 1);
    wormGfx.fillCircle(24, 14, 2.5);
    wormGfx.fillCircle(24, 22, 2.5);
    wormGfx.generateTexture('tex_worm_hero', 36, 36);
    wormGfx.destroy();

    // 2. Fodder Bat (Летучая мышь) - Small purple flying critter
    const fodderGfx = this.make.graphics({ x: 0, y: 0 });
    fodderGfx.fillStyle(0xa855f7, 1);
    fodderGfx.fillCircle(12, 12, 8);
    fodderGfx.lineStyle(2, 0x581c87, 1);
    fodderGfx.strokeCircle(12, 12, 8);
    // Wings
    fodderGfx.fillStyle(0xc084fc, 0.9);
    fodderGfx.fillTriangle(4, 12, 0, 4, 10, 8);
    fodderGfx.fillTriangle(20, 12, 24, 4, 14, 8);
    fodderGfx.fillStyle(0xfef08a, 1);
    fodderGfx.fillCircle(14, 10, 2);
    fodderGfx.fillCircle(14, 14, 2);
    fodderGfx.generateTexture('tex_fodder', 24, 24);
    fodderGfx.destroy();

    // 3. Crawler (Ползун) - Orange swarmer beetle
    const crawlerGfx = this.make.graphics({ x: 0, y: 0 });
    crawlerGfx.fillStyle(0xd97706, 1);
    crawlerGfx.fillCircle(16, 16, 14);
    crawlerGfx.lineStyle(2, 0x78350f, 1);
    crawlerGfx.strokeCircle(16, 16, 14);
    crawlerGfx.fillStyle(0xfef08a, 1);
    crawlerGfx.fillCircle(16, 16, 4);
    crawlerGfx.generateTexture('tex_crawler', 32, 32);
    crawlerGfx.destroy();

    // 4. Sprinter (Спринтер) - Bright neon lime/orange fast runner
    const sprinterGfx = this.make.graphics({ x: 0, y: 0 });
    sprinterGfx.fillStyle(0xf97316, 1);
    sprinterGfx.fillTriangle(24, 12, 4, 4, 4, 20);
    sprinterGfx.lineStyle(2, 0x7c2d12, 1);
    sprinterGfx.strokeTriangle(24, 12, 4, 4, 4, 20);
    sprinterGfx.fillStyle(0xffffff, 1);
    sprinterGfx.fillCircle(12, 12, 3);
    sprinterGfx.generateTexture('tex_sprinter', 26, 24);
    sprinterGfx.destroy();

    // 5. Armored Slug / Tank (Броневик) - Heavy metallic grey/green slug
    const tankGfx = this.make.graphics({ x: 0, y: 0 });
    tankGfx.fillStyle(0x475569, 1);
    tankGfx.fillCircle(24, 24, 22);
    tankGfx.lineStyle(4, 0x1e293b, 1);
    tankGfx.strokeCircle(24, 24, 22);
    tankGfx.fillStyle(0x64748b, 1);
    tankGfx.fillCircle(24, 24, 14);
    tankGfx.fillStyle(0xef4444, 1);
    tankGfx.fillCircle(30, 24, 4);
    tankGfx.generateTexture('tex_tank', 48, 48);
    tankGfx.destroy();

    // 6. Exploder (Разрывник) - Pulsing dark red explosive bulb
    const exploderGfx = this.make.graphics({ x: 0, y: 0 });
    exploderGfx.fillStyle(0xdc2626, 1);
    exploderGfx.fillCircle(16, 16, 14);
    exploderGfx.lineStyle(3, 0x450a0a, 1);
    exploderGfx.strokeCircle(16, 16, 14);
    exploderGfx.fillStyle(0xfbbf24, 1);
    exploderGfx.fillCircle(16, 16, 6);
    exploderGfx.generateTexture('tex_exploder', 32, 32);
    exploderGfx.destroy();

    // 7. Mini-Boss Elite (Элитный Мутант) - 60x60 glowing red mutant
    const miniBossGfx = this.make.graphics({ x: 0, y: 0 });
    miniBossGfx.fillStyle(0xb91c1c, 1);
    miniBossGfx.fillCircle(30, 30, 28);
    miniBossGfx.lineStyle(4, 0xfacc15, 1); // Gold elite border
    miniBossGfx.strokeCircle(30, 30, 28);
    miniBossGfx.fillStyle(0x7f1d1d, 1);
    miniBossGfx.fillCircle(30, 30, 14);
    miniBossGfx.fillStyle(0xfef08a, 1);
    miniBossGfx.fillCircle(38, 24, 5);
    miniBossGfx.fillCircle(38, 36, 5);
    miniBossGfx.generateTexture('tex_miniboss', 60, 60);
    miniBossGfx.destroy();

    // 8. Boss: Kurgan (Курган) - Massive 76x76 armored mound
    const bossGfx = this.make.graphics({ x: 0, y: 0 });
    bossGfx.fillStyle(0x312e81, 1);
    bossGfx.fillCircle(38, 38, 36);
    bossGfx.lineStyle(4, 0x4338ca, 1);
    bossGfx.strokeCircle(38, 38, 36);
    bossGfx.fillStyle(0xef4444, 1);
    bossGfx.fillCircle(38, 38, 16);
    bossGfx.fillStyle(0xfde047, 1);
    bossGfx.fillCircle(44, 30, 6);
    bossGfx.fillCircle(44, 46, 6);
    bossGfx.generateTexture('tex_boss_kurgan', 76, 76);
    bossGfx.destroy();

    // 9. Slime Spit Projectile (Neon lime green)
    const slimeGfx = this.make.graphics({ x: 0, y: 0 });
    slimeGfx.fillStyle(0x22c55e, 1);
    slimeGfx.fillCircle(8, 8, 7);
    slimeGfx.lineStyle(2, 0xffffff, 0.9);
    slimeGfx.strokeCircle(8, 8, 7);
    slimeGfx.generateTexture('tex_slime_spit', 16, 16);
    slimeGfx.destroy();

    // 10. Acid Pool (Toxic green puddle)
    const acidPoolGfx = this.make.graphics({ x: 0, y: 0 });
    acidPoolGfx.fillStyle(0x84cc16, 0.6);
    acidPoolGfx.fillCircle(32, 32, 30);
    acidPoolGfx.lineStyle(3, 0x4ade80, 0.9);
    acidPoolGfx.strokeCircle(32, 32, 30);
    acidPoolGfx.generateTexture('tex_acid_pool', 64, 64);
    acidPoolGfx.destroy();

    // 11. XP Gem (Electric green cartoon crystal with black stroke)
    const gemGfx = this.make.graphics({ x: 0, y: 0 });
    gemGfx.fillStyle(0x4ade80, 1);
    gemGfx.fillCircle(8, 8, 6);
    gemGfx.lineStyle(2, 0x14532d, 1);
    gemGfx.strokeCircle(8, 8, 6);
    gemGfx.fillStyle(0xffffff, 1);
    gemGfx.fillCircle(6, 6, 2);
    gemGfx.generateTexture('tex_gem', 16, 16);
    gemGfx.destroy();


    // 16. Wireless Homing Dagger (Cyan glowing sharp projectile)
    const daggerGfx = this.make.graphics({ x: 0, y: 0 });
    daggerGfx.fillStyle(0x38bdf8, 1);
    daggerGfx.fillTriangle(20, 7, 0, 0, 0, 14);
    daggerGfx.lineStyle(1.5, 0xffffff, 1);
    daggerGfx.strokeTriangle(20, 7, 0, 0, 0, 14);
    daggerGfx.fillStyle(0xffffff, 1);
    daggerGfx.fillCircle(6, 7, 3);
    daggerGfx.generateTexture('tex_homing_dagger', 22, 16);
    daggerGfx.destroy();

    // 17. GOO Drop (Bright toxic green blob with yellow shine and gold outline)
    const gooGfx = this.make.graphics({ x: 0, y: 0 });
    gooGfx.fillStyle(0x84cc16, 1);
    gooGfx.fillCircle(10, 10, 8);
    gooGfx.lineStyle(2, 0xfacc15, 1); // Gold rim
    gooGfx.strokeCircle(10, 10, 8);
    gooGfx.fillStyle(0xfef08a, 1); // Shiny highlight
    gooGfx.fillCircle(7, 7, 3);
    gooGfx.fillStyle(0x22c55e, 0.8);
    gooGfx.fillCircle(11, 11, 4);
    gooGfx.generateTexture('tex_goo_drop', 20, 20);
    gooGfx.destroy();

    // 18. Carrot Projectile (Sharp orange carrot with comic outline)
    const carrotGfx = this.make.graphics({ x: 0, y: 0 });
    carrotGfx.fillStyle(0xf97316, 1);
    carrotGfx.fillTriangle(24, 7, 0, 1, 0, 13);
    carrotGfx.lineStyle(2, 0x7c2d12, 1);
    carrotGfx.strokeTriangle(24, 7, 0, 1, 0, 13);
    carrotGfx.fillStyle(0x22c55e, 1);
    carrotGfx.fillRect(0, 4, 4, 6);
    carrotGfx.generateTexture('tex_carrot_proj', 26, 16);
    carrotGfx.destroy();

    // 19. Eggplant Ball (Purple round rolling ball)
    const eggGfx = this.make.graphics({ x: 0, y: 0 });
    eggGfx.fillStyle(0x9333ea, 1);
    eggGfx.fillCircle(16, 16, 14);
    eggGfx.lineStyle(2, 0x581c87, 1);
    eggGfx.strokeCircle(16, 16, 14);
    eggGfx.fillStyle(0x22c55e, 1);
    eggGfx.fillTriangle(16, 2, 12, 8, 20, 8);
    eggGfx.generateTexture('tex_eggplant_ball', 32, 32);
    eggGfx.destroy();
  }
}
