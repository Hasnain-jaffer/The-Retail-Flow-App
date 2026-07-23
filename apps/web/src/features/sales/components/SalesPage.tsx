import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ShoppingCart, Plus, Minus, Receipt, CreditCard, Banknote,
  Search, Tag, Printer, CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fadeIn, slideUp, staggerContainer } from "@/lib/motion";
import { apiFetch } from "@/api/client";

interface CartItem {
  id: string; name: string; price: number; quantity: number;
}

interface PosProduct {
  id: string; name: string; price: string | number; sku: string; stock: number;
}

export default function SalesPage() {
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<{ orderNumber: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    apiFetch("/products?limit=100")
      .then((data) => setProducts(data.products || []))
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, []);

  const addToCart = (product: PosProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id: product.id, name: product.name, price: Number(product.price), quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) => prev.map((item) => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return newQty === 0 ? null : { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax - discount;

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const completeSale = async () => {
    setSubmitError("");
    setSubmitting(true);
    try {
      const { order } = await apiFetch("/orders", {
        method: "POST",
        body: JSON.stringify({
          status: "completed",
          subtotal: subtotal.toFixed(2),
          tax: tax.toFixed(2),
          discount: discount.toFixed(2),
          total: total.toFixed(2),
          paymentMethod,
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            unitPrice: item.price.toFixed(2),
            total: (item.price * item.quantity).toFixed(2),
          })),
        }),
      });
      setCompletedOrder(order);
      setShowReceipt(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to complete sale");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-6">
      <motion.div variants={fadeIn}>
        <h1 className="text-3xl font-bold">Sales & POS</h1>
        <p className="text-muted-foreground mt-1">Process sales and manage transactions</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Grid */}
        <motion.div variants={slideUp} className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Search products by name or SKU..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {loadingProducts ? (
              [1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />)
            ) : filteredProducts.length === 0 ? (
              <p className="col-span-full text-sm text-muted-foreground text-center py-8">
                {products.length === 0 ? "No products yet — add some in Inventory first." : "No products match your search."}
              </p>
            ) : filteredProducts.map((product) => (
              <motion.button
                key={product.id}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => addToCart(product)}
                disabled={product.stock === 0}
                className="glass-card rounded-2xl p-4 text-left hover:border-primary/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <Tag className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-medium text-sm truncate">{product.name}</h4>
                <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                <p className="text-lg font-bold text-primary mt-2">${Number(product.price).toFixed(2)}</p>
                {product.stock === 0 && <p className="text-[10px] text-red-400 mt-1">Out of stock</p>}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Cart */}
        <motion.div variants={slideUp} className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Current Order</h3>
            <span className="ml-auto text-xs text-muted-foreground">{cart.length} items</span>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-1">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Cart is empty</p>
                <p className="text-xs">Click products to add</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl bg-white/5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => updateQuantity(item.id, -1)} className="p-1 rounded-lg bg-white/10 hover:bg-white/20">
                      <Minus className="w-3 h-3" />
                    </motion.button>
                    <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => updateQuantity(item.id, 1)} className="p-1 rounded-lg bg-white/10 hover:bg-white/20">
                      <Plus className="w-3 h-3" />
                    </motion.button>
                  </div>
                  <p className="text-sm font-semibold w-16 text-right">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <>
              <div className="border-t border-white/10 my-4 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (8%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-500">
                    <span>Discount</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/10">
                  <span>Total</span>
                  <span className="text-primary">${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setPaymentMethod("cash")}
                  className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all", paymentMethod === "cash" ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground hover:bg-white/10")}>
                  <Banknote className="w-4 h-4" /> Cash
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setPaymentMethod("card")}
                  className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all", paymentMethod === "card" ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground hover:bg-white/10")}>
                  <CreditCard className="w-4 h-4" /> Card
                </motion.button>
              </div>

              {submitError && (
                <div className="mb-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                  {submitError}
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={completeSale}
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Receipt className="w-4 h-4" />
                {submitting ? "Processing..." : `Complete Sale — $${total.toFixed(2)}`}
              </motion.button>
            </>
          )}
        </motion.div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card-strong rounded-3xl p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-bold">Sale Complete!</h3>
              <p className="text-muted-foreground text-sm mt-1 font-mono">{completedOrder?.orderNumber}</p>
            </div>

            <div className="space-y-2 mb-6">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.name} x{item.quantity}</span>
                  <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-white/10 pt-2 space-y-1">
                <div className="flex justify-between text-sm text-muted-foreground"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm text-muted-foreground"><span>Tax</span><span>${tax.toFixed(2)}</span></div>
                <div className="flex justify-between text-lg font-bold pt-1"><span>Total</span><span>${total.toFixed(2)}</span></div>
              </div>
            </div>

            <div className="flex gap-3">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => { setCart([]); setShowReceipt(false); setDiscount(0); setCompletedOrder(null); }}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium">
                New Sale
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2">
                <Printer className="w-4 h-4" /> Print
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}