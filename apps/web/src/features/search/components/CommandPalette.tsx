// src/features/search/components/CommandPalette.tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, LayoutDashboard, Package, ShoppingCart, Users, Truck, BarChart3, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const commands = [
  { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, shortcut: "G D" },
  { id: "inventory", label: "Inventory", path: "/inventory", icon: Package, shortcut: "G I" },
  { id: "sales", label: "Sales & POS", path: "/sales", icon: ShoppingCart, shortcut: "G S" },
  { id: "customers", label: "Customers", path: "/customers", icon: Users, shortcut: "G C" },
  { id: "purchases", label: "Purchases", path: "/purchases", icon: Truck, shortcut: "G P" },
  { id: "reports", label: "Reports", path: "/reports", icon: BarChart3, shortcut: "G R" },
  { id: "settings", label: "Settings", path: "/settings", icon: Settings, shortcut: "G ," },
];

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        isOpen ? onClose() : null;
      }
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      if (e.key === "ArrowUp") setSelectedIndex((i) => Math.max(i - 1, 0));
      if (e.key === "Enter" && filtered[selectedIndex]) {
        navigate(filtered[selectedIndex].path);
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, selectedIndex, navigate, onClose]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-lg glass-card-strong rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
              <Search className="w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search commands..."
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                autoFocus
              />
              <kbd className="px-2 py-1 rounded bg-white/10 text-[10px] font-mono">ESC</kbd>
            </div>

            <div className="max-h-80 overflow-y-auto py-2">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No results found for "{query}"
                </div>
              ) : (
                filtered.map((cmd, i) => {
                  const Icon = cmd.icon;
                  return (
                    <motion.button
                      key={cmd.id}
                      onMouseEnter={() => setSelectedIndex(i)}
                      onClick={() => { navigate(cmd.path); onClose(); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                        i === selectedIndex ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="flex-1 text-left">{cmd.label}</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] font-mono">{cmd.shortcut}</kbd>
                    </motion.button>
                  );
                })
              )}
            </div>

            <div className="flex items-center gap-4 px-4 py-2 border-t border-white/10 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><kbd className="px-1 rounded bg-white/5">↑↓</kbd> Navigate</span>
              <span className="flex items-center gap-1"><kbd className="px-1 rounded bg-white/5">↵</kbd> Select</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}