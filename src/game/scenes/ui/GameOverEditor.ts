import Phaser from 'phaser';

export interface GameOverLayoutItem {
  x: number;
  y: number;
  scale?: number;
  rot?: number;
}

export interface GameOverLayoutConfig {
  header: GameOverLayoutItem;
  tape: GameOverLayoutItem;
  tapeDate: GameOverLayoutItem;
  tapePlace: GameOverLayoutItem;
  tapeOp: GameOverLayoutItem;
  badge: GameOverLayoutItem;
  dossierPaper: GameOverLayoutItem;
  portrait: GameOverLayoutItem;
  idPlate: GameOverLayoutItem;
  idVal: GameOverLayoutItem;
  statusVal: GameOverLayoutItem;
  statsPaper: GameOverLayoutItem;
  diagnosis: GameOverLayoutItem;
  statTime: GameOverLayoutItem;
  statGoo: GameOverLayoutItem;
  statKills: GameOverLayoutItem;
  statDrink: GameOverLayoutItem;
  statTeeth: GameOverLayoutItem;
  statFiasco: GameOverLayoutItem;
  shameStamp: GameOverLayoutItem;
  skullStamp: GameOverLayoutItem;
  verdict: GameOverLayoutItem;
  shareBtn: GameOverLayoutItem;
  playBtn: GameOverLayoutItem;
  menuBtn: GameOverLayoutItem;
  reviveBtn: GameOverLayoutItem;
  doubleGooBtn: GameOverLayoutItem;
  challenge: GameOverLayoutItem;
}

export const DEFAULT_GAMEOVER_LAYOUT: GameOverLayoutConfig = {
  header: { x: 0, y: -245, scale: 0.74, rot: 0 },
  tape: { x: -336, y: -251, scale: 0.88, rot: 0 },
  tapeDate: { x: -371, y: -284, scale: 1.08, rot: 0 },
  tapePlace: { x: -368, y: -255, scale: 0.94, rot: 0 },
  tapeOp: { x: -345, y: -224, scale: 1.04, rot: 0 },
  badge: { x: 292, y: -239, scale: 0.78, rot: 0 },
  dossierPaper: { x: -221, y: 60, scale: 0.96, rot: 0 },
  portrait: { x: -216, y: -8, scale: 0.54, rot: 0 },
  idPlate: { x: -222, y: 203, scale: 0.86, rot: 0 },
  idVal: { x: -273, y: 177, scale: 1, rot: 0 },
  statusVal: { x: -236, y: 210, scale: 1, rot: 0 },
  statsPaper: { x: 143, y: 36, scale: 0.8, rot: 0 },
  diagnosis: { x: 142, y: -125, scale: 0.8, rot: -4 },
  statTime: { x: 145, y: -87, scale: 1.14, rot: 0 },
  statGoo: { x: 164, y: -53, scale: 1.06, rot: 0 },
  statKills: { x: 175, y: -17, scale: 1.08, rot: 0 },
  statDrink: { x: 237, y: 15, scale: 1.08, rot: 0 },
  statTeeth: { x: 187, y: 51, scale: 1.12, rot: 0 },
  statFiasco: { x: 195, y: 87, scale: 1, rot: 0 },
  shameStamp: { x: 251, y: 177, scale: 0.6, rot: 12 },
  skullStamp: { x: 378, y: 141, scale: 1, rot: 0 },
  verdict: { x: 118, y: 124, scale: 0.88, rot: 0 },
  shareBtn: { x: -304, y: 285, scale: 0.42, rot: 0 },
  playBtn: { x: 101, y: 289, scale: 0.46, rot: 0 },
  menuBtn: { x: 314, y: 280, scale: 1, rot: 0 },
  reviveBtn: { x: -106, y: 288, scale: 0.4, rot: 0 },
  doubleGooBtn: { x: -507, y: 287, scale: 0.42, rot: 0 },
  challenge: { x: -2, y: 348, scale: 1.06, rot: 0 },
};

const STORAGE_KEY = 'bashmak_gameover_layout_v3';
const EDIT_MODE_KEY = 'bashmak_gameover_edit_mode_v2';

interface AttachedItem {
  element: Phaser.GameObjects.GameObject;
  dx: number;
  dy: number;
}

interface DraggableEntry {
  key: keyof GameOverLayoutConfig;
  target: Phaser.GameObjects.GameObject;
  displayName: string;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  hitZone?: Phaser.GameObjects.Rectangle;
  attached: AttachedItem[];
}

export class GameOverEditor {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private onLayoutChanged: () => void;

  public layout: GameOverLayoutConfig;
  public isEditMode = true;

  private selectedKey: keyof GameOverLayoutConfig | null = null;
  private selectedEntry: DraggableEntry | null = null;

  private activeDrag: {
    entry: DraggableEntry;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null = null;

  private entries: Map<keyof GameOverLayoutConfig, DraggableEntry> = new Map();
  private hitZones: Phaser.GameObjects.Rectangle[] = [];
  private hudElements: Phaser.GameObjects.GameObject[] = [];
  private selectionBox?: Phaser.GameObjects.Graphics;
  private keydownHandler?: (e: KeyboardEvent) => void;
  private wheelHandler?: (pointer: Phaser.Input.Pointer, gameObjects: any, deltaX: number, deltaY: number) => void;
  private pointerMoveHandler?: (pointer: Phaser.Input.Pointer) => void;
  private pointerUpHandler?: () => void;

  constructor(scene: Phaser.Scene, onLayoutChanged: () => void) {
    this.scene = scene;
    this.onLayoutChanged = onLayoutChanged;
    this.layout = this.loadLayout();
    this.isEditMode = this.loadEditMode();
  }

  public setContainer(container: Phaser.GameObjects.Container): void {
    this.container = container;
  }

  public resetEntries(): void {
    this.entries.clear();
    this.hitZones.forEach((h) => h.destroy());
    this.hitZones = [];
  }

  public attach(
    key: keyof GameOverLayoutConfig,
    target: Phaser.GameObjects.GameObject,
    displayName: string,
    width = 200,
    height = 50,
    offsetX = 0,
    offsetY = 0,
    attachedChildren: Phaser.GameObjects.GameObject[] = []
  ): void {
    if (!this.container) return;

    const t = target as any;
    const currentScale = t.scaleX || 1;
    const attached: AttachedItem[] = attachedChildren.map((child: any) => ({
      element: child,
      dx: (child.x - t.x) / currentScale,
      dy: (child.y - t.y) / currentScale,
    }));

    const entry: DraggableEntry = {
      key,
      target,
      displayName,
      width,
      height,
      offsetX,
      offsetY,
      attached,
    };
    this.entries.set(key, entry);

    if (this.isEditMode) {
      const hitZone = this.scene.add
        .rectangle(t.x + offsetX, t.y + offsetY, width, height, 0x22c55e, 0.15)
        .setStrokeStyle(2, 0x22c55e, 0.9)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });

      this.container.add(hitZone);
      this.container.bringToTop(hitZone);
      this.hitZones.push(hitZone);
      entry.hitZone = hitZone;

      const onSelect = (pointer: Phaser.Input.Pointer) => {
        if (!this.isEditMode) return;
        this.selectedKey = key;
        this.selectedEntry = entry;
        this.activeDrag = {
          entry,
          startX: pointer.x,
          startY: pointer.y,
          originX: t.x,
          originY: t.y,
        };
        this.updateSelectionBox();
        this.updateHud();
      };

      hitZone.on('pointerdown', onSelect);

      if (typeof t.setInteractive === 'function') {
        t.setScrollFactor?.(0);
        t.setInteractive({ useHandCursor: true });
        t.on('pointerdown', onSelect);
      }
    }
  }

  public setupListeners(): void {
    this.cleanupListeners();

    // Drag pointer move
    this.pointerMoveHandler = (pointer: Phaser.Input.Pointer) => {
      if (!this.activeDrag || !this.isEditMode || !this.container) return;

      const scale = this.container.scaleX || 1;
      const dx = (pointer.x - this.activeDrag.startX) / scale;
      const dy = (pointer.y - this.activeDrag.startY) / scale;

      const newX = Math.round(this.activeDrag.originX + dx);
      const newY = Math.round(this.activeDrag.originY + dy);

      const target = this.activeDrag.entry.target as any;
      target.x = newX;
      target.y = newY;

      this.layout[this.activeDrag.entry.key].x = newX;
      this.layout[this.activeDrag.entry.key].y = newY;

      if (this.activeDrag.entry.hitZone) {
        this.activeDrag.entry.hitZone.x = newX + this.activeDrag.entry.offsetX;
        this.activeDrag.entry.hitZone.y = newY + this.activeDrag.entry.offsetY;
      }

      const s = this.layout[this.activeDrag.entry.key].scale ?? 1;
      for (const att of this.activeDrag.entry.attached) {
        const c = att.element as any;
        c.x = newX + att.dx * s;
        c.y = newY + att.dy * s;
      }

      this.updateSelectionBox();
      this.updateHud();
    };
    this.scene.input.on('pointermove', this.pointerMoveHandler);

    // Drag pointer up
    this.pointerUpHandler = () => {
      if (this.activeDrag) {
        this.activeDrag = null;
        this.saveLayout();
      }
    };
    this.scene.input.on('pointerup', this.pointerUpHandler);

    // Mouse wheel (scale / rotate)
    this.wheelHandler = (pointer: Phaser.Input.Pointer, _obj: any, _dx: number, deltaY: number) => {
      if (!this.isEditMode || !this.selectedKey || !this.selectedEntry) return;

      const pos = this.layout[this.selectedKey];
      if (!pos) return;

      const isAltOrCtrl = pointer.event?.altKey || pointer.event?.ctrlKey;
      if (isAltOrCtrl) {
        const rotDir = deltaY > 0 ? 1 : -1;
        const rotStep = pointer.event?.shiftKey ? 5 : 1;
        pos.rot = Math.round(((pos.rot || 0) + rotDir * rotStep) * 10) / 10;
        this.applyTransform(this.selectedEntry, pos);
      } else {
        const scaleStep = pointer.event?.shiftKey ? 0.1 : 0.02;
        const stepVal = deltaY > 0 ? -scaleStep : scaleStep;
        pos.scale = Math.min(3.0, Math.max(0.2, Math.round(((pos.scale || 1) + stepVal) * 100) / 100));
        this.applyTransform(this.selectedEntry, pos);
      }

      this.saveLayout();
      this.updateSelectionBox();
      this.updateHud();
    };
    this.scene.input.on('wheel', this.wheelHandler);

    // Keyboard handlers
    this.keydownHandler = (e: KeyboardEvent) => {
      const isToggle =
        e.key === 'd' ||
        e.key === 'D' ||
        e.key === 'в' ||
        e.key === 'В' ||
        e.code === 'KeyD' ||
        e.key === 'F2';

      if (isToggle) {
        e.preventDefault();
        e.stopPropagation();
        this.isEditMode = !this.isEditMode;
        this.saveEditMode();
        this.onLayoutChanged();
        return;
      }

      if (!this.isEditMode || !this.selectedKey || !this.selectedEntry) return;

      const step = e.shiftKey ? 10 : 1;
      const rotStep = e.shiftKey ? 5 : 1;
      const scaleStep = e.shiftKey ? 0.1 : 0.02;
      let handled = false;
      const pos = this.layout[this.selectedKey];

      if (e.key === 'ArrowLeft') { pos.x -= step; handled = true; }
      else if (e.key === 'ArrowRight') { pos.x += step; handled = true; }
      else if (e.key === 'ArrowUp') { pos.y -= step; handled = true; }
      else if (e.key === 'ArrowDown') { pos.y += step; handled = true; }
      else if (e.key === 'q' || e.key === 'Q' || e.key === 'й' || e.key === 'Й') {
        pos.rot = Math.round(((pos.rot || 0) - rotStep) * 10) / 10;
        handled = true;
      }
      else if (e.key === 'e' || e.key === 'E' || e.key === 'у' || e.key === 'У') {
        pos.rot = Math.round(((pos.rot || 0) + rotStep) * 10) / 10;
        handled = true;
      }
      else if (e.key === '-' || e.key === '_' || e.key === '[') {
        pos.scale = Math.max(0.2, Math.round(((pos.scale || 1) - scaleStep) * 100) / 100);
        handled = true;
      }
      else if (e.key === '=' || e.key === '+' || e.key === ']') {
        pos.scale = Math.min(3.0, Math.round(((pos.scale || 1) + scaleStep) * 100) / 100);
        handled = true;
      }

      if (handled) {
        e.preventDefault();
        e.stopPropagation();
        this.applyTransform(this.selectedEntry, pos);
        this.saveLayout();
        this.updateSelectionBox();
        this.updateHud();
      }
    };

    window.addEventListener('keydown', this.keydownHandler, true);
    this.scene.input.keyboard?.on('keydown', this.keydownHandler);
  }

  private applyTransform(entry: DraggableEntry, pos: GameOverLayoutItem): void {
    const t = entry.target as any;
    t.x = pos.x;
    t.y = pos.y;
    t.setScale?.(pos.scale ?? 1);
    t.setAngle?.(pos.rot ?? 0);

    if (entry.hitZone) {
      entry.hitZone.x = pos.x + entry.offsetX;
      entry.hitZone.y = pos.y + entry.offsetY;
      entry.hitZone.setScale(pos.scale ?? 1);
      entry.hitZone.setAngle(pos.rot ?? 0);
    }

    const s = pos.scale ?? 1;
    for (const att of entry.attached) {
      const c = att.element as any;
      c.x = pos.x + att.dx * s;
      c.y = pos.y + att.dy * s;
      c.setScale?.(s);
      c.setAngle?.(pos.rot ?? 0);
    }
  }

  public renderHud(): void {
    this.clearHud();

    const { width } = this.scene.cameras.main;

    // Toggle button in top-right corner (strictly without emojis)
    const toggleBtnText = this.isEditMode ? '[ РАЗМЕТКА: ВКЛ ]' : '[ РЕДАКТОР ]';
    const toggleBtnColor = this.isEditMode ? '#4ade80' : '#facc15';

    const topToggleBtn = this.scene.add
      .text(width - 25, 25, toggleBtnText, {
        fontSize: '15px',
        color: toggleBtnColor,
        backgroundColor: '#0f172a',
        padding: { x: 12, y: 8 },
        fontFamily: '"Gagalin", monospace',
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(30000)
      .setInteractive({ useHandCursor: true });

    topToggleBtn.setStyle({ stroke: toggleBtnColor, strokeThickness: 1.5 });
    this.hudElements.push(topToggleBtn);

    topToggleBtn.on('pointerdown', () => {
      this.isEditMode = !this.isEditMode;
      this.saveEditMode();
      this.onLayoutChanged();
    });

    if (!this.isEditMode) return;

    // Top HUD Toolbar
    const centerX = width / 2;
    const barW = Math.min(width - 220, 800);

    const bgGfx = this.scene.add.graphics();
    bgGfx.fillStyle(0x0f172a, 0.95);
    bgGfx.lineStyle(2, 0x22c55e, 1);
    bgGfx.fillRoundedRect(centerX - barW / 2, 8, barW, 36, 6);
    bgGfx.strokeRoundedRect(centerX - barW / 2, 8, barW, 36, 6);
    bgGfx.setScrollFactor(0).setDepth(30000);
    this.hudElements.push(bgGfx);

    // Copy JSON button
    const copyBtn = this.scene.add
      .text(centerX + barW / 2 - 15, 26, '[ КОПИРОВАТЬ JSON ]', {
        fontSize: '13px',
        color: '#fbbf24',
        fontFamily: '"Gagalin", monospace',
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(30001)
      .setInteractive({ useHandCursor: true });
    this.hudElements.push(copyBtn);

    copyBtn.on('pointerdown', () => {
      const text = JSON.stringify(this.layout, null, 2);
      try {
        navigator.clipboard?.writeText(text);
      } catch {}
      console.log('--- НОВЫЕ КООРДИНАТЫ GAMEOVER_MODAL ---');
      console.log(text);
      copyBtn.setText('[ СКОПИРОВАНО! ]');
      this.scene.time.delayedCall(1500, () => {
        if (copyBtn.active) copyBtn.setText('[ КОПИРОВАТЬ JSON ]');
      });
    });

    // Reset button
    const resetBtn = this.scene.add
      .text(centerX + barW / 2 - 180, 26, '[ СБРОС ]', {
        fontSize: '13px',
        color: '#ef4444',
        fontFamily: '"Gagalin", monospace',
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(30001)
      .setInteractive({ useHandCursor: true });
    this.hudElements.push(resetBtn);

    resetBtn.on('pointerdown', () => {
      this.layout = JSON.parse(JSON.stringify(DEFAULT_GAMEOVER_LAYOUT));
      this.saveLayout();
      this.onLayoutChanged();
    });

    this.selectionBox = this.scene.add.graphics();
    if (this.container) {
      this.container.add(this.selectionBox);
    }
    this.hudElements.push(this.selectionBox);

    this.updateHud();
  }

  private updateHud(): void {
    const existingStatus = this.hudElements.find((el) => (el as any).isStatusText);
    if (existingStatus) {
      existingStatus.destroy();
      this.hudElements = this.hudElements.filter((el) => el !== existingStatus);
    }

    if (!this.isEditMode) return;

    const { width } = this.scene.cameras.main;
    const centerX = width / 2;
    const barW = Math.min(width - 220, 800);

    let info = 'Стрелки: сдвиг | Q/E: поворот | -/+: масштаб';
    if (this.selectedKey && this.layout[this.selectedKey]) {
      const pos = this.layout[this.selectedKey];
      const name = this.selectedEntry?.displayName || this.selectedKey;
      info = `${name} | X: ${pos.x}, Y: ${pos.y}`;
    }

    const status = this.scene.add
      .text(centerX - barW / 2 + 15, 26, info, {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: '"Gagalin", monospace',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(30001);
    (status as any).isStatusText = true;
    this.hudElements.push(status);
  }

  private updateSelectionBox(): void {
    if (!this.selectionBox || !this.selectedEntry || !this.isEditMode) {
      this.selectionBox?.clear();
      return;
    }

    this.selectionBox.clear();
    this.selectionBox.lineStyle(2, 0xfacc15, 1);
    const target = this.selectedEntry.target as any;
    const x = target.x + this.selectedEntry.offsetX;
    const y = target.y + this.selectedEntry.offsetY;
    const w = this.selectedEntry.width;
    const h = this.selectedEntry.height;

    this.selectionBox.strokeRect(x - w / 2, y - h / 2, w, h);
    this.selectionBox.fillStyle(0xfacc15, 0.25);
    this.selectionBox.fillRect(x - w / 2, y - h / 2, w, h);
  }

  public clearHud(): void {
    this.hudElements.forEach((el) => el.destroy());
    this.hudElements = [];
    if (this.selectionBox) {
      this.selectionBox.destroy();
      this.selectionBox = undefined;
    }
  }

  public cleanupListeners(): void {
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler, true);
      this.scene.input.keyboard?.off('keydown', this.keydownHandler);
      this.keydownHandler = undefined;
    }
    if (this.pointerMoveHandler) {
      this.scene.input.off('pointermove', this.pointerMoveHandler);
      this.pointerMoveHandler = undefined;
    }
    if (this.pointerUpHandler) {
      this.scene.input.off('pointerup', this.pointerUpHandler);
      this.pointerUpHandler = undefined;
    }
    if (this.wheelHandler) {
      this.scene.input.off('wheel', this.wheelHandler);
      this.wheelHandler = undefined;
    }
  }

  public destroy(): void {
    this.cleanupListeners();
    this.clearHud();
    this.resetEntries();
    this.activeDrag = null;
    this.selectedKey = null;
    this.selectedEntry = null;
    this.container = null;
  }

  private loadEditMode(): boolean {
    try {
      const val = localStorage.getItem(EDIT_MODE_KEY);
      if (val === null) return true;
      return val === 'true';
    } catch {
      return true;
    }
  }

  private saveEditMode(): void {
    try {
      localStorage.setItem(EDIT_MODE_KEY, this.isEditMode ? 'true' : 'false');
    } catch {}
  }

  private loadLayout(): GameOverLayoutConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_GAMEOVER_LAYOUT, ...JSON.parse(raw) };
    } catch {}
    return JSON.parse(JSON.stringify(DEFAULT_GAMEOVER_LAYOUT));
  }

  private saveLayout(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.layout));
    } catch {}
  }
}
