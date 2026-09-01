import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, GameActionRequest, StartRunRequest, FinishRunRequest } from './types';
import { validateTelegramMiniAppInitData, validateTelegramWebLogin } from './auth/telegram';
import { createSessionJwt, verifySessionJwt } from './auth/crypto';
import { GameService } from './game/gameService';
import { RunService } from './game/runService';

type Variables = {
  telegramId: number;
  username?: string;
  gameService: GameService;
  runService: RunService;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Enable CORS
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Helper to get JWT Secret
function getJwtSecret(env: Env): string {
  return env.JWT_SECRET || 'bashmak_dev_secret_key_change_in_production_98765';
}

// ----------------------------------------------------
// AUTH ENDPOINTS (Public)
// ----------------------------------------------------

/**
 * Telegram Mini App Auth
 */
app.post('/api/auth/telegram-tma', async (c) => {
  try {
    const body = await c.req.json<{ initData: string }>();
    if (!body.initData) {
      return c.json({ error: 'MISSING_INIT_DATA' }, 400);
    }

    const botToken = c.env.BOT_TOKEN;

    let telegramId: number;
    let username: string | undefined;
    let firstName: string | undefined;
    let languageCode: string | undefined;

    if (botToken) {
      const validation = await validateTelegramMiniAppInitData(body.initData, botToken);
      if (!validation.valid || !validation.user?.id) {
        return c.json({ error: 'INVALID_TELEGRAM_SIGNATURE' }, 401);
      }
      telegramId = validation.user.id;
      username = validation.user.username;
      firstName = validation.user.first_name;
      languageCode = validation.user.language_code;
    } else if (c.env.DEV_MODE === 'true') {
      // Dev / Test mode fallback
      const params = new URLSearchParams(body.initData);
      const rawUser = params.get('user');
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        telegramId = parsed.id || 999999;
        username = parsed.username || 'dev_player';
        firstName = parsed.first_name || 'Dev';
      } else {
        telegramId = 999999;
        username = 'dev_player';
        firstName = 'Dev';
      }
    }

    const gameService = new GameService(c.env.DB);
    const { profile } = await gameService.getOrCreateUserAndProfile(telegramId, {
      username,
      first_name: firstName,
      language_code: languageCode,
    });

    const exp = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
    const token = await createSessionJwt({ telegramId, username, exp }, getJwtSecret(c.env));

    return c.json({
      success: true,
      token,
      user: {
        telegramId,
        username,
        firstName,
      },
      profile,
    });
  } catch (err) {
    console.error('[auth/telegram-tma] Error:', err);
    return c.json({ error: 'AUTH_FAILED', message: String(err) }, 500);
  }
});

/**
 * Telegram Web Widget Auth
 */
app.post('/api/auth/telegram-web', async (c) => {
  try {
    const body = await c.req.json<Record<string, string | number>>();
    const botToken = c.env.BOT_TOKEN;

    let telegramId: number;
    let username: string | undefined;
    let firstName: string | undefined;

    if (botToken) {
      const validation = await validateTelegramWebLogin(body, botToken);
      if (!validation.valid || !validation.user?.id) {
        return c.json({ error: 'INVALID_TELEGRAM_WEB_SIGNATURE' }, 401);
      }
      telegramId = validation.user.id;
      username = validation.user.username;
      firstName = validation.user.first_name;
    } else if (c.env.DEV_MODE === 'true') {
      telegramId = Number(body.id) || 999999;
      username = body.username ? String(body.username) : 'web_player';
      firstName = body.first_name ? String(body.first_name) : 'Web';
    }

    const gameService = new GameService(c.env.DB);
    const { profile } = await gameService.getOrCreateUserAndProfile(telegramId, {
      username,
      first_name: firstName,
    });

    const exp = Date.now() + 30 * 24 * 60 * 60 * 1000;
    const token = await createSessionJwt({ telegramId, username, exp }, getJwtSecret(c.env));

    return c.json({
      success: true,
      token,
      user: {
        telegramId,
        username,
        firstName,
      },
      profile,
    });
  } catch (err) {
    console.error('[auth/telegram-web] Error:', err);
    return c.json({ error: 'AUTH_FAILED', message: String(err) }, 500);
  }
});

/**
 * Dev / Guest Login (Enabled for local dev or tests)
 */
app.post('/api/auth/dev-login', async (c) => {
  const body = await c.req.json<{ telegramId?: number; username?: string }>().catch(() => ({}));
  const telegramId = body.telegramId || 100001;
  const username = body.username || 'guest_tester';

  const gameService = new GameService(c.env.DB);
  const { profile } = await gameService.getOrCreateUserAndProfile(telegramId, {
    username,
    first_name: 'Tester',
  });

  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const token = await createSessionJwt({ telegramId, username, exp }, getJwtSecret(c.env));

  return c.json({
    success: true,
    token,
    user: {
      telegramId,
      username,
      firstName: 'Tester',
    },
    profile,
  });
});

// ----------------------------------------------------
// PROTECTED API MIDDLEWARE
// ----------------------------------------------------

app.use('/api/*', async (c, next) => {
  if (c.req.path.startsWith('/api/auth/')) {
    return next();
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'UNAUTHORIZED_MISSING_TOKEN' }, 401);
  }

  const token = authHeader.substring(7);
  const verified = await verifySessionJwt(token, getJwtSecret(c.env));
  if (!verified) {
    return c.json({ error: 'UNAUTHORIZED_INVALID_TOKEN' }, 401);
  }

  c.set('telegramId', verified.telegramId);
  c.set('username', verified.username);
  c.set('gameService', new GameService(c.env.DB));
  c.set('runService', new RunService(c.env.DB, c.get('gameService')));

  await next();
});

// ----------------------------------------------------
// GAME ENDPOINTS (Protected)
// ----------------------------------------------------

/**
 * Full Canonical Profile Snapshot
 */
app.get('/api/profile', async (c) => {
  const telegramId = c.get('telegramId');
  const gameService = c.get('gameService');

  const profile = await gameService.getProfile(telegramId);
  if (!profile) {
    return c.json({ error: 'PROFILE_NOT_FOUND' }, 404);
  }

  return c.json({
    success: true,
    profile,
  });
});

/**
 * Idempotent Economy & Meta Action
 */
app.post('/api/action', async (c) => {
  const telegramId = c.get('telegramId');
  const gameService = c.get('gameService');
  const body = await c.req.json<GameActionRequest>();

  const result = await gameService.executeAction(telegramId, body);
  return c.json(result.body, result.status as any);
});

/**
 * Run Start
 */
app.post('/api/run/start', async (c) => {
  const telegramId = c.get('telegramId');
  const runService = c.get('runService');
  const body = await c.req.json<StartRunRequest>().catch(() => ({ heroId: '' }));

  const result = await runService.startRun(telegramId, body);
  return c.json(result.body, result.status as any);
});

/**
 * Idempotent Run Finish with Validation
 */
app.post('/api/run/finish', async (c) => {
  const telegramId = c.get('telegramId');
  const runService = c.get('runService');
  const body = await c.req.json<FinishRunRequest>();

  const result = await runService.finishRun(telegramId, body);
  return c.json(result.body, result.status as any);
});

// Fallback to static assets (for Cloudflare Pages)
app.all('*', (c) => {
  if (c.env.ASSETS && typeof c.env.ASSETS.fetch === 'function') {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.text('Not Found', 404);
});

export default app;
