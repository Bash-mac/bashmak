export class HealthComponent {
  public currentHp: number;
  public maxHp: number;

  constructor(maxHp: number) {
    this.maxHp = maxHp;
    this.currentHp = maxHp;
  }

  get isAlive(): boolean {
    return this.currentHp > 0;
  }

  get percent(): number {
    return Math.max(0, Math.min(1, this.currentHp / this.maxHp));
  }

  takeDamage(amount: number): number {
    if (!this.isAlive) return 0;
    const actualDamage = Math.max(0, amount);
    this.currentHp = Math.max(0, this.currentHp - actualDamage);
    return actualDamage;
  }

  heal(amount: number): number {
    if (!this.isAlive) return 0;
    const previous = this.currentHp;
    this.currentHp = Math.min(this.maxHp, this.currentHp + amount);
    return this.currentHp - previous;
  }

  reset(maxHp?: number): void {
    if (maxHp !== undefined) {
      this.maxHp = maxHp;
    }
    this.currentHp = this.maxHp;
  }
}
