import { hmacSha256, sha256, bufferToHex } from './crypto';

export interface TelegramUserData {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

/**
 * Validates Telegram Mini App initData string.
 * According to Telegram documentation:
 * 1. Parse query params.
 * 2. Extract hash.
 * 3. Sort all remaining keys alphabetically.
 * 4. Format into key=value\n string.
 * 5. secret_key = HMAC-SHA-256("WebAppData", bot_token)
 * 6. calculated_hash = HMAC-SHA-256(secret_key, data_check_string)
 */
export async function validateTelegramMiniAppInitData(
  initData: string,
  botToken: string
): Promise<{ valid: boolean; user?: TelegramUserData; authDate?: number }> {
  try {
    if (!initData || !botToken) return { valid: false };

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return { valid: false };

    params.delete('hash');

    const sortedKeys = Array.from(params.keys()).sort();
    const checkString = sortedKeys.map((k) => `${k}=${params.get(k)}`).join('\n');

    // secret = HMAC_SHA256("WebAppData", botToken)
    const secretKeyBuffer = await hmacSha256('WebAppData', botToken);

    // calculatedHash = HMAC_SHA256(secretKeyBuffer, checkString)
    const calculatedHashBuffer = await hmacSha256(secretKeyBuffer, checkString);
    const calculatedHash = bufferToHex(calculatedHashBuffer);

    if (calculatedHash.toLowerCase() !== hash.toLowerCase()) {
      return { valid: false };
    }

    const authDate = parseInt(params.get('auth_date') || '0', 10);
    const rawUser = params.get('user');
    let user: TelegramUserData | undefined;
    if (rawUser) {
      user = JSON.parse(rawUser);
    }

    return {
      valid: true,
      user,
      authDate,
    };
  } catch (err) {
    console.error('[validateTelegramMiniAppInitData] Error:', err);
    return { valid: false };
  }
}

/**
 * Validates Telegram Web Login Widget data.
 * According to Telegram Login Widget doc:
 * 1. Keys: id, first_name, last_name, username, photo_url, auth_date, hash.
 * 2. checkString = sorted key=value lines without hash.
 * 3. secret_key = SHA256(bot_token).
 * 4. calculated_hash = HMAC_SHA256(secret_key, checkString).
 */
export async function validateTelegramWebLogin(
  data: Record<string, string | number>,
  botToken: string
): Promise<{ valid: boolean; user?: TelegramUserData }> {
  try {
    const hash = String(data.hash || '');
    if (!hash || !botToken) return { valid: false };

    const keys = Object.keys(data).filter((k) => k !== 'hash').sort();
    const checkString = keys.map((k) => `${k}=${data[k]}`).join('\n');

    const secretKeyBuffer = await sha256(botToken);
    const calculatedHashBuffer = await hmacSha256(secretKeyBuffer, checkString);
    const calculatedHash = bufferToHex(calculatedHashBuffer);

    if (calculatedHash.toLowerCase() !== hash.toLowerCase()) {
      return { valid: false };
    }

    return {
      valid: true,
      user: {
        id: Number(data.id),
        first_name: data.first_name ? String(data.first_name) : undefined,
        last_name: data.last_name ? String(data.last_name) : undefined,
        username: data.username ? String(data.username) : undefined,
      },
    };
  } catch (err) {
    console.error('[validateTelegramWebLogin] Error:', err);
    return { valid: false };
  }
}
