export interface Staff {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "staff";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffPermission {
  id: string;
  staff_id: string;
  section_name: string;
  can_view: boolean;
  can_edit: boolean;
  can_add: boolean;
  can_delete: boolean;
}

export interface ShippingMethod {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
}

export interface CustomerReply {
  id: string;
  order_id: string;
  comment: string;
  created_at: string;
  created_by_staff_id: string | null;
}

export interface OctBranchComment {
  id: string;
  order_id: string;
  comment: string;
  created_at: string;
  created_by_staff_id: string | null;
}

export interface Order {
  id: string;
  order_number: number;
  order_date: string;
  cutoff_timing: "before_4pm" | "after_4pm" | null;
  preparation_responsible_id: string | null;
  order_statuses: string[];
  unavailable_products: string;
  team_notes: string;
  opp_checkbox: boolean;
  vendor_products: string;
  vendor_order_date: string | null;
  vendor_reply_date: string | null;
  vendor_receive_date: string | null;
  cs_contact_date: string | null;
  cs_chat_checkbox: boolean;
  cs_reply_date: string | null;
  shipping_method_id: string | null;
  packing_datetime: string | null;
  packing_responsible_id: string | null;
  audit_comment: string;
  operation_feedback: string;
  oct_branch_products: string;
  oct_branch_receive_date: string | null;
  is_closed: boolean;
  closed_at: string | null;
  is_cancelled: boolean;
  cancelled_at: string | null;
  is_blacklisted: boolean;
  last_updated: string;
  last_updated_by: string | null;
  created_at: string;
  preparation_responsible?: Staff | null;
  packing_responsible?: Staff | null;
  shipping_method?: ShippingMethod | null;
  customer_replies?: CustomerReply[];
  oct_branch_comments?: OctBranchComment[];
}

export const ORDER_STATUSES = [
  "open",
  "preparing",
  "waiting_vendor",
  "waiting_6th_oct_branch",
  "waiting_customer_update",
  "customer_replied",
  "packing",
  "complete",
  "closed",
  "cancelled",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  preparing: "Preparing",
  waiting_vendor: "Waiting Vendor",
  waiting_6th_oct_branch: "Waiting 6th Oct Branch",
  waiting_customer_update: "Waiting Customer Update",
  customer_replied: "Customer Replied",
  packing: "Packing",
  complete: "Complete",
  closed: "Closed",
  cancelled: "Cancelled",
};

export const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  open: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30", dot: "bg-blue-500" },
  preparing: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-500" },
  waiting_vendor: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30", dot: "bg-purple-500" },
  waiting_6th_oct_branch: { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/30", dot: "bg-cyan-500" },
  waiting_customer_update: { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30", dot: "bg-orange-500" },
  customer_replied: { bg: "bg-green-500/15", text: "text-green-400", border: "border-green-500/30", dot: "bg-green-500" },
  packing: { bg: "bg-pink-500/15", text: "text-pink-400", border: "border-pink-500/30", dot: "bg-pink-500" },
  complete: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", dot: "bg-emerald-500" },
  closed: { bg: "bg-navy-500/20", text: "text-navy-300", border: "border-navy-500/30", dot: "bg-navy-400" },
  cancelled: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30", dot: "bg-red-500" },
};

export const TAB_SECTIONS = [
  "open_orders",
  "preparing",
  "waiting_vendor",
  "waiting_6th_oct_branch",
  "waiting_customer_update",
  "customer_replied",
  "complete",
  "closed",
  "cancelled",
] as const;

export const SECTION_LABELS: Record<string, string> = {
  all_orders: "All Orders",
  open_orders: "Open Orders",
  preparing: "Preparing",
  waiting_vendor: "Waiting Vendor",
  waiting_6th_oct_branch: "Waiting 6th Oct Branch",
  waiting_customer_update: "Waiting Customer Update",
  customer_replied: "Customer Replied",
  complete: "Complete",
  closed: "Closed",
  cancelled: "Cancelled",
  dashboard: "Dashboard",
  settings: "Settings",
};

export function formatOrderNumber(num: number): string {
  return `OR-${num}`;
}
