import { Hono } from "hono";
import { z } from "zod";
import { inDemoMode } from "../db/client.js";
import { demoOrders, demoProducts, demoCustomers } from "../db/memoryStore.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Customer } from "../models/Customer.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireStaff } from "../middleware/rbac.js";

const ordersRouter = new Hono();

function generateOrderNumber() {
  const date = new Date();
  return `ORD-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
}

// Get all orders — requires auth: order history is business-sensitive
// and was previously readable by anyone, unauthenticated.
ordersRouter.get("/", authMiddleware, async (c) => {
  try {
    const status = c.req.query("status");
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = (page - 1) * limit;

    if (inDemoMode()) {
      let results = demoOrders.all();
      if (status) results = results.filter((o) => o.status === status);
      results = [...results].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      const total = results.length;
      const paged = results.slice(offset, offset + limit).map((o) => ({
        ...o,
        customer: o.customerId ? demoCustomers.findById(o.customerId) : null,
      }));
      return c.json({ orders: paged, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    }

    const filter: any = {};
    if (status) filter.status = status;

    const results = await Order.find(filter)
      .populate("customerId")
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);
    const total = await Order.countDocuments(filter);

    return c.json({
      orders: results.map((o: any) => ({ ...o.toObject(), customer: o.customerId || null })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    return c.json({ error: "Failed to fetch orders" }, 500);
  }
});

// Get single order — items are embedded, so no join is needed here.
ordersRouter.get("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");

    if (inDemoMode()) {
      const order = demoOrders.findById(id);
      if (!order) return c.json({ error: "Order not found" }, 404);
      const customer = order.customerId ? demoCustomers.findById(order.customerId) : null;
      const items = (order.items || []).map((item: any) => ({
        ...item, product: demoProducts.findById(item.productId),
      }));
      return c.json({ order: { ...order, customer, items } });
    }

    const order = await Order.findById(id).populate("customerId").populate("items.productId");
    if (!order) return c.json({ error: "Order not found" }, 404);

    const obj = order.toObject() as any;
    return c.json({
      order: {
        ...obj,
        customer: obj.customerId || null,
        items: obj.items.map((item: any) => ({ ...item, product: item.productId })),
      },
    });
  } catch {
    return c.json({ error: "Failed to fetch order" }, 500);
  }
});

const orderItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1),
  unitPrice: z.number(),
  total: z.number(),
});

const orderWriteSchema = z.object({
  customerId: z.string().optional(),
  status: z.enum(["pending", "processing", "completed", "cancelled"]).optional(),
  subtotal: z.number(),
  tax: z.number().optional(),
  discount: z.number().optional(),
  total: z.number(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).default([]),
});

// Create order (a "sale" from the POS) — decrements stock for each item
// and, if a customer is attached, rolls their spend/order-count forward.
ordersRouter.post("/", authMiddleware, requireStaff, async (c) => {
  try {
    const body = orderWriteSchema.parse(await c.req.json());
    const { items, ...orderData } = body;
    const orderNumber = generateOrderNumber();

    if (inDemoMode()) {
      const order = demoOrders.insert({ ...orderData, orderNumber, items });
      for (const item of items) {
        const product = demoProducts.findById(item.productId);
        if (product) demoProducts.update(item.productId, { stock: Math.max(0, product.stock - item.quantity) });
      }
      if (orderData.customerId) {
        const customer = demoCustomers.findById(orderData.customerId);
        if (customer) {
          demoCustomers.update(orderData.customerId, {
            totalSpent: (customer.totalSpent || 0) + body.total,
            orderCount: (customer.orderCount || 0) + 1,
          });
        }
      }
      return c.json({ order }, 201);
    }

    const order = await Order.create({ ...orderData, orderNumber, items });

    for (const item of items) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
    }
    if (orderData.customerId) {
      await Customer.findByIdAndUpdate(orderData.customerId, {
        $inc: { totalSpent: body.total, orderCount: 1 },
      });
    }

    return c.json({ order }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return c.json({ error: error.errors }, 400);
    return c.json({ error: "Failed to create order" }, 500);
  }
});

const statusUpdateSchema = z.object({
  status: z.enum(["pending", "processing", "completed", "cancelled"]),
});

ordersRouter.patch("/:id/status", authMiddleware, requireStaff, async (c) => {
  try {
    const id = c.req.param("id");
    const { status } = statusUpdateSchema.parse(await c.req.json());

    const order = inDemoMode()
      ? demoOrders.update(id, { status })
      : await Order.findByIdAndUpdate(id, { status }, { new: true });

    if (!order) return c.json({ error: "Order not found" }, 404);
    return c.json({ order });
  } catch (error) {
    if (error instanceof z.ZodError) return c.json({ error: error.errors }, 400);
    return c.json({ error: "Failed to update order" }, 500);
  }
});

export default ordersRouter;
