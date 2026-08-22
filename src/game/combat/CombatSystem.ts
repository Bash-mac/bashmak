import type { Entity } from '../entities/Entity';
import { EventBus } from '../core/EventBus';
import { GameState } from '../core/GameState';

export class CombatSystem {
  private eventBus = EventBus.getInstance();
  private gameState = GameState.getInstance();

  /**
   * Calculates and applies damage between attacker and target.
   */
  applyDamage(attacker: Entity, target: Entity, customDamage?: number): number {
    if (!target.isAlive) return 0;

    const baseDamage = customDamage ?? attacker.stats.damage;
    const targetArmor = target.stats.armor || 0;
    const effectiveDamage = Math.max(1, Math.round(baseDamage - targetArmor));

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

      // Check on-hit status effects for Hero attacks
      if (attacker.type === 'hero') {
        const mods = this.gameState.playerModifiers;
        if (mods.slowPercent > 0) {
          target.applySlow(mods.slowPercent, mods.slowDurationMs || 2000);
        }
        if (mods.poisonSalivaDmg > 0) {
          target.applyPoison(mods.poisonSalivaDmg, mods.poisonDurationMs || 3000);
        }
      }

      if (!target.isAlive) {
        this.gameState.recordKill();

        // Heal on kill upgrade
        const mods = this.gameState.playerModifiers;
        if (mods.healOnKill > 0 && attacker.type === 'hero') {
          attacker.health.heal(mods.healOnKill);
          this.eventBus.emit('player:healed', {
            currentHp: attacker.health.currentHp,
            maxHp: attacker.health.maxHp,
            amount: mods.healOnKill,
          });
        }

        this.eventBus.emit('enemy:died', {
          id: target.id,
          xpValue: target.definition?.xpReward ?? 5,
          x: target.x,
          y: target.y,
        });
      }
    }

    return effectiveDamage;
  }
}
