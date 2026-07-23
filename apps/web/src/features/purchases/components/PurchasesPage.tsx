import { useState } from "react";
import { motion } from "framer-motion";
import {
  Truck, Plus, Search, Calendar, Package,
  CheckCircle2, Clock, AlertCircle, ChevronRight, Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fadeIn, slideUp, staggerContainer } from "@/lib/motion";

interface PurchaseOrder {
  id: string; poNumber: string; supplier: string; status: string;
  total: number; items: number; expectedDate: string; createdAt: string;
}

const mockPOs: PurchaseOrder[] = [
  { id: "1", poNumber: "PO-2026-001", supplier: "TechGear Supply Co.", status: "received", total: 4590.00, items: 45, expectedDate: "2026-07-20", createdAt: "2026-07-15" },
  { id: "2", poNumber: "PO-2026-002", supplier: "Global Textiles Ltd.", status: "shipped", total: 2340.50, items: 120, expectedDate: "2026-07-22", createdAt: "2026-07-16" },
  { id: "3", poNumber: "PO-2026-003", supplier: "SportMax Equipment", status: "pending", total: 1890.00, items: 30, expectedDate: "2026-07-25", createdAt: "2026-07-17" },
  { id: "4", poNumber: "PO-2026-004", supplier: "Home Essentials Inc.", status: "received", total: 675.25, items: 50, expectedDate: "2026-07-18", createdAt: "2026-07-14" },
  { id: "5", poNumber: "PO-2026-005", supplier: "ElectroWorld Distributors", status: "shipped", total: 8900.00, items: 25, expectedDate: "2026-07-24", createdAt: "2026-07-16" },
];

const statusConfig: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  pending: { color: "text-amber-500", bg: "bg-amber-500/10", icon: Clock, label: "Pending" },
  shipped: { color: "text-blue-500", bg: "bg-blue-500/10", icon: Truck, label: "Shipped" },
  received: { color: "text-emerald-500", bg: "bg-emerald-500/10", icon: CheckCircle2, label: "Received" },
  cancelled: { color: "text-red-500", bg: "bg-red-500/10", icon: AlertCircle, label: "Cancelled" },
};

export default function PurchasesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredPOs = mockPOs.filter((po) => {
    const matchesSearch = po.supplier.toLowerCase().includes(searchQuery.toLowerCase()) || po.poNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPending = mockPOs.filter((p) => p.status === "pending").reduce((a, b) => a + b.total, 0);
  const totalReceived = mockPOs.filter((p) => p.status === "received").reduce((a, b) => a + b.total, 0);

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-6">
      <motion.div variants={fadeIn} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Purchases</h1>
          <p className="text-muted-foreground mt-1">Manage purchase orders and suppliers</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium shadow-lg hover:shadow-glow transition-all">
          <Plus className="w-4 h-4" /> New Purchase Order
        </motion.button>
      </motion.div>

      <motion.div variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: "Total POs", value: mockPOs.length.toString(), color: "text-primary", icon: Package },
          { label: "Pending Value", value: "$" + totalPending.toLocaleString(), color: "text-amber-500", icon: Clock },
          { label: "Received Value", value: "$" + totalReceived.toLocaleString(), color: "text-emerald-500", icon: CheckCircle2 },
          { label: "Suppliers", value: "12", color: "text-blue-400", icon: Building2 },
        ].map((stat) => (
          <motion.div key={stat.label} variants={fadeIn} className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={cn("w-5 h-5", stat.color)} />
            </div>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className={cn("text-2xl font-bold mt-1", stat.color)}>{stat.value}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search purchase orders..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
        </div>
        <div className="flex gap-2">
          {["all", "pending", "shipped", "received"].map((status) => (
            <motion.button key={status} whileTap={{ scale: 0.95 }} onClick={() => setStatusFilter(status)}
              className={cn("px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all", statusFilter === status ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground hover:bg-white/10")}>
              {status}
            </motion.button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={slideUp} className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Expected</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredPOs.map((po) => {
                const status = statusConfig[po.status];
                const StatusIcon = status.icon;
                return (
                  <tr key={po.id} className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-primary" />
                        <span className="font-mono text-sm font-medium">{po.poNumber}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm">{po.supplier}</td>
                    <td className="py-4 px-4">
                      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", status.bg, status.color)}>
                        <StatusIcon className="w-3 h-3" /> {status.label}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm">{po.items} items</td>
                    <td className="py-4 px-4 font-medium">${po.total.toFixed(2)}</td>
                    <td className="py-4 px-4 text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {po.expectedDate}
                    </td>
                    <td className="py-4 px-4"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}