import Phaser from 'phaser';
import type { IInputSource, InputAction, InputVector } from './IInputSource';

export class KeyboardInputSource implements IInputSource {
  public isEnabled = true;
  private scene: Phaser.Scene;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW?: Phaser.Input.Keyboard.Key;
  private keyA?: Phaser.Input.Keyboard.Key;
  private keyS?: Phaser.Input.Keyboard.Key;
  private keyD?: Phaser.Input.Keyboard.Key;
  private keySpace?: Phaser.Input.Keyboard.Key;
  private keyShift?: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  init(): void {
    if (!this.scene.input.keyboard) return;

    this.cursors = this.scene.input.keyboard.createCursorKeys();
    this.keyW = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keySpace = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyShift = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
  }

  getVector(): InputVector {
    if (!this.isEnabled) return { x: 0, y: 0 };

    let x = 0;
    let y = 0;

    const left = this.cursors?.left.isDown || this.keyA?.isDown;
    const right = this.cursors?.right.isDown || this.keyD?.isDown;
    const up = this.cursors?.up.isDown || this.keyW?.isDown;
    const down = this.cursors?.down.isDown || this.keyS?.isDown;

    if (left) x -= 1;
    if (right) x += 1;
    if (up) y -= 1;
    if (down) y += 1;

    // Normalize if moving diagonally
    if (x !== 0 && y !== 0) {
      const length = Math.sqrt(x * x + y * y);
      x /= length;
      y /= length;
    }

    return { x, y };
  }

  isActionPressed(action: InputAction): boolean {
    if (!this.isEnabled) return false;

    switch (action) {
      case 'attack':
        return Boolean(this.keySpace?.isDown);
      case 'dash':
        return Boolean(this.keyShift?.isDown);
      default:
        return false;
    }
  }

  destroy(): void {
    // Keyboard clean up is handled by Phaser scene
  }
}
