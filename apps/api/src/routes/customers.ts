import { Hono } from "hono";
import { z } from "zod";
import { inDemoMode } from "../db/client.js";
import { demoCustomers, demoOrders } from "../db/memoryStore.js";
import { Customer } from "../models/Customer.js";
import { Order } from "../models/Order.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireStaff } from "../middleware/rbac.js";

const customersRouter = new Hono();

// Get all customers — requires auth: this table has PII (email, phone,
// address, spending history) and previously had no auth check at all.
customersRouter.get("/", authMiddleware, async (c) => {
  try {
    const query = c.req.query("q");
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = (page - 1) * limit;

    if (inDemoMode()) {
      let results = demoCustomers.all();
      if (query) results = results.filter((cust) => cust.name.toLowerCase().includes(query.toLowerCase()));
      results = [...results].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      const total = results.length;
      return c.json({
        customers: results.slice(offset, offset + limit),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }

    const filter: any = query ? { name: { $regex: query, $options: "i" } } : {};
    const results = await Customer.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit);
    const total = await Customer.countDocuments(filter);

    return c.json({
      customers: results,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    return c.json({ error: "Failed to fetch customers" }, 500);
  }
});

// Get single customer with order history — same PII reasoning as above.
customersRouter.get("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");

    if (inDemoMode()) {
      const customer = demoCustomers.findById(id);
      if (!customer) return c.json({ error: "Customer not found" }, 404);
      const orders = demoOrders.find((o) => o.customerId === id);
      return c.json({ customer: { ...customer, orders } });
    }

    const customer = await Customer.findById(id);
    if (!customer) return c.json({ error: "Customer not found" }, 404);

    const orders = await Order.find({ customerId: id }).sort({ createdAt: -1 });
    return c.json({ customer: { ...customer.toObject(), orders } });
  } catch {
    return c.json({ error: "Failed to fetch customer" }, 500);
  }
});

const customerWriteSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  loyaltyTier: z.enum(["bronze", "silver", "gold", "platinum"]).optional(),
  loyaltyPoints: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

customersRouter.post("/", authMiddleware, requireStaff, async (c) => {
  try {
    const body = customerWriteSchema.parse(await c.req.json());
    const customer = inDemoMode() ? demoCustomers.insert(body) : await Customer.create(body);
    return c.json({ customer }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return c.json({ error: error.errors }, 400);
    return c.json({ error: "Failed to create customer" }, 500);
  }
});

customersRouter.put("/:id", authMiddleware, requireStaff, async (c) => {
  try {
    const id = c.req.param("id");
    const body = customerWriteSchema.partial().parse(await c.req.json());

    const customer = inDemoMode()
      ? demoCustomers.update(id, body)
      : await Customer.findByIdAndUpdate(id, body, { new: true });

    if (!customer) return c.json({ error: "Customer not found" }, 404);
    return c.json({ customer });
  } catch (error) {
    if (error instanceof z.ZodError) return c.json({ error: error.errors }, 400);
    return c.json({ error: "Failed to update customer" }, 500);
  }
});

customersRouter.delete("/:id", authMiddleware, requireStaff, async (c) => {
  try {
    const id = c.req.param("id");
    const deleted = inDemoMode() ? demoCustomers.delete(id) : await Customer.findByIdAndDelete(id);
    if (!deleted) return c.json({ error: "Customer not found" }, 404);
    return c.json({ message: "Customer deleted" });
  } catch {
    return c.json({ error: "Failed to delete customer" }, 500);
  }
});

export default customersRouter;
