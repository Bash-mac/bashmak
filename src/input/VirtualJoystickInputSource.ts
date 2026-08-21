import Phaser from 'phaser';
import type { IInputSource, InputAction, InputVector } from './IInputSource';

export class VirtualJoystickInputSource implements IInputSource {
  public isEnabled = true;
  private scene: Phaser.Scene;
  private vector: InputVector = { x: 0, y: 0 };
  private isPointerDown = false;
  private startPosition = { x: 0, y: 0 };
  private currentPointerId: number | null = null;

  private baseCircle?: Phaser.GameObjects.Graphics;
  private thumbCircle?: Phaser.GameObjects.Graphics;

  private readonly maxRadius = 50;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  init(): void {
    // Check touch support or device capability
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice && !this.scene.sys.game.device.input.touch) {
      // Keep enabled but dormant unless touched
    }

    this.baseCircle = this.scene.add.graphics().setScrollFactor(0).setDepth(9998).setVisible(false);
    this.thumbCircle = this.scene.add.graphics().setScrollFactor(0).setDepth(9999).setVisible(false);

    this.drawJoystickGraphics();

    this.scene.input.on('pointerdown', this.onPointerDown, this);
    this.scene.input.on('pointermove', this.onPointerMove, this);
    this.scene.input.on('pointerup', this.onPointerUp, this);
    this.scene.input.on('pointerupoutside', this.onPointerUp, this);
  }

  private drawJoystickGraphics(): void {
    if (!this.baseCircle || !this.thumbCircle) return;

    this.baseCircle.clear();
    this.baseCircle.fillStyle(0xffffff, 0.15);
    this.baseCircle.lineStyle(2, 0xffffff, 0.4);
    this.baseCircle.fillCircle(0, 0, this.maxRadius);
    this.baseCircle.strokeCircle(0, 0, this.maxRadius);

    this.thumbCircle.clear();
    this.thumbCircle.fillStyle(0x00ffff, 0.6);
    this.thumbCircle.fillCircle(0, 0, 20);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.isEnabled) return;
    // If we're not currently tracking a pointer, track this one
    if (this.currentPointerId === null) {
      this.currentPointerId = pointer.id;
      this.isPointerDown = true;
      this.startPosition = { x: pointer.x, y: pointer.y };

      this.baseCircle?.setPosition(pointer.x, pointer.y).setVisible(true);
      this.thumbCircle?.setPosition(pointer.x, pointer.y).setVisible(true);
      this.vector = { x: 0, y: 0 };
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isEnabled || !this.isPointerDown || pointer.id !== this.currentPointerId) return;

    const dx = pointer.x - this.startPosition.x;
    const dy = pointer.y - this.startPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
      this.vector = { x: 0, y: 0 };
      this.thumbCircle?.setPosition(this.startPosition.x, this.startPosition.y);
      return;
    }

    const angle = Math.atan2(dy, dx);
    const clampedDistance = Math.min(distance, this.maxRadius);

    const thumbX = this.startPosition.x + Math.cos(angle) * clampedDistance;
    const thumbY = this.startPosition.y + Math.sin(angle) * clampedDistance;
    this.thumbCircle?.setPosition(thumbX, thumbY);

    // Normalized vector output
    const intensity = clampedDistance / this.maxRadius;
    this.vector = {
      x: Math.cos(angle) * intensity,
      y: Math.sin(angle) * intensity,
    };
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.currentPointerId) {
      this.currentPointerId = null;
      this.isPointerDown = false;
      this.vector = { x: 0, y: 0 };
      this.baseCircle?.setVisible(false);
      this.thumbCircle?.setVisible(false);
    }
  }

  getVector(): InputVector {
    return this.isEnabled ? this.vector : { x: 0, y: 0 };
  }

  isActionPressed(_action: InputAction): boolean {
    return false;
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.onPointerDown, this);
    this.scene.input.off('pointermove', this.onPointerMove, this);
    this.scene.input.off('pointerup', this.onPointerUp, this);
    this.scene.input.off('pointerupoutside', this.onPointerUp, this);

    this.baseCircle?.destroy();
    this.thumbCircle?.destroy();
  }
}
