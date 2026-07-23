// src/features/notifications/components/NotificationPanel.tsx
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, AlertTriangle, Package, ShoppingCart, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const notifications = [
  { id: "1", title: "Low Stock Alert", message: "Running Shoes (RS-003) is below minimum stock level", type: "warning", time: "5 min ago", icon: AlertTriangle },
  { id: "2", title: "New Order", message: "Order #ORD-7829 received for $234.97", type: "success", time: "10 min ago", icon: ShoppingCart },
  { id: "3", title: "New Customer", message: "Emily Davis created an account", type: "info", time: "25 min ago", icon: User },
  { id: "4", title: "Purchase Order Received", message: "PO-2026-001 from TechGear Supply has been received", type: "success", time: "1 hour ago", icon: Package },
  { id: "5", title: "Stock Updated", message: "Coffee Mug (CM-004) is now out of stock", type: "warning", time: "2 hours ago", icon: AlertTriangle },
];

const typeConfig: Record<string, { color: string; bg: string }> = {
  success: { color: "text-emerald-500", bg: "bg-emerald-500/10" },
  warning: { color: "text-amber-500", bg: "bg-amber-500/10" },
  info: { color: "text-blue-500", bg: "bg-blue-500/10" },
};

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm glass-card-strong border-l border-white/10"
          >
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Notifications</h3>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">{notifications.length}</span>
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            <div className="overflow-y-auto custom-scrollbar" style={{ height: "calc(100% - 70px)" }}>
              <div className="p-3 space-y-2">
                {notifications.map((n, i) => {
                  const config = typeConfig[n.type];
                  const Icon = n.icon;
                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn("p-2 rounded-lg flex-shrink-0", config.bg)}>
                          <Icon className={cn("w-4 h-4", config.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-sm">{n.title}</p>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">{n.time}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.message}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="p-4 border-t border-white/10">
                <button className="w-full py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors text-center">
                  Mark all as read
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}