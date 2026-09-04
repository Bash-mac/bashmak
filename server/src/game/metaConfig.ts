export interface ServerMetaPowerUp {
  id: string;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
}

export const SERVER_META_POWERUPS: Record<string, ServerMetaPowerUp> = {
  power_hp: { id: 'power_hp', maxLevel: 5, baseCost: 100, costMultiplier: 1.5 },
  power_speed: { id: 'power_speed', maxLevel: 5, baseCost: 120, costMultiplier: 1.6 },
  power_damage: { id: 'power_damage', maxLevel: 5, baseCost: 150, costMultiplier: 1.7 },
  power_magnet: { id: 'power_magnet', maxLevel: 5, baseCost: 80, costMultiplier: 1.4 },
  power_greed: { id: 'power_greed', maxLevel: 5, baseCost: 100, costMultiplier: 1.5 },
  power_regen: { id: 'power_regen', maxLevel: 3, baseCost: 250, costMultiplier: 2.0 },
  power_revive: { id: 'power_revive', maxLevel: 1, baseCost: 600, costMultiplier: 1.0 },
  power_weapon_slots: { id: 'power_weapon_slots', maxLevel: 3, baseCost: 350, costMultiplier: 2.0 },
  power_tome_slots: { id: 'power_tome_slots', maxLevel: 3, baseCost: 350, costMultiplier: 2.0 },
};

export function getPowerUpCost(def: ServerMetaPowerUp, currentLevel: number): number {
  if (def.costMultiplier === 1.0) {
    return def.baseCost;
  }
  return Math.round(def.baseCost * Math.pow(def.costMultiplier, currentLevel));
}

export function getTotalSpentGooOnPowerUps(powerUps: Record<string, number>): number {
  let total = 0;
  for (const [id, lvl] of Object.entries(powerUps)) {
    const def = SERVER_META_POWERUPS[id];
    if (!def) continue;
    for (let i = 0; i < lvl; i++) {
      total += getPowerUpCost(def, i);
    }
  }
  return total;
}

export const VALID_HERO_IDS = ['hero_vypolzok', 'hero_markovka'];
export const DEFAULT_UNLOCKED_HEROES = ['hero_vypolzok', 'hero_markovka'];
export const DEFAULT_SELECTED_HERO = 'hero_vypolzok';
