import { randomBytes } from "crypto";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import type { Context } from "hono";

/**
 * JWT secret resolution.
 *
 * Previously this fell back to a hardcoded literal string
 * ("retailflow-secret-key-change-in-production") baked into the source
 * code. Anyone who has ever seen this repo (which, being a starter
 * template, is a lot of people) can forge valid tokens for any
 * deployment that forgot to set JWT_SECRET.
 *
 * Now: if JWT_SECRET isn't set, we generate a random 32-byte secret once
 * at boot instead. Tokens minted with it stop being valid on restart
 * (fine for local demo use — that's what demo mode already implies) and,
 * critically, nobody can pre-compute a forgeable secret by reading this
 * file. In production this should always be set explicitly so sessions
 * survive a restart; we log loudly if it isn't.
 */
function resolveJwtSecret(): Uint8Array {
  if (process.env.JWT_SECRET) {
    return new TextEncoder().encode(process.env.JWT_SECRET);
  }

  if (process.env.NODE_ENV === "production") {
    console.error("❌ JWT_SECRET is not set. Refusing to start in production without it.");
    process.exit(1);
  }

  console.warn(
    "⚠️  JWT_SECRET is not set — using a random secret generated for this process only.\n" +
    "   Sessions will not survive a server restart. Set JWT_SECRET in apps/api/.env for real use."
  );
  return randomBytes(32);
}

export const JWT_SECRET = resolveJwtSecret();

const COOKIE_NAME = "token";
const isProd = process.env.NODE_ENV === "production";

/**
 * httpOnly cookie for the JWT — client-side JS (including an XSS
 * payload) can never read it. The frontend no longer stores the token
 * itself at all; see apps/web/src/store/auth.ts.
 *
 * SameSite is "None" in production (not "Strict"/"Lax") on purpose: the
 * frontend (Vercel) and this API (Render) are deployed on two completely
 * different domains, and a cross-site cookie is only ever sent by the
 * browser at all when SameSite=None + Secure is set. "Strict" would
 * silently stop the cookie from being sent on every request from the
 * deployed frontend — login would appear to succeed but every
 * subsequent request would look logged-out. Locally both apps run on
 * localhost so "Lax" is fine (and doesn't require HTTPS, which
 * SameSite=None requires from the browser).
 */
export function setAuthCookie(c: Context, token: string) {
  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "None" : "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days, matches the JWT's own expiry
  });
}

export function clearAuthCookie(c: Context) {
  // Must match the attributes used in setAuthCookie (path, sameSite,
  // secure) — a delete with mismatched attributes silently fails to
  // remove the cookie in some browsers, which would leave someone
  // "logged out" in the UI but still holding a valid session cookie.
  deleteCookie(c, COOKIE_NAME, {
    path: "/",
    secure: isProd,
    sameSite: isProd ? "None" : "Lax",
  });
}

/** Bearer header OR the httpOnly cookie — Bearer kept for any future non-browser client. */
export function getTokenFromRequest(c: Context): string | null {
  const authHeader = c.req.header("authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.split(" ")[1];
  return getCookie(c, COOKIE_NAME) || null;
}
