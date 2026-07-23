// src/features/settings/components/SettingsPage.tsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Store, Users, Bell, Palette, Shield,
  Save, CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fadeIn, slideUp, staggerContainer } from "@/lib/motion";
import { apiFetch } from "@/api/client";
import { useAuthStore } from "@/store/auth";
import { isAdmin } from "@/lib/roles";

const tabs = [
  { id: "company", label: "Company", icon: Store },
  { id: "team", label: "Team", icon: Users },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "security", label: "Security", icon: Shield },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("company");
  const [saved, setSaved] = useState(false);

  const { user: currentUser } = useAuthStore();
  const isAdminUser = isAdmin(currentUser?.role);

  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [roleUpdateError, setRoleUpdateError] = useState("");

  useEffect(() => {
    if (activeTab !== "team" || !isAdminUser) return;
    setUsersLoading(true);
    apiFetch("/auth/users")
      .then((data) => { setTeamMembers(data.users || []); setUsersError(""); })
      .catch((err) => setUsersError(err.message || "Failed to load team members"))
      .finally(() => setUsersLoading(false));
  }, [activeTab, isAdminUser]);

  const handleRoleChange = async (userId: string, role: string) => {
    setRoleUpdateError("");
    const previous = teamMembers;
    // Optimistic update — the dropdown should feel instant; roll back if
    // the server rejects it (e.g. trying to change your own role, which
    // the backend also blocks).
    setTeamMembers((prev) => prev.map((m) => (m.id === userId ? { ...m, role } : m)));
    try {
      await apiFetch(`/auth/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
    } catch (err) {
      setTeamMembers(previous);
      setRoleUpdateError(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-6">
      <motion.div variants={fadeIn}>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your business preferences</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <motion.div variants={slideUp} className="lg:col-span-1">
          <div className="glass-card rounded-2xl p-3 space-y-1">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.div variants={slideUp} className="lg:col-span-3 glass-card rounded-2xl p-6">
          {activeTab === "company" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Company Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company Name</label>
                  <input type="text" defaultValue="RetailFlow Inc." className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tax ID</label>
                  <input type="text" defaultValue="12-3456789" className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <input type="email" defaultValue="contact@retailflow.com" className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <input type="tel" defaultValue="+1 (555) 123-4567" className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Address</label>
                <textarea rows={3} defaultValue="123 Commerce St, Suite 100&#10;New York, NY 10001" className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none" />
              </div>
            </div>
          )}

          {activeTab === "team" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Team Members</h3>

              {!isAdminUser ? (
                <div className="p-4 rounded-xl bg-white/5 text-sm text-muted-foreground">
                  Only admins can view and manage team members and roles.
                </div>
              ) : usersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />)}
                </div>
              ) : usersError ? (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">{usersError}</div>
              ) : (
                <div className="space-y-3">
                  {roleUpdateError && (
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">{roleUpdateError}</div>
                  )}
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/5">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-sm font-bold">
                        {member.name.split(" ").map((n: string) => n[0]).join("")}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                      {member.id === currentUser?.id ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">{member.role} (you)</span>
                      ) : (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none capitalize"
                        >
                          {["admin", "manager", "staff", "viewer"].map((r) => (
                            <option key={r} value={r} className="bg-background capitalize">{r}</option>
                          ))}
                        </select>
                      )}
                      <span className={cn("w-2 h-2 rounded-full", member.isActive ? "bg-emerald-500" : "bg-gray-500")} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Notification Preferences</h3>
              <div className="space-y-4">
                {[
                  { label: "Low stock alerts", desc: "Get notified when products run low", enabled: true },
                  { label: "New orders", desc: "Receive notifications for new sales", enabled: true },
                  { label: "Daily summary", desc: "Email digest of daily activity", enabled: false },
                  { label: "Team mentions", desc: "When someone mentions you in comments", enabled: true },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                    <div>
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <button className={cn(
                      "w-11 h-6 rounded-full transition-colors relative",
                      item.enabled ? "bg-primary" : "bg-white/10"
                    )}>
                      <div className={cn(
                        "w-4 h-4 rounded-full bg-white absolute top-1 transition-all",
                        item.enabled ? "left-6" : "left-1"
                      )} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Appearance</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Theme</label>
                  <div className="flex gap-3">
                    {["dark", "light", "system"].map((theme) => (
                      <button key={theme} className={cn(
                        "flex-1 py-3 rounded-xl border text-sm font-medium capitalize transition-all",
                        theme === "dark" ? "border-primary bg-primary/10 text-primary" : "border-white/10 hover:bg-white/5"
                      )}>
                        {theme}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Accent Color</label>
                  <div className="flex gap-3">
                    {["violet", "blue", "emerald", "rose", "amber"].map((color) => (
                      <button key={color} className={cn(
                        "w-10 h-10 rounded-xl transition-all hover:scale-110",
                        color === "violet" && "bg-violet-500 ring-2 ring-white",
                        color === "blue" && "bg-blue-500",
                        color === "emerald" && "bg-emerald-500",
                        color === "rose" && "bg-rose-500",
                        color === "amber" && "bg-amber-500"
                      )} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Security Settings</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Current Password</label>
                  <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Password</label>
                  <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Two-Factor Authentication</label>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm">Authenticator App</p>
                        <p className="text-xs text-muted-foreground">Use an authenticator app for 2FA</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium">Enable</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-white/10 flex justify-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium shadow-lg"
            >
              {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Changes</>}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}