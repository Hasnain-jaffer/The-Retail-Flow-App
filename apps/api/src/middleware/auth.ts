import { createMiddleware } from "hono/factory";
import * as jose from "jose";
import { JWT_SECRET, getTokenFromRequest } from "../lib/auth-cookies.js";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "staff" | "viewer";
}

export interface AuthContext {
  user: AuthUser;
}

export const authMiddleware = createMiddleware<{
  Variables: AuthContext;
}>(async (c, next) => {
  const token = getTokenFromRequest(c); // Bearer header OR httpOnly cookie

  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    c.set("user", payload as unknown as AuthUser);
    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
});
