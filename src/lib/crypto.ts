// AES-256-GCM symmetric encryption for at-rest secrets (TOTP shared secrets).
//
// Key management: `MFA_ENCRYPTION_KEY` env var, 32 bytes encoded as hex
// (64 hex chars). Generated with `openssl rand -hex 32`.
//
// HIPAA-relevant: TOTP shared secrets are a credential, so they must be
// encrypted at rest. The DB-level encryption (Postgres native + Neon's
// AES at rest) is necessary but not sufficient — column-level encryption
// here means a DB dump alone never reveals MFA secrets.

import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM standard
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.MFA_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      "MFA_ENCRYPTION_KEY not set. Generate with: openssl rand -hex 32",
    );
  }
  if (hex.length !== 64) {
    throw new Error("MFA_ENCRYPTION_KEY must be 32 bytes (64 hex chars)");
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypt a UTF-8 string. Returns a self-contained base64 payload:
 *   [12-byte IV][16-byte auth tag][ciphertext]
 * Decryption requires the same MFA_ENCRYPTION_KEY.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

/**
 * Decrypt a payload produced by encrypt(). Throws if the tag doesn't
 * verify — never silently returns garbage.
 */
export function decrypt(payload: string): string {
  const key = getKey();
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const enc = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
