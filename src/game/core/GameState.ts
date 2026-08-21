import { EventBus } from './EventBus';

export class GameState {
  private static instance: GameState;

  // Run statistics
  public runTime = 0; // In seconds
  public kills = 0;
  public score = 0;
  public isGameOver = false;

  // Progression
  public level = 1;
  public currentXp = 0;
  public nextLevelXp = 10;

  // Selected upgrades in current run
  public selectedUpgrades: string[] = [];

  private constructor() {}

  static getInstance(): GameState {
    if (!GameState.instance) {
      GameState.instance = new GameState();
    }
    return GameState.instance;
  }

  reset(): void {
    this.runTime = 0;
    this.kills = 0;
    this.score = 0;
    this.isGameOver = false;
    this.level = 1;
    this.currentXp = 0;
    this.nextLevelXp = 10;
    this.selectedUpgrades = [];
  }

  updateTime(deltaSeconds: number): void {
    if (this.isGameOver) return;
    this.runTime += deltaSeconds;
  }

  addXp(amount: number): void {
    if (this.isGameOver) return;
    this.currentXp += amount;
    const bus = EventBus.getInstance();

    while (this.currentXp >= this.nextLevelXp) {
      this.currentXp -= this.nextLevelXp;
      this.level += 1;
      this.nextLevelXp = Math.floor(this.nextLevelXp * 1.5);
      bus.emit('player:levelUp', { newLevel: this.level });
    }

    bus.emit('xp:gained', {
      amount,
      totalXp: this.currentXp,
      level: this.level,
      nextLevelXp: this.nextLevelXp,
    });
  }

  recordKill(): void {
    this.kills += 1;
    this.score += 100;
  }

  endRun(won = false): void {
    if (this.isGameOver) return;
    this.isGameOver = true;
    EventBus.getInstance().emit('run:ended', {
      won,
      timeSurvived: Math.floor(this.runTime),
      kills: this.kills,
      level: this.level,
    });
  }
}
