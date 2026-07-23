import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Search, Plus, Mail, Phone, Star, Crown, Medal, ChevronRight,
  ShoppingBag, Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fadeIn, slideUp, staggerContainer } from "@/lib/motion";
import { apiFetch } from "@/api/client";
import { useAuthStore } from "@/store/auth";
import { canWrite } from "@/lib/roles";

interface Customer {
  id: string; name: string; email: string; phone: string;
  loyaltyPoints: number; loyaltyTier: string; totalSpent: string | number;
  orderCount: number; createdAt: string;
}

const tierConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  bronze: { icon: Medal, color: "text-amber-700", bg: "bg-amber-700/10", label: "Bronze" },
  silver: { icon: Medal, color: "text-gray-400", bg: "bg-gray-400/10", label: "Silver" },
  gold: { icon: Star, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Gold" },
  platinum: { icon: Crown, color: "text-cyan-400", bg: "bg-cyan-400/10", label: "Platinum" },
};

export default function CustomersPage() {
  const { user } = useAuthStore();
  const canEdit = canWrite(user?.role);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const debounce = setTimeout(() => {
      setLoading(true);
      apiFetch(`/customers?limit=200${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`)
        .then((data) => { setCustomers(data.customers || []); setError(""); })
        .catch((err) => setError(err.message || "Failed to load customers"))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", email: "", phone: "" });
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    setAdding(true);
    try {
      await apiFetch("/customers", { method: "POST", body: JSON.stringify(newCustomer) });
      setShowAddModal(false);
      setNewCustomer({ name: "", email: "", phone: "" });
      setSearchQuery((q) => q); // trigger existing effect to re-fetch
      apiFetch(`/customers?limit=200`).then((data) => setCustomers(data.customers || []));
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add customer");
    } finally {
      setAdding(false);
    }
  };

  const tierOf = (c: Customer) => tierConfig[c.loyaltyTier] || tierConfig.bronze;

  const avgSpend = customers.length > 0
    ? customers.reduce((a, c) => a + Number(c.totalSpent), 0) / customers.length
    : 0;

  if (loading && customers.length === 0) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 rounded-lg bg-white/5 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
        <div className="h-96 rounded-2xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center">
        <p className="text-destructive font-medium">Couldn't load customers</p>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-6">
      <motion.div variants={fadeIn} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground mt-1">
            {canEdit ? "Manage customer relationships and loyalty" : "Browse customer relationships and loyalty"}
          </p>
        </div>
        {canEdit && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium shadow-lg hover:shadow-glow transition-all">
            <Plus className="w-4 h-4" /> Add Customer
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
              onClick={(e) => e.stopPropagation()} onSubmit={handleAddCustomer}
              className="glass-card rounded-2xl p-6 w-full max-w-md space-y-4">
              <h3 className="font-semibold text-lg">Add Customer</h3>
              {addError && <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">{addError}</div>}
              <div className="space-y-3">
                <input required placeholder="Full name" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none text-sm" />
                <input type="email" placeholder="Email (optional)" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none text-sm" />
                <input placeholder="Phone (optional)" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none text-sm" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-white/5 transition-colors">Cancel</button>
                <button type="submit" disabled={adding} className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50">
                  {adding ? "Adding..." : "Add Customer"}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Customers", value: customers.length.toString(), color: "text-primary" },
          { label: "Platinum", value: customers.filter((c) => c.loyaltyTier === "platinum").length.toString(), color: "text-cyan-400" },
          { label: "Gold", value: customers.filter((c) => c.loyaltyTier === "gold").length.toString(), color: "text-yellow-500" },
          { label: "Avg. Spend", value: "$" + avgSpend.toFixed(0), color: "text-emerald-400" },
        ].map((stat) => (
          <motion.div key={stat.label} variants={fadeIn} className="glass-card rounded-2xl p-5">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className={cn("text-3xl font-bold mt-1", stat.color)}>{stat.value}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.div variants={fadeIn} className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" placeholder="Search customers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={slideUp} className="lg:col-span-2 glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Tier</th>
                  <th className="py-3 px-4">Orders</th>
                  <th className="py-3 px-4">Total Spent</th>
                  <th className="py-3 px-4">Last Purchase</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    {searchQuery ? "No customers match your search." : "No customers yet."}
                  </td></tr>
                ) : customers.map((customer) => {
                  const tier = tierOf(customer);
                  const TierIcon = tier.icon;
                  return (
                    <tr key={customer.id} onClick={() => setSelectedCustomer(customer)}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-sm font-bold">
                            {customer.name.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{customer.name}</p>
                            <p className="text-xs text-muted-foreground">{customer.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", tier.bg, tier.color)}>
                          <TierIcon className="w-3 h-3" /> {tier.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm">{customer.orderCount}</td>
                      <td className="py-4 px-4 font-medium">${Number(customer.totalSpent).toFixed(2)}</td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">{new Date(customer.createdAt).toLocaleDateString()}</td>
                      <td className="py-4 px-4"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div variants={slideUp}>
          {selectedCustomer ? (
            <div className="glass-card rounded-2xl p-6 space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl font-bold mx-auto mb-3">
                  {selectedCustomer.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <h3 className="text-xl font-bold">{selectedCustomer.name}</h3>
                <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mt-2", tierOf(selectedCustomer).bg, tierOf(selectedCustomer).color)}>
                  {(() => { const Icon = tierOf(selectedCustomer).icon; return <Icon className="w-3 h-3" />; })()}
                  {tierOf(selectedCustomer).label} Member
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedCustomer.email || "No email on file"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedCustomer.phone || "No phone on file"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedCustomer.orderCount} orders</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>Customer since {new Date(selectedCustomer.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Loyalty Points</span>
                  <span className="text-lg font-bold text-primary">{selectedCustomer.loyaltyPoints.toLocaleString()}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${Math.min((selectedCustomer.loyaltyPoints / 5000) * 100, 100)}%` }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a customer to view details</p>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}