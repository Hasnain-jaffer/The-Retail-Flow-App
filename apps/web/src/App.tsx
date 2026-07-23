import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import DashboardLayout from "./components/layout/DashboardLayout";
import LoginPage from "./features/auth/components/LoginPage";
import DashboardPage from "./features/dashboard/components/DashboardPage";
import InventoryPage from "./features/inventory/components/InventoryPage";
import SalesPage from "./features/sales/components/SalesPage";
import CustomersPage from "./features/customers/components/CustomersPage";
import PurchasesPage from "./features/purchases/components/PurchasesPage";
import ReportsPage from "./features/reports/components/ReportsPage";
import SettingsPage from "./features/settings/components/SettingsPage";
import CommandPalette from "./features/search/components/CommandPalette";
import NotificationPanel from "./features/notifications/components/NotificationPanel";
import { useAuthStore } from "./store/auth";
import { canWrite } from "./lib/roles";

// Guards routes whose entire purpose is creating writes (a sale, a
// purchase order) that a "viewer" role can't make anyway — the nav link
// is already hidden for viewers (see DashboardLayout), but that alone
// doesn't stop someone from typing the URL directly, so the route itself
// needs the same check as a second layer.
function RequireStaff({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (!canWrite(user?.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function App() {
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const { status, restoreSession } = useAuthStore();

  // On load there's no token in JS to check (it lives only in the
  // httpOnly cookie) — ask the backend "who am I, based on the cookie
  // you can see" once, rather than trusting a locally-set flag. This
  // replaces the previous `if (!localStorage.getItem("auth_token"))`
  // check, which any script on the page (or the user's own devtools)
  // could satisfy by writing any string at all — it never verified
  // anything with the server.
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full"
        />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <LoginPage />;
  }

  return (
    <>
      <DashboardLayout
        onOpenCommand={() => setIsCommandOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
      >
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/sales" element={<RequireStaff><SalesPage /></RequireStaff>} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/purchases" element={<RequireStaff><PurchasesPage /></RequireStaff>} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AnimatePresence>
      </DashboardLayout>

      <CommandPalette isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} />
      <NotificationPanel isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </>
  );
}

export default App;
