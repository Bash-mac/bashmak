/**
 * Web Crypto utility functions for Telegram validation and Session JWTs.
 */

export async function hmacSha256(keyData: ArrayBuffer | Uint8Array | string, message: string): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const rawKey = typeof keyData === 'string' ? enc.encode(keyData) : keyData;
  const key = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', key, enc.encode(message));
}

export async function sha256(message: string): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  return await crypto.subtle.digest('SHA-256', enc.encode(message));
}

export function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export async function createSessionJwt(
  payload: { telegramId: number; username?: string; exp: number },
  secret: string
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const sigBuffer = await hmacSha256(secret, data);
  const sigHex = bufferToHex(sigBuffer);
  const encodedSig = base64UrlEncode(sigHex);

  return `${data}.${encodedSig}`;
}

export async function verifySessionJwt(
  token: string,
  secret: string
): Promise<{ telegramId: number; username?: string; exp: number } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSig] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;

    const expectedSigBuffer = await hmacSha256(secret, data);
    const expectedSigHex = bufferToHex(expectedSigBuffer);
    const expectedEncodedSig = base64UrlEncode(expectedSigHex);

    if (encodedSig !== expectedEncodedSig) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (typeof payload.exp === 'number' && Date.now() > payload.exp) {
      return null;
    }

    if (typeof payload.telegramId !== 'number') {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
