import { createMiddleware } from "hono/factory";
import type { AuthContext } from "./auth.js";

type Role = "admin" | "manager" | "staff" | "viewer";

const roleHierarchy: Record<Role, number> = {
  viewer: 0,
  staff: 1,
  manager: 2,
  admin: 3,
};

export const requireRole = (minRole: Role) => {
  return createMiddleware<{ Variables: AuthContext }>(async (c, next) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userLevel = roleHierarchy[user.role as Role] ?? 0;
    const requiredLevel = roleHierarchy[minRole];

    if (userLevel < requiredLevel) {
      return c.json({ error: "Forbidden: Insufficient permissions" }, 403);
    }

    await next();
  });
};

export const requireAdmin = requireRole("admin");
export const requireManager = requireRole("manager");
export const requireStaff = requireRole("staff");
