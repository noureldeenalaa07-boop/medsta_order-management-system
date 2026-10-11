/*
# Order Management System Schema

## Overview
Creates a complete order management system with staff authentication, permissions,
order tracking with multiple statuses, shipping methods, customer replies, and audit trails.

## Tables Created

1. **staff** - System users (preparation staff, packing staff, admins)
   - id (uuid, PK, references auth.users)
   - email, full_name, role (admin/staff), password managed by Supabase Auth
   - is_active, created_at, updated_at

2. **staff_permissions** - Granular permissions per staff member for each tab/section
   - staff_id, section_name, can_view, can_edit, can_add, can_delete

3. **shipping_methods** - Configurable shipping methods with colors
   - id, name, color, is_active

4. **orders** - Main orders table with all fields
   - order_number (auto-incrementing), order_date, cutoff_timing
   - preparation_responsible_id (FK to staff)
   - order_statuses (array of statuses - an order can have multiple)
   - unavailable_products, team_notes, opp_checkbox
   - vendor_products, vendor_order_date, vendor_reply_date, vendor_receive_date
   - cs_contact_date, cs_chat_checkbox, cs_reply_date
   - customer_replies (array of comments)
   - shipping_method_id (FK)
   - packing_datetime, packing_responsible_id (FK to staff)
   - audit_comment, operation_feedback
   - is_closed, closed_at, is_cancelled, cancelled_at
   - last_updated, last_updated_by

5. **customer_replies** - Multiple customer comments per order
   - order_id, comment, created_at, created_by_staff_id

6. **order_status_history** - Track status changes for audit
   - order_id, status, changed_by, changed_at

## Security
- RLS enabled on all tables
- Policies scoped to authenticated users only
- Staff can view/edit orders based on their permissions (enforced in app layer)
*/

-- Staff table (links to auth.users)
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_select_authenticated" ON staff;
CREATE POLICY "staff_select_authenticated" ON staff FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "staff_insert_authenticated" ON staff;
CREATE POLICY "staff_insert_authenticated" ON staff FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "staff_update_authenticated" ON staff;
CREATE POLICY "staff_update_authenticated" ON staff FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "staff_delete_authenticated" ON staff;
CREATE POLICY "staff_delete_authenticated" ON staff FOR DELETE
  TO authenticated USING (true);

-- Staff permissions table
CREATE TABLE IF NOT EXISTS staff_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  section_name text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_add boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, section_name)
);

ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perms_select_authenticated" ON staff_permissions;
CREATE POLICY "perms_select_authenticated" ON staff_permissions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "perms_insert_authenticated" ON staff_permissions;
CREATE POLICY "perms_insert_authenticated" ON staff_permissions FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "perms_update_authenticated" ON staff_permissions;
CREATE POLICY "perms_update_authenticated" ON staff_permissions FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "perms_delete_authenticated" ON staff_permissions;
CREATE POLICY "perms_delete_authenticated" ON staff_permissions FOR DELETE
  TO authenticated USING (true);

-- Shipping methods table
CREATE TABLE IF NOT EXISTS shipping_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shipping_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shipping_select_authenticated" ON shipping_methods;
CREATE POLICY "shipping_select_authenticated" ON shipping_methods FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "shipping_insert_authenticated" ON shipping_methods;
CREATE POLICY "shipping_insert_authenticated" ON shipping_methods FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "shipping_update_authenticated" ON shipping_methods;
CREATE POLICY "shipping_update_authenticated" ON shipping_methods FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "shipping_delete_authenticated" ON shipping_methods;
CREATE POLICY "shipping_delete_authenticated" ON shipping_methods FOR DELETE
  TO authenticated USING (true);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number integer NOT NULL,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  cutoff_timing text CHECK (cutoff_timing IN ('before_4pm', 'after_4pm')),
  preparation_responsible_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  order_statuses text[] NOT NULL DEFAULT '{}',
  unavailable_products text DEFAULT '',
  team_notes text DEFAULT '',
  opp_checkbox boolean NOT NULL DEFAULT false,
  vendor_products text DEFAULT '',
  vendor_order_date date,
  vendor_reply_date date,
  vendor_receive_date date,
  cs_contact_date date,
  cs_chat_checkbox boolean NOT NULL DEFAULT false,
  cs_reply_date date,
  shipping_method_id uuid REFERENCES shipping_methods(id) ON DELETE SET NULL,
  packing_datetime timestamptz,
  packing_responsible_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  audit_comment text DEFAULT '',
  operation_feedback text DEFAULT '',
  oct_branch_products text DEFAULT '',
  oct_branch_receive_date date,
  is_closed boolean NOT NULL DEFAULT false,
  closed_at timestamptz,
  is_cancelled boolean NOT NULL DEFAULT false,
  cancelled_at timestamptz,
  last_updated timestamptz DEFAULT now(),
  last_updated_by uuid REFERENCES staff(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Auto-incrementing order number
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'orders_order_number_seq') THEN
    CREATE SEQUENCE orders_order_number_seq START 1;
  END IF;
END $$;

-- Set default to use the sequence
ALTER TABLE orders ALTER COLUMN order_number SET DEFAULT nextval('orders_order_number_seq');

-- Unique constraint on order_number
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_order_number_key') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_statuses ON orders USING GIN(order_statuses);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_authenticated" ON orders;
CREATE POLICY "orders_select_authenticated" ON orders FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "orders_insert_authenticated" ON orders;
CREATE POLICY "orders_insert_authenticated" ON orders FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "orders_update_authenticated" ON orders;
CREATE POLICY "orders_update_authenticated" ON orders FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "orders_delete_authenticated" ON orders;
CREATE POLICY "orders_delete_authenticated" ON orders FOR DELETE
  TO authenticated USING (true);

-- Customer replies table (multiple comments per order)
CREATE TABLE IF NOT EXISTS customer_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by_staff_id uuid REFERENCES staff(id) ON DELETE SET NULL
);

ALTER TABLE customer_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "replies_select_authenticated" ON customer_replies;
CREATE POLICY "replies_select_authenticated" ON customer_replies FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "replies_insert_authenticated" ON customer_replies;
CREATE POLICY "replies_insert_authenticated" ON customer_replies FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "replies_update_authenticated" ON customer_replies;
CREATE POLICY "replies_update_authenticated" ON customer_replies FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "replies_delete_authenticated" ON customer_replies;
CREATE POLICY "replies_delete_authenticated" ON customer_replies FOR DELETE
  TO authenticated USING (true);

-- Order status history table (audit trail)
CREATE TABLE IF NOT EXISTS order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  changed_by uuid REFERENCES staff(id) ON DELETE SET NULL,
  changed_at timestamptz DEFAULT now()
);

ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "history_select_authenticated" ON order_status_history;
CREATE POLICY "history_select_authenticated" ON order_status_history FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "history_insert_authenticated" ON order_status_history;
CREATE POLICY "history_insert_authenticated" ON order_status_history FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "history_delete_authenticated" ON order_status_history;
CREATE POLICY "history_delete_authenticated" ON order_status_history FOR DELETE
  TO authenticated USING (true);
