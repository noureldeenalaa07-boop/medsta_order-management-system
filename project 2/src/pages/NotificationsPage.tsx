import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { Order, CustomerReply } from "../lib/types";
import { STATUS_LABELS, STATUS_COLORS, formatOrderNumber } from "../lib/types";
import { Bell, Package, MessageSquare, BellOff } from "lucide-react";

interface NotificationsPageProps {
  onOpenOrder: (order: Order) => void;
  initialMode?: "general" | "replies";
}

interface NotificationEntry {
  id: string;
  type: "new_order" | "customer_reply";
  order_number: number;
  order_id: string;
  message: string;
  reply_text?: string;
  created_at: string;
  read: boolean;
}

export default function NotificationsPage({ onOpenOrder, initialMode = "general" }: NotificationsPageProps) {
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersMap, setOrdersMap] = useState<Map<string, Order>>(new Map());
  const [filter, setFilter] = useState<"all" | "new_order" | "customer_reply">(
    initialMode === "replies" ? "customer_reply" : "all"
  );

  useEffect(() => {
    setFilter(initialMode === "replies" ? "customer_reply" : "all");
  }, [initialMode]);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    setLoading(true);
    const [{ data: allOrders }, { data: allReplies }] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("customer_replies").select("*").order("created_at", { ascending: false }).limit(50),
    ]);

    const orderMap = new Map<string, Order>();
    (allOrders as Order[] || []).forEach((o) => orderMap.set(o.id, o));
    setOrdersMap(orderMap);

    const items: NotificationEntry[] = [];

    (allOrders as Order[] || []).forEach((o) => {
      items.push({
        id: `order-${o.id}`,
        type: "new_order",
        order_number: o.order_number,
        order_id: o.id,
        message: `New order ${formatOrderNumber(o.order_number)} created`,
        created_at: o.created_at,
        read: true,
      });
    });

    (allReplies as CustomerReply[] || []).forEach((r) => {
      const order = orderMap.get(r.order_id);
      items.push({
        id: `reply-${r.id}`,
        type: "customer_reply",
        order_number: order?.order_number || 0,
        order_id: r.order_id,
        message: `Customer replied on order ${formatOrderNumber(order?.order_number || 0)}`,
        reply_text: r.comment,
        created_at: r.created_at,
        read: true,
      });
    });

    items.sort((a, b) => b.created_at.localeCompare(a.created_at));
    setNotifications(items);
    setLoading(false);
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { dateStyle: "medium" });
  }

  function fullDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  }

  const filtered = filter === "all" ? notifications : notifications.filter((n) => n.type === filter);
  const newOrderCount = notifications.filter((n) => n.type === "new_order").length;
  const replyCount = notifications.filter((n) => n.type === "customer_reply").length;

  function handleOpenOrder(n: NotificationEntry) {
    const order = ordersMap.get(n.order_id);
    if (order) onOpenOrder(order);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Bell className="w-6 h-6 text-primary-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-sm text-navy-400">All new orders and customer replies in one place</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => setFilter("all")}
          className={`glass-card p-4 text-left transition-all ${filter === "all" ? "border-primary-500" : "hover:border-primary-500/50"}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{notifications.length}</div>
              <div className="text-xs text-navy-300">All Notifications</div>
            </div>
          </div>
        </button>
        <button
          onClick={() => setFilter("new_order")}
          className={`glass-card p-4 text-left transition-all ${filter === "new_order" ? "border-primary-500" : "hover:border-primary-500/50"}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{newOrderCount}</div>
              <div className="text-xs text-navy-300">New Orders</div>
            </div>
          </div>
        </button>
        <button
          onClick={() => setFilter("customer_reply")}
          className={`glass-card p-4 text-left transition-all ${filter === "customer_reply" ? "border-primary-500" : "hover:border-primary-500/50"}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{replyCount}</div>
              <div className="text-xs text-navy-300">Customer Replies</div>
            </div>
          </div>
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700/50">
          <h3 className="text-sm font-semibold text-white">
            {filter === "all" ? "All Activity" : filter === "new_order" ? "New Orders" : "Customer Replies"}
          </h3>
          <span className="text-xs text-navy-400">{filtered.length} items</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <BellOff className="w-8 h-8 text-navy-600" />
            <p className="text-navy-400 text-sm">No notifications in this category</p>
          </div>
        ) : (
          <div className="divide-y divide-navy-700/20 max-h-[600px] overflow-y-auto">
            {filtered.map((n) => (
              <button
                key={n.id}
                onClick={() => handleOpenOrder(n)}
                className="w-full flex items-start gap-4 px-6 py-4 hover:bg-navy-700/20 transition-colors text-left group"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  n.type === "new_order" ? "bg-primary-500/15" : "bg-green-500/15"
                }`}>
                  {n.type === "new_order" ? (
                    <Package className="w-5 h-5 text-primary-400" />
                  ) : (
                    <MessageSquare className="w-5 h-5 text-green-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-white font-medium">{n.message}</span>
                    <span className="text-xs text-navy-500">{timeAgo(n.created_at)}</span>
                  </div>

                  {n.reply_text && (
                    <div className="mt-2 bg-navy-800/40 rounded-lg px-3 py-2.5 border-l-2 border-green-500/40">
                      <p className="text-sm text-navy-200 whitespace-pre-wrap">{n.reply_text}</p>
                    </div>
                  )}

                  {n.type === "new_order" && ordersMap.get(n.order_id) && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {ordersMap.get(n.order_id)!.order_statuses.map((s) => {
                        const c = STATUS_COLORS[s];
                        return (
                          <span key={s} className={`status-badge text-[10px] ${c?.bg || ""} ${c?.text || ""} ${c?.border || ""}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${c?.dot || ""}`} />
                            {STATUS_LABELS[s] || s}
                          </span>
                        );
                      })}
                      {ordersMap.get(n.order_id)!.is_closed && (
                        <span className="status-badge bg-navy-500/20 text-navy-300">Closed</span>
                      )}
                      {ordersMap.get(n.order_id)!.is_cancelled && (
                        <span className="status-badge bg-red-500/15 text-red-400">Cancelled</span>
                      )}
                    </div>
                  )}

                  <span className="text-[10px] text-navy-500 mt-1.5 block">{fullDate(n.created_at)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
