import { Hono } from "hono";
import { inDemoMode } from "../db/client.js";
import { demoOrders, demoProducts, demoCustomers } from "../db/memoryStore.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Customer } from "../models/Customer.js";
import { authMiddleware } from "../middleware/auth.js";

const reportsRouter = new Hono();

function periodToStartDate(period: string): Date {
  const now = new Date();
  const start = new Date();
  switch (period) {
    case "24h": start.setDate(now.getDate() - 1); break;
    case "7d": start.setDate(now.getDate() - 7); break;
    case "30d": start.setDate(now.getDate() - 30); break;
    case "90d": start.setDate(now.getDate() - 90); break;
    case "1y": start.setFullYear(now.getFullYear() - 1); break;
    default: start.setDate(now.getDate() - parseInt(period || "30")); break;
  }
  return start;
}

reportsRouter.get("/revenue", authMiddleware, async (c) => {
  try {
    const period = c.req.query("period") || "7d";
    const now = new Date();
    const startDate = periodToStartDate(period);

    if (inDemoMode()) {
      const inRange = demoOrders.find((o) => new Date(o.createdAt) >= startDate && new Date(o.createdAt) <= now);
      const total = inRange.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const byDay: Record<string, { revenue: number; orders: number }> = {};
      for (const o of inRange) {
        const day = new Date(o.createdAt).toISOString().slice(0, 10);
        byDay[day] = byDay[day] || { revenue: 0, orders: 0 };
        byDay[day].revenue += Number(o.total || 0);
        byDay[day].orders += 1;
      }
      const daily = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, ...v }));
      return c.json({ summary: { total, count: inRange.length }, daily });
    }

    const orders = await Order.find({ createdAt: { $gte: startDate, $lte: now } });
    const total = orders.reduce((sum, o: any) => sum + Number(o.total || 0), 0);
    const byDay: Record<string, { revenue: number; orders: number }> = {};
    for (const o of orders as any[]) {
      const day = new Date(o.createdAt).toISOString().slice(0, 10);
      byDay[day] = byDay[day] || { revenue: 0, orders: 0 };
      byDay[day].revenue += Number(o.total || 0);
      byDay[day].orders += 1;
    }
    const daily = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));

    return c.json({ summary: { total, count: orders.length }, daily });
  } catch {
    return c.json({ error: "Failed to generate revenue report" }, 500);
  }
});

reportsRouter.get("/top-products", authMiddleware, async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "10");
    const period = c.req.query("period") || "30d";
    const now = new Date();
    const startDate = periodToStartDate(period);

    const tally: Record<string, { productId: string; name: string; totalSold: number; revenue: number }> = {};

    if (inDemoMode()) {
      const inRange = demoOrders.find((o) => new Date(o.createdAt) >= startDate && new Date(o.createdAt) <= now);
      for (const o of inRange) {
        for (const item of o.items || []) {
          const product = demoProducts.findById(item.productId);
          const key = item.productId;
          tally[key] = tally[key] || { productId: key, name: product?.name || "Unknown", totalSold: 0, revenue: 0 };
          tally[key].totalSold += item.quantity;
          tally[key].revenue += Number(item.total || 0);
        }
      }
    } else {
      const orders = await Order.find({ createdAt: { $gte: startDate, $lte: now } });
      for (const o of orders as any[]) {
        for (const item of o.items || []) {
          const key = String(item.productId);
          tally[key] = tally[key] || { productId: key, name: "", totalSold: 0, revenue: 0 };
          tally[key].totalSold += item.quantity;
          tally[key].revenue += Number(item.total || 0);
        }
      }
      const products = await Product.find({ _id: { $in: Object.keys(tally) } });
      for (const p of products as any[]) {
        if (tally[String(p._id)]) tally[String(p._id)].name = p.name;
      }
    }

    const topProducts = Object.values(tally).sort((a, b) => b.totalSold - a.totalSold).slice(0, limit);
    return c.json({ products: topProducts });
  } catch {
    return c.json({ error: "Failed to generate top products report" }, 500);
  }
});

reportsRouter.get("/categories", authMiddleware, async (c) => {
  try {
    const period = c.req.query("period") || "30d";
    const now = new Date();
    const startDate = periodToStartDate(period);

    const tally: Record<string, { category: string; revenue: number; units: number }> = {};

    if (inDemoMode()) {
      const inRange = demoOrders.find((o) => new Date(o.createdAt) >= startDate && new Date(o.createdAt) <= now);
      for (const o of inRange) {
        for (const item of o.items || []) {
          const product = demoProducts.findById(item.productId);
          const cat = product?.category || "Uncategorized";
          tally[cat] = tally[cat] || { category: cat, revenue: 0, units: 0 };
          tally[cat].revenue += Number(item.total || 0);
          tally[cat].units += item.quantity;
        }
      }
    } else {
      const orders = await Order.find({ createdAt: { $gte: startDate, $lte: now } });
      const productIds = [...new Set(orders.flatMap((o: any) => o.items.map((i: any) => String(i.productId))))];
      const products = await Product.find({ _id: { $in: productIds } });
      const categoryById: Record<string, string> = {};
      for (const p of products as any[]) categoryById[String(p._id)] = p.category;

      for (const o of orders as any[]) {
        for (const item of o.items || []) {
          const cat = categoryById[String(item.productId)] || "Uncategorized";
          tally[cat] = tally[cat] || { category: cat, revenue: 0, units: 0 };
          tally[cat].revenue += Number(item.total || 0);
          tally[cat].units += item.quantity;
        }
      }
    }

    const categories = Object.values(tally).sort((a, b) => b.revenue - a.revenue);
    return c.json({ categories });
  } catch {
    return c.json({ error: "Failed to generate category report" }, 500);
  }
});

reportsRouter.get("/dashboard", authMiddleware, async (c) => {
  try {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeek = new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000);

    let currentWeek = { revenue: 0, orders: 0 };
    let previousWeek = { revenue: 0, orders: 0 };
    let productCount = 0, customerCount = 0, lowStock: any[] = [];

    if (inDemoMode()) {
      const curOrders = demoOrders.find((o) => new Date(o.createdAt) >= weekAgo);
      currentWeek = { revenue: curOrders.reduce((s, o) => s + Number(o.total || 0), 0), orders: curOrders.length };

      const prevOrders = demoOrders.find((o) => new Date(o.createdAt) >= lastWeek && new Date(o.createdAt) < weekAgo);
      previousWeek = { revenue: prevOrders.reduce((s, o) => s + Number(o.total || 0), 0), orders: prevOrders.length };

      productCount = demoProducts.count();
      customerCount = demoCustomers.count();
      lowStock = demoProducts.find((p) => p.stock <= p.minStock).slice(0, 5);
    } else {
      const curOrders = await Order.find({ createdAt: { $gte: weekAgo } });
      currentWeek = { revenue: curOrders.reduce((s, o: any) => s + Number(o.total || 0), 0), orders: curOrders.length };

      const prevOrders = await Order.find({ createdAt: { $gte: lastWeek, $lt: weekAgo } });
      previousWeek = { revenue: prevOrders.reduce((s, o: any) => s + Number(o.total || 0), 0), orders: prevOrders.length };

      productCount = await Product.countDocuments();
      customerCount = await Customer.countDocuments();
      const allProducts = await Product.find();
      lowStock = allProducts.filter((p: any) => p.stock <= p.minStock).slice(0, 5);
    }

    return c.json({
      stats: {
        revenue: {
          current: currentWeek.revenue,
          previous: previousWeek.revenue,
          change: previousWeek.revenue > 0
            ? (((currentWeek.revenue - previousWeek.revenue) / previousWeek.revenue) * 100).toFixed(1)
            : 0,
        },
        orders: {
          current: currentWeek.orders,
          previous: previousWeek.orders,
          change: previousWeek.orders > 0
            ? (((currentWeek.orders - previousWeek.orders) / previousWeek.orders) * 100).toFixed(1)
            : 0,
        },
        products: productCount,
        customers: customerCount,
      },
      lowStock,
    });
  } catch {
    return c.json({ error: "Failed to generate dashboard stats" }, 500);
  }
});

export default reportsRouter;
