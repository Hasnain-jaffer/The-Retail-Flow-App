const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/**
 * SECURITY: no token is read from localStorage here anymore. The backend
 * sets the JWT as an httpOnly cookie on login/register (see
 * apps/api/src/lib/auth-cookies.ts) — client-side JS, including an XSS
 * payload, can never read it. `credentials: "include"` makes the browser
 * attach that cookie automatically on every request instead.
 */
export async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  // Some endpoints (e.g. logout) may return an empty body
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
