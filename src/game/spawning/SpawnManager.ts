import type { EnemyDefinition } from '../data/definitions';
import { DUMMY_ENEMY } from '../data/enemies';

export interface SpawnPoint {
  x: number;
  y: number;
}

export class SpawnManager {
  private getPlayerPosition: () => { x: number; y: number };
  private spawnCallback: (definition: EnemyDefinition, x: number, y: number) => void;

  private spawnTimer = 0;
  private spawnIntervalMs = 2500; // 2.5 seconds
  private maxActiveEnemies = 15;
  private currentActiveCount = 0;

  constructor(
    getPlayerPosition: () => { x: number; y: number },
    spawnCallback: (definition: EnemyDefinition, x: number, y: number) => void
  ) {
    this.getPlayerPosition = getPlayerPosition;
    this.spawnCallback = spawnCallback;
  }

  update(deltaMs: number): void {
    if (this.currentActiveCount >= this.maxActiveEnemies) return;

    this.spawnTimer += deltaMs;
    if (this.spawnTimer >= this.spawnIntervalMs) {
      this.spawnTimer = 0;
      this.spawnNextEnemy();
    }
  }

  setEnemyCount(count: number): void {
    this.currentActiveCount = count;
  }

  private spawnNextEnemy(): void {
    const playerPos = this.getPlayerPosition();
    // Spawn in a circle around the player
    const angle = Math.random() * Math.PI * 2;
    const distance = 400 + Math.random() * 100;

    const x = playerPos.x + Math.cos(angle) * distance;
    const y = playerPos.y + Math.sin(angle) * distance;

    this.spawnCallback(DUMMY_ENEMY, x, y);
  }

  reset(): void {
    this.spawnTimer = 0;
    this.currentActiveCount = 0;
  }
}
