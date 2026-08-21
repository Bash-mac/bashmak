import type Phaser from 'phaser';
import type { IInputSource, InputAction, InputVector } from './IInputSource';
import { KeyboardInputSource } from './KeyboardInputSource';
import { VirtualJoystickInputSource } from './VirtualJoystickInputSource';

export class InputManager {
  private keyboardSource: KeyboardInputSource;
  private touchSource: VirtualJoystickInputSource;
  private sources: IInputSource[] = [];

  constructor(scene: Phaser.Scene) {
    this.keyboardSource = new KeyboardInputSource(scene);
    this.touchSource = new VirtualJoystickInputSource(scene);
    this.sources = [this.keyboardSource, this.touchSource];
  }

  init(): void {
    for (const source of this.sources) {
      source.init();
    }
  }

  getMovementVector(): InputVector {
    // Check keyboard first; if neutral, check touch joystick
    const kbVector = this.keyboardSource.getVector();
    if (kbVector.x !== 0 || kbVector.y !== 0) {
      return kbVector;
    }

    return this.touchSource.getVector();
  }

  isActionActive(action: InputAction): boolean {
    return this.sources.some((s) => s.isActionPressed(action));
  }

  destroy(): void {
    for (const source of this.sources) {
      source.destroy();
    }
  }
}
