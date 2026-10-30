import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto'

// scrypt (memory-hard, built into Node) — no native dependency in the image.
const KEYLEN = 64
const PARAMS: ScryptOptions = { N: 16384, r: 8, p: 1 }

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, KEYLEN, PARAMS, (err, key) => (err ? reject(err) : resolve(key))),
  )
}

/** Returns `scrypt$<salt b64>$<hash b64>`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await derive(password, salt)
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, saltB64, hashB64] = stored.split('$')
  if (algo !== 'scrypt' || !saltB64 || !hashB64) return false
  const expected = Buffer.from(hashB64, 'base64')
  const key = await derive(password, Buffer.from(saltB64, 'base64'))
  return key.length === expected.length && timingSafeEqual(key, expected)
}
