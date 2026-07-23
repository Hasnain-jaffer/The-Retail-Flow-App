import dns from 'dns'; // Set DNS servers to Google's public DNS servers
dns.setServers(['8.8.8.8', '8.8.4.4']);

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import "dotenv/config";

import { connectDB } from "./db/client.js";
import authRoutes from "./routes/auth.js";
import productsRoutes from "./routes/products.js";
import ordersRoutes from "./routes/orders.js";
import customersRoutes from "./routes/customers.js";
import reportsRoutes from "./routes/reports.js";

await connectDB();

const app = new Hono();

// Middleware
// Origins are read from an env var so this works across environments
// without editing code: locally both apps run on localhost, but once
// deployed the frontend (Vercel) and backend (Render) are on completely
// different domains, so the allowed origin has to be the real Vercel URL.
// ALLOWED_ORIGINS accepts a comma-separated list, e.g.
// "https://retailflow.vercel.app,https://retailflow-staging.vercel.app"
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000", "http://localhost:5173"];

app.use("*", cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use("*", logger());

// Health check
app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// API Routes
app.route("/api/auth", authRoutes);
app.route("/api/products", productsRoutes);
app.route("/api/orders", ordersRoutes);
app.route("/api/customers", customersRoutes);
app.route("/api/reports", reportsRoutes);

// 404 handler
app.notFound((c) => c.json({ error: "Not found" }, 404));

// Error handler
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

const port = parseInt(process.env.PORT || "5000");

console.log(`🚀 RetailFlow API running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
