import Phaser from 'phaser';

export interface PoolConfig<T> {
  create: () => T;
  onGet?: (item: T) => void;
  onRelease?: (item: T) => void;
  maxSize?: number;
}

export class ObjectPool<T extends Phaser.GameObjects.GameObject> {
  private freeList: T[] = [];
  private activeSet: Set<T> = new Set();
  private scene?: Phaser.Scene;
  private config: PoolConfig<T>;

  constructor(scene: Phaser.Scene, config: PoolConfig<T>) {
    this.scene = scene;
    this.config = config;
  }

  public prewarm(count: number): void {
    for (let i = 0; i < count; i++) {
      const item = this.config.create();
      this.deactivateItem(item);
      this.freeList.push(item);
    }
  }

  public get(): T {
    let item: T;
    if (this.freeList.length > 0) {
      item = this.freeList.pop()!;
    } else {
      item = this.config.create();
    }

    this.activeSet.add(item);
    item.setActive(true);
    if ('setVisible' in item && typeof (item as { setVisible?: (v: boolean) => unknown }).setVisible === 'function') {
      (item as { setVisible: (v: boolean) => unknown }).setVisible(true);
    }

    const body = (item as unknown as { body?: Phaser.Physics.Arcade.Body }).body;
    if (body) {
      body.enable = true;
    }

    this.config.onGet?.(item);
    return item;
  }

  public release(item: T): boolean {
    if (!item) return false;

    if (!this.activeSet.has(item)) {
      return false;
    }

    this.activeSet.delete(item);
    this.deactivateItem(item);
    try {
      this.config.onRelease?.(item);
    } catch {
      // Safe fallback if item was destroyed during scene shutdown
    }

    const maxSize = this.config.maxSize ?? 500;
    if (this.freeList.length < maxSize) {
      this.freeList.push(item);
    } else {
      item.destroy();
    }
    return true;
  }

  public releaseAll(): void {
    const active = Array.from(this.activeSet);
    for (const item of active) {
      this.release(item);
    }
  }

  private deactivateItem(item: T): void {
    if (this.scene && this.scene.tweens) {
      this.scene.tweens.killTweensOf(item);
    }

    item.setActive(false);
    if ('setVisible' in item && typeof (item as { setVisible?: (v: boolean) => unknown }).setVisible === 'function') {
      (item as { setVisible: (v: boolean) => unknown }).setVisible(false);
    }

    const body = (item as unknown as { body?: Phaser.Physics.Arcade.Body }).body;
    if (body) {
      body.enable = false;
      body.stop();
    }
  }

  public get activeCount(): number {
    return this.activeSet.size;
  }

  public get freeCount(): number {
    return this.freeList.length;
  }

  public clear(): void {
    this.releaseAll();
    for (const item of this.freeList) {
      try {
        item.destroy();
      } catch {
        // Ignore if already destroyed
      }
    }
    this.freeList = [];
    this.activeSet.clear();
  }
}
