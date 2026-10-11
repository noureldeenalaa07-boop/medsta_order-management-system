import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { Order, Staff, ShippingMethod, CustomerReply } from "../lib/types";
import { ORDER_STATUSES, STATUS_LABELS, STATUS_COLORS, SECTION_LABELS } from "../lib/types";
import { useAuth } from "../lib/auth";
import { Plus, Bell, Clock, Edit3 } from "lucide-react";
import OrderModal from "../components/OrderModal";

interface OrdersPageProps {
  initialSection: string;
  staffList: Staff[];
  shippingMethods: ShippingMethod[];
}

export default function OrdersPage({ initialSection, staffList, shippingMethods }: OrdersPageProps) {
  const { staff: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState(initialSection);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newCount, setNewCount] = useState<Record<string, number>>({});

  useEffect(() => {
    setActiveTab(initialSection);
  }, [initialSection]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("order_number", { ascending: false });
    setOrders((data as Order[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("orders-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setNewCount((prev) => ({ ...prev, all_orders: (prev.all_orders || 0) + 1 }));
          const newOrder = payload.new as Order;
          newOrder.order_statuses.forEach((s) => {
            setNewCount((prev) => ({ ...prev, [s]: (prev[s] || 0) + 1 }));
          });
        }
        loadOrders();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "customer_replies" }, () => {
        loadOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOrders]);

  function filterOrders(section: string): Order[] {
    if (section === "all_orders") return orders;
    if (section === "closed") return orders.filter((o) => o.is_closed);
    if (section === "cancelled") return orders.filter((o) => o.is_cancelled);
    if (section === "open_orders") return orders.filter((o) => !o.order_statuses.includes("packing") && !o.is_closed && !o.is_cancelled);
    return orders.filter((o) => o.order_statuses.includes(section));
  }

  function clearNewCount(section: string) {
    setNewCount((prev) => ({ ...prev, [section]: 0 }));
  }

  async function addNewOrder() {
    const { data, error } = await supabase
      .from("orders")
      .insert({
        order_statuses: ["open"],
        preparation_responsible_id: currentUser?.id || null,
      })
      .select("*")
      .single();
    if (data) {
      await loadOrders();
      setSelectedOrder(data as Order);
      setShowModal(true);
    }
    if (error) console.error("Error creating order:", error);
  }

  const filtered = filterOrders(activeTab);
  const tabs = [
    "all_orders",
    "open_orders",
    "preparing",
    "waiting_vendor",
    "waiting_6th_oct_branch",
    "waiting_customer_update",
    "customer_replied",
    "complete",
    "closed",
    "cancelled",
  ];

  const allColumns = [
    "order_number", "order_date", "cutoff_timing", "preparation_responsible", "order_statuses",
    "unavailable_products", "team_notes", "opp_checkbox", "vendor_products",
    "vendor_order_date", "vendor_reply_date", "vendor_receive_date",
    "cs_contact_date", "cs_chat_checkbox", "cs_reply_date", "customer_replies",
    "shipping_method", "packing_datetime", "packing_responsible",
    "audit_comment", "operation_feedback", "last_updated",
  ];

  const sectionColumns: Record<string, string[]> = {
    all_orders: allColumns,
    open_orders: allColumns,
    preparing: ["order_number", "order_date", "preparation_responsible", "order_statuses", "unavailable_products", "team_notes", "opp_checkbox", "vendor_products"],
    waiting_vendor: ["order_number", "order_date", "preparation_responsible", "order_statuses", "vendor_products", "vendor_order_date", "vendor_reply_date", "vendor_receive_date"],
    waiting_6th_oct_branch: ["order_number", "order_date", "preparation_responsible", "order_statuses", "oct_branch_products", "oct_branch_receive_date"],
    waiting_customer_update: ["order_number", "order_date", "preparation_responsible", "order_statuses", "cs_contact_date", "cs_chat_checkbox", "cs_reply_date", "customer_replies"],
    customer_replied: ["order_number", "order_date", "preparation_responsible", "order_statuses", "cs_contact_date", "cs_chat_checkbox", "cs_reply_date", "customer_replies"],
    complete: ["order_number", "order_date", "preparation_responsible", "order_statuses", "shipping_method", "packing_datetime", "packing_responsible"],
    closed: allColumns,
    cancelled: allColumns,
  };

  const columns = sectionColumns[activeTab] || allColumns;

  const columnLabels: Record<string, string> = {
    order_number: "Order #",
    order_date: "Order Date",
    cutoff_timing: "Cutoff",
    preparation_responsible: "Prep Responsible",
    order_statuses: "Order Status",
    unavailable_products: "Unavailable Products",
    team_notes: "Team Notes",
    opp_checkbox: "OPP",
    vendor_products: "Vendor Products",
    vendor_order_date: "Vendor Order Date",
    vendor_reply_date: "Vendor Reply Date",
    vendor_receive_date: "Vendor Receive Date",
    cs_contact_date: "CS Contact Date",
    cs_chat_checkbox: "Chat",
    cs_reply_date: "CS Reply Date",
    customer_replies: "Customer Reply",
    shipping_method: "Shipping Method",
    packing_datetime: "Packing Date/Time",
    packing_responsible: "Packing Responsible",
    audit_comment: "Audit Comment",
    operation_feedback: "Op. Feedback",
    last_updated: "Last Update",
    oct_branch_products: "6th Oct Products",
    oct_branch_receive_date: "6th Oct Receive Date",
  };

  function renderCell(order: Order, col: string) {
    switch (col) {
      case "order_number":
        return <span className="font-bold text-primary-400">#{order.order_number}</span>;
      case "order_date":
        return <span className="text-navy-200 text-sm">{order.order_date}</span>;
      case "cutoff_timing":
        return (
          <span className={`text-xs ${order.cutoff_timing === "before_4pm" ? "text-amber-400" : "text-blue-400"}`}>
            {order.cutoff_timing === "before_4pm" ? "Before 4PM" : order.cutoff_timing === "after_4pm" ? "After 4PM" : "--"}
          </span>
        );
      case "preparation_responsible": {
        const s = staffList.find((s) => s.id === order.preparation_responsible_id);
        return <span className="text-sm text-navy-200">{s?.full_name || "--"}</span>;
      }
      case "packing_responsible": {
        const s = staffList.find((s) => s.id === order.packing_responsible_id);
        return <span className="text-sm text-navy-200">{s?.full_name || "--"}</span>;
      }
      case "order_statuses":
        return (
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
            {order.is_closed && <span className="status-badge bg-navy-500/20 text-navy-300">Closed</span>}
            {order.is_cancelled && <span className="status-badge bg-red-500/15 text-red-400">Cancelled</span>}
          </div>
        );
      case "unavailable_products":
        return <span className="text-xs text-navy-300 max-w-[120px] truncate" title={order.unavailable_products}>{order.unavailable_products || "--"}</span>;
      case "team_notes":
        return <span className="text-xs text-navy-300 max-w-[120px] truncate" title={order.team_notes}>{order.team_notes || "--"}</span>;
      case "opp_checkbox":
        return order.opp_checkbox ? <span className="text-green-400">Yes</span> : <span className="text-navy-600">--</span>;
      case "cs_chat_checkbox":
        return order.cs_chat_checkbox ? <span className="text-green-400">Chat</span> : <span className="text-navy-600">--</span>;
      case "vendor_products":
        return <span className="text-xs text-navy-300 max-w-[120px] truncate" title={order.vendor_products}>{order.vendor_products || "--"}</span>;
      case "vendor_order_date":
        return <span className="text-xs text-navy-200">{order.vendor_order_date || "--"}</span>;
      case "vendor_reply_date":
        return <span className="text-xs text-navy-200">{order.vendor_reply_date || "--"}</span>;
      case "vendor_receive_date":
        return <span className="text-xs text-navy-200">{order.vendor_receive_date || "--"}</span>;
      case "oct_branch_products":
        return <span className="text-xs text-navy-300 max-w-[120px] truncate" title={order.oct_branch_products}>{order.oct_branch_products || "--"}</span>;
      case "oct_branch_receive_date":
        return <span className="text-xs text-navy-200">{order.oct_branch_receive_date || "--"}</span>;
      case "cs_contact_date":
        return <span className="text-xs text-navy-200">{order.cs_contact_date || "--"}</span>;
      case "cs_reply_date":
        return <span className="text-xs text-navy-200">{order.cs_reply_date || "--"}</span>;
      case "customer_replies":
        return order.customer_replies && order.customer_replies.length > 0 ? (
          <span className="status-badge bg-green-500/15 text-green-400 border border-green-500/30">
            {order.customer_replies.length} {order.customer_replies.length === 1 ? "comment" : "comments"}
          </span>
        ) : <span className="text-navy-600 text-xs">--</span>;
      case "shipping_method": {
        const m = shippingMethods.find((m) => m.id === order.shipping_method_id);
        return m ? (
          <span className="status-badge" style={{ backgroundColor: `${m.color}25`, color: m.color }}>
            {m.name}
          </span>
        ) : <span className="text-navy-600 text-xs">--</span>;
      }
      case "packing_datetime":
        return order.packing_datetime ? (
          <span className="text-xs text-navy-200 flex items-center gap-1">
            <Clock className="w-3 h-3 text-pink-400" />
            {new Date(order.packing_datetime).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
          </span>
        ) : <span className="text-navy-600 text-xs">--</span>;
      case "audit_comment":
        return <span className="text-xs text-navy-300 max-w-[100px] truncate" title={order.audit_comment}>{order.audit_comment || "--"}</span>;
      case "operation_feedback":
        return <span className="text-xs text-navy-300 max-w-[100px] truncate" title={order.operation_feedback}>{order.operation_feedback || "--"}</span>;
      case "last_updated":
        return (
          <span className="text-xs text-navy-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-500" />
            {new Date(order.last_updated).toLocaleDateString("en-US")}
          </span>
        );
      default:
        return "--";
    }
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Tab bar */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto tab-scroll pb-2">
        <button
          onClick={addNewOrder}
          className="btn-primary flex items-center gap-1.5 text-sm whitespace-nowrap flex-shrink-0"
        >
          <Plus className="w-4 h-4" /> New Order
        </button>
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          const count = newCount[tab] || 0;
          return (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                clearNewCount(tab);
              }}
              className={`tab-button flex-shrink-0 ${
                isActive
                  ? "bg-navy-800 text-white border-primary-500"
                  : "bg-navy-900/30 text-navy-400 border-transparent hover:text-white hover:bg-navy-800/50"
              }`}
            >
              {SECTION_LABELS[tab]}
              {count > 0 && (
                <span className="flex items-center gap-0.5 bg-primary-600 text-white text-xs px-1.5 py-0.5 rounded-full animate-pulse-soft">
                  <Bell className="w-2.5 h-2.5" />
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Orders table */}
      <div className="glass-card flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-navy-400 text-sm">
            No orders in this list
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-navy-900/90 backdrop-blur-md z-10">
                <tr className="border-b border-navy-700/50">
                  {columns.map((col) => (
                    <th key={col} className="px-3 py-3 text-xs font-medium text-navy-300 whitespace-nowrap">
                      {columnLabels[col] || col}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-xs font-medium text-navy-300 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order, i) => (
                  <tr
                    key={order.id}
                    className={`border-b border-navy-700/20 hover:bg-navy-700/20 transition-colors cursor-pointer animate-fade-in ${
                      i % 2 === 0 ? "bg-navy-900/20" : ""
                    }`}
                    style={{ animationDelay: `${i * 20}ms` }}
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowModal(true);
                    }}
                  >
                    {columns.map((col) => (
                      <td key={col} className="px-3 py-3 whitespace-nowrap">
                        {renderCell(order, col)}
                      </td>
                    ))}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                          setShowModal(true);
                        }}
                        className="text-primary-400 hover:text-primary-300 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && selectedOrder && (
        <OrderModal
          order={selectedOrder}
          staffList={staffList}
          shippingMethods={shippingMethods}
          onClose={() => {
            setShowModal(false);
            setSelectedOrder(null);
          }}
          onSaved={() => loadOrders()}
        />
      )}
    </div>
  );
}
