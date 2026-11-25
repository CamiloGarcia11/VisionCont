import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

/**
 * Genera un hash seguro con sal aleatoria usando scrypt (sin dependencias nativas).
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${derived}`;
}

/**
 * Verifica una contraseña en texto plano contra un hash almacenado usando comparación en tiempo constante.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;

  const expectedBuf = Buffer.from(expectedHex, "hex");
  const actualBuf = scryptSync(password, salt, KEY_LENGTH);

  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
