import { randomBytes, scrypt, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)
const KEY_LENGTH = 64

/** Stored as "salt:hash", both hex — no new dependency (bcrypt/argon2) needed for a single scrypt call per auth attempt. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer
  return `${salt}:${derivedKey.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer
  const storedBuffer = Buffer.from(hash, 'hex')
  // timingSafeEqual throws on length mismatch rather than returning false —
  // a malformed/truncated stored hash shouldn't crash the login attempt.
  if (storedBuffer.length !== derivedKey.length) return false
  return timingSafeEqual(derivedKey, storedBuffer)
}
