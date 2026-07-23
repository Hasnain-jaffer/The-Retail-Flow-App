// src/features/reports/components/ReportsPage.tsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, DollarSign, Package,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fadeIn, slideUp, staggerContainer } from "@/lib/motion";
import { apiFetch } from "@/api/client";

const CHART_COLORS = ["bg-violet-500", "bg-pink-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-cyan-500"];

export default function ReportsPage() {
  const [period, setPeriod] = useState("30d");
  const [daily, setDaily] = useState<{ date: string; revenue: number; orders: number }[]>([]);
  const [summary, setSummary] = useState<{ total: number; count: number } | null>(null);
  const [categories, setCategories] = useState<{ category: string; revenue: number; units: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    const periodDays = period.replace("d", "").replace("y", "").replace("h", "");
    Promise.all([
      apiFetch(`/reports/revenue?period=${period}`),
      apiFetch(`/reports/categories?period=${period === "1y" ? "365" : period === "24h" ? "1" : periodDays}`),
    ])
      .then(([revenue, cats]) => {
        setDaily(revenue.daily || []);
        setSummary(revenue.summary || null);
        setCategories(cats.categories || []);
        setError("");
      })
      .catch((err) => setError(err.message || "Failed to load reports"))
      .finally(() => setLoading(false));
  }, [period]);

  const totalRevenue = Number(summary?.total ?? 0);
  const totalOrders = Number(summary?.count ?? 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const maxDaily = Math.max(1, ...daily.map((d) => Number(d.revenue) || 0));
  const totalCategoryRevenue = categories.reduce((a, c) => a + Number(c.revenue), 0) || 1;

  if (loading && daily.length === 0 && !error) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 rounded-lg bg-white/5 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
        <div className="h-72 rounded-2xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center">
        <p className="text-destructive font-medium">Couldn't load reports</p>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-6">
      <motion.div variants={fadeIn} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground mt-1">Analytics and business insights</p>
        </div>
        <div className="flex gap-2">
          {["7d", "30d", "90d", "1y"].map((p) => (
            <motion.button
              key={p}
              whileTap={{ scale: 0.95 }}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                period === p ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground hover:bg-white/10"
              )}
            >
              {p}
            </motion.button>
          ))}
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium">
            <Download className="w-4 h-4" /> Export
          </motion.button>
        </div>
      </motion.div>

      <motion.div variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign },
          { label: "Total Orders", value: totalOrders.toLocaleString(), icon: Package },
          { label: "Avg. Order Value", value: `$${avgOrderValue.toFixed(2)}`, icon: BarChart3 },
        ].map((stat) => (
          <motion.div key={stat.label} variants={fadeIn} className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <stat.icon className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={slideUp} className="lg:col-span-2 glass-card rounded-2xl p-6">
          <h3 className="font-semibold mb-6">Revenue Trend</h3>
          {daily.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
              No orders yet in this period — the chart will fill in as sales come through.
            </div>
          ) : (
            <div className="h-64 flex items-end gap-4">
              {daily.map((d, i) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(4, (Number(d.revenue) / maxDaily) * 100)}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1 }}
                    className="w-full rounded-t-lg bg-primary/60 hover:bg-primary/80 transition-colors relative group"
                  >
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 backdrop-blur-sm px-2 py-1 rounded-lg text-xs whitespace-nowrap">
                      ${Number(d.revenue).toLocaleString()}
                    </div>
                  </motion.div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div variants={slideUp} className="glass-card rounded-2xl p-6">
          <h3 className="font-semibold mb-6">Sales by Category</h3>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No category sales in this period yet.</p>
          ) : (
            <div className="space-y-4">
              {categories.map((cat, i) => {
                const pct = (Number(cat.revenue) / totalCategoryRevenue) * 100;
                return (
                  <motion.div
                    key={cat.category}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>{cat.category}</span>
                      <span className="font-medium">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className={cn("h-full rounded-full", CHART_COLORS[i % CHART_COLORS.length])}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}