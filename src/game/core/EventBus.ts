type EventCallback<T = any> = (data: T) => void;

export interface GameEvents {
  'player:damaged': { currentHp: number; maxHp: number; damage: number };
  'player:healed': { currentHp: number; maxHp: number; amount: number };
  'player:died': void;
  'enemy:spawned': { id: string; x: number; y: number };
  'enemy:damaged': { id: string; currentHp: number; damage: number };
  'enemy:died': { id: string; xpValue: number; x: number; y: number };
  'xp:gained': { amount: number; totalXp: number; level: number; nextLevelXp: number };
  'player:levelUp': { newLevel: number };
  'run:started': void;
  'run:ended': { won: boolean; timeSurvived: number; kills: number; level: number };
}

export class EventBus {
  private static instance: EventBus;
  private listeners: Map<keyof GameEvents, Set<EventCallback>> = new Map();

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  on<K extends keyof GameEvents>(event: K, callback: EventCallback<GameEvents[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unbind function
    return () => this.off(event, callback);
  }

  off<K extends keyof GameEvents>(event: K, callback: EventCallback<GameEvents[K]>): void {
    const eventSet = this.listeners.get(event);
    if (eventSet) {
      eventSet.delete(callback);
    }
  }

  emit<K extends keyof GameEvents>(event: K, data?: GameEvents[K]): void {
    const eventSet = this.listeners.get(event);
    if (eventSet) {
      for (const callback of eventSet) {
        callback(data);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
