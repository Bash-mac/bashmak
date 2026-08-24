import Phaser from 'phaser';
import { ObjectPool } from '../pools/ObjectPool';

export class DamageNumberPool {
  private pool: ObjectPool<Phaser.GameObjects.Text>;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.pool = new ObjectPool<Phaser.GameObjects.Text>(scene, {
      create: () => {
        return scene.add
          .text(0, 0, '', {
            fontSize: '14px',
            fontStyle: 'bold',
            fontFamily: 'monospace',
            stroke: '#000000',
            strokeThickness: 3,
          })
          .setOrigin(0.5)
          .setDepth(200);
      },
      onRelease: (textObj) => {
        textObj.setAlpha(1);
        textObj.setScale(1);
      },
      maxSize: 100,
    });

    this.pool.prewarm(30);
  }

  public showDamage(x: number, y: number, amount: number, isCrit = false): void {
    const textObj = this.pool.get();
    const formattedText = isCrit ? `CRIT! ${Math.round(amount)}` : `${Math.round(amount)}`;
    
    textObj.setText(formattedText);
    textObj.setPosition(x + Phaser.Math.Between(-8, 8), y + Phaser.Math.Between(-6, 6));
    textObj.setColor(isCrit ? '#facc15' : '#ffffff');
    textObj.setFontSize(isCrit ? '18px' : '13px');
    textObj.setAlpha(1);
    textObj.setScale(isCrit ? 1.3 : 1.0);

    const targetY = y - (isCrit ? 36 : 24);

    this.scene.tweens.add({
      targets: textObj,
      y: targetY,
      alpha: 0,
      scaleX: isCrit ? 1.0 : 0.8,
      scaleY: isCrit ? 1.0 : 0.8,
      duration: isCrit ? 600 : 450,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.pool.release(textObj);
      },
    });
  }

  public showText(x: number, y: number, text: string, color = '#4ade80'): void {
    const textObj = this.pool.get();
    textObj.setText(text);
    textObj.setPosition(x, y);
    textObj.setColor(color);
    textObj.setFontSize('13px');
    textObj.setAlpha(1);
    textObj.setScale(1.0);

    this.scene.tweens.add({
      targets: textObj,
      y: y - 28,
      alpha: 0,
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.pool.release(textObj);
      },
    });
  }

  public clear(): void {
    this.pool.clear();
  }
}
