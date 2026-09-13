import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const SCRYPT_PREFIX = 'scrypt';

/** Generic short-numeric-secret hasher — used for both customer MPIN and ATM PIN. */
export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pin, salt, 64).toString('hex');
  return `${SCRYPT_PREFIX}:${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [prefix, salt, hash] = stored.split(':');
  if (prefix !== SCRYPT_PREFIX || !salt || !hash) {
    return false;
  }
  const candidate = scryptSync(pin, salt, 64).toString('hex');
  return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'));
}
