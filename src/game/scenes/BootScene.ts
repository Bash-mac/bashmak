import Phaser from 'phaser';
import { PlaceholderTextures } from './helpers/PlaceholderTextures';

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
    this.load.image('social_buttons', '/assets/menu/social_buttons.webp');
    this.load.image('char_worm', '/assets/menu/char_worm.webp');
    this.load.image('char_rat', '/assets/menu/char_rat.webp');





    // Vypolzok Assets & UI
    this.load.image('vypolzok_portrait', '/assets/sprites/vypolzok/ui/portrait_vypolzok.webp');
    this.load.image('hud_face_smug', '/assets/sprites/vypolzok/ui/hud_face_smug.webp');
    this.load.image('hud_face_bored', '/assets/sprites/vypolzok/ui/hud_face_bored.webp');
    this.load.image('hud_face_injured', '/assets/sprites/vypolzok/ui/hud_face_injured.webp');

    // Vypolzok Character Sprites
    for (let i = 1; i <= 4; i++) {
      this.load.image(`vypolzok_idle_${i}`, `/assets/sprites/vypolzok/idle/idle_${i}.webp`);
      this.load.image(`vypolzok_spit_${i}`, `/assets/sprites/vypolzok/spit/spit_${i}.webp`);
      this.load.image(`vypolzok_hurt_${i}`, `/assets/sprites/vypolzok/hurt/hurt_${i}.webp`);
    }
    for (let i = 1; i <= 5; i++) {
      this.load.image(`vypolzok_run_${i}`, `/assets/sprites/vypolzok/run/run_${i}.webp`);
      this.load.image(`vypolzok_dead_${i}`, `/assets/sprites/vypolzok/dead/dead_${i}.webp`);
    }

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

    // Markovka (Beda) Assets & UI
    this.load.image('portrait_markovka', '/assets/sprites/markovka/HUD/portrait_markovka.webp');
    this.load.image('hud_face_smug_markovka', '/assets/sprites/markovka/HUD/hud_face_smug.webp');
    this.load.image('hud_face_bored_markovka', '/assets/sprites/markovka/HUD/hud_face_bored.webp');
    this.load.image('hud_face_injured_markovka', '/assets/sprites/markovka/HUD/hud_face_injured.webp');

    // Markovka Character Sprites
    for (let i = 1; i <= 4; i++) {
      this.load.image(`markovka_idle_${i}`, `/assets/sprites/markovka/idle/idle_${i}.webp`);
      this.load.image(`markovka_attack_${i}`, `/assets/sprites/markovka/attack/attack_${i}.webp`);
      this.load.image(`markovka_hurt_${i}`, `/assets/sprites/markovka/hurt/hurt_${i}.webp`);
    }
    for (let i = 1; i <= 18; i++) {
      this.load.image(`markovka_run_${i}`, `/assets/sprites/markovka/run/run_${i}.webp`);
    }
    for (let i = 1; i <= 5; i++) {
      this.load.image(`markovka_dead_${i}`, `/assets/sprites/markovka/dead/dead_${i}.webp`);
    }

    // Markovka Weapon & VFX
    for (let i = 1; i <= 4; i++) {
      this.load.image(`vfx_carrot_fly_${i}`, `/assets/sprites/markovka/weapon/vfx_carrot_fly/vfx_carrot_fly_${i}.webp`);
      this.load.image(`vfx_carrot_splat_${i}`, `/assets/sprites/markovka/weapon/vfx_carrot_splat/vfx_carrot_splat_${i}.webp`);
    }
    this.load.image('tex_carrot_proj', '/assets/sprites/markovka/weapon/vfx_carrot_fly/vfx_carrot_fly_1.webp');
    this.load.image('tex_carrot_proj_crit', '/assets/sprites/markovka/weapon/vfx_carrot_fly/vfx_carrot_fly_4.webp');

    // Default primary projectile texture
    this.load.image('tex_homing_dagger', '/assets/sprites/vypolzok/vfx/spit_proj/spit_proj_1.webp');
    this.load.image('tex_acid_pool', '/assets/sprites/vypolzok/vfx/acid_pool/acid_pool_1.webp');

    // Combat FX
    this.load.spritesheet('vfx_electro_zap', '/assets/sprites/vfx/vfx_electro_zap.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('vfx_piezo_muzzle', '/assets/sprites/vfx/vfx_piezo_muzzle.png', { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet('vfx_piezo_hit', '/assets/sprites/vfx/vfx_piezo_hit.png', { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet('vfx_toilet_lid_spin', '/assets/sprites/vfx/vfx_toilet_lid_spin.png', { frameWidth: 160, frameHeight: 160 });
    this.load.spritesheet('vfx_toilet_lid_spin_slime', '/assets/sprites/vfx/vfx_toilet_lid_spin_slime.png', { frameWidth: 200, frameHeight: 160 });
    this.load.spritesheet('vfx_toilet_lid_impact', '/assets/sprites/vfx/vfx_toilet_lid_impact.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('vfx_sock_stench', '/assets/sprites/vfx/vfx_sock_stench.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('vfx_boot_stomp', '/assets/sprites/vfx/vfx_boot_stomp.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('vfx_orbit_fly', '/assets/sprites/vfx/vfx_orbit_fly.png', { frameWidth: 64, frameHeight: 102 });

    // Map Floor Tiles & Decals
    this.load.image('tex_floor', '/assets/sprites/map/tex_floor.webp');
    this.load.image('floor_cracked', '/assets/sprites/map/floor_cracked.webp');
    this.load.image('floor_sewage', '/assets/sprites/map/floor_sewage.webp');
    this.load.image('floor_graffiti', '/assets/sprites/map/floor_graffiti.webp');
    this.load.atlas('atlas_floor_bricks', '/assets/sprites/map/atlas_floor_bricks.webp', '/assets/sprites/map/atlas_floor_bricks.json');
    this.load.atlas('atlas_floor_decals', '/assets/sprites/map/atlas_floor_decals.webp', '/assets/sprites/map/atlas_floor_decals.json');

    // Map Architecture & Interactive Props
    this.load.image('tex_prop_pillar', '/assets/sprites/map/props/tex_prop_pillar.webp');
    this.load.image('tex_prop_barrel', '/assets/sprites/map/props/tex_prop_barrel.webp');
    this.load.image('tex_prop_shrine', '/assets/sprites/map/props/tex_prop_shrine.webp');
    this.load.image('prop_manhole', '/assets/sprites/map/props/prop_manhole.webp');
    this.load.image('prop_grate', '/assets/sprites/map/props/prop_grate.webp');
    this.load.image('prop_valve', '/assets/sprites/map/props/prop_valve.webp');
    this.load.image('prop_slime_source', '/assets/sprites/map/props/prop_slime_source.webp');

    // --- 90s Gross-Out HD UI System Assets ---
    // 1. Hero Selection Dossier & Cutout Assets
    this.load.image('hero_dossier_bg', '/assets/menu/hero_dossier_bg.webp');
    this.load.image('polaroid_vypolzok', '/assets/ui/hero_modal/polaroid_vypolzok.webp');
    this.load.image('polaroid_bashmak', '/assets/ui/hero_modal/polaroid_bashmak.webp');
    this.load.image('polaroid_markovka', '/assets/ui/hero_modal/polaroid_markovka.webp');
    this.load.image('polaroid_baklazhan', '/assets/ui/hero_modal/polaroid_baklazhan.webp');
    this.load.image('char_vypolzok', '/assets/ui/hero_modal/char_vypolzok.webp');
    this.load.image('char_markovka', '/assets/ui/hero_modal/char_markovka.webp');
    this.load.image('char_bashmak', '/assets/ui/hero_modal/char_bashmak.webp');
    this.load.image('char_baklazhan', '/assets/ui/hero_modal/char_baklazhan.webp');
    this.load.image('hero_card_worm', '/assets/ui/posters/hero_card_worm.webp');
    this.load.image('hero_card_bashmak', '/assets/ui/posters/hero_card_bashmak.webp');
    this.load.image('hero_card_markovka', '/assets/ui/posters/hero_card_markovka.webp');
    this.load.image('hero_card_baklazhan', '/assets/ui/posters/hero_card_baklazhan.webp');
    this.load.image('chains_pod', '/assets/ui/hero_modal/chains_pod.webp');

    // 2. Card Frames (512x768)
    this.load.image('card_frame_standard', '/assets/ui/frames/card_frame_standard.webp');
    this.load.image('card_frame_gold', '/assets/ui/frames/card_frame_gold.webp');
    this.load.image('card_frame_consumable', '/assets/ui/frames/card_frame_consumable.webp');

    // 3. Action Buttons (512x205) - Blank Frames for Multi-language Localization
    this.load.image('btn_frame_green', '/assets/ui/buttons/btn_frame_green.webp');
    this.load.image('btn_frame_gold', '/assets/ui/buttons/btn_frame_gold.webp');
    this.load.image('btn_frame_red', '/assets/ui/buttons/btn_frame_red.webp');
    this.load.image('btn_frame_dark', '/assets/ui/buttons/btn_frame_dark.webp');

    // 4. HUD Overlays
    this.load.image('hud_avatar_badge_frame', '/assets/ui/hud/hud_avatar_badge_frame.webp');
    this.load.image('hud_bar_frame', '/assets/ui/hud/hud_bar_frame.webp');
    this.load.image('hud_bar_fill_hp', '/assets/ui/hud/hud_bar_fill_hp.webp');
    this.load.image('hud_bar_fill_xp', '/assets/ui/hud/hud_bar_fill_xp.webp');
    this.load.image('hud_slot_frame', '/assets/ui/hud/hud_slot_frame.webp');

    // 4b. Pause Modal Kit
    this.load.image('pause_panel', '/assets/ui/pause/pause_panel.webp');
    this.load.image('pause_ribbon_stats', '/assets/ui/pause/pause_ribbon_stats.webp');
    this.load.image('pause_ribbon_section', '/assets/ui/pause/pause_ribbon_section.webp');
    this.load.image('pause_slot_empty', '/assets/ui/pause/pause_slot_empty.webp');
    this.load.image('pause_icon_play', '/assets/ui/pause/pause_icon_play.webp');
    this.load.image('pause_icon_grimoire', '/assets/ui/pause/pause_icon_grimoire.webp');
    this.load.image('pause_icon_restart', '/assets/ui/pause/pause_icon_restart.webp');
    this.load.image('pause_icon_home', '/assets/ui/pause/pause_icon_home.webp');

    // 5. Square Icons (256x256) - Weapons, Tomes, Evolutions
    this.load.image('icon_weapon_slime_spit', '/assets/ui/icons/icon_weapon_slime_spit.webp');
    this.load.image('icon_weapon_carrot_barrage', '/assets/ui/icons/icon_weapon_carrot_barrage.webp');
    this.load.image('icon_weapon_lace_whip', '/assets/ui/icons/icon_weapon_lace_whip.webp');
    this.load.image('icon_weapon_mega_boot', '/assets/ui/icons/icon_weapon_mega_boot.webp');
    this.load.image('icon_weapon_eggplant_roll', '/assets/ui/icons/icon_weapon_eggplant_roll.webp');
    this.load.image('icon_weapon_acid_trail', '/assets/ui/icons/icon_weapon_acid_trail.webp');
    this.load.image('icon_weapon_orbiting_flies', '/assets/ui/icons/icon_weapon_orbiting_flies.webp');
    this.load.image('icon_weapon_toilet_lid', '/assets/ui/icons/icon_weapon_toilet_lid.webp');
    this.load.image('icon_weapon_piezo_taser', '/assets/ui/icons/icon_weapon_piezo_taser.webp');

    this.load.image('icon_tome_area', '/assets/ui/icons/icon_tome_area.webp');
    this.load.image('icon_tome_armor', '/assets/ui/icons/icon_tome_armor.webp');
    this.load.image('icon_tome_attack_speed', '/assets/ui/icons/icon_tome_attack_speed.webp');
    this.load.image('icon_tome_crit', '/assets/ui/icons/icon_tome_crit.webp');
    this.load.image('icon_tome_damage', '/assets/ui/icons/icon_tome_damage.webp');
    this.load.image('icon_tome_hp_regen', '/assets/ui/icons/icon_tome_hp_regen.webp');
    this.load.image('icon_tome_lifesteal', '/assets/ui/icons/icon_tome_lifesteal.webp');
    this.load.image('icon_tome_magnet', '/assets/ui/icons/icon_tome_magnet.webp');
    this.load.image('icon_tome_quantity', '/assets/ui/icons/icon_tome_quantity.webp');
    this.load.image('icon_tome_speed', '/assets/ui/icons/icon_tome_speed.webp');

    this.load.image('icon_evo_acid_tsunami', '/assets/ui/icons/icon_evo_acid_tsunami.webp');
    this.load.image('icon_evo_typhoon_flail', '/assets/ui/icons/icon_evo_typhoon_flail.webp');
    this.load.image('icon_evo_gatling_carrot', '/assets/ui/icons/icon_evo_gatling_carrot.webp');
    this.load.image('icon_evo_planetary_cataclysm', '/assets/ui/icons/icon_evo_planetary_cataclysm.webp');

    // 5b. Grimoire UI Modular Frame & Row Assets
    this.load.image('grimoire_frame', '/assets/ui/grimoire/grimoire_frame.webp');
    this.load.image('grimoire_bg_brick', '/assets/ui/grimoire/grimoire_bg_brick.webp');
    this.load.image('grimoire_row_acid', '/assets/ui/grimoire/grimoire_row_acid.webp');
    this.load.image('grimoire_row_electric', '/assets/ui/grimoire/grimoire_row_electric.webp');
    this.load.image('grimoire_row_fire', '/assets/ui/grimoire/grimoire_row_fire.webp');
    this.load.image('grimoire_row_void', '/assets/ui/grimoire/grimoire_row_void.webp');

    // 6. Enemy Sprites & Death VFX
    for (let i = 1; i <= 3; i++) {
      this.load.image(`tex_fodder_run_${i}`, `/assets/sprites/enemies/fodder/fodder_${i}.webp`);
      this.load.image(`tex_crawler_run_${i}`, `/assets/sprites/enemies/swarmer/swarmer_${i}.webp`);
      this.load.image(`tex_tank_run_${i}`, `/assets/sprites/enemies/tank/tank_${i}.webp`);
    }
    for (let i = 1; i <= 4; i++) {
      this.load.image(`tex_sprinter_run_${i}`, `/assets/sprites/enemies/sprinter/sprinter_${i}.webp`);
      this.load.image(`tex_exploder_run_${i}`, `/assets/sprites/enemies/exploder/exploder_${i}.webp`);
      this.load.image(`tex_miniboss_run_${i}`, `/assets/sprites/enemies/miniboss/miniboss_${i}.webp`);
      this.load.image(`tex_boss_run_${i}`, `/assets/sprites/enemies/boss/boss_${i}.webp`);
      this.load.image(`tex_enemy_dead_${i}`, `/assets/sprites/enemies/enemy_dead/enemy_dead_${i}.webp`);
    }

    // 7. Pickups & Loot Drops
    this.load.image('drop_xp_small', '/assets/sprites/drop/drop_xp_small.webp');
    this.load.image('drop_xp_big', '/assets/sprites/drop/drop_xp_big.webp');
    this.load.image('drop_goo', '/assets/sprites/drop/drop_goo.webp');
  }

  create(): void {
    PlaceholderTextures.generate(this);
    this.createVypolzokAnimations();
    this.createMarkovkaAnimations();
    this.createEnemyAnimations();
    this.scene.start('MenuScene');
  }

  private createEnemyAnimations(): void {
    const enemies = [
      { key: 'anim_fodder_run', prefix: 'tex_fodder_run_', count: 3, rate: 8 },
      { key: 'anim_crawler_run', prefix: 'tex_crawler_run_', count: 3, rate: 6 },
      { key: 'anim_sprinter_run', prefix: 'tex_sprinter_run_', count: 4, rate: 12 },
      { key: 'anim_tank_run', prefix: 'tex_tank_run_', count: 3, rate: 6 },
      { key: 'anim_exploder_run', prefix: 'tex_exploder_run_', count: 4, rate: 8 },
      { key: 'anim_miniboss_run', prefix: 'tex_miniboss_run_', count: 4, rate: 8 },
      { key: 'anim_boss_run', prefix: 'tex_boss_run_', count: 4, rate: 8 },
    ];
    for (const e of enemies) {
      this.anims.create({
        key: e.key,
        frames: Array.from({ length: e.count }, (_, i) => ({ key: `${e.prefix}${i + 1}` })),
        frameRate: e.rate,
        repeat: -1,
      });
    }

    this.anims.create({
      key: 'vfx_anim_enemy_dead',
      frames: Array.from({ length: 3 }, (_, i) => ({ key: `tex_enemy_dead_${i + 1}` })),
      frameRate: 14,
      repeat: 0,
    });
  }

  private createVypolzokAnimations(): void {
    // 1. Idle (drinking soda, scratching belly, smug grin)
    const idleFrames = [
      { key: 'vypolzok_idle_1' }, { key: 'vypolzok_idle_2' }, { key: 'vypolzok_idle_3' },
      { key: 'vypolzok_idle_4' }, { key: 'vypolzok_idle_3' }, { key: 'vypolzok_idle_2' },
    ];
    this.anims.create({
      key: 'vypolzok_anim_idle',
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

    // 6. VFX: Acid Pool Bubbling
    this.anims.create({
      key: 'vfx_anim_acid_pool',
      frames: [
        { key: 'vfx_acid_pool_1' }, { key: 'vfx_acid_pool_2' }, { key: 'vfx_acid_pool_3' }, { key: 'vfx_acid_pool_4' },
      ],
      frameRate: 8,
      repeat: -1,
    });

    // 7. VFX: Impact Splat Explosion
    this.anims.create({
      key: 'vfx_anim_impact_splat',
      frames: [
        { key: 'vfx_impact_splat_1' }, { key: 'vfx_impact_splat_2' }, { key: 'vfx_impact_splat_3' }, { key: 'vfx_impact_splat_4' },
      ],
      frameRate: 14,
      repeat: 0,
    });

    // 8. VFX: Spit Projectile Flight Animation
    this.anims.create({
      key: 'vfx_anim_spit_proj',
      frames: [
        { key: 'vfx_spit_proj_1' }, { key: 'vfx_spit_proj_2' }, { key: 'vfx_spit_proj_3' },
        { key: 'vfx_spit_proj_4' }, { key: 'vfx_spit_proj_5' }, { key: 'vfx_spit_proj_6' },
        { key: 'vfx_spit_proj_7' }, { key: 'vfx_spit_proj_8' }, { key: 'vfx_spit_proj_9' },
      ],
      frameRate: 16,
      repeat: -1,
    });
  }

  private createMarkovkaAnimations(): void {
    // 1. Idle (holding bat on shoulder, chewing, bouncing)
    this.anims.create({
      key: 'markovka_anim_idle',
      frames: [
        { key: 'markovka_idle_1' },
        { key: 'markovka_idle_2' },
        { key: 'markovka_idle_3' },
        { key: 'markovka_idle_4' },
      ],
      frameRate: 6,
      repeat: -1,
    });

    // 2. Run (3/4 punk swagger stride)
    this.anims.create({
      key: 'markovka_anim_run',
      frames: Array.from({ length: 18 }, (_, i) => ({ key: `markovka_run_${i + 1}` })),
      frameRate: 16,
      repeat: -1,
    });

    // 3. Attack (savage bat swing)
    this.anims.create({
      key: 'markovka_anim_attack',
      frames: [
        { key: 'markovka_attack_1' },
        { key: 'markovka_attack_2' },
        { key: 'markovka_attack_3' },
        { key: 'markovka_attack_4' },
      ],
      frameRate: 14,
      repeat: 0,
    });

    // 4. Hurt (shock face, stars, squished)
    this.anims.create({
      key: 'markovka_anim_hurt',
      frames: [
        { key: 'markovka_hurt_1' },
        { key: 'markovka_hurt_2' },
        { key: 'markovka_hurt_3' },
        { key: 'markovka_hurt_4' },
      ],
      frameRate: 12,
      repeat: 0,
    });

    // 5. Dead (splat into orange puddle with boot & bat)
    this.anims.create({
      key: 'markovka_anim_dead',
      frames: [
        { key: 'markovka_dead_1' },
        { key: 'markovka_dead_2' },
        { key: 'markovka_dead_3' },
        { key: 'markovka_dead_4' },
        { key: 'markovka_dead_5' },
      ],
      frameRate: 8,
      repeat: 0,
    });

    // 6. VFX: Flying Carrot Flight
    this.anims.create({
      key: 'vfx_anim_carrot_fly',
      frames: [
        { key: 'vfx_carrot_fly_1' }, { key: 'vfx_carrot_fly_2' }, { key: 'vfx_carrot_fly_3' },
      ],
      frameRate: 12,
      repeat: -1,
    });

    // 7. VFX: Carrot Impact Splat
    this.anims.create({
      key: 'vfx_anim_carrot_splat',
      frames: [
        { key: 'vfx_carrot_splat_1' }, { key: 'vfx_carrot_splat_2' }, { key: 'vfx_carrot_splat_3' }, { key: 'vfx_carrot_splat_4' },
      ],
      frameRate: 14,
      repeat: 0,
    });

    // 8. VFX: Arcada Effector Electric Zap & Muzzle
    this.anims.create({
      key: 'vfx_anim_electro_zap',
      frames: this.anims.generateFrameNumbers('vfx_electro_zap', { start: 0, end: 11 }),
      frameRate: 24,
      repeat: 0,
    });
    this.anims.create({
      key: 'vfx_anim_piezo_muzzle',
      frames: this.anims.generateFrameNumbers('vfx_piezo_muzzle', { start: 0, end: 7 }),
      frameRate: 24,
      repeat: 0,
    });
    this.anims.create({
      key: 'vfx_anim_piezo_hit',
      frames: this.anims.generateFrameNumbers('vfx_piezo_hit', { start: 0, end: 7 }),
      frameRate: 24,
      repeat: 0,
    });
    this.anims.create({
      key: 'anim_toilet_lid_spin',
      frames: this.anims.generateFrameNumbers('vfx_toilet_lid_spin', { start: 0, end: 7 }),
      frameRate: 24,
      repeat: -1,
    });
    this.anims.create({
      key: 'anim_toilet_lid_spin_slime',
      frames: this.anims.generateFrameNumbers('vfx_toilet_lid_spin_slime', { start: 0, end: 7 }),
      frameRate: 24,
      repeat: -1,
    });
    this.anims.create({
      key: 'vfx_anim_toilet_lid_impact',
      frames: this.anims.generateFrameNumbers('vfx_toilet_lid_impact', { start: 0, end: 5 }),
      frameRate: 18,
      repeat: 0,
    });
    this.anims.create({
      key: 'vfx_anim_sock_stench',
      frames: this.anims.generateFrameNumbers('vfx_sock_stench', { start: 0, end: 11 }),
      frameRate: 26,
      repeat: 0,
    });
    this.anims.create({
      key: 'vfx_anim_boot_stomp',
      frames: this.anims.generateFrameNumbers('vfx_boot_stomp', { start: 0, end: 11 }),
      frameRate: 30,
      repeat: 0,
    });
    this.anims.create({
      key: 'anim_orbit_fly_buzz',
      frames: this.anims.generateFrameNumbers('vfx_orbit_fly', { start: 0, end: 3 }),
      frameRate: 18,
      repeat: -1,
    });
  }
}
