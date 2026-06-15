// TOTP (RFC 6238) for HIPAA-aligned MFA.
//
// Each user has one TOTP secret. We:
//   - Generate it server-side (32 base32 chars = 160 bits entropy)
//   - Encode it as an otpauth:// URL with the issuer "Watermelon"
//   - Render that URL as a QR code for the user to scan with any
//     authenticator app (Google Authenticator, 1Password, Authy, etc.)
//   - Encrypt the raw secret with AES-256-GCM before storing
//   - On each verify, decrypt and call otpauth's window-aware validate
//     (defaults to ±1 step = ±30s clock skew tolerance)

import { Secret, TOTP } from "otpauth";
import QRCode from "qrcode";
import { decrypt, encrypt } from "./crypto";

const ISSUER = "Watermelon";
const DIGITS = 6;
const PERIOD = 30; // seconds
const ALGORITHM = "SHA1"; // standard for compatibility with all authenticator apps

export interface MfaEnrollment {
  secret: string;        // base32 — show to user as fallback if QR doesn't scan
  secretEncrypted: string; // store this in DB
  otpauthUrl: string;    // otpauth://totp/Watermelon:email?secret=...&issuer=Watermelon
  qrDataUrl: string;     // data:image/png;base64,... — drop into <img src=...>
}

/** Build a fresh enrollment kit for a given user email. */
export async function buildEnrollment(userEmail: string): Promise<MfaEnrollment> {
  // 20-byte (160-bit) secret encoded as base32 = 32 chars
  const secret = new Secret({ size: 20 });
  const totp = new TOTP({
    issuer: ISSUER,
    label: userEmail,
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD,
    secret,
  });
  const otpauthUrl = totp.toString();
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1, scale: 6 });

  return {
    secret: secret.base32,
    secretEncrypted: encrypt(secret.base32),
    otpauthUrl,
    qrDataUrl,
  };
}

/** Verify a 6-digit token against an encrypted secret. */
export function verifyToken(secretEncrypted: string, token: string): boolean {
  const cleaned = token.replace(/\s+/g, "").trim();
  if (!/^\d{6}$/.test(cleaned)) return false;

  let secretBase32: string;
  try {
    secretBase32 = decrypt(secretEncrypted);
  } catch {
    return false;
  }

  const totp = new TOTP({
    issuer: ISSUER,
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD,
    secret: Secret.fromBase32(secretBase32),
  });

  // Allow ±1 period (30s) of clock skew. Returns delta if valid, null if not.
  const delta = totp.validate({ token: cleaned, window: 1 });
  return delta !== null;
}
