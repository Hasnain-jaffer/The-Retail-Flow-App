import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  DollarSign, Package, ShoppingCart, Users,
  ArrowUpRight, ArrowDownRight, AlertTriangle, Clock, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fadeIn, slideUp, staggerContainer } from "@/lib/motion";
import { apiFetch } from "@/api/client";

function AnimatedCounter({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const duration = 1500, steps = 60, increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) { setCount(value); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
}

function StatCard({ title, value, prefix, suffix, change, changeType, icon: Icon }: any) {
  return (
    <motion.div variants={fadeIn} className="glass-card rounded-2xl p-5 hover:shadow-glow transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold mt-1">
            <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
          </h3>
        </div>
        <div className="p-2.5 rounded-xl bg-primary/10"><Icon className="w-5 h-5 text-primary" /></div>
      </div>
      <div className="flex items-center gap-1 mt-3">
        {changeType === "positive" ? <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : <ArrowDownRight className="w-4 h-4 text-red-500" />}
        <span className={cn("text-sm font-medium", changeType === "positive" ? "text-emerald-500" : "text-red-500")}>{change}</span>
        <span className="text-sm text-muted-foreground ml-1">vs last week</span>
      </div>
    </motion.div>
  );
}

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface DashboardStats {
  stats: {
    revenue: { current: number; previous: number; change: number | string };
    orders: { current: number; previous: number; change: number | string };
    products: number;
    customers: number;
  };
  lowStock: { id: string; name: string; sku: string; stock: number; minStock: number }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dailyRevenue, setDailyRevenue] = useState<{ date: string; revenue: number }[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch("/reports/dashboard"),
      apiFetch("/reports/revenue?period=7d"),
      apiFetch("/orders?limit=4"),
      apiFetch("/reports/top-products?limit=5&period=30"),
    ])
      .then(([dashboard, revenue, orders, top]) => {
        setStats(dashboard);
        setDailyRevenue(revenue.daily || []);
        setRecentOrders(orders.orders || []);
        setTopProducts(top.products || []);
      })
      .catch((err) => setError(err.message || "Failed to load dashboard data"))
      .finally(() => setLoading(false));
  }, []);

  const fmtChange = (c: number | string) => {
    const n = Number(c);
    return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
  };

  const maxDaily = Math.max(1, ...dailyRevenue.map((d) => Number(d.revenue) || 0));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-lg bg-white/5 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center">
        <p className="text-destructive font-medium">Couldn't load the dashboard</p>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-6">
      <motion.div variants={fadeIn}>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening today.</p>
      </motion.div>

      <motion.div variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Weekly Revenue" value={Number(stats?.stats.revenue.current ?? 0)} prefix="$"
          change={fmtChange(stats?.stats.revenue.change ?? 0)}
          changeType={Number(stats?.stats.revenue.change ?? 0) >= 0 ? "positive" : "negative"} icon={DollarSign} />
        <StatCard title="Weekly Orders" value={Number(stats?.stats.orders.current ?? 0)}
          change={fmtChange(stats?.stats.orders.change ?? 0)}
          changeType={Number(stats?.stats.orders.change ?? 0) >= 0 ? "positive" : "negative"} icon={ShoppingCart} />
        <StatCard title="Products" value={Number(stats?.stats.products ?? 0)} change="—" changeType="positive" icon={Package} />
        <StatCard title="Customers" value={Number(stats?.stats.customers ?? 0)} change="—" changeType="positive" icon={Users} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={slideUp} className="lg:col-span-2 glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold">Revenue Overview</h3>
              <p className="text-sm text-muted-foreground">Last 7 days</p>
            </div>
          </div>
          {dailyRevenue.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              No orders yet in this period — the chart will fill in as sales come through.
            </div>
          ) : (
            <div className="h-48 flex items-end gap-3">
              {dailyRevenue.map((d, i) => {
                const h = Math.max(4, (Number(d.revenue) / maxDaily) * 100);
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                      className="w-full rounded-t-lg bg-primary/60 hover:bg-primary/80 transition-colors relative group"
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 backdrop-blur-sm px-2 py-1 rounded-lg text-xs whitespace-nowrap">
                        ${Number(d.revenue).toLocaleString()}
                      </div>
                    </motion.div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(d.date).toLocaleDateString(undefined, { weekday: "short" })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        <motion.div variants={slideUp} className="space-y-4">
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Low Stock Alerts</h3>
              <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 font-medium">{stats?.lowStock.length ?? 0} items</span>
            </div>
            {(!stats?.lowStock || stats.lowStock.length === 0) ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nothing low on stock right now.</p>
            ) : (
              <div className="space-y-3">
                {stats.lowStock.map((item, i) => (
                  <motion.div
                    key={item.sku}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-amber-500">{item.stock}</p>
                      <p className="text-[10px] text-muted-foreground">min {item.minStock}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={slideUp} className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent Orders</h3>
            <button className="text-xs text-primary hover:underline flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></button>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order, i) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <ShoppingCart className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-primary">{order.orderNumber}</span>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full", order.status === "completed" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500")}>{order.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{order.customer?.name || "Walk-in customer"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">${Number(order.total).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(order.createdAt)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div variants={slideUp} className="glass-card rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Top Products</h3>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No sales recorded in this period yet.</p>
          ) : (
            <div className="space-y-4">
              {topProducts.map((product, i) => (
                <motion.div
                  key={product.productId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.totalSold} sold</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">${Number(product.revenue).toLocaleString()}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
