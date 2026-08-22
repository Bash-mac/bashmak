import random
import math

class SimModifiers:
    def __init__(self):
        self.doubleSpitChance = 0
        self.multishotCount = 1
        self.bounceCount = 0
        self.attackSpeedBonus = 0
        self.burstFireCount = 1
        self.splashPercent = 0
        self.damagePercentBonus = 0
        self.critChance = 0
        self.critMultiplier = 2.0
        self.hpRegenPerSec = 0
        self.healOnKill = 0
        self.cheatDeathUnlocked = False
        self.cheatDeathUsed = False
        self.wriggleDash = False
        self.acidTrail = False
        self.homingDaggersLevel = 1
        self.homingDaggersCount = 2
        self.bouncingBonesLevel = 0
        self.bouncingBonesCount = 0
        self.lightningZapLevel = 0
        self.staticZapMax = 100
        self.acidTrailLevel = 0
        self.acidTrailDps = 0
        self.pierceCount = 0
        self.armorShred = 0
        self.slowPercent = 0
        self.tomeQuantity = 0
        self.tomeSpeed = 0
        self.tomeMagnet = 0
        self.tomeCritSize = 0

def run_single(strategy, cfg):
    time = 0.0
    dt = 0.1
    playerHp = cfg['startHp']
    maxHp = cfg['startHp']
    playerLevel = 1
    currentXp = 0
    nextLevelXp = cfg['baseXp']
    kills = 0
    mods = SimModifiers()
    activeSlots = {}

    px, py = 0.0, 0.0
    enemies = []
    attackTimer = 0.0
    boneTimer = 0.0
    staticZapCurrent = 0.0
    spawnTimer = 0.0
    miniBossSpawned = False
    bossSpawned = False
    iframeTimer = 0.0

    while time < 600.0 and playerHp > 0:
        time += dt
        minutes = time / 60.0

        if mods.hpRegenPerSec > 0:
            playerHp = min(maxHp, playerHp + mods.hpRegenPerSec * dt)
        if iframeTimer > 0:
            iframeTimer -= dt

        # Scaling
        hpMult = 1.0 + cfg['mobHpRate'] * minutes + cfg['mobHpQuad'] * minutes * minutes
        spdMult = 1.0 + 0.04 * minutes
        dmgMult = 1.0 + cfg['mobDmgRate'] * minutes

        if minutes >= 5.0 and not miniBossSpawned:
            miniBossSpawned = True
            angle = random.random() * math.pi * 2
            enemies.append({
                'name': 'MiniBoss',
                'hp': cfg['miniBossHp'] * hpMult,
                'maxHp': cfg['miniBossHp'] * hpMult,
                'speed': 115 * spdMult,
                'damage': 20 * dmgMult,
                'x': px + math.cos(angle) * 450,
                'y': py + math.sin(angle) * 450,
                'xp': 20
            })

        if minutes >= 10.0 and not bossSpawned:
            bossSpawned = True
            angle = random.random() * math.pi * 2
            enemies.append({
                'name': 'Boss',
                'hp': cfg['bossHp'] * hpMult,
                'maxHp': cfg['bossHp'] * hpMult,
                'speed': 125 * spdMult,
                'damage': 25 * dmgMult,
                'x': px + math.cos(angle) * 550,
                'y': py + math.sin(angle) * 550,
                'xp': 50
            })

        targetPop = cfg['earlyMobCount'] if minutes < 1.0 else (55 if minutes < 2.5 else (80 if minutes < 4.0 else (105 if minutes < 6.0 else 135)))
        spawnTimer += dt * 1000
        if spawnTimer >= 250 and len(enemies) < targetPop:
            spawnTimer = 0
            angle = random.random() * math.pi * 2
            dist = 360 + random.random() * 70
            # Mob type
            if minutes < 0.6:
                is_bat = random.random() < 0.55
                m_hp, m_spd, m_dmg, m_xp = (10, 180, 6, 1) if is_bat else (24, 135, 8, 2)
            elif minutes < 2.5:
                r = random.random()
                if r < 0.35: m_hp, m_spd, m_dmg, m_xp = (10, 180, 6, 1)
                elif r < 0.70: m_hp, m_spd, m_dmg, m_xp = (24, 135, 8, 2)
                else: m_hp, m_spd, m_dmg, m_xp = (12, 215, 7, 2)
            else:
                r = random.random()
                if r < 0.25: m_hp, m_spd, m_dmg, m_xp = (10, 180, 6, 1)
                elif r < 0.50: m_hp, m_spd, m_dmg, m_xp = (24, 135, 8, 2)
                elif r < 0.75: m_hp, m_spd, m_dmg, m_xp = (12, 215, 7, 2)
                else: m_hp, m_spd, m_dmg, m_xp = (85, 85, 16, 4)

            enemies.append({
                'name': 'Mob',
                'hp': m_hp * hpMult,
                'maxHp': m_hp * hpMult,
                'speed': m_spd * spdMult,
                'damage': m_dmg * dmgMult,
                'x': px + math.cos(angle) * dist,
                'y': py + math.sin(angle) * dist,
                'xp': m_xp
            })

        # Kiting
        kdx, kdy = 0.0, 0.0
        touching = 0
        for e in enemies:
            d = math.hypot(px - e['x'], py - e['y'])
            if 0 < d < 220:
                kdx += (px - e['x']) / d
                kdy += (py - e['y']) / d
            if d < 35:
                touching += 1
        klen = math.hypot(kdx, kdy)
        pspd = (210 if not mods.wriggleDash else 260)
        if touching > 0:
            pspd *= max(0.50, 1.0 - touching * 0.10)
        if klen > 0:
            px += (kdx / klen) * pspd * dt
            py += (kdy / klen) * pspd * dt

            # Static Zap
            if mods.lightningZapLevel > 0:
                staticZapCurrent += dt * 1000 * (cfg['zapChargeRate'] + (mods.lightningZapLevel - 1) * 0.01)
                if staticZapCurrent >= mods.staticZapMax:
                    staticZapCurrent = 0
                    for zt in enemies[:3 + mods.lightningZapLevel]:
                        zt['hp'] -= cfg['zapDmg'] * (1 + mods.damagePercentBonus) * (1 + mods.lightningZapLevel * 0.2)

            # Acid Trail
            if mods.acidTrail:
                for e in enemies:
                    if math.hypot(px - e['x'], py - e['y']) < 45:
                        e['hp'] -= (mods.acidTrailDps or 12) * dt

        # Enemy Pursuit
        for e in enemies:
            d = math.hypot(px - e['x'], py - e['y'])
            if d > 10:
                effSpd = e['speed']
                if mods.slowPercent > 0 and d < 120: effSpd *= (1 - mods.slowPercent)
                e['x'] += ((px - e['x']) / d) * effSpd * dt
                e['y'] += ((py - e['y']) / d) * effSpd * dt

            if d <= 22 and iframeTimer <= 0:
                iframeTimer = cfg['iframeDuration']
                netDmg = max(1, e['damage'] - mods.armorShred)
                playerHp -= netDmg
                if playerHp <= 0 and mods.cheatDeathUnlocked and not mods.cheatDeathUsed:
                    mods.cheatDeathUsed = True
                    playerHp = maxHp * 0.5

        # Attack 1: Homing Daggers
        baseSpeed = 1.35 * (1 + mods.attackSpeedBonus)
        attackTimer += dt
        if attackTimer >= (1.0 / baseSpeed) and len(enemies) > 0:
            attackTimer = 0
            enemies.sort(key=lambda e: math.hypot(px - e['x'], py - e['y']))
            baseDmg = cfg['baseDmg'] * (1 + mods.damagePercentBonus)
            if mods.critChance > 0 and random.random() < mods.critChance:
                baseDmg *= mods.critMultiplier

            totalDaggers = mods.homingDaggersCount * mods.burstFireCount
            pierce = 1 + mods.pierceCount
            for i in range(totalDaggers):
                idx = i % min(len(enemies), 6)
                t = enemies[idx]
                dmg = baseDmg * pierce
                t['hp'] -= dmg
                if mods.splashPercent > 0:
                    for s in range(min(4, len(enemies))):
                        if s != idx:
                            enemies[s]['hp'] -= dmg * mods.splashPercent

        # Attack 2: Bouncing Bones
        if mods.bouncingBonesLevel > 0:
            boneTimer += dt
            if boneTimer >= (1.3 / (1 + mods.attackSpeedBonus * 0.7)) and len(enemies) > 0:
                boneTimer = 0
                count = mods.bouncingBonesCount
                bounces = 2 + mods.bounceCount
                bDmg = cfg['boneDmg'] * (1 + mods.damagePercentBonus)
                for c in range(count):
                    for b in range(bounces):
                        target = enemies[(c * bounces + b) % len(enemies)]
                        target['hp'] -= bDmg

        # Resolve Kills
        alive = []
        for e in enemies:
            if e['hp'] <= 0:
                kills += 1
                currentXp += e['xp']
                if mods.healOnKill > 0:
                    playerHp = min(maxHp, playerHp + mods.healOnKill * 0.4)
            else:
                alive.append(e)
        enemies = alive

        # Level up
        while currentXp >= nextLevelXp:
            currentXp -= nextLevelXp
            playerLevel += 1
            nextLevelXp = math.floor(cfg['baseXp'] + (playerLevel ** 1.7) * cfg['xpExp'])

            # Pick upgrade
            if strategy == 'tony_homing_spam':
                opts = ['wpn_homing_daggers', 'tome_quantity', 'tome_speed', 'tome_crit_size']
            elif strategy == 'tesla_zap':
                opts = ['wpn_lightning_zap', 'wpn_acid_trail', 'tome_speed', 'tome_magnet']
            elif strategy == 'tank_bones':
                opts = ['wpn_bouncing_bones', 'tome_vitality', 'tome_quantity', 'tome_crit_size']
            else:
                opts = ['wpn_homing_daggers', 'wpn_bouncing_bones', 'wpn_lightning_zap', 'wpn_acid_trail',
                        'tome_quantity', 'tome_speed', 'tome_magnet', 'tome_crit_size', 'tome_vitality']

            valid = [o for o in opts if activeSlots.get(o, 0) < 5 and (len(activeSlots) < 4 or o in activeSlots)]
            if valid:
                chosen = valid[0] if strategy != 'random' else random.choice(valid)
                lvl = activeSlots.get(chosen, 0) + 1
                activeSlots[chosen] = lvl

                # Apply mod
                if chosen == 'wpn_homing_daggers':
                    mods.homingDaggersLevel = lvl
                    mods.homingDaggersCount = 2 + (lvl - 1)
                    if lvl >= 3: mods.pierceCount += 1
                    if lvl >= 4: mods.splashPercent += 0.25
                elif chosen == 'wpn_bouncing_bones':
                    mods.bouncingBonesLevel = lvl
                    mods.bouncingBonesCount = 1 + (lvl // 2)
                    mods.bounceCount += 1
                elif chosen == 'wpn_lightning_zap':
                    mods.lightningZapLevel = lvl
                elif chosen == 'wpn_acid_trail':
                    mods.acidTrail = True
                    mods.acidTrailLevel = lvl
                    mods.acidTrailDps = 12 + lvl * 8
                elif chosen == 'tome_quantity':
                    mods.tomeQuantity = lvl
                    mods.homingDaggersCount += 1
                    mods.bouncingBonesCount += 1
                elif chosen == 'tome_speed':
                    mods.tomeSpeed = lvl
                    mods.attackSpeedBonus += 0.15
                elif chosen == 'tome_crit_size':
                    mods.tomeCritSize = lvl
                    mods.critChance += 0.12
                    mods.critMultiplier = 2.0 + lvl * 0.2
                elif chosen == 'tome_vitality':
                    mods.hpRegenPerSec += 0.8
                    mods.healOnKill += 0.5
                    if lvl >= 3:
                        maxHp += 30
                        playerHp += 30
                    if lvl >= 5: mods.cheatDeathUnlocked = True
            else:
                playerHp = min(maxHp, playerHp + 25)

    return {
        'survived': time,
        'level': playerLevel,
        'kills': kills,
    }

def evaluate(cfg, runs=250):
    strats = ['random', 'tony_homing_spam', 'tesla_zap', 'tank_bones']
    res = {}
    for s in strats:
        out = [run_single(s, cfg) for _ in range(runs)]
        wins = sum(1 for r in out if r['survived'] >= 600) / runs * 100
        early_d = sum(1 for r in out if r['survived'] < 180) / runs * 100
        avg_lvl = sum(r['level'] for r in out) / runs
        res[s] = {'win': wins, 'early_death': early_d, 'lvl': avg_lvl}
    return res

# Grid search / Genetic calibration
best_score = float('inf')
best_cfg = None
best_res = None

for trial in range(60):
    cfg = {
        'startHp': random.choice([60, 65, 70, 75]),
        'baseDmg': random.choice([9, 10, 11, 12, 13]),
        'boneDmg': random.choice([20, 22, 25, 28]),
        'zapDmg': random.choice([14, 16, 18, 20]),
        'zapChargeRate': random.choice([0.015, 0.02, 0.025]),
        'iframeDuration': random.choice([0.22, 0.25, 0.28, 0.30]),
        'miniBossHp': random.choice([800, 900, 1000, 1100]),
        'bossHp': random.choice([3200, 3600, 4000, 4500]),
        'mobHpRate': random.choice([0.38, 0.42, 0.46, 0.50]),
        'mobHpQuad': random.choice([0.02, 0.03, 0.04]),
        'mobDmgRate': random.choice([0.15, 0.18, 0.22]),
        'earlyMobCount': random.choice([38, 42, 45, 48]),
        'baseXp': random.choice([15, 18, 20]),
        'xpExp': random.choice([6.0, 7.0, 8.0]),
    }
    r = evaluate(cfg, runs=200)
    
    # Check criteria penalty
    penalty = 0
    for s, v in r.items():
        # Target winrate 35-55%
        if v['win'] < 35: penalty += (35 - v['win']) * 3
        elif v['win'] > 55: penalty += (v['win'] - 55) * 3
        # Target early death 5-10%
        if v['early_death'] < 5: penalty += (5 - v['early_death']) * 4
        elif v['early_death'] > 10: penalty += (v['early_death'] - 10) * 4

    levels = [v['lvl'] for v in r.values()]
    lvl_gap = max(levels) - min(levels)
    if lvl_gap > 2.0:
        penalty += (lvl_gap - 2.0) * 15

    if penalty < best_score:
        best_score = penalty
        best_cfg = cfg
        best_res = r
        print(f"Trial {trial}: Penalty={penalty:.1f}, Res={r}")
        if penalty == 0:
            break

print("\n--- BEST CONFIG ---")
print(best_cfg)
print(best_res)
