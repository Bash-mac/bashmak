import {
  type RunSnapshot,
  type VerdictVariant,
  VERDICT_RULES,
  FALLBACK_VERDICT_VARIANTS,
} from '../data/verdicts';
import { GameState } from './GameState';
import { SaveManager } from './SaveManager';

export class RunVerdictSystem {
  /**
   * Подбирает итоговые формулировки забега на основе снапшота билда и результатов.
   * Правила имеют простой приоритет: выбирается первое совпавшее правило с наивысшим priority.
   */
  public static evaluate(snapshot: RunSnapshot): VerdictVariant {
    // Сортировка по убыванию приоритета
    const sortedRules = [...VERDICT_RULES].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (rule.match(snapshot)) {
        return this.pickRandomVariant(rule.variants);
      }
    }

    return this.pickRandomVariant(FALLBACK_VERDICT_VARIANTS);
  }

  /**
   * Формирует снапшот текущего забега из глобальных менеджеров состояния.
   */
  public static createSnapshot(won = false): RunSnapshot {
    const state = GameState.getInstance();
    const saveManager = SaveManager.getInstance();
    const isRecord = won || saveManager.lastRunWasRecord;

    const upgradesSet = new Set<string>();
    for (const id of state.activeUpgrades.keys()) {
      upgradesSet.add(id);
    }

    return {
      heroId: state.currentHeroId || 'hero_vypolzok',
      runTime: state.runTime,
      kills: state.kills,
      gooCollected: state.gooCollected,
      score: state.score,
      level: state.level,
      isRecord,
      won,
      upgrades: upgradesSet,
    };
  }

  private static pickRandomVariant(variants: VerdictVariant[]): VerdictVariant {
    if (!variants || variants.length === 0) {
      return FALLBACK_VERDICT_VARIANTS[0];
    }
    const idx = Math.floor(Math.random() * variants.length);
    return variants[idx];
  }
}
