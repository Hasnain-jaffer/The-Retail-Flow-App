/**
 * Seed script — populates MongoDB with sample products and customers so
 * the app isn't empty on first run.
 *
 * Requires a real MONGODB_URI in apps/api/.env — this connects directly
 * to MongoDB and won't do anything useful against demo mode (in-memory
 * data only exists inside the API server's own process while it's
 * running, so a separate script process can't populate it).
 *
 * Run with: npx tsx src/seed.ts
 * (from inside apps/api)
 */
import dns from 'dns'; // Set DNS servers to Google's public DNS servers
dns.setServers(['8.8.8.8', '8.8.4.4']);

import "dotenv/config";
import mongoose from "mongoose";
import { Product } from "./models/Product.js";
import { Customer } from "./models/Customer.js";

const sampleProducts = [
  { name: "Wireless Headphones", sku: "WH-001", category: "Electronics", price: 79.99, cost: 42.00, stock: 45, minStock: 10 },
  { name: "Cotton T-Shirt", sku: "TS-002", category: "Clothing", price: 24.99, cost: 8.50, stock: 120, minStock: 20 },
  { name: "Running Shoes", sku: "RS-003", category: "Footwear", price: 129.99, cost: 65.00, stock: 5, minStock: 10 },
  { name: "Coffee Mug", sku: "CM-004", category: "Home", price: 14.99, cost: 4.20, stock: 0, minStock: 15 },
  { name: "Laptop Stand", sku: "LS-005", category: "Electronics", price: 49.99, cost: 22.00, stock: 28, minStock: 5 },
  { name: "Yoga Mat", sku: "YM-006", category: "Sports", price: 34.99, cost: 12.50, stock: 60, minStock: 10 },
  { name: "Bluetooth Speaker", sku: "BS-007", category: "Electronics", price: 59.99, cost: 28.00, stock: 3, minStock: 8 },
  { name: "Water Bottle", sku: "WB-008", category: "Sports", price: 19.99, cost: 6.00, stock: 95, minStock: 20 },
  { name: "Desk Lamp", sku: "DL-009", category: "Home", price: 39.99, cost: 15.00, stock: 22, minStock: 8 },
  { name: "Backpack", sku: "BP-010", category: "Accessories", price: 54.99, cost: 24.00, stock: 40, minStock: 10 },
];

const sampleCustomers = [
  { name: "Sarah Johnson", email: "sarah@email.com", phone: "+1 555-0101", loyaltyTier: "gold", loyaltyPoints: 2450 },
  { name: "Mike Chen", email: "mike@email.com", phone: "+1 555-0102", loyaltyTier: "silver", loyaltyPoints: 1200 },
  { name: "Emily Davis", email: "emily@email.com", phone: "+1 555-0103", loyaltyTier: "platinum", loyaltyPoints: 3800 },
  { name: "James Wilson", email: "james@email.com", phone: "+1 555-0104", loyaltyTier: "bronze", loyaltyPoints: 450 },
  { name: "Lisa Anderson", email: "lisa@email.com", phone: "+1 555-0105", loyaltyTier: "gold", loyaltyPoints: 1800 },
];

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI is not set in apps/api/.env — nothing to seed against.");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB");

  let productsAdded = 0;
  for (const p of sampleProducts) {
    const exists = await Product.findOne({ sku: p.sku });
    if (exists) continue;
    await Product.create(p);
    productsAdded++;
  }
  console.log(`📦 Added ${productsAdded} products (${sampleProducts.length - productsAdded} already existed)`);

  let customersAdded = 0;
  for (const cust of sampleCustomers) {
    const exists = await Customer.findOne({ email: cust.email });
    if (exists) continue;
    await Customer.create(cust);
    customersAdded++;
  }
  console.log(`👥 Added ${customersAdded} customers (${sampleCustomers.length - customersAdded} already existed)`);

  await mongoose.disconnect();
  console.log("✅ Done");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});