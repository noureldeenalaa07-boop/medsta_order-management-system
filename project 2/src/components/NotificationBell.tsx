import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import type { Order, CustomerReply } from "../lib/types";
import { STATUS_LABELS, STATUS_COLORS } from "../lib/types";
import { Bell, Package, MessageSquare, X, ChevronRight } from "lucide-react";

export interface NotificationItem {
  id: string;
  type: "new_order" | "customer_reply";
  order_number: number;
  order_id: string;
  message: string;
  reply_text?: string;
  created_at: string;
  read: boolean;
}

interface NotificationBellProps {
  onOpenOrder: (order: Order) => void;
  onViewAll: () => void;
  mode: "general" | "replies";
}

export default function NotificationBell({ onOpenOrder, onViewAll, mode }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [ordersMap, setOrdersMap] = useState<Map<string, Order>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInitialNotifications();
    const cleanup = subscribeToChanges();
    return cleanup;
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function loadInitialNotifications() {
    if (mode === "general") {
      const { data: recentOrders } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      const orderMap = new Map<string, Order>();
      (recentOrders as Order[] || []).forEach((o) => orderMap.set(o.id, o));
      setOrdersMap(orderMap);

      const items: NotificationItem[] = (recentOrders as Order[] || []).map((o) => ({
        id: `order-${o.id}`,
        type: "new_order" as const,
        order_number: o.order_number,
        order_id: o.id,
        message: `New order #${o.order_number} created`,
        created_at: o.created_at,
        read: true,
      }));

      items.sort((a, b) => b.created_at.localeCompare(a.created_at));
      setNotifications(items.slice(0, 20));
    } else {
      const { data: recentReplies } = await supabase
        .from("customer_replies")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      const orderIds = (recentReplies as CustomerReply[] || []).map((r) => r.order_id);
      const orderMap = new Map<string, Order>();
      if (orderIds.length > 0) {
        const { data: orderData } = await supabase
          .from("orders")
          .select("*")
          .in("id", orderIds);
        (orderData as Order[] || []).forEach((o) => orderMap.set(o.id, o));
      }
      setOrdersMap(orderMap);

      const items: NotificationItem[] = (recentReplies as CustomerReply[] || []).map((r) => {
        const order = orderMap.get(r.order_id);
        return {
          id: `reply-${r.id}`,
          type: "customer_reply" as const,
          order_number: order?.order_number || 0,
          order_id: r.order_id,
          message: `Customer replied on order #${order?.order_number || "?"}`,
          reply_text: r.comment,
          created_at: r.created_at,
          read: true,
        };
      });

      items.sort((a, b) => b.created_at.localeCompare(a.created_at));
      setNotifications(items.slice(0, 20));
    }
  }

  function subscribeToChanges(): () => void {
    if (mode === "general") {
      const channel = supabase
        .channel("notifications-general")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
          const newOrder = payload.new as Order;
          setOrdersMap((prev) => new Map(prev).set(newOrder.id, newOrder));
          setNotifications((prev) => [
            {
              id: `order-${newOrder.id}-${Date.now()}`,
              type: "new_order",
              order_number: newOrder.order_number,
              order_id: newOrder.id,
              message: `New order #${newOrder.order_number} created`,
              created_at: newOrder.created_at,
              read: false,
            },
            ...prev,
          ]);
          setUnreadCount((c) => c + 1);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      const channel = supabase
        .channel("notifications-replies")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "customer_replies" }, async (payload) => {
          const reply = payload.new as CustomerReply;
          const { data: orderData } = await supabase
            .from("orders")
            .select("*")
            .eq("id", reply.order_id)
            .maybeSingle();
          const order = orderData as Order;
          if (order) {
            setOrdersMap((prev) => new Map(prev).set(order.id, order));
          }
          setNotifications((prev) => [
            {
              id: `reply-${reply.id}-${Date.now()}`,
              type: "customer_reply",
              order_number: order?.order_number || 0,
              order_id: reply.order_id,
              message: `Customer replied on order #${order?.order_number || "?"}`,
              reply_text: reply.comment,
              created_at: reply.created_at,
              read: false,
            },
            ...prev,
          ]);
          setUnreadCount((c) => c + 1);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  function handleNotificationClick(n: NotificationItem) {
    setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)));
    setUnreadCount((c) => Math.max(0, c - 1));
    const order = ordersMap.get(n.order_id);
    if (order) {
      onOpenOrder(order);
    }
    setShowPanel(false);
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  const isGeneral = mode === "general";
  const iconColor = isGeneral ? "text-primary-400" : "text-green-400";
  const bgGradient = isGeneral ? "from-primary-500 to-primary-700" : "from-green-500 to-green-700";
  const panelTitle = isGeneral ? "General Notifications" : "Customer Reply Notifications";
  const emptyText = isGeneral ? "No new order notifications" : "No customer reply notifications";
  const viewAllText = isGeneral ? "View all notifications" : "View all replies";

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative text-navy-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-navy-800/50"
        title={panelTitle}
        aria-label={panelTitle}
      >
        {isGeneral ? (
          <Bell className="w-5 h-5" />
        ) : (
          <MessageSquare className="w-5 h-5" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-danger-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse-soft px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <div className="absolute top-full left-auto right-0 mt-2 w-[380px] max-w-[90vw] glass-card shadow-2xl overflow-hidden animate-slide-up z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-navy-700/50 bg-navy-900/80">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${bgGradient} flex items-center justify-center`}>
                {isGeneral ? <Bell className="w-3.5 h-3.5 text-white" /> : <MessageSquare className="w-3.5 h-3.5 text-white" />}
              </div>
              <span className="text-sm font-semibold text-white">{panelTitle}</span>
              {unreadCount > 0 && (
                <span className="bg-danger-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
                  Mark all read
                </button>
              )}
              <button onClick={() => setShowPanel(false)} className="text-navy-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-navy-400 text-sm">{emptyText}</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-navy-700/30 transition-colors text-left border-b border-navy-700/20 last:border-0 ${
                    !n.read ? (isGeneral ? "bg-primary-500/5" : "bg-green-500/5") : ""
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    n.type === "new_order" ? "bg-primary-500/15" : "bg-green-500/15"
                  }`}>
                    {n.type === "new_order" ? (
                      <Package className={`w-4 h-4 ${iconColor}`} />
                    ) : (
                      <MessageSquare className="w-4 h-4 text-green-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white font-medium">{n.message}</span>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-danger-500 flex-shrink-0 animate-pulse-soft" />}
                    </div>
                    {n.reply_text && (
                      <p className="text-xs text-navy-300 mt-1 line-clamp-2 bg-navy-800/40 rounded-md px-2 py-1.5 border border-navy-700/30">
                        "{n.reply_text}"
                      </p>
                    )}
                    {n.type === "new_order" && ordersMap.get(n.order_id) && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {ordersMap.get(n.order_id)!.order_statuses.map((s) => {
                          const c = STATUS_COLORS[s];
                          return (
                            <span key={s} className={`status-badge text-[10px] ${c?.bg || ""} ${c?.text || ""}`}>
                              {STATUS_LABELS[s] || s}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <span className="text-[10px] text-navy-500 mt-1 block">{timeAgo(n.created_at)}</span>
                  </div>

                  <ChevronRight className="w-4 h-4 text-navy-600 flex-shrink-0 mt-2" />
                </button>
              ))
            )}
          </div>

          <div className="border-t border-navy-700/50 bg-navy-900/80 px-4 py-2.5">
            <button
              onClick={() => {
                setShowPanel(false);
                onViewAll();
              }}
              className="w-full text-center text-xs text-primary-400 hover:text-primary-300 transition-colors py-1"
            >
              {viewAllText} →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
