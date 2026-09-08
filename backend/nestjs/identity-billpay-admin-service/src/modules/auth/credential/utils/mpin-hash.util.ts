import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const SCRYPT_PREFIX = 'scrypt';

export function hashMpin(mpin: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(mpin, salt, 64).toString('hex');
  return `${SCRYPT_PREFIX}:${salt}:${hash}`;
}

export function verifyMpin(mpin: string, stored: string): boolean {
  const [prefix, salt, hash] = stored.split(':');
  if (prefix !== SCRYPT_PREFIX || !salt || !hash) {
    return false;
  }
  const candidate = scryptSync(mpin, salt, 64).toString('hex');
  return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'));
}
