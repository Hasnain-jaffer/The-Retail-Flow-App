import { Hono } from "hono";
import { z } from "zod";
import { inDemoMode } from "../db/client.js";
import { demoProducts } from "../db/memoryStore.js";
import { Product } from "../models/Product.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireStaff } from "../middleware/rbac.js";

const productsRouter = new Hono();

function withStatus(p: any) {
  const status = p.stock === 0 ? "out_of_stock" : p.stock <= p.minStock ? "low_stock" : "in_stock";
  return { ...p, status };
}

// Get all products with filtering — requires auth: the `cost` field is
// internal margin data, not something to expose to anonymous requests.
productsRouter.get("/", authMiddleware, async (c) => {
  try {
    const query = c.req.query("q");
    const category = c.req.query("category");
    const status = c.req.query("status");
    const sortBy = c.req.query("sortBy") || "name";
    const sortOrder = c.req.query("sortOrder") || "asc";
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = (page - 1) * limit;

    if (inDemoMode()) {
      let results = demoProducts.all().map(withStatus);
      if (query) results = results.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
      if (category && category !== "All") results = results.filter((p) => p.category === category);
      if (status) results = results.filter((p) => p.status === status);
      results.sort((a, b) => {
        const dir = sortOrder === "desc" ? -1 : 1;
        return a[sortBy] > b[sortBy] ? dir : a[sortBy] < b[sortBy] ? -dir : 0;
      });
      const total = results.length;
      return c.json({
        products: results.slice(offset, offset + limit),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }

    const filter: any = {};
    if (query) filter.name = { $regex: query, $options: "i" };
    if (category && category !== "All") filter.category = category;
    // status is a virtual (derived from stock), so it's applied after the
    // DB query rather than as part of the Mongo filter itself.

    const sortDir = sortOrder === "desc" ? -1 : 1;
    let results = await Product.find(filter).sort({ [sortBy]: sortDir }).skip(offset).limit(limit);
    let mapped = results.map((p) => withStatus(p.toObject()));
    if (status) mapped = mapped.filter((p) => p.status === status);

    const total = await Product.countDocuments(filter);

    return c.json({
      products: mapped,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch products" }, 500);
  }
});

// Get single product — same reasoning as above (internal cost field).
productsRouter.get("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const product = inDemoMode() ? demoProducts.findById(id) : await Product.findById(id);

    if (!product) {
      return c.json({ error: "Product not found" }, 404);
    }

    return c.json({ product: withStatus(inDemoMode() ? product : (product as any).toObject()) });
  } catch {
    return c.json({ error: "Failed to fetch product" }, 500);
  }
});

const productWriteSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.string().min(1),
  price: z.number(),
  cost: z.number().optional(),
  stock: z.number().int().min(0).optional(),
  minStock: z.number().int().min(0).optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  barcode: z.string().optional(),
});

productsRouter.post("/", authMiddleware, requireStaff, async (c) => {
  try {
    const body = productWriteSchema.parse(await c.req.json());
    const product = inDemoMode() ? demoProducts.insert(body) : await Product.create(body);
    return c.json({ product: withStatus(inDemoMode() ? product : (product as any).toObject()) }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return c.json({ error: error.errors }, 400);
    return c.json({ error: "Failed to create product" }, 500);
  }
});

productsRouter.put("/:id", authMiddleware, requireStaff, async (c) => {
  try {
    const id = c.req.param("id");
    const body = productWriteSchema.partial().parse(await c.req.json());

    const product = inDemoMode()
      ? demoProducts.update(id, body)
      : await Product.findByIdAndUpdate(id, body, { new: true });

    if (!product) return c.json({ error: "Product not found" }, 404);
    return c.json({ product: withStatus(inDemoMode() ? product : (product as any).toObject()) });
  } catch (error) {
    if (error instanceof z.ZodError) return c.json({ error: error.errors }, 400);
    return c.json({ error: "Failed to update product" }, 500);
  }
});

productsRouter.delete("/:id", authMiddleware, requireStaff, async (c) => {
  try {
    const id = c.req.param("id");
    const deleted = inDemoMode() ? demoProducts.delete(id) : await Product.findByIdAndDelete(id);
    if (!deleted) return c.json({ error: "Product not found" }, 404);
    return c.json({ message: "Product deleted" });
  } catch {
    return c.json({ error: "Failed to delete product" }, 500);
  }
});

productsRouter.get("/categories/list", authMiddleware, async (c) => {
  try {
    const categories = inDemoMode()
      ? [...new Set(demoProducts.all().map((p) => p.category))]
      : await Product.distinct("category");
    return c.json({ categories });
  } catch {
    return c.json({ error: "Failed to fetch categories" }, 500);
  }
});

export default productsRouter;
