import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, Download, Pencil, Trash2, Grid, List,
  ArrowUpDown, AlertTriangle, CheckCircle2, XCircle, Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fadeIn, staggerContainer } from "@/lib/motion";
import { apiFetch } from "@/api/client";
import { useAuthStore } from "@/store/auth";
import { canWrite } from "@/lib/roles";

interface Product {
  id: string; name: string; sku: string; category: string;
  price: string | number; stock: number; minStock: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
  updatedAt?: string;
}

export default function InventoryPage() {
  const { user } = useAuthStore();
  const canEdit = canWrite(user?.role);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<keyof Product>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const loadProducts = () => {
    setLoading(true);
    apiFetch(`/products?limit=200${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}${selectedCategory !== "All" ? `&category=${encodeURIComponent(selectedCategory)}` : ""}`)
      .then((data) => { setProducts(data.products || []); setError(""); })
      .catch((err) => setError(err.message || "Failed to load inventory"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    apiFetch("/products/categories/list")
      .then((data) => setCategories(["All", ...(data.categories || [])]))
      .catch(() => {});
  }, []);

  // Re-fetch when search/category changes — the backend does the
  // filtering (it's the source of truth, not a client-side .filter() over
  // a small hardcoded array like before).
  useEffect(() => {
    const debounce = setTimeout(loadProducts, 250);
    return () => clearTimeout(debounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCategory]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this product? This can't be undone.")) return;
    try {
      await apiFetch(`/products/${id}`, { method: "DELETE" });
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete product");
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    const aVal = a[sortField], bVal = b[sortField];
    if (typeof aVal === "string" && typeof bVal === "string") return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    if (typeof aVal === "number" && typeof bVal === "number") return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    return 0;
  });

  const toggleSort = (field: keyof Product) => {
    if (sortField === field) setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDirection("asc"); }
  };

  const toggleSelect = (id: string) => {
    setSelectedProducts((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === sortedProducts.length) setSelectedProducts(new Set());
    else setSelectedProducts(new Set(sortedProducts.map((p) => p.id)));
  };

  const getStockStatus = (product: Product) => {
    if (product.stock === 0) return { label: "Out of Stock", color: "text-red-500", bg: "bg-red-500/10", icon: XCircle };
    if (product.stock <= product.minStock) return { label: "Low Stock", color: "text-amber-500", bg: "bg-amber-500/10", icon: AlertTriangle };
    return { label: "In Stock", color: "text-emerald-500", bg: "bg-emerald-500/10", icon: CheckCircle2 };
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", sku: "", category: "", price: "", stock: "0", minStock: "10" });
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    setAdding(true);
    try {
      await apiFetch("/products", {
        method: "POST",
        body: JSON.stringify({
          ...newProduct,
          price: newProduct.price,
          stock: Number(newProduct.stock),
          minStock: Number(newProduct.minStock),
        }),
      });
      setShowAddModal(false);
      setNewProduct({ name: "", sku: "", category: "", price: "", stock: "0", minStock: "10" });
      loadProducts();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add product");
    } finally {
      setAdding(false);
    }
  };

  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= p.minStock).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

  if (loading && products.length === 0) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 rounded-lg bg-white/5 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
        <div className="h-96 rounded-2xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center">
        <p className="text-destructive font-medium">Couldn't load inventory</p>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-6">
      <motion.div variants={fadeIn} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground mt-1">
            {canEdit ? "Manage products, stock levels, and categories" : "Browse products and stock levels"}
          </p>
        </div>
        {canEdit && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium shadow-lg hover:shadow-glow transition-all">
            <Plus className="w-4 h-4" /> Add Product
          </motion.button>
        )}
      </motion.div>

      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}>
            <motion.form
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()} onSubmit={handleAddProduct}
              className="glass-card rounded-2xl p-6 w-full max-w-md space-y-4">
              <h3 className="font-semibold text-lg">Add Product</h3>
              {addError && <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">{addError}</div>}
              <div className="grid grid-cols-2 gap-3">
                <input required placeholder="Name" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="col-span-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none text-sm" />
                <input required placeholder="SKU" value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none text-sm" />
                <input required placeholder="Category" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none text-sm" />
                <input required type="number" step="0.01" placeholder="Price" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none text-sm" />
                <input type="number" placeholder="Stock" value={newProduct.stock} onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none text-sm" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-white/5 transition-colors">Cancel</button>
                <button type="submit" disabled={adding} className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50">
                  {adding ? "Adding..." : "Add Product"}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Products", value: products.length.toString(), color: "text-primary" },
          { label: "Low Stock", value: lowStockCount.toString(), color: "text-amber-500" },
          { label: "Out of Stock", value: outOfStockCount.toString(), color: "text-red-500" },
        ].map((stat) => (
          <motion.div key={stat.label} variants={fadeIn} className="glass-card rounded-2xl p-5">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className={cn("text-3xl font-bold mt-1", stat.color)}>{stat.value}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <motion.button key={cat} whileTap={{ scale: 0.95 }} onClick={() => setSelectedCategory(cat)}
              className={cn("px-3 py-2 rounded-lg text-sm font-medium transition-all", selectedCategory === cat ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground hover:bg-white/10")}>
              {cat}
            </motion.button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="flex p-1 rounded-xl bg-white/5">
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setViewMode("grid")} className={cn("p-2 rounded-lg", viewMode === "grid" && "bg-white/10")}><Grid className="w-4 h-4" /></motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setViewMode("list")} className={cn("p-2 rounded-lg", viewMode === "list" && "bg-white/10")}><List className="w-4 h-4" /></motion.button>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium">
            <Download className="w-4 h-4" /> Export
          </motion.button>
        </div>
      </motion.div>

      {viewMode === "list" ? (
        <motion.div variants={fadeIn} className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4"><input type="checkbox" checked={selectedProducts.size === sortedProducts.length && sortedProducts.length > 0} onChange={toggleSelectAll} className="rounded bg-white/5 border-white/10" /></th>
                  {[{ key: "name" as const, label: "Product" }, { key: "sku" as const, label: "SKU" }, { key: "category" as const, label: "Category" }, { key: "price" as const, label: "Price" }, { key: "stock" as const, label: "Stock" }].map((col) => (
                    <th key={col.key} className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors" onClick={() => toggleSort(col.key)}>
                      <div className="flex items-center gap-1">{col.label}<ArrowUpDown className={cn("w-3 h-3", sortField === col.key && "text-primary")} /></div>
                    </th>
                  ))}
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {sortedProducts.map((product) => {
                    const status = getStockStatus(product);
                    const StatusIcon = status.icon;
                    return (
                      <motion.tr key={product.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4"><input type="checkbox" checked={selectedProducts.has(product.id)} onChange={() => toggleSelect(product.id)} className="rounded bg-white/5 border-white/10" /></td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center"><ImageIcon className="w-4 h-4 text-muted-foreground" /></div>
                            <span className="font-medium text-sm">{product.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-mono text-sm text-muted-foreground">{product.sku}</td>
                        <td className="py-4 px-4 text-sm">{product.category}</td>
                        <td className="py-4 px-4 font-medium">${Number(product.price).toFixed(2)}</td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div className={cn("h-full rounded-full", product.stock > product.minStock ? "bg-emerald-500" : product.stock > 0 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${Math.min((product.stock / (product.minStock * 3)) * 100, 100)}%` }} />
                            </div>
                            <span className="text-sm">{product.stock}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4"><span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", status.bg, status.color)}><StatusIcon className="w-3 h-3" />{status.label}</span></td>
                        <td className="py-4 px-4">
                          {canEdit ? (
                            <div className="flex gap-1">
                              <motion.button whileTap={{ scale: 0.9 }} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></motion.button>
                              <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleDelete(product.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5 text-red-500" /></motion.button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">View only</span>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AnimatePresence>
            {sortedProducts.map((product) => {
              const status = getStockStatus(product);
              return (
                <motion.div key={product.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} whileHover={{ y: -4 }} className="glass-card rounded-2xl p-4">
                  <div className="aspect-square rounded-xl bg-gradient-to-br from-primary/5 to-secondary/10 mb-3 flex items-center justify-center"><ImageIcon className="w-10 h-10 text-muted-foreground/30" /></div>
                  <h4 className="font-semibold text-sm">{product.name}</h4>
                  <p className="text-xs text-muted-foreground">{product.sku}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-primary">${Number(product.price).toFixed(2)}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", status.bg, status.color)}>{status.label}</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}