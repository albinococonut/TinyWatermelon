// Signed short-lived tokens for the family magic-link portal.
// These tokens are what appear in the PHI-free SMS body as wmln.app/o/:token.
//
// Format: base64url(JSON payload) + "." + HMAC-SHA256 signature.
// Payload contains { slotId, childId, exp } — never PHI in plaintext.
// The signature prevents forgery; expiry prevents replay.

import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_SECRET = process.env.PORTAL_TOKEN_SECRET ?? process.env.AUTH_SECRET ?? "dev-fallback-change-me";
const TTL_SECONDS = 24 * 60 * 60; // 24 hours

export interface PortalTokenPayload {
  slotId: string;
  childId: string;
  organizationId: string;
  exp: number; // unix timestamp
}

function sign(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", TOKEN_SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function verify(token: string): PortalTokenPayload | null {
  try {
    const [data, sig] = token.split(".");
    if (!data || !sig) return null;
    const expected = createHmac("sha256", TOKEN_SECRET).update(data).digest("base64url");
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as PortalTokenPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createPortalToken(payload: Omit<PortalTokenPayload, "exp">): string {
  return sign({ ...payload, exp: Math.floor(Date.now() / 1000) + TTL_SECONDS });
}

export function verifyPortalToken(token: string): PortalTokenPayload | null {
  return verify(token);
}
