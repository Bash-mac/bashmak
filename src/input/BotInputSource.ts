import type { IInputSource, InputAction, InputVector } from './IInputSource';

export class BotInputSource implements IInputSource {
  public isEnabled = false;
  private vector: InputVector = { x: 0, y: 0 };
  private actions: Set<InputAction> = new Set();

  init(): void {
    this.vector.x = 0;
    this.vector.y = 0;
    this.actions.clear();
  }

  setVector(x: number, y: number): void {
    this.vector.x = x;
    this.vector.y = y;
  }

  setAction(action: InputAction, pressed: boolean): void {
    if (pressed) {
      this.actions.add(action);
    } else {
      this.actions.delete(action);
    }
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.vector.x = 0;
      this.vector.y = 0;
      this.actions.clear();
    }
  }

  getVector(): InputVector {
    if (!this.isEnabled) {
      return { x: 0, y: 0 };
    }
    return this.vector;
  }

  isActionPressed(action: InputAction): boolean {
    if (!this.isEnabled) {
      return false;
    }
    return this.actions.has(action);
  }

  destroy(): void {
    this.isEnabled = false;
    this.vector.x = 0;
    this.vector.y = 0;
    this.actions.clear();
  }
}
