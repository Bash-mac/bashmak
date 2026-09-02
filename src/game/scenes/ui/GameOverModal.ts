import Phaser from 'phaser';
import { GameState } from '../../core/GameState';
import { SaveManager } from '../../core/SaveManager';
import { createPlatformAdapter } from '../../../platform';
import { AudioManager } from '../../audio/AudioManager';
import {
  GameOverEditor,
  type GameOverLayoutConfig,
  type GameOverLayoutItem,
} from './GameOverEditor';

export class GameOverModal {
  private scene: Phaser.Scene;
  private platform = createPlatformAdapter();
  private audio = AudioManager.getInstance();
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private modalContainer: Phaser.GameObjects.Container | null = null;
  private elements: Phaser.GameObjects.GameObject[] = [];
  private editor: GameOverEditor;

  public isVisible = false;
  private won = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.editor = new GameOverEditor(scene, () => this.render());
  }

  public show(won = false): void {
    this.clear();
    this.isVisible = true;
    this.won = won;

    this.editor.setupListeners();
    this.render();
  }

  private render(): void {
    const { width, height } = this.scene.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;

    this.clearRenderElements();

    // 1. Fullscreen dark backdrop
    if (!this.overlay) {
      this.overlay = this.scene.add
        .rectangle(centerX, centerY, width, height, 0x05080c, 0.92)
        .setScrollFactor(0)
        .setDepth(10000)
        .setInteractive();
    }

    // 2. Scaled root container (Virtual Viewport 1280x720 base, pinned to camera)
    const k = Math.min((width * 0.96) / 1280, (height * 0.96) / 720);
    if (!this.modalContainer) {
      this.modalContainer = this.scene.add
        .container(centerX, centerY)
        .setDepth(10001)
        .setScrollFactor(0);
    }
    this.modalContainer.setPosition(centerX, centerY).setScale(k).setScrollFactor(0);

    this.editor.setContainer(this.modalContainer);
    this.editor.resetEntries();

    const state = GameState.getInstance();
    const saveManager = SaveManager.getInstance();
    const isRecord = this.won || saveManager.lastRunWasRecord;

    const minutes = Math.floor(state.runTime / 60);
    const seconds = Math.floor(state.runTime % 60);
    const timeSurvived = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    const heroId = state.currentHeroId || 'hero_vypolzok';
    const isCarrot = heroId === 'hero_markovka';
    const heroName = isCarrot ? 'Морковка' : 'Выползок';
    const heroTag = isCarrot ? 'MRKVK-777' : 'VPLZOK-666';

    const layout = this.editor.layout;

    // --- Header ---
    const header = this.createImage(layout.header, 'protocol_header', 560, 195);
    this.editor.attach('header', header, 'Шапка протокола', 560, 150);

    // --- Tape Meta ---
    const tapeImg = this.createImage(layout.tape, 'protocol_tape_meta', 220, 135);
    this.editor.attach('tape', tapeImg, 'Скотч плашка', 220, 135);

    const tapeTextOpts: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '11px',
      color: '#261406',
      fontStyle: 'bold',
      fontFamily: '"Balsamiq Sans", monospace',
    };
    const tapeDate = this.createText(layout.tapeDate, '24.05.199X', tapeTextOpts, 0, 0.5);
    this.editor.attach('tapeDate', tapeDate, 'Текст Дата', 90, 20);

    const tapePlace = this.createText(layout.tapePlace, 'СЕКТОР 7-Б', tapeTextOpts, 0, 0.5);
    this.editor.attach('tapePlace', tapePlace, 'Текст Место', 100, 20);

    const tapeOp = this.createText(layout.tapeOp, 'Д-Р ГНИЛЫЙ', tapeTextOpts, 0, 0.5);
    this.editor.attach('tapeOp', tapeOp, 'Текст Оператор', 110, 20);

    // --- Badge ---
    const badge = this.createImage(layout.badge, 'protocol_badge_police', 140, 165);
    this.editor.attach('badge', badge, 'Герб КПК', 140, 165);

    // --- Left Dossier Paper ---
    const dossierPaper = this.createImage(layout.dossierPaper, 'protocol_paper_dossier', 330, 425);
    this.editor.attach('dossierPaper', dossierPaper, 'Бланк досье', 330, 425);

    // --- Hero Portrait ---
    let portraitKey = 'portrait_vypolzok_flattened';
    let statusText = 'УТИЛИЗИРОВАН';

    if (isRecord) {
      portraitKey = isCarrot ? 'portrait_markovka_win' : 'portrait_vypolzok_win';
      statusText = 'РЕКОРД РАЙОНА';
    } else if (state.runTime < 90) {
      portraitKey = isCarrot ? 'portrait_markovka_eye' : 'portrait_vypolzok_eye';
      statusText = 'НЕГОДЕН';
    } else {
      portraitKey = isCarrot ? 'portrait_markovka_beaten' : 'portrait_vypolzok_flattened';
      statusText = 'УТИЛИЗИРОВАН';
    }

    const portrait = this.createImage(layout.portrait, portraitKey, 250, 260);
    this.editor.attach('portrait', portrait, 'Арт героя', 240, 240);

    // --- ID Plate ---
    const idPlate = this.createImage(layout.idPlate, 'protocol_plate_id', 275, 125);
    this.editor.attach('idPlate', idPlate, 'Плашка ID/Статус', 275, 125);

    // ID Text
    const idValText = this.createText(layout.idVal, heroTag, {
      fontSize: '15px',
      color: '#facc15',
      fontStyle: 'bold',
      fontFamily: '"Gagalin", monospace',
    }, 0, 0.5);
    this.editor.attach('idVal', idValText, 'Текст ID', 140, 30);

    // Status Text
    const statusValText = this.createText(layout.statusVal, statusText, {
      fontSize: '14px',
      color: isRecord ? '#86efac' : '#ef4444',
      fontStyle: 'bold',
      fontFamily: '"Gagalin", monospace',
    }, 0, 0.5);
    this.editor.attach('statusVal', statusValText, 'Текст Статус', 150, 30);

    // --- Right Stats Paper ---
    const statsPaper = this.createImage(layout.statsPaper, 'protocol_paper_stats', 330, 425);
    this.editor.attach('statsPaper', statsPaper, 'Бланк диагноза', 330, 425);

    // Diagnosis Text Stamp
    const { diagnosisTitle, fiascoReason } = this.getDiagnosis(state, isRecord);
    const diagText = this.createText(layout.diagnosis, diagnosisTitle, {
      fontSize: '18px',
      color: isRecord ? '#15803d' : '#b91c1c',
      fontStyle: 'bold',
      fontFamily: '"Gagalin", monospace',
      align: 'center',
      wordWrap: { width: 220 },
      stroke: isRecord ? '#86efac' : '#fee2e2',
      strokeThickness: 2,
    }, 0.5, 0.5);
    this.editor.attach('diagnosis', diagText, 'Штамп Диагноз', 220, 50);

    // Dynamic Stats Values
    const drinkAmount = (state.gooCollected * 0.01 + 2.5).toFixed(1);
    const lostTeeth = Math.floor(state.kills * 0.12) + 3;

    const statRows: { key: keyof GameOverLayoutConfig; name: string; val: string; alignRight: boolean }[] = [
      { key: 'statTime', name: 'Строка Время', val: timeSurvived, alignRight: true },
      { key: 'statGoo', name: 'Строка GOO', val: `+${state.gooCollected} GOO`, alignRight: true },
      { key: 'statKills', name: 'Строка Киллы', val: `${state.kills} шт.`, alignRight: true },
      { key: 'statDrink', name: 'Строка Выпито', val: `${drinkAmount} л`, alignRight: true },
      { key: 'statTeeth', name: 'Строка Зубы', val: `${lostTeeth}`, alignRight: true },
      { key: 'statFiasco', name: 'Строка Фиаско', val: fiascoReason, alignRight: false },
    ];

    for (const row of statRows) {
      const txt = this.createText(layout[row.key], row.val, {
        fontSize: '13px',
        color: '#1e293b',
        fontStyle: 'bold',
        fontFamily: '"Balsamiq Sans", monospace',
        align: row.alignRight ? 'right' : 'center',
        wordWrap: row.alignRight ? undefined : { width: 180 },
      }, row.alignRight ? 1 : 0.5, 0.5);
      this.editor.attach(row.key, txt, row.name, 160, 28);
    }

    // --- Stamps ---
    const shameStamp = this.createImage(layout.shameStamp, 'protocol_stamp_shame', 110, 90);
    this.editor.attach('shameStamp', shameStamp, 'Штамп позора', 110, 90);

    const skullStamp = this.createImage(layout.skullStamp, 'protocol_stamp_skull', 50, 55);
    this.editor.attach('skullStamp', skullStamp, 'Череп штамп', 50, 55);

    // --- Verdict Text ---
    const verdictString = isRecord ? 'РЕКОРД КОЛЛЕКТОРА ПОБИТ' : 'СКИЛЛ НЕ ОБНАРУЖЕН';
    const verdictText = this.createText(layout.verdict, verdictString, {
      fontSize: '24px',
      color: isRecord ? '#16a34a' : '#6b21a8',
      fontStyle: 'bold',
      fontFamily: '"Gagalin", monospace',
      stroke: isRecord ? '#bbf7d0' : '#f3e8ff',
      strokeThickness: 3,
    }, 0.5, 0.5);
    this.editor.attach('verdict', verdictText, 'Текст вердикта', 350, 45);

    // --- Challenge Callout ---
    const challengeMessage = isRecord
      ? `Мой ${heroName} поставил новый рекорд: ${timeSurvived}! Попробуй побить мой счет!`
      : `Мой ${heroName} продержался ${timeSurvived}. Докажи, что ты не больший лузер - побей мой счет!`;

    const challengeText = this.createText(layout.challenge, `"${challengeMessage}"`, {
      fontSize: '12px',
      color: '#facc15',
      fontFamily: '"Balsamiq Sans", monospace',
      align: 'center',
      wordWrap: { width: 750 },
    }, 0.5, 0.5);
    this.editor.attach('challenge', challengeText, 'Цитата вызова', 600, 30);

    // --- Action Buttons ---
    this.renderButtons(layout, challengeMessage);

    // Render dev HUD
    this.editor.renderHud();
  }

  private renderButtons(layout: GameOverLayoutConfig, challengeMessage: string): void {
    let isActionTriggered = false;

    // 1. Share Button
    const sharePos = layout.shareBtn;
    const shareImg = this.createImage(sharePos, 'btn_frame_green', 280, 58);
    const shareTxt = this.createText(sharePos, 'ПОКАЗАТЬ ПОЗОР В ЧАТЕ', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: '"Gagalin", monospace',
    }, 0.5, 0.5);

    if (!this.editor.isEditMode) {
      shareImg.setInteractive({ useHandCursor: true });
      shareImg.on('pointerdown', () => {
        this.platform.vibrate(40);
        this.audio.playClick();
        this.platform.share?.(challengeMessage);
        shareTxt.setText('СКОПИРОВАНО В ЧАТ!');
        this.scene.time.delayedCall(1500, () => {
          if (shareTxt.active) shareTxt.setText('ПОКАЗАТЬ ПОЗОР В ЧАТЕ');
        });
      });
      this.attachButtonHover(shareImg, shareTxt, sharePos);
    }
    this.editor.attach('shareBtn', shareImg, 'Кнопка Шеринг', 280, 58, 0, 0, [shareTxt]);

    // 2. Play Again Button
    const playPos = layout.playBtn;
    const playImg = this.createImage(playPos, 'btn_frame_gold', 280, 58);
    const playTxt = this.createText(playPos, 'ЕЩЕ РАЗОК', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: '"Gagalin", monospace',
    }, 0.5, 0.5);

    if (!this.editor.isEditMode) {
      playImg.setInteractive({ useHandCursor: true });
      playImg.on('pointerdown', () => {
        if (isActionTriggered) return;
        isActionTriggered = true;
        this.platform.vibrate(30);
        this.audio.playClick();
        this.scene.time.delayedCall(40, () => {
          this.clear();
          this.scene.scene.restart();
        });
      });
      this.attachButtonHover(playImg, playTxt, playPos);
    }
    this.editor.attach('playBtn', playImg, 'Кнопка Еще разок', 280, 58, 0, 0, [playTxt]);

    // 3. Menu Button
    const menuPos = layout.menuBtn;
    const menuImg = this.createImage(menuPos, 'protocol_plate_rusty', 62, 42);
    const menuTxt = this.createText(menuPos, 'МЕНЮ', {
      fontSize: '11px',
      color: '#fef08a',
      fontStyle: 'bold',
      fontFamily: '"Gagalin", monospace',
    }, 0.5, 0.5);

    if (!this.editor.isEditMode) {
      menuImg.setInteractive({ useHandCursor: true });
      menuImg.on('pointerdown', () => {
        if (isActionTriggered) return;
        isActionTriggered = true;
        this.platform.vibrate(30);
        this.audio.playClick();
        this.scene.time.delayedCall(40, () => {
          this.clear();
          this.scene.scene.start('MenuScene');
        });
      });
      this.attachButtonHover(menuImg, menuTxt, menuPos, 1.05);
    }
    this.editor.attach('menuBtn', menuImg, 'Кнопка Меню', 62, 42, 0, 0, [menuTxt]);

    // 4. Revive Button (Monetization Placeholder)
    const revivePos = layout.reviveBtn;
    const reviveImg = this.createImage(revivePos, 'btn_frame_gold', 260, 52);
    const reviveTxt = this.createText(revivePos, 'ВОСКРЕСНУТЬ ЗА РЕКЛАМУ', {
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: '"Gagalin", monospace',
    }, 0.5, 0.5);

    if (!this.editor.isEditMode) {
      reviveImg.setInteractive({ useHandCursor: true });
      reviveImg.on('pointerdown', () => {
        this.platform.vibrate(30);
        this.audio.playClick();
        console.log('[Monetization] Revive triggered');
      });
      this.attachButtonHover(reviveImg, reviveTxt, revivePos);
    }
    this.editor.attach('reviveBtn', reviveImg, 'Кнопка Воскреснуть', 260, 52, 0, 0, [reviveTxt]);

    // 5. Double GOO Button (Monetization Placeholder)
    const gooPos = layout.doubleGooBtn;
    const doubleGooImg = this.createImage(gooPos, 'btn_frame_green', 210, 44);
    const doubleGooTxt = this.createText(gooPos, 'УДВОИТЬ GOO X2', {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: '"Gagalin", monospace',
    }, 0.5, 0.5);

    if (!this.editor.isEditMode) {
      doubleGooImg.setInteractive({ useHandCursor: true });
      doubleGooImg.on('pointerdown', () => {
        this.platform.vibrate(30);
        this.audio.playClick();
        console.log('[Monetization] Double GOO triggered');
      });
      this.attachButtonHover(doubleGooImg, doubleGooTxt, gooPos);
    }
    this.editor.attach('doubleGooBtn', doubleGooImg, 'Кнопка Удвоить GOO', 210, 44, 0, 0, [doubleGooTxt]);
  }

  private attachButtonHover(
    img: Phaser.GameObjects.Image,
    txt: Phaser.GameObjects.Text,
    pos: GameOverLayoutItem,
    factor = 1.03
  ): void {
    img.on('pointerover', () => {
      const s = (pos.scale ?? 1) * factor;
      img.setScale(s);
      txt.setScale(s);
    });
    img.on('pointerout', () => {
      const s = pos.scale ?? 1;
      img.setScale(s);
      txt.setScale(s);
    });
  }

  private createImage(
    pos: GameOverLayoutItem,
    key: string,
    displayWidth: number,
    displayHeight: number
  ): Phaser.GameObjects.Image {
    const img = this.scene.add
      .image(pos.x, pos.y, key)
      .setDisplaySize(displayWidth, displayHeight)
      .setScale(pos.scale ?? 1)
      .setAngle(pos.rot ?? 0)
      .setScrollFactor(0);

    this.modalContainer?.add(img);
    this.elements.push(img);
    return img;
  }

  private createText(
    pos: GameOverLayoutItem,
    text: string,
    style: Phaser.Types.GameObjects.Text.TextStyle,
    originX = 0.5,
    originY = 0.5
  ): Phaser.GameObjects.Text {
    const txt = this.scene.add
      .text(pos.x, pos.y, text, style)
      .setOrigin(originX, originY)
      .setScale(pos.scale ?? 1)
      .setAngle(pos.rot ?? 0)
      .setScrollFactor(0);

    this.modalContainer?.add(txt);
    this.elements.push(txt);
    return txt;
  }

  private getDiagnosis(state: GameState, isRecord: boolean): { diagnosisTitle: string; fiascoReason: string } {
    if (isRecord) {
      return { diagnosisTitle: 'РЕКОРД СЕКТОРА ПОБИТ!', fiascoReason: 'СДОХ, НО С РЕКОРДОМ' };
    }
    if (state.runTime < 90) {
      return {
        diagnosisTitle: state.runTime < 45 ? 'САМОЛИКВИДАЦИЯ ОТ ИСПУГА' : 'ЗАТОПТАН ПЛАНКТОНОМ',
        fiascoReason: 'СТАЯ МЕЛКИХ ТВАРЕЙ',
      };
    }
    if (state.kills > 250) {
      return { diagnosisTitle: 'РАЗМАЗАН ТОЛПОЙ ПО СТЕНЕ', fiascoReason: 'ПЕРЕДОЗ ОРДОЙ' };
    }
    if (state.gooCollected > 400) {
      return { diagnosisTitle: 'УМЕР ОТ ЖАДНОСТИ', fiascoReason: 'ПОГОНЯ ЗА СЛИЗЬЮ' };
    }
    return { diagnosisTitle: 'РАЗОБРАН НА СУВЕНИРЫ', fiascoReason: 'ЛОБОВОЙ ТАРАН' };
  }

  private clearRenderElements(): void {
    this.editor.clearHud();
    this.elements.forEach((el) => el.destroy());
    this.elements = [];
  }

  public clear(): void {
    this.isVisible = false;
    this.editor.destroy();
    this.clearRenderElements();

    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
    if (this.modalContainer) {
      this.modalContainer.destroy();
      this.modalContainer = null;
    }
  }
}
