import Phaser from 'phaser';
import { createPlatformAdapter } from '../../../platform';
import { SaveManager } from '../../core/SaveManager';
import { GameApiClient } from '../../../api/GameApiClient';
import { AudioManager } from '../../audio/AudioManager';

export class AuthModal {
  private scene: Phaser.Scene;
  private platform = createPlatformAdapter();
  private audio = AudioManager.getInstance();
  private elements: Phaser.GameObjects.GameObject[] = [];
  public isVisible = false;
  private onSyncCallback?: () => void;

  constructor(scene: Phaser.Scene, onSync?: () => void) {
    this.scene = scene;
    this.onSyncCallback = onSync;
  }

  public show(): void {
    this.clear();
    this.isVisible = true;

    const { width, height } = this.scene.cameras.main;
    const saveManager = SaveManager.getInstance();
    const apiClient = GameApiClient.getInstance();
    const isTelegram = this.platform.isTelegram;
    const authUser = apiClient.getCurrentUser() || (isTelegram ? this.platform.getUser() : null);
    const isAuth = Boolean(
      isTelegram ||
      (apiClient.isAuthenticated() && authUser && (authUser as any).id !== 'guest')
    );

    const scale = Math.min((width * 0.96) / 1280, (height * 0.96) / 720);
    const centerX = width / 2;
    const centerY = height / 2;

    // 1. Dark overlay
    const overlay = this.scene.add
      .rectangle(centerX, centerY, width, height, 0x090d16, 0.88)
      .setScrollFactor(0)
      .setDepth(10000)
      .setInteractive();
    this.elements.push(overlay);

    // 2. Main modal frame
    const modalWidth = 520 * scale;
    const modalHeight = 380 * scale;
    const frameBg = this.scene.add
      .rectangle(centerX, centerY, modalWidth, modalHeight, 0x131a2a, 0.96)
      .setStrokeStyle(3 * scale, isAuth ? 0x4ade80 : 0x38bdf8)
      .setScrollFactor(0)
      .setDepth(10001);
    this.elements.push(frameBg);

    // 3. Header title
    const titleText = isAuth ? 'ПРОФИЛЬ TELEGRAM' : 'ВХОД В АККАУНТ';
    const titleColor = isAuth ? '#4ade80' : '#38bdf8';
    const titleStroke = isAuth ? '#064e3b' : '#075985';

    const title = this.scene.add
      .text(centerX, centerY - 140 * scale, titleText, {
        fontSize: `${Math.round(24 * scale)}px`,
        fontStyle: 'bold',
        color: titleColor,
        fontFamily: 'monospace',
        stroke: titleStroke,
        strokeThickness: Math.round(4 * scale),
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10002);
    this.elements.push(title);

    // 4. Content details
    const stats = (saveManager as any).data?.stats || { totalRuns: 0, bestScore: 0, totalGooEarned: 0 };
    const goo = saveManager.getGoo();

    if (isAuth && authUser) {
      const userName = (authUser as any).username ? `@${(authUser as any).username}` : (authUser as any).firstName || 'Игрок';
      const tgId = (authUser as any).telegramId || (authUser as any).id || 'Cloudflare D1';

      const contentLines = [
        `ИМЯ: ${userName}`,
        `TELEGRAM ID: ${tgId}`,
        `СТАТУС: ОНЛАЙН (CLOUDFLARE D1)`,
        `БАЛАНС GOO: ${goo}`,
        `ВСЕГО ЗАБЕГОВ: ${stats.totalRuns}`,
        `ЛУЧШИЙ СЧЕТ: ${stats.bestScore}`,
      ];

      const content = this.scene.add
        .text(centerX, centerY - 15 * scale, contentLines.join('\n'), {
          fontSize: `${Math.round(15 * scale)}px`,
          color: '#cbd5e1',
          fontFamily: 'monospace',
          align: 'center',
          lineSpacing: Math.round(7 * scale),
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(10002);
      this.elements.push(content);

      // Sync button
      const btnSyncY = centerY + 90 * scale;
      const btnSyncBg = this.scene.add
        .rectangle(centerX, btnSyncY, 260 * scale, 42 * scale, 0x166534, 1)
        .setStrokeStyle(2 * scale, 0x4ade80)
        .setScrollFactor(0)
        .setDepth(10002)
        .setInteractive({ useHandCursor: true });
      this.elements.push(btnSyncBg);

      const btnSyncText = this.scene.add
        .text(centerX, btnSyncY, 'СИНХРОНИЗИРОВАТЬ', {
          fontSize: `${Math.round(14 * scale)}px`,
          fontStyle: 'bold',
          color: '#ffffff',
          fontFamily: 'monospace',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(10003);
      this.elements.push(btnSyncText);

      btnSyncBg.on('pointerdown', async () => {
        this.platform.vibrate(25);
        this.audio.playClick();
        btnSyncText.setText('ОБНОВЛЕНИЕ...');
        await saveManager.syncWithServer();
        if (this.onSyncCallback) this.onSyncCallback();
        btnSyncText.setText('СИНХРОНИЗИРОВАНО!');
        this.scene.time.delayedCall(800, () => this.hide());
      });
    } else {
      // Guest mode
      const descLines = [
        'Войдите через Telegram, чтобы',
        'сохранять баланс и прокачку онлайн',
        'и играть с единым прогрессом везде.',
      ];

      const descText = this.scene.add
        .text(centerX, centerY - 50 * scale, descLines.join('\n'), {
          fontSize: `${Math.round(15 * scale)}px`,
          color: '#cbd5e1',
          fontFamily: 'monospace',
          align: 'center',
          lineSpacing: Math.round(7 * scale),
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(10002);
      this.elements.push(descText);

      // Mount official Telegram Login Widget DOM Element in the center
      const widgetY = centerY + 25 * scale;
      this.mountTelegramWidget(centerX, widgetY);

      // Bot link
      const botLinkText = this.scene.add
        .text(centerX, centerY + 85 * scale, 'Или открыть бота: @BashmakAppBot', {
          fontSize: `${Math.round(13 * scale)}px`,
          color: '#38bdf8',
          fontFamily: 'monospace',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(10002)
        .setInteractive({ useHandCursor: true });
      this.elements.push(botLinkText);

      botLinkText.on('pointerdown', () => {
        if (typeof window !== 'undefined') {
          window.open('https://t.me/BashmakAppBot', '_blank');
        }
      });
    }

    // Close Button
    const btnCloseY = centerY + (isAuth ? 145 : 140) * scale;
    const btnCloseBg = this.scene.add
      .rectangle(centerX, btnCloseY, 140 * scale, 34 * scale, 0x334155, 0.9)
      .setStrokeStyle(1.5 * scale, 0x94a3b8)
      .setScrollFactor(0)
      .setDepth(10002)
      .setInteractive({ useHandCursor: true });
    this.elements.push(btnCloseBg);

    const btnCloseText = this.scene.add
      .text(centerX, btnCloseY, 'ЗАКРЫТЬ', {
        fontSize: `${Math.round(13 * scale)}px`,
        fontStyle: 'bold',
        color: '#cbd5e1',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10003);
    this.elements.push(btnCloseText);

    btnCloseBg.on('pointerdown', () => {
      this.platform.vibrate(20);
      this.audio.playClick();
      this.hide();
    });
  }

  private mountTelegramWidget(centerX: number, centerY: number): void {
    if (typeof document === 'undefined') return;

    this.unmountTelegramWidget();

    // Register global auth handler
    (window as any).onTelegramAuth = async (user: Record<string, string | number>) => {
      try {
        const apiClient = GameApiClient.getInstance();
        const res = await apiClient.authTelegramWeb(user);
        if (res.profile) {
          SaveManager.getInstance().hydrateFromProfile(res.profile);
        }
        if (this.onSyncCallback) this.onSyncCallback();
        // Immediately switch modal to authenticated profile view
        this.show();
      } catch (err) {
        console.error('[AuthModal] Telegram web auth failed:', err);
      }
    };

    const container = document.createElement('div');
    container.id = 'tg-login-widget-container';
    container.style.position = 'fixed';
    container.style.left = `${centerX}px`;
    container.style.top = `${centerY}px`;
    container.style.transform = 'translate(-50%, -50%)';
    container.style.zIndex = '10005';

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', 'BashmakAppBot');
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '6');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    container.appendChild(script);
    document.body.appendChild(container);
  }

  private unmountTelegramWidget(): void {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById('tg-login-widget-container');
    if (existing) {
      existing.remove();
    }
  }

  public hide(): void {
    this.unmountTelegramWidget();
    this.clear();
    this.isVisible = false;
  }

  private clear(): void {
    this.unmountTelegramWidget();
    this.elements.forEach((el) => el.destroy());
    this.elements = [];
  }
}
