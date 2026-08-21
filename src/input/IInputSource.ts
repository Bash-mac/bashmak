export interface InputVector {
  x: number;
  y: number;
}

export type InputAction = 'attack' | 'dash' | 'special';

export interface IInputSource {
  readonly isEnabled: boolean;
  init(): void;
  getVector(): InputVector;
  isActionPressed(action: InputAction): boolean;
  destroy(): void;
}
