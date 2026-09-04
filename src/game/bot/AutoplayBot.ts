import type Phaser from 'phaser';
import type { Entity } from '../entities/Entity';
import { GameState } from '../core/GameState';
import { EventBus } from '../core/EventBus';
import type { LootSystem } from '../loot/LootSystem';
import type { InputManager } from '../../input/InputManager';
import type { LevelUpModal } from '../scenes/ui/LevelUpModal';

export interface BotMetrics {
  runTimeSeconds: number;
  currentDps: number;
  averageDps: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  kills: number;
  level: number;
  xpRatePerMin: number;
  dpsHistory: Array<{ time: number; dps: number }>;
  levelMilestones: Array<{ level: number; time: number }>;
  activeGemsCount: number;
  activeEnemiesCount: number;
}

export interface DetectedBug {
  time: number;
  severity: 'WARNING' | 'ERROR';
  type: string;
  message: string;
  details?: Record<string, unknown>;
}

export class AutoplayBot {
  public scene: Phaser.Scene;
  private player: Entity;
  private enemiesMap: Map<string, Entity>;
  private lootSystem: LootSystem;
  private inputManager: InputManager;
  private gameState: GameState;
  private levelUpModal: LevelUpModal;
  private eventBus = EventBus.getInstance();

  public isEnabled = false;

  // Steering configuration
  private readonly avoidanceRadius = 220;
  private readonly avoidanceRadiusSq = 220 * 220;
  private readonly gemAttractRadiusSq = 380 * 380;
  private readonly mapBoundLimit = 1650;

  // Humanoid reaction & smoothing state
  private reactionIntervalMs = 160;
  private reactionTimerMs = 0;
  private currentVx = 0;
  private currentVy = 0;
  private targetVx = 0;
  private targetVy = 0;
  private wanderAngle = Math.random() * Math.PI * 2;

  // Reusable scratch vectors for Zero-Allocation
  private avoidX = 0;
  private avoidY = 0;
  private attractX = 0;
  private attractY = 0;
  private boundX = 0;
  private boundY = 0;

  // Auto Level-Up
  private levelUpWaitTimerMs = 0;
  private readonly levelUpDelayMs = 800;

  // Metrics collection
  private totalDamageDealt = 0;
  private totalDamageTaken = 0;
  private damageRingBuffer: Array<{ time: number; damage: number }> = [];
  private ringBufferIndex = 0;
  private readonly ringBufferSize = 300;
  private levelMilestones: Array<{ level: number; time: number }> = [];
  private dpsHistory: Array<{ time: number; dps: number }> = [];
  private lastDpsSampleTime = 0;

  // Bug watchdog
  private watchdogTimerMs = 0;
  private readonly watchdogIntervalMs = 500;
  private lastCheckedX = 0;
  private lastCheckedY = 0;
  private stuckTimerMs = 0;
  private modalOpenTimerMs = 0;
  public detectedBugs: DetectedBug[] = [];

  private unbindEvents: Array<() => void> = [];

  constructor(
    scene: Phaser.Scene,
    player: Entity,
    enemiesMap: Map<string, Entity>,
    lootSystem: LootSystem,
    inputManager: InputManager,
    gameState: GameState,
    levelUpModal: LevelUpModal
  ) {
    this.scene = scene;
    this.player = player;
    this.enemiesMap = enemiesMap;
    this.lootSystem = lootSystem;
    this.inputManager = inputManager;
    this.gameState = gameState;
    this.levelUpModal = levelUpModal;

    // Pre-allocate ring buffer
    for (let i = 0; i < this.ringBufferSize; i++) {
      this.damageRingBuffer.push({ time: -1, damage: 0 });
    }

    this.setupEventListeners();
    this.exposeGlobalApi();

    // Default to active so bot immediately plays unless user explicitly turned it off
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const isExplicitlyEnabled =
      urlParams?.get('bot') === '1' ||
      urlParams?.get('autoplay') === '1' ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('bashmak_bot') === 'true');

    this.setEnabled(Boolean(isExplicitlyEnabled));

    // Global hotkey B / И to toggle bot anytime during run
    const onKeyB = (e: KeyboardEvent) => {
      if (e.code === 'KeyB' || e.key === 'b' || e.key === 'B' || e.key === 'и' || e.key === 'И') {
        const active = this.toggle();
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('bashmak_bot', active ? 'true' : 'false');
        }
        this.lootSystem.showFloatText(
          this.player.x,
          this.player.y - 40,
          active ? 'АВТОБОТ: ВКЛ' : 'АВТОБОТ: ВЫКЛ',
          active ? '#4ade80' : '#f87171'
        );
      } else if ((e.code === 'KeyC' || e.key === 'c' || e.key === 'C' || e.key === 'с' || e.key === 'С') && !e.ctrlKey && !e.metaKey) {
        this.copyReportToClipboard();
      }
    };
    window.addEventListener('keydown', onKeyB);
    this.unbindEvents.push(() => window.removeEventListener('keydown', onKeyB));
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    const botSource = this.inputManager.getBotSource();
    botSource.setEnabled(enabled);

    if (!enabled) {
      this.currentVx = 0;
      this.currentVy = 0;
      this.targetVx = 0;
      this.targetVy = 0;
      botSource.setVector(0, 0);
    } else {
      console.log('[AutoplayBot] Enabled by user/system.');
    }
  }

  public toggle(): boolean {
    this.setEnabled(!this.isEnabled);
    return this.isEnabled;
  }

  private setupEventListeners(): void {
    this.unbindEvents.push(
      this.eventBus.on('enemy:damaged', (data: { damage?: number }) => {
        const dmg = data?.damage ?? 0;
        if (dmg > 0) {
          this.totalDamageDealt += dmg;
          const entry = this.damageRingBuffer[this.ringBufferIndex];
          entry.time = this.gameState.runTime;
          entry.damage = dmg;
          this.ringBufferIndex = (this.ringBufferIndex + 1) % this.ringBufferSize;
        }
      }),

      this.eventBus.on('player:damaged', (data: { damage?: number }) => {
        const dmg = data?.damage ?? 0;
        this.totalDamageTaken += dmg;
      }),

      this.eventBus.on('player:levelUp', () => {
        this.levelMilestones.push({
          level: this.gameState.level,
          time: Number(this.gameState.runTime.toFixed(1)),
        });
        this.levelUpWaitTimerMs = this.levelUpDelayMs;
      })
    );
  }

  public update(deltaMs: number): void {
    const deltaSec = deltaMs / 1000;

    // 1. Run bug detection regardless of bot toggle to monitor game health
    this.runWatchdog(deltaMs);

    // 2. Sample DPS history every 2 seconds
    if (this.gameState.runTime - this.lastDpsSampleTime >= 2.0) {
      this.lastDpsSampleTime = this.gameState.runTime;
      this.dpsHistory.push({
        time: Number(this.gameState.runTime.toFixed(1)),
        dps: Math.round(this.calculateRollingDps(3.0)),
      });
      if (this.dpsHistory.length > 50) {
        this.dpsHistory.shift();
      }
    }

    // 3. Auto Level-Up resolution
    if (this.levelUpModal.isVisible) {
      this.modalOpenTimerMs += deltaMs;
      if (this.isEnabled) {
        this.levelUpWaitTimerMs -= deltaMs;
        if (this.levelUpWaitTimerMs <= 0) {
          this.levelUpWaitTimerMs = this.levelUpDelayMs;
          this.selectLevelUpCard();
        }
      }
      return;
    } else {
      this.modalOpenTimerMs = 0;
    }

    if (!this.isEnabled || !this.player.isAlive) {
      return;
    }

    // 4. Humanoid reaction rate limiting
    this.reactionTimerMs -= deltaMs;
    if (this.reactionTimerMs <= 0) {
      this.reactionTimerMs = this.reactionIntervalMs + (Math.random() * 40 - 20);
      this.calculateDesiredSteering();
    }

    // 5. Input smoothing (Lerp towards target direction)
    const smoothFactor = Math.min(1.0, deltaSec * 9.0);
    this.currentVx += (this.targetVx - this.currentVx) * smoothFactor;
    this.currentVy += (this.targetVy - this.currentVy) * smoothFactor;

    // 6. Feed vector to InputManager
    this.inputManager.getBotSource().setVector(this.currentVx, this.currentVy);
  }

  private calculateDesiredSteering(): void {
    const px = this.player.x;
    const py = this.player.y;

    this.avoidX = 0;
    this.avoidY = 0;
    this.attractX = 0;
    this.attractY = 0;
    this.boundX = 0;
    this.boundY = 0;

    let dangerCount = 0;
    let closestThreatDistSq = Number.MAX_VALUE;
    let closestEnemyDx = 0;
    let closestEnemyDy = 0;

    // Potential fields: Repulsion from all active enemies
    for (const enemy of this.enemiesMap.values()) {
      if (!enemy.isAlive || !enemy.sprite?.active) continue;

      const ex = enemy.x;
      const ey = enemy.y;
      const dx = px - ex;
      const dy = py - ey;
      const distSq = dx * dx + dy * dy;

      if (distSq < closestThreatDistSq) {
        closestThreatDistSq = distSq;
        closestEnemyDx = ex - px;
        closestEnemyDy = ey - py;
      }

      if (distSq < this.avoidanceRadiusSq && distSq > 0.001) {
        dangerCount++;
        const dist = Math.sqrt(distSq);
        const factor = (this.avoidanceRadius - dist) / this.avoidanceRadius;

        // Weight multiplier by enemy danger archetype
        let priority = 1.0;
        if (enemy.isChampion) priority = 1.8;
        else if (enemy.definition?.archetype === 'boss') priority = 2.4;
        else if (enemy.definition?.archetype === 'sprinter') priority = 1.6;
        else if (enemy.definition?.archetype === 'exploder') priority = 1.5;

        const weight = factor * factor * priority;
        this.avoidX += (dx / dist) * weight;
        this.avoidY += (dy / dist) * weight;
      }
    }

    // Normalize avoidance force
    const avoidLenSq = this.avoidX * this.avoidX + this.avoidY * this.avoidY;
    if (avoidLenSq > 0.001) {
      const avoidLen = Math.sqrt(avoidLenSq);
      this.avoidX /= avoidLen;
      this.avoidY /= avoidLen;
    }

    // Potential fields: Attraction to XP gems / chests if safe
    const isSafeToCollect = dangerCount < 4 || closestThreatDistSq > 100 * 100;
    if (isSafeToCollect) {
      let nearestGemDistSq = this.gemAttractRadiusSq;
      let targetGemX = 0;
      let targetGemY = 0;
      let foundGem = false;

      // Check chests first (high priority)
      const chests = this.lootSystem.chestsGroup.getChildren() as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[];
      for (let i = 0; i < chests.length; i++) {
        const c = chests[i];
        if (!c.active) continue;
        const cdx = c.x - px;
        const cdy = c.y - py;
        const cdistSq = cdx * cdx + cdy * cdy;
        if (cdistSq < nearestGemDistSq) {
          nearestGemDistSq = cdistSq;
          targetGemX = c.x;
          targetGemY = c.y;
          foundGem = true;
          break;
        }
      }

      // Check gems if no chest found
      if (!foundGem) {
        const gems = this.lootSystem.gemsGroup.getChildren() as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[];
        const count = gems.length;
        // Sample gems to keep performance ultra fast
        const step = count > 30 ? 2 : 1;
        for (let i = 0; i < count; i += step) {
          const g = gems[i];
          if (!g.active) continue;
          const gdx = g.x - px;
          const gdy = g.y - py;
          const gdistSq = gdx * gdx + gdy * gdy;
          if (gdistSq < nearestGemDistSq) {
            nearestGemDistSq = gdistSq;
            targetGemX = g.x;
            targetGemY = g.y;
            foundGem = true;
          }
        }
      }

      if (foundGem) {
        const gdx = targetGemX - px;
        const gdy = targetGemY - py;
        const gdist = Math.sqrt(nearestGemDistSq);
        if (gdist > 0.001) {
          this.attractX = gdx / gdist;
          this.attractY = gdy / gdist;
        }
      }
    }

    // World boundary repulsion
    if (Math.abs(px) > this.mapBoundLimit) {
      this.boundX = px > 0 ? -1 : 1;
    }
    if (Math.abs(py) > this.mapBoundLimit) {
      this.boundY = py > 0 ? -1 : 1;
    }

    // Combine forces: Repulsion has higher priority than attraction
    let finalX = 0;
    let finalY = 0;

    if (avoidLenSq > 0.001) {
      finalX = this.avoidX * 1.5 + this.attractX * 0.35 + this.boundX * 1.2;
      finalY = this.avoidY * 1.5 + this.attractY * 0.35 + this.boundY * 1.2;
    } else if (this.attractX !== 0 || this.attractY !== 0) {
      finalX = this.attractX * 1.2 + this.boundX * 0.8;
      finalY = this.attractY * 1.2 + this.boundY * 0.8;
    } else if (closestThreatDistSq < 650 * 650) {
      // Kite nearby visible enemies: stay at optimal weapon engagement range (~240-270px)
      const cdist = Math.max(1, Math.sqrt(closestThreatDistSq));
      const approachFactor = (cdist - 250) / 250;
      const tangentX = -closestEnemyDy / cdist;
      const tangentY = closestEnemyDx / cdist;
      finalX = (closestEnemyDx / cdist) * approachFactor + tangentX * 0.85 + this.boundX * 0.8;
      finalY = (closestEnemyDy / cdist) * approachFactor + tangentY * 0.85 + this.boundY * 0.8;
    } else {
      // Smooth natural wandering across the arena
      this.wanderAngle += (Math.random() - 0.5) * 0.35;
      finalX = Math.cos(this.wanderAngle) + this.boundX * 1.5;
      finalY = Math.sin(this.wanderAngle) + this.boundY * 1.5;
    }

    // Micro-noise (human analog stick imperfection)
    const jitter = 0.12;
    finalX += (Math.random() - 0.5) * jitter;
    finalY += (Math.random() - 0.5) * jitter;

    // Normalize final target vector
    const totalLenSq = finalX * finalX + finalY * finalY;
    if (totalLenSq > 0.001) {
      const totalLen = Math.sqrt(totalLenSq);
      this.targetVx = Math.max(-1, Math.min(1, finalX / totalLen));
      this.targetVy = Math.max(-1, Math.min(1, finalY / totalLen));
    } else {
      this.targetVx = 0;
      this.targetVy = 0;
    }
  }

  private selectLevelUpCard(): void {
    // Simulate keyboard '1' or 'Enter' to pick first available card (often ready evolution or top choice)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1', code: 'Digit1' }));
  }

  private runWatchdog(deltaMs: number): void {
    this.watchdogTimerMs += deltaMs;
    if (this.watchdogTimerMs < this.watchdogIntervalMs) {
      return;
    }
    this.watchdogTimerMs = 0;

    const px = this.player.x;
    const py = this.player.y;
    const hp = this.player.health.currentHp;

    // 1. Check for NaN / Infinity anomalies
    if (Number.isNaN(px) || Number.isNaN(py) || !Number.isFinite(px) || !Number.isFinite(py)) {
      this.logBug('ERROR', 'INVALID_COORDINATES', 'Player position is NaN or Infinity!', { x: px, y: py });
    }
    if (Number.isNaN(hp) || !Number.isFinite(hp)) {
      this.logBug('ERROR', 'INVALID_HEALTH', 'Player HP is NaN or Infinity!', { hp });
    }

    // 2. Check for player stuck bug (skip when paused or modal is visible)
    const isPaused = this.scene.physics.world.isPaused || this.levelUpModal.isVisible;
    if (this.isEnabled && this.player.isAlive && !isPaused) {
      const isTryingToMove = Math.abs(this.currentVx) > 0.3 || Math.abs(this.currentVy) > 0.3;
      const dx = px - this.lastCheckedX;
      const dy = py - this.lastCheckedY;
      const movedDistSq = dx * dx + dy * dy;

      if (isTryingToMove && movedDistSq < 16) {
        this.stuckTimerMs += this.watchdogIntervalMs;
        if (this.stuckTimerMs >= 3000) {
          this.logBug('WARNING', 'PLAYER_STUCK', 'Player attempted movement but stayed in place for > 3.0s.', {
            x: Math.round(px),
            y: Math.round(py),
          });
          this.stuckTimerMs = 0;
        }
      } else {
        this.stuckTimerMs = 0;
      }
    }

    this.lastCheckedX = px;
    this.lastCheckedY = py;

    // 3. Pool leak detection: Gems pool overflow
    const activeGems = this.lootSystem.gemsGroup.countActive(true);
    if (activeGems > 95) {
      this.logBug('WARNING', 'GEM_POOL_LIMIT_EXCEEDED', `Active gems count (${activeGems}) exceeded hard limit of 90!`, {
        activeGems,
      });
    }

    // 4. Modal deadlock detection
    if (this.modalOpenTimerMs > 10000) {
      this.logBug('ERROR', 'MODAL_DEADLOCK', 'Level up modal remained open for > 10 seconds without closing.', {
        modalOpenTimerMs: this.modalOpenTimerMs,
      });
      this.modalOpenTimerMs = 0;
    }

    // 5. Large frame spike detection
    if (deltaMs > 150) {
      this.logBug('WARNING', 'FRAME_SPIKE', `Significant frame hitch detected (${Math.round(deltaMs)}ms).`, {
        deltaMs,
      });
    }
  }

  private logBug(severity: 'WARNING' | 'ERROR', type: string, message: string, details?: Record<string, unknown>): void {
    const bug: DetectedBug = {
      time: Number(this.gameState.runTime.toFixed(1)),
      severity,
      type,
      message,
      details,
    };
    this.detectedBugs.push(bug);
    if (this.detectedBugs.length > 100) {
      this.detectedBugs.shift();
    }
    console.warn(`[AutoplayBot ${severity}] [${type}] ${message}`, details ?? '');
  }

  public calculateRollingDps(windowSeconds = 3.0): number {
    const currentTime = this.gameState.runTime;
    const startTime = currentTime - windowSeconds;
    let windowDamage = 0;

    for (let i = 0; i < this.ringBufferSize; i++) {
      const entry = this.damageRingBuffer[i];
      if (entry.time >= startTime && entry.time <= currentTime) {
        windowDamage += entry.damage;
      }
    }

    return windowDamage / Math.max(0.5, windowSeconds);
  }

  public getMetrics(): BotMetrics {
    const runTime = Math.max(0.1, this.gameState.runTime);
    const avgDps = this.totalDamageDealt / runTime;
    const rollingDps = this.calculateRollingDps(3.0);
    const xpPerMin = (this.gameState.currentXp / runTime) * 60;

    return {
      runTimeSeconds: Math.floor(runTime),
      currentDps: Math.round(rollingDps),
      averageDps: Math.round(avgDps),
      totalDamageDealt: Math.round(this.totalDamageDealt),
      totalDamageTaken: Math.round(this.totalDamageTaken),
      kills: this.gameState.kills,
      level: this.gameState.level,
      xpRatePerMin: Math.round(xpPerMin),
      dpsHistory: [...this.dpsHistory],
      levelMilestones: [...this.levelMilestones],
      activeGemsCount: this.lootSystem.gemsGroup.countActive(true),
      activeEnemiesCount: this.enemiesMap.size,
    };
  }

  public printReportToConsole(): void {
    const metrics = this.getMetrics();
    console.log('====================================================');
    console.log('             AUTOPLAY BOT METRICS REPORT            ');
    console.log('====================================================');
    console.table({
      'Run Time': `${metrics.runTimeSeconds}s`,
      'Level': metrics.level,
      'Current DPS (3s)': metrics.currentDps,
      'Average DPS': metrics.averageDps,
      'Total Damage Dealt': metrics.totalDamageDealt,
      'Total Damage Taken': metrics.totalDamageTaken,
      'Kills': metrics.kills,
      'XP / Min': metrics.xpRatePerMin,
      'Active Enemies': metrics.activeEnemiesCount,
      'Active Gems': metrics.activeGemsCount,
      'Bugs Detected': this.detectedBugs.length,
    });

    if (this.detectedBugs.length > 0) {
      console.log('--- DETECTED BUGS / ANOMALIES ---');
      console.table(this.detectedBugs);
    } else {
      console.log('No bugs or anomalies detected during this run.');
    }
    console.log('====================================================');
  }

  public async copyReportToClipboard(): Promise<string> {
    const metrics = this.getMetrics();
    const lines = [
      '=== BASHMAK AUTOPLAY BOT REPORT ===',
      `Время забега: ${metrics.runTimeSeconds} сек`,
      `Уровень героя: ${metrics.level}`,
      `Текущий DPS (3s): ${metrics.currentDps}`,
      `Средний DPS: ${metrics.averageDps}`,
      `Суммарный нанесенный урон: ${metrics.totalDamageDealt}`,
      `Полученный урон: ${metrics.totalDamageTaken}`,
      `Убийств врагов: ${metrics.kills}`,
      `Темп опыта (XP/мин): ${metrics.xpRatePerMin}`,
      `Активных врагов: ${metrics.activeEnemiesCount}`,
      `Кристаллов на поле: ${metrics.activeGemsCount}`,
      `Обнаружено багов/аномалий: ${this.detectedBugs.length}`,
    ];

    if (this.detectedBugs.length > 0) {
      lines.push('\n--- ОБНАРУЖЕННЫЕ БАГИ И АНОМАЛИИ ---');
      this.detectedBugs.forEach((b, idx) => {
        lines.push(`${idx + 1}. [${b.severity}] [${b.type}] t=${b.time}s: ${b.message}`);
        if (b.details) {
          lines.push(`   Контекст: ${JSON.stringify(b.details)}`);
        }
      });
    } else {
      lines.push('\nБагов и аномалий за время теста не зафиксировано.');
    }

    if (metrics.levelMilestones.length > 0) {
      lines.push('\n--- ХРОНОЛОГИЯ УРОВНЕЙ ---');
      metrics.levelMilestones.forEach((m) => {
        lines.push(`Уровень ${m.level} взят на ${m.time}s`);
      });
    }

    const reportText = lines.join('\n');

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(reportText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = reportText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      this.lootSystem.showFloatText(this.player.x, this.player.y - 40, 'СКОПИРОВАНО В БУФЕР!', '#38bdf8');
    } catch (e) {
      console.warn('[AutoplayBot] Clipboard copy error:', e);
    }

    this.printReportToConsole();
    return reportText;
  }

  private exposeGlobalApi(): void {
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__bashmakBot = {
        enable: () => this.setEnabled(true),
        disable: () => this.setEnabled(false),
        toggle: () => this.toggle(),
        getMetrics: () => this.getMetrics(),
        getBugs: () => this.detectedBugs,
        printReport: () => this.printReportToConsole(),
        copyReport: () => this.copyReportToClipboard(),
        botInstance: this,
      };
    }
  }

  public destroy(): void {
    this.setEnabled(false);
    this.unbindEvents.forEach((u) => u());
    this.unbindEvents = [];
    if (typeof window !== 'undefined') {
      delete (window as unknown as Record<string, unknown>).__bashmakBot;
    }
  }
}
