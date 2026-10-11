import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { Order } from "../lib/types";
import { STATUS_LABELS, STATUS_COLORS, SECTION_LABELS, formatOrderNumber } from "../lib/types";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  TrendingUp, Package, Clock, CheckCircle2,
  Sun, Moon, CalendarDays, ArrowUpRight,
} from "lucide-react";

interface DashboardProps {
  onNavigate: (section: string) => void;
}

function isToday(dateStr: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return dateStr === today;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentChanges, setRecentChanges] = useState<{ order_number: number; field: string; timestamp: string }[]>([]);

  useEffect(() => {
    loadOrders();
    const channel = supabase
      .channel("dashboard-orders-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        loadOrders();
        if (payload.eventType === "INSERT") {
          const o = payload.new as Order;
          setRecentChanges((prev) => [
            { order_number: o.order_number, field: "New order created", timestamp: new Date().toISOString() },
            ...prev,
          ].slice(0, 10));
        } else if (payload.eventType === "UPDATE") {
          const o = payload.new as Order;
          setRecentChanges((prev) => [
            { order_number: o.order_number, field: "Order updated", timestamp: new Date().toISOString() },
            ...prev,
          ].slice(0, 10));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadOrders() {
    const { data } = await supabase.from("orders").select("*").order("order_date", { ascending: false });
    setOrders((data as Order[]) || []);
    setLoading(false);
  }

  const todayOrders = orders.filter((o) => isToday(o.order_date));
  const todayBefore4pm = todayOrders.filter((o) => o.cutoff_timing === "before_4pm");
  const todayAfter4pm = todayOrders.filter((o) => o.cutoff_timing === "after_4pm");

  const todayStatusCounts: Record<string, number> = {};
  todayOrders.forEach((o) => {
    o.order_statuses.forEach((s) => {
      todayStatusCounts[s] = (todayStatusCounts[s] || 0) + 1;
    });
  });

  const todayBarData = Object.entries(todayStatusCounts).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    count,
    status,
  }));

  const allStatusCounts: Record<string, number> = {};
  orders.forEach((o) => {
    o.order_statuses.forEach((s) => {
      allStatusCounts[s] = (allStatusCounts[s] || 0) + 1;
    });
  });

  const pieData = Object.entries(allStatusCounts).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
    color: STATUS_COLORS[status]?.dot || "#627d98",
  }));

  const cards = [
    { label: "Today's Orders", value: todayOrders.length, icon: CalendarDays, color: "from-primary-500 to-primary-700", section: "open_orders" },
    { label: "Before 4 PM", value: todayBefore4pm.length, icon: Sun, color: "from-amber-500 to-amber-700", section: "open_orders" },
    { label: "After 4 PM", value: todayAfter4pm.length, icon: Moon, color: "from-blue-500 to-blue-700", section: "open_orders" },
    { label: "Preparing", value: allStatusCounts["preparing"] || 0, icon: Clock, color: "from-amber-500 to-amber-700", section: "preparing" },
    { label: "Packing", value: allStatusCounts["packing"] || 0, icon: Package, color: "from-pink-500 to-pink-700", section: "packing" },
    { label: "Complete", value: allStatusCounts["complete"] || 0, icon: CheckCircle2, color: "from-emerald-500 to-emerald-700", section: "complete" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-sm text-navy-400">{todayDate}</p>
          </div>
        </div>
      </div>

      {/* Key stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((card) => (
          <button
            key={card.label}
            onClick={() => onNavigate(card.section)}
            className="glass-card p-4 text-left hover:scale-[1.02] transition-transform duration-300 group relative overflow-hidden"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-5 group-hover:opacity-15 transition-opacity`} />
            <div className="relative">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <div className="text-2xl font-bold text-white">{card.value}</div>
              <div className="text-xs text-navy-300 mt-1">{card.label}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Today's cutoff breakdown bar */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Today's Orders — Before vs After 4 PM</h3>
          <span className="text-xs text-navy-400">{todayOrders.length} total today</span>
        </div>
        {todayOrders.length > 0 ? (
          <div className="flex items-end gap-6 h-40">
            <div className="flex-1 flex flex-col items-center justify-end h-full">
              <div className="text-2xl font-bold text-amber-400 mb-2">{todayBefore4pm.length}</div>
              <div
                className="w-full max-w-[120px] rounded-t-lg bg-gradient-to-t from-amber-600 to-amber-400 transition-all duration-500"
                style={{ height: `${todayBefore4pm.length / todayOrders.length * 100}%` }}
              />
              <div className="flex items-center gap-1.5 mt-2 text-xs text-navy-300">
                <Sun className="w-3.5 h-3.5 text-amber-400" /> Before 4 PM
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-end h-full">
              <div className="text-2xl font-bold text-blue-400 mb-2">{todayAfter4pm.length}</div>
              <div
                className="w-full max-w-[120px] rounded-t-lg bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-500"
                style={{ height: `${todayAfter4pm.length / todayOrders.length * 100}%` }}
              />
              <div className="flex items-center gap-1.5 mt-2 text-xs text-navy-300">
                <Moon className="w-3.5 h-3.5 text-blue-400" /> After 4 PM
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-end h-full">
              <div className="text-2xl font-bold text-primary-400 mb-2">
                {todayOrders.length - todayBefore4pm.length - todayAfter4pm.length}
              </div>
              <div
                className="w-full max-w-[120px] rounded-t-lg bg-gradient-to-t from-navy-600 to-navy-400 transition-all duration-500"
                style={{
                  height: `${(todayOrders.length - todayBefore4pm.length - todayAfter4pm.length) / todayOrders.length * 100}%`,
                }}
              />
              <div className="flex items-center gap-1.5 mt-2 text-xs text-navy-300">
                <Clock className="w-3.5 h-3.5 text-navy-400" /> Not Set
              </div>
            </div>
          </div>
        ) : (
          <div className="h-40 flex items-center justify-center text-navy-400 text-sm">No orders created today yet</div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Today's Orders by Status</h3>
          {todayBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={todayBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#243b53" />
                <XAxis dataKey="name" stroke="#627d98" tick={{ fontSize: 10, fontFamily: "Inter" }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis stroke="#627d98" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#102a43",
                    border: "1px solid #243b53",
                    borderRadius: "8px",
                    fontFamily: "Inter",
                  }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {todayBarData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.status]?.dot || "#6366f1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-navy-400 text-sm">No orders today</div>
          )}
        </div>

        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-white mb-4">All-Time Status Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} innerRadius={45}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#102a43",
                    border: "1px solid #243b53",
                    borderRadius: "8px",
                    fontFamily: "Inter",
                  }}
                />
                <Legend wrapperStyle={{ fontFamily: "Inter", fontSize: 10, color: "#627d98" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-navy-400 text-sm">No data available</div>
          )}
        </div>
      </div>

      {/* All Orders table with ticker-style change indicators */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Package className="w-4 h-4 text-primary-400" /> All Orders
          </h3>
          <button
            onClick={() => onNavigate("open_orders")}
            className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            Go to Orders →
          </button>
        </div>

        {/* Live changes ticker */}
        {recentChanges.length > 0 && (
          <div className="mb-3 flex items-center gap-2 overflow-hidden">
            <span className="flex items-center gap-1 text-xs text-accent-400 flex-shrink-0">
              <ArrowUpRight className="w-3.5 h-3.5" /> Live:
            </span>
            <div className="flex gap-3 overflow-x-auto tab-scroll pb-1">
              {recentChanges.map((c, i) => (
                <span key={i} className="text-xs text-navy-300 whitespace-nowrap flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse-soft" />
                  {formatOrderNumber(c.order_number)} — {c.field}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-navy-900/90 backdrop-blur-md z-10">
              <tr className="border-b border-navy-700/50">
                <th className="px-3 py-2 text-xs font-medium text-navy-300 whitespace-nowrap">Order #</th>
                <th className="px-3 py-2 text-xs font-medium text-navy-300 whitespace-nowrap">BL</th>
                <th className="px-3 py-2 text-xs font-medium text-navy-300 whitespace-nowrap">Date</th>
                <th className="px-3 py-2 text-xs font-medium text-navy-300 whitespace-nowrap">Cutoff</th>
                <th className="px-3 py-2 text-xs font-medium text-navy-300 whitespace-nowrap">Status</th>
                <th className="px-3 py-2 text-xs font-medium text-navy-300 whitespace-nowrap">Last Update</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const isBlacked = order.is_blacklisted;
                const isCancelled = order.is_cancelled || order.order_statuses.includes("cancelled");
                return (
                  <tr
                    key={order.id}
                    className={`border-b border-navy-700/20 hover:bg-navy-700/20 transition-colors cursor-pointer ${
                      isBlacked ? "bg-black text-white" : isCancelled ? "bg-red-950/40" : ""
                    }`}
                    onClick={() => onNavigate("open_orders")}
                  >
                    <td className="px-3 py-2.5">
                      <span className={`font-bold ${isBlacked ? "text-white" : "text-primary-400"}`}>
                        {formatOrderNumber(order.order_number)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <input type="checkbox" checked={order.is_blacklisted} readOnly className="w-4 h-4 accent-danger-500" />
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-sm ${isBlacked ? "text-white" : "text-navy-200"}`}>{order.order_date}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      {order.cutoff_timing === "before_4pm" ? (
                        <span className="text-xs text-amber-400">Before 4PM</span>
                      ) : order.cutoff_timing === "after_4pm" ? (
                        <span className="text-xs text-blue-400">After 4PM</span>
                      ) : (
                        <span className="text-xs text-navy-500">--</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {order.order_statuses.map((s) => {
                          const c = STATUS_COLORS[s];
                          return (
                            <span key={s} className={`status-badge ${c?.bg || ""} ${c?.text || ""} ${c?.border || ""}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${c?.dot || ""}`} />
                              {STATUS_LABELS[s] || s}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs flex items-center gap-1 ${isBlacked ? "text-white/70" : "text-navy-400"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isBlacked ? "bg-white/50" : "bg-accent-500"}`} />
                        {new Date(order.last_updated).toLocaleDateString("en-US")}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-navy-400 text-sm">No orders yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section notification boxes */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-4">Lists & Notifications</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(SECTION_LABELS)
            .filter(([key]) => key !== "dashboard" && key !== "settings" && key !== "all_orders")
            .map(([key, label]) => {
              const count =
                key === "closed"
                  ? orders.filter((o) => o.is_closed).length
                  : key === "cancelled"
                  ? orders.filter((o) => o.is_cancelled).length
                  : key === "open_orders"
                  ? orders.filter((o) => !o.order_statuses.includes("packing") && !o.is_closed && !o.is_cancelled).length
                  : orders.filter((o) => o.order_statuses.includes(key)).length;
              return (
                <button
                  key={key}
                  onClick={() => onNavigate(key)}
                  className="glass-card p-4 text-left hover:border-primary-500/50 transition-all duration-300 group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-navy-200">{label}</span>
                    {count > 0 && (
                      <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center animate-pulse-soft">
                        {count}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-navy-400">
                    {count > 0 ? `${count} orders` : "No new items"}
                  </div>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
