import { Entity } from '../entities/Entity';
import { EventBus } from '../core/EventBus';
import { GameState } from '../core/GameState';

export class CombatSystem {
  private eventBus = EventBus.getInstance();
  private gameState = GameState.getInstance();

  /**
   * Calculates and applies damage between two entities.
   */
  applyDamage(attacker: Entity, target: Entity, customDamage?: number): number {
    if (!target.isAlive) return 0;

    const baseDamage = customDamage ?? attacker.stats.damage;
    const targetArmor = target.stats.armor || 0;
    const effectiveDamage = Math.max(1, baseDamage - targetArmor);

    target.health.takeDamage(effectiveDamage);

    if (target.type === 'hero') {
      this.eventBus.emit('player:damaged', {
        currentHp: target.health.currentHp,
        maxHp: target.health.maxHp,
        damage: effectiveDamage,
      });

      if (!target.isAlive) {
        this.eventBus.emit('player:died');
        this.gameState.endRun(false);
      }
    } else if (target.type === 'enemy') {
      this.eventBus.emit('enemy:damaged', {
        id: target.id,
        currentHp: target.health.currentHp,
        damage: effectiveDamage,
      });

      if (!target.isAlive) {
        this.gameState.recordKill();
        this.eventBus.emit('enemy:died', {
          id: target.id,
          xpValue: 5,
          x: target.x,
          y: target.y,
        });
      }
    }

    return effectiveDamage;
  }
}
