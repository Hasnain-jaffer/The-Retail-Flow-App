import mongoose from "mongoose";

const connectionString = process.env.MONGODB_URI || "";

let isDemoMode = true;

export async function connectDB() {
  if (!connectionString) {
    console.warn(
      "⚠️  MONGODB_URI is not set — running in demo mode.\n" +
      "   Auth (register/login/roles) works fully with real in-memory\n" +
      "   persistence. Products/orders/customers also persist in-memory\n" +
      "   for this process, but reset on restart. Set MONGODB_URI in\n" +
      "   apps/api/.env (e.g. a free MongoDB Atlas cluster) for a real,\n" +
      "   durable database."
    );
    isDemoMode = true;
    return;
  }

  try {
    await mongoose.connect(connectionString);
    isDemoMode = false;
    console.log("✅ Connected to MongoDB");
  } catch (e) {
    console.warn("⚠️  Could not connect to MongoDB. Falling back to demo mode (in-memory, resets on restart).", e);
    isDemoMode = true;
  }
}

export function inDemoMode() {
  return isDemoMode;
}
