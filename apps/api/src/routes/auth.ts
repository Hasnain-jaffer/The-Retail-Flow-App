import { Hono } from "hono";
import { z } from "zod";
import bcrypt from "bcryptjs";
import * as jose from "jose";
import { inDemoMode } from "../db/client.js";
import { demoUsers } from "../db/memoryStore.js";
import { User } from "../models/User.js";
import { JWT_SECRET, setAuthCookie, clearAuthCookie } from "../lib/auth-cookies.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/rbac.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Role is intentionally NOT accepted from the client here — self-
// registered accounts start as "viewer" (except the very first account
// ever created — see the bootstrap comment in the register handler
// below). Only an existing admin can promote someone via the
// RBAC-protected PATCH /api/auth/users/:id/role route below.
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2),
});

const auth = new Hono();

const toPublicUser = (u: any) => ({ id: String(u.id ?? u._id), email: u.email, name: u.name, role: u.role });

async function signToken(user: any) {
  return new jose.SignJWT({ id: String(user.id ?? user._id), email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

async function findUserByEmail(email: string) {
  if (inDemoMode()) return demoUsers.findOne((u) => u.email === email);
  return User.findOne({ email });
}

async function countUsers() {
  if (inDemoMode()) return demoUsers.count();
  return User.countDocuments();
}

async function createUser(data: { email: string; password: string; name: string; role: string }) {
  if (inDemoMode()) return demoUsers.insert({ ...data, isActive: true });
  return User.create(data);
}

auth.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name } = registerSchema.parse(body);

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return c.json({ error: "Email already registered" }, 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Bootstrap exception: the very first account on a brand-new instance
    // becomes admin automatically — otherwise there would be no way to
    // ever get an admin account without direct database access. This
    // only fires when the user collection is completely empty (checked
    // server-side by counting real documents, not trusted from anything
    // the client sends), and every registration after that first one
    // still defaults to "viewer" like normal.
    const isFirstUser = (await countUsers()) === 0;
    const newUser = await createUser({
      email, password: hashedPassword, name,
      role: isFirstUser ? "admin" : "viewer",
    });

    const token = await signToken(newUser);
    setAuthCookie(c, token);

    return c.json({ token, user: toPublicUser(newUser) }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors }, 400);
    }
    return c.json({ error: "Internal server error" }, 500);
  }
});

auth.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = loginSchema.parse(body);

    const foundUser = await findUserByEmail(email);

    // Login NEVER creates an account and NEVER derives a role from the
    // email string — an unknown email is just a failed login, exactly
    // like a wrong password, same status code and message for both.
    if (!foundUser) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    const validPassword = await bcrypt.compare(password, foundUser.password);
    if (!validPassword) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    const token = await signToken(foundUser);
    setAuthCookie(c, token);

    return c.json({ token, user: toPublicUser(foundUser) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors }, 400);
    }
    return c.json({ error: "Internal server error" }, 500);
  }
});

auth.post("/logout", (c) => {
  clearAuthCookie(c);
  return c.json({ message: "Logged out" });
});

auth.get("/me", authMiddleware, async (c) => {
  const authedUser = c.get("user");
  const id = authedUser.id as string;

  const found = inDemoMode()
    ? demoUsers.findById(id)
    : await User.findById(id);

  if (!found) return c.json({ error: "User not found" }, 404);
  return c.json({ user: toPublicUser(found) });
});

// ---- Admin-only user management ----

auth.get("/users", authMiddleware, requireAdmin, async (c) => {
  const all = inDemoMode() ? demoUsers.all() : await User.find();
  return c.json({ users: all.map(toPublicUser) });
});

const roleUpdateSchema = z.object({
  role: z.enum(["admin", "manager", "staff", "viewer"]),
});

auth.patch("/users/:id/role", authMiddleware, requireAdmin, async (c) => {
  try {
    const id = c.req.param("id");
    const { role } = roleUpdateSchema.parse(await c.req.json());
    const authedUser = c.get("user");

    if (id === authedUser.id) {
      return c.json({ error: "You cannot change your own role" }, 400);
    }

    const updated = inDemoMode()
      ? demoUsers.update(id, { role })
      : await User.findByIdAndUpdate(id, { role }, { new: true });

    if (!updated) return c.json({ error: "User not found" }, 404);
    return c.json({ user: toPublicUser(updated) });
  } catch (error) {
    if (error instanceof z.ZodError) return c.json({ error: error.errors }, 400);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default auth;
