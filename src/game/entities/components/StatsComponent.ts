export interface StatsData {
  maxHp: number;
  speed: number;
  damage: number;
  armor?: number;
  attackSpeed?: number;
}

export class StatsComponent {
  public maxHp: number;
  public speed: number;
  public damage: number;
  public armor: number;
  public attackSpeed: number;

  constructor(stats: StatsData) {
    this.maxHp = stats.maxHp;
    this.speed = stats.speed;
    this.damage = stats.damage;
    this.armor = stats.armor ?? 0;
    this.attackSpeed = stats.attackSpeed ?? 1.0;
  }

  modifyMaxHp(amount: number): void {
    this.maxHp = Math.max(1, this.maxHp + amount);
  }

  modifySpeed(multiplier: number): void {
    this.speed *= multiplier;
  }
}
