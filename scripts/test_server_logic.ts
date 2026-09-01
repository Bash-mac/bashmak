import { validateTelegramMiniAppInitData, validateTelegramWebLogin } from '../server/src/auth/telegram';
import { createSessionJwt, verifySessionJwt, hmacSha256, bufferToHex, sha256 } from '../server/src/auth/crypto';
import { SERVER_META_POWERUPS, getPowerUpCost } from '../server/src/game/metaConfig';

async function runTests() {
  console.log('--- STARTING SERVER LOGIC TESTS ---');

  const botToken = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';
  const jwtSecret = 'test_jwt_secret_key_123';

  // 1. Test Telegram TMA initData generation & validation
  const userObj = { id: 77712345, first_name: 'Vasya', username: 'vasya_shoemaker' };
  const authDate = Math.floor(Date.now() / 1000);
  const dataCheckString = `auth_date=${authDate}\nuser=${JSON.stringify(userObj)}`;

  const secretKey = await hmacSha256('WebAppData', botToken);
  const hash = bufferToHex(await hmacSha256(secretKey, dataCheckString));

  const initData = `user=${encodeURIComponent(JSON.stringify(userObj))}&auth_date=${authDate}&hash=${hash}`;

  const tmaResult = await validateTelegramMiniAppInitData(initData, botToken);
  console.log('TMA Validation valid:', tmaResult.valid, 'User ID:', tmaResult.user?.id);
  if (!tmaResult.valid || tmaResult.user?.id !== 77712345) {
    throw new Error('TMA validation failed!');
  }

  // 2. Test Telegram Web Login Widget generation & validation
  const webAuthData: Record<string, string | number> = {
    id: 77712345,
    first_name: 'Vasya',
    username: 'vasya_shoemaker',
    auth_date: authDate,
  };
  const webCheckString = `auth_date=${authDate}\nfirst_name=Vasya\nid=77712345\nusername=vasya_shoemaker`;
  const webSecretKey = await sha256(botToken);
  const webHash = bufferToHex(await hmacSha256(webSecretKey, webCheckString));
  webAuthData.hash = webHash;

  const webResult = await validateTelegramWebLogin(webAuthData, botToken);
  console.log('Web Login Validation valid:', webResult.valid, 'User ID:', webResult.user?.id);
  if (!webResult.valid || webResult.user?.id !== 77712345) {
    throw new Error('Web login validation failed!');
  }

  // 3. Test JWT Session token issue & verify
  const token = await createSessionJwt({ telegramId: 77712345, username: 'vasya_shoemaker', exp: Date.now() + 3600000 }, jwtSecret);
  const verified = await verifySessionJwt(token, jwtSecret);
  console.log('JWT Verification telegramId:', verified?.telegramId, 'username:', verified?.username);
  if (!verified || verified.telegramId !== 77712345) {
    throw new Error('JWT verification failed!');
  }

  // 4. Test Meta PowerUp cost calculations
  const hpDef = SERVER_META_POWERUPS['power_hp'];
  const cost0 = getPowerUpCost(hpDef, 0); // 100
  const cost1 = getPowerUpCost(hpDef, 1); // 150
  console.log(`HP Upgrade Level 0 cost: ${cost0}, Level 1 cost: ${cost1}`);
  if (cost0 !== 100 || cost1 !== 150) {
    throw new Error('PowerUp cost calculation mismatch!');
  }

  console.log('--- ALL SERVER LOGIC TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
