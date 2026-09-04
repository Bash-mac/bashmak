import type Phaser from 'phaser';
import type { IInputSource, InputAction, InputVector } from './IInputSource';
import { KeyboardInputSource } from './KeyboardInputSource';
import { VirtualJoystickInputSource } from './VirtualJoystickInputSource';
import { BotInputSource } from './BotInputSource';

export class InputManager {
  private keyboardSource: KeyboardInputSource;
  private touchSource: VirtualJoystickInputSource;
  private botSource: BotInputSource;
  private sources: IInputSource[] = [];

  constructor(scene: Phaser.Scene) {
    this.keyboardSource = new KeyboardInputSource(scene);
    this.touchSource = new VirtualJoystickInputSource(scene);
    this.botSource = new BotInputSource();
    this.sources = [this.keyboardSource, this.touchSource, this.botSource];
  }

  init(): void {
    for (const source of this.sources) {
      source.init();
    }
  }

  getBotSource(): BotInputSource {
    return this.botSource;
  }

  private isMovementAllowed = true;

  getMovementVector(): InputVector {
    if (!this.isMovementAllowed) {
      return { x: 0, y: 0 };
    }

    // 1. Check keyboard first: manual input overrides bot
    const kbVector = this.keyboardSource.getVector();
    if (kbVector.x !== 0 || kbVector.y !== 0) {
      return kbVector;
    }

    // 2. Check touch joystick: manual touch overrides bot
    const touchVector = this.touchSource.getVector();
    if (touchVector.x !== 0 || touchVector.y !== 0) {
      return touchVector;
    }

    // 3. If human is idle and bot is enabled, bot steers the hero
    if (this.botSource.isEnabled) {
      return this.botSource.getVector();
    }

    return { x: 0, y: 0 };
  }

  isActionActive(action: InputAction): boolean {
    if (!this.isMovementAllowed) return false;
    return this.sources.some((s) => s.isActionPressed(action));
  }

  setEnabled(enabled: boolean): void {
    this.isMovementAllowed = enabled;
    this.touchSource.setEnabled(enabled);
  }

  destroy(): void {
    for (const source of this.sources) {
      source.destroy();
    }
  }
}
