import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { Order, Staff, ShippingMethod, CustomerReply, OctBranchComment } from "../lib/types";
import { ORDER_STATUSES, STATUS_LABELS, STATUS_COLORS, formatOrderNumber } from "../lib/types";
import { useAuth } from "../lib/auth";
import { X, Plus, Clock, Save, Trash2, MessageSquare, Check, CheckCircle2 } from "lucide-react";

interface OrderModalProps {
  order: Order | null;
  staffList: Staff[];
  shippingMethods: ShippingMethod[];
  onClose: () => void;
  onSaved: () => void;
}

export default function OrderModal({ order, staffList, shippingMethods, onClose, onSaved }: OrderModalProps) {
  const { staff: currentUser } = useAuth();
  const [form, setForm] = useState<Order | null>(order);
  const [replies, setReplies] = useState<CustomerReply[]>([]);
  const [octComments, setOctComments] = useState<OctBranchComment[]>([]);
  const [newReply, setNewReply] = useState("");
  const [newOctComment, setNewOctComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (order) {
      setForm(order);
      loadReplies(order.id);
      loadOctComments(order.id);
    }
  }, [order]);

  async function loadReplies(orderId: string) {
    const { data } = await supabase
      .from("customer_replies")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });
    setReplies((data as CustomerReply[]) || []);
  }

  async function loadOctComments(orderId: string) {
    const { data } = await supabase
      .from("oct_branch_comments")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });
    setOctComments((data as OctBranchComment[]) || []);
  }

  if (!form) return null;

  function update<K extends keyof Order>(key: K, value: Order[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function toggleStatus(status: string) {
    if (!form) return;
    const current = form.order_statuses;
    const newStatuses = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    update("order_statuses", newStatuses);
  }

  async function addReply() {
    if (!form || !newReply.trim() || !currentUser) return;
    const { data } = await supabase
      .from("customer_replies")
      .insert({
        order_id: form.id,
        comment: newReply.trim(),
        created_by_staff_id: currentUser.id,
      })
      .select("*")
      .single();
    if (data) {
      setReplies([data as CustomerReply, ...replies]);
      setNewReply("");
    }
  }

  async function deleteReply(replyId: string) {
    await supabase.from("customer_replies").delete().eq("id", replyId);
    setReplies(replies.filter((r) => r.id !== replyId));
  }

  async function addOctComment() {
    if (!form || !newOctComment.trim() || !currentUser) return;
    const { data } = await supabase
      .from("oct_branch_comments")
      .insert({
        order_id: form.id,
        comment: newOctComment.trim(),
        created_by_staff_id: currentUser.id,
      })
      .select("*")
      .single();
    if (data) {
      setOctComments([data as OctBranchComment, ...octComments]);
      setNewOctComment("");
    }
  }

  async function deleteOctComment(commentId: string) {
    await supabase.from("oct_branch_comments").delete().eq("id", commentId);
    setOctComments(octComments.filter((c) => c.id !== commentId));
  }

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    const { id, ...updateData } = form;
    await supabase
      .from("orders")
      .update({
        ...updateData,
        last_updated: new Date().toISOString(),
        last_updated_by: currentUser?.id || null,
      })
      .eq("id", id);
    setSaving(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
    onSaved();
  }

  async function setPackingNow() {
    if (!form || !currentUser) return;
    const now = new Date().toISOString();
    update("packing_datetime", now);
    update("packing_responsible_id", currentUser.id);
    setForm((prev) => (prev ? { ...prev, packing_datetime: now, packing_responsible_id: currentUser.id } : prev));
  }

  function markVendorReceived() {
    if (!form) return;
    const updated = form.order_statuses.filter((s) => s !== "waiting_vendor");
    update("order_statuses", updated);
    update("vendor_receive_date", new Date().toISOString().slice(0, 10));
    setForm((prev) => prev ? { ...prev, order_statuses: updated, vendor_receive_date: new Date().toISOString().slice(0, 10) } : prev);
  }

  function markOctBranchReceived() {
    if (!form) return;
    const updated = form.order_statuses.filter((s) => s !== "waiting_6th_oct_branch");
    update("order_statuses", updated);
    update("oct_branch_receive_date", new Date().toISOString().slice(0, 10));
    setForm((prev) => prev ? { ...prev, order_statuses: updated, oct_branch_receive_date: new Date().toISOString().slice(0, 10) } : prev);
  }

  const inputCls = "w-full bg-navy-800/50 border border-navy-600/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="glass-card w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-navy-900/80 backdrop-blur-md -mx-6 px-6 py-3 z-10 border-b border-navy-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">{formatOrderNumber(form.order_number)}</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Order {formatOrderNumber(form.order_number)}</h2>
              <p className="text-xs text-navy-400">{form.order_date}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {savedFlash && (
              <span className="flex items-center gap-1 text-accent-400 text-sm animate-fade-in">
                <Check className="w-4 h-4" /> Saved
              </span>
            )}
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
              <Save className="w-4 h-4 inline mr-1" />
              {saving ? "..." : "Save"}
            </button>
            <button onClick={onClose} className="text-navy-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {/* Status badges with toggle */}
          <div>
            <label className="block text-sm text-navy-300 mb-2">Order Statuses</label>
            <div className="flex flex-wrap gap-2">
              {ORDER_STATUSES.map((status) => {
                const active = form.order_statuses.includes(status);
                const c = STATUS_COLORS[status];
                return (
                  <button
                    key={status}
                    onClick={() => toggleStatus(status)}
                    className={`status-badge border transition-all duration-200 ${
                      active ? `${c.bg} ${c.text} ${c.border}` : "bg-navy-800/30 text-navy-400 border-navy-700/30 hover:border-navy-600"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${active ? c.dot : "bg-navy-600"}`} />
                    {STATUS_LABELS[status]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-navy-300 mb-1.5">Order Date</label>
              <input type="date" value={form.order_date || ""} onChange={(e) => update("order_date", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm text-navy-300 mb-1.5">Before/After 4PM</label>
              <select value={form.cutoff_timing || ""} onChange={(e) => update("cutoff_timing", e.target.value as "before_4pm" | "after_4pm" | null)} className={inputCls}>
                <option value="">--</option>
                <option value="before_4pm">Before 4PM</option>
                <option value="after_4pm">After 4PM</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-navy-300 mb-1.5">Preparation Responsible</label>
              <select value={form.preparation_responsible_id || ""} onChange={(e) => update("preparation_responsible_id", e.target.value || null)} className={inputCls}>
                <option value="">--</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-navy-300 mb-1.5">Packing Responsible</label>
              <select value={form.packing_responsible_id || ""} onChange={(e) => update("packing_responsible_id", e.target.value || null)} className={inputCls}>
                <option value="">--</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-navy-300 mb-1.5">Unavailable Products</label>
              <textarea value={form.unavailable_products} onChange={(e) => update("unavailable_products", e.target.value)} className={inputCls} rows={2} />
            </div>
            <div>
              <label className="block text-sm text-navy-300 mb-1.5">Team Notes</label>
              <textarea value={form.team_notes} onChange={(e) => update("team_notes", e.target.value)} className={inputCls} rows={2} />
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.opp_checkbox} onChange={(e) => update("opp_checkbox", e.target.checked)} className="w-4 h-4 rounded accent-primary-600" />
              <span className="text-sm text-navy-200">OPP</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.cs_chat_checkbox} onChange={(e) => update("cs_chat_checkbox", e.target.checked)} className="w-4 h-4 rounded accent-primary-600" />
              <span className="text-sm text-navy-200">Chat</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_blacklisted} onChange={(e) => update("is_blacklisted", e.target.checked)} className="w-4 h-4 rounded accent-danger-500" />
              <span className="text-sm text-danger-400">Blacklist</span>
            </label>
          </div>

          {/* Vendor section */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-primary-400">Vendor Products</h3>
              {form.order_statuses.includes("waiting_vendor") && (
                <button
                  onClick={markVendorReceived}
                  className="flex items-center gap-1.5 text-xs bg-accent-500/20 text-accent-400 border border-accent-500/30 rounded-lg px-3 py-1.5 hover:bg-accent-500/30 transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark Vendor Received
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-navy-400 mb-1">Vendor Order Date</label>
                <input type="date" value={form.vendor_order_date || ""} onChange={(e) => update("vendor_order_date", e.target.value || null)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-navy-400 mb-1">Vendor Reply Date</label>
                <input type="date" value={form.vendor_reply_date || ""} onChange={(e) => update("vendor_reply_date", e.target.value || null)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-navy-400 mb-1">Vendor Receive Date</label>
                <input type="date" value={form.vendor_receive_date || ""} onChange={(e) => update("vendor_receive_date", e.target.value || null)} className={inputCls} />
              </div>
            </div>
            <textarea value={form.vendor_products} onChange={(e) => update("vendor_products", e.target.value)} className={inputCls} rows={2} placeholder="Vendor products" />
          </div>

          {/* Oct branch section with multiple comments */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-cyan-400">6th Oct Branch Products</h3>
              {form.order_statuses.includes("waiting_6th_oct_branch") && (
                <button
                  onClick={markOctBranchReceived}
                  className="flex items-center gap-1.5 text-xs bg-accent-500/20 text-accent-400 border border-accent-500/30 rounded-lg px-3 py-1.5 hover:bg-accent-500/30 transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark 6th Oct Received
                </button>
              )}
            </div>
            <textarea value={form.oct_branch_products} onChange={(e) => update("oct_branch_products", e.target.value)} className={inputCls} rows={2} placeholder="6th Oct branch products" />
            <div>
              <label className="block text-xs text-navy-400 mb-1">Receive Date</label>
              <input type="date" value={form.oct_branch_receive_date || ""} onChange={(e) => update("oct_branch_receive_date", e.target.value || null)} className={inputCls} />
            </div>

            {/* Multiple comments section */}
            <div className="pt-2 border-t border-navy-700/30">
              <label className="block text-xs text-cyan-400 mb-2 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" /> 6th Oct Branch Comments
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  value={newOctComment}
                  onChange={(e) => setNewOctComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addOctComment()}
                  placeholder="Add comment..."
                  className={inputCls}
                />
                <button onClick={addOctComment} className="btn-primary px-3">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {octComments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-3 py-2 animate-slide-up">
                    <div className="flex-1">
                      <p className="text-sm text-cyan-200">{c.comment}</p>
                      <p className="text-xs text-navy-400 mt-1">{new Date(c.created_at).toLocaleString("en-US")}</p>
                    </div>
                    <button onClick={() => deleteOctComment(c.id)} className="text-navy-400 hover:text-danger-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {octComments.length === 0 && <p className="text-xs text-navy-400 text-center py-2">No comments yet</p>}
              </div>
            </div>
          </div>

          {/* CS section */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-orange-400">Customer Service</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-navy-400 mb-1">CS Contact Date</label>
                <input type="date" value={form.cs_contact_date || ""} onChange={(e) => update("cs_contact_date", e.target.value || null)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-navy-400 mb-1">CS Reply Date</label>
                <input type="date" value={form.cs_reply_date || ""} onChange={(e) => update("cs_reply_date", e.target.value || null)} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Customer replies */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-green-400 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Customer Reply
            </h3>
            <div className="flex gap-2">
              <input
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addReply()}
                placeholder="Add customer comment..."
                className={inputCls}
              />
              <button onClick={addReply} className="btn-primary px-3">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {replies.map((r) => (
                <div key={r.id} className="flex items-start gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 animate-slide-up">
                  <div className="flex-1">
                    <p className="text-sm text-green-200">{r.comment}</p>
                    <p className="text-xs text-navy-400 mt-1">{new Date(r.created_at).toLocaleString("en-US")}</p>
                  </div>
                  <button onClick={() => deleteReply(r.id)} className="text-navy-400 hover:text-danger-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {replies.length === 0 && <p className="text-xs text-navy-400 text-center py-2">No comments yet</p>}
            </div>
          </div>

          {/* Shipping & Packing */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-pink-400">Shipping & Packing</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-navy-400 mb-1">Shipping Method</label>
                <select value={form.shipping_method_id || ""} onChange={(e) => update("shipping_method_id", e.target.value || null)} className={inputCls}>
                  <option value="">--</option>
                  {shippingMethods.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-navy-400 mb-1">Packing Date/Time</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.packing_datetime ? new Date(form.packing_datetime).toLocaleString("en-US") : ""}
                    readOnly
                    className={inputCls}
                    placeholder="Not set yet"
                  />
                  <button onClick={setPackingNow} className="btn-secondary px-3 whitespace-nowrap" title="Set to now">
                    <Clock className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Audit & Feedback */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-navy-300 mb-1.5">Audit Comment</label>
              <textarea value={form.audit_comment} onChange={(e) => update("audit_comment", e.target.value)} className={inputCls} rows={2} />
            </div>
            <div>
              <label className="block text-sm text-navy-300 mb-1.5">Operation Feedback</label>
              <textarea value={form.operation_feedback} onChange={(e) => update("operation_feedback", e.target.value)} className={inputCls} rows={2} />
            </div>
          </div>

          {/* Close / Cancel / Blacklist */}
          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_closed}
                onChange={(e) => update("is_closed", e.target.checked)}
                className="w-4 h-4 accent-navy-500"
              />
              <span className="text-sm text-navy-200">Closed</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_cancelled}
                onChange={(e) => update("is_cancelled", e.target.checked)}
                className="w-4 h-4 accent-danger-500"
              />
              <span className="text-sm text-navy-200">Cancelled</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_blacklisted}
                onChange={(e) => update("is_blacklisted", e.target.checked)}
                className="w-4 h-4 accent-danger-500"
              />
              <span className="text-sm text-danger-400">Blacklist</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
