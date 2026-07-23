import type { Role } from "@/store/auth";

/**
 * Mirrors the backend's role hierarchy (see apps/api/src/middleware/rbac.ts)
 * so the UI hides/disables the same actions the API would reject anyway —
 * a viewer should never see an "Add Product" button that just 403s when
 * clicked.
 */
const STAFF_LEVEL: Role[] = ["admin", "manager", "staff"];

export function canWrite(role: Role | undefined) {
  return !!role && STAFF_LEVEL.includes(role);
}

export function isAdmin(role: Role | undefined) {
  return role === "admin";
}
