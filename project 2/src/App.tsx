import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./lib/auth";
import { supabase } from "./lib/supabase";
import type { Order, Staff, ShippingMethod } from "./lib/types";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import OrdersPage from "./pages/OrdersPage";
import SettingsPage from "./pages/SettingsPage";
import NotificationsPage from "./pages/NotificationsPage";
import SearchBar from "./components/SearchBar";
import OrderModal from "./components/OrderModal";
import NotificationBell from "./components/NotificationBell";
import { Package, LayoutDashboard, Settings, LogOut, Bell, MessageSquare } from "lucide-react";

function AppContent() {
  const { session, staff, loading, signOut } = useAuth();
  const [currentPage, setCurrentPage] = useState<"dashboard" | "orders" | "settings" | "notifications">("dashboard");
  const [notificationsMode, setNotificationsMode] = useState<"general" | "replies">("general");
  const [orderSection, setOrderSection] = useState("open_orders");
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (session) {
      loadStaffAndShipping();
    }
  }, [session]);

  async function loadStaffAndShipping() {
    const [staffRes, shipRes] = await Promise.all([
      supabase.from("staff").select("*").order("full_name"),
      supabase.from("shipping_methods").select("*").eq("is_active", true),
    ]);
    setStaffList((staffRes.data as Staff[]) || []);
    setShippingMethods((shipRes.data as ShippingMethod[]) || []);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-950">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session || !staff) {
    return <Login />;
  }

  if (!staff.is_active) {
    return <Login />;
  }

  function navigateToSection(section: string) {
    if (section === "all_orders") {
      setOrderSection("open_orders");
    } else {
      setOrderSection(section);
    }
    setCurrentPage("orders");
  }

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-navy-900/80 backdrop-blur-md border-b border-navy-700/50 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-white hidden sm:block">Order Management System</h1>
          </div>

          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <SearchBar onSelectOrder={(order) => setSelectedOrder(order)} />
          </div>

          <div className="flex items-center gap-2">
            {/* General notifications bell */}
            <NotificationBell
              mode="general"
              onOpenOrder={(order) => setSelectedOrder(order)}
              onViewAll={() => {
                setNotificationsMode("general");
                setCurrentPage("notifications");
              }}
            />
            {/* Customer reply notifications bell */}
            <NotificationBell
              mode="replies"
              onOpenOrder={(order) => setSelectedOrder(order)}
              onViewAll={() => {
                setNotificationsMode("replies");
                setCurrentPage("notifications");
              }}
            />
            <div className="flex items-center gap-2 bg-navy-800/50 rounded-lg px-3 py-1.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-xs">
                {staff.full_name.charAt(0)}
              </div>
              <span className="text-sm text-white hidden sm:block">{staff.full_name}</span>
              <span className={`status-badge ${staff.role === "admin" ? "bg-primary-500/15 text-primary-400" : "bg-navy-500/20 text-navy-300"}`}>
                {staff.role === "admin" ? "Admin" : "Staff"}
              </span>
            </div>
            <button
              onClick={signOut}
              className="text-navy-400 hover:text-danger-400 transition-colors p-2 rounded-lg hover:bg-navy-800/50"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="md:hidden mt-2">
          <SearchBar onSelectOrder={(order) => setSelectedOrder(order)} />
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-navy-900/40 border-b border-navy-700/30 px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage("dashboard")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentPage === "dashboard" ? "bg-primary-600 text-white" : "text-navy-300 hover:text-white hover:bg-navy-800/50"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </button>
          <button
            onClick={() => {
              setOrderSection("open_orders");
              setCurrentPage("orders");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentPage === "orders" ? "bg-primary-600 text-white" : "text-navy-300 hover:text-white hover:bg-navy-800/50"
            }`}
          >
            <Package className="w-4 h-4" /> Orders
          </button>
          <button
            onClick={() => {
              setNotificationsMode("general");
              setCurrentPage("notifications");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentPage === "notifications" ? "bg-primary-600 text-white" : "text-navy-300 hover:text-white hover:bg-navy-800/50"
            }`}
          >
            <Bell className="w-4 h-4" /> Notifications
          </button>
          <button
            onClick={() => setCurrentPage("settings")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentPage === "settings" ? "bg-primary-600 text-white" : "text-navy-300 hover:text-white hover:bg-navy-800/50"
            }`}
          >
            <Settings className="w-4 h-4" /> Settings
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6 overflow-hidden">
        {currentPage === "dashboard" && <Dashboard onNavigate={navigateToSection} />}
        {currentPage === "orders" && (
          <OrdersPage
            initialSection={orderSection}
            staffList={staffList}
            shippingMethods={shippingMethods}
          />
        )}
        {currentPage === "notifications" && (
          <NotificationsPage onOpenOrder={(order) => setSelectedOrder(order)} initialMode={notificationsMode} />
        )}
        {currentPage === "settings" && <SettingsPage />}
      </main>

      {/* Global order modal from search/notifications */}
      {selectedOrder && (
        <OrderModal
          order={selectedOrder}
          staffList={staffList}
          shippingMethods={shippingMethods}
          onClose={() => setSelectedOrder(null)}
          onSaved={() => {}}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
