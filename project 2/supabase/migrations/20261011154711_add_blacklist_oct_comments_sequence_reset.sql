/*
# Add Blacklist, Oct Branch Comments, and Reset Order Sequence

## Overview
This migration adds three features:
1. A blacklist checkbox on orders — when checked, the entire row turns black with white text.
2. A separate table for multiple 6th Oct Branch comments per order (replacing the single text field approach).
3. Resets the order number sequence to start at OR-7000 format (sequence value 7000).

## Changes

### 1. New column on `orders` table
- `is_blacklisted` (boolean, default false) — marks an order as blacklisted.

### 2. New table: `oct_branch_comments`
- `id` (uuid, primary key)
- `order_id` (uuid, FK to orders, ON DELETE CASCADE)
- `comment` (text, not null) — the comment text
- `created_at` (timestamptz, default now())
- `created_by_staff_id` (uuid, FK to staff, ON DELETE SET NULL)

This allows staff to add multiple comments to the 6th Oct Branch section instead of one text field.

### 3. Reset order sequence
- Sets `orders_order_number_seq` to start at 7000 so new orders begin at OR-7000.

## Security
- RLS enabled on `oct_branch_comments` with authenticated-only CRUD policies.
- Existing `orders` RLS policies cover the new `is_blacklisted` column (column-level not restricted).
*/

-- Add is_blacklisted column to orders
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'is_blacklisted') THEN
    ALTER TABLE orders ADD COLUMN is_blacklisted boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Create oct_branch_comments table
CREATE TABLE IF NOT EXISTS oct_branch_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by_staff_id uuid REFERENCES staff(id) ON DELETE SET NULL
);

ALTER TABLE oct_branch_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "oct_comments_select_authenticated" ON oct_branch_comments;
CREATE POLICY "oct_comments_select_authenticated" ON oct_branch_comments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "oct_comments_insert_authenticated" ON oct_branch_comments;
CREATE POLICY "oct_comments_insert_authenticated" ON oct_branch_comments FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "oct_comments_update_authenticated" ON oct_branch_comments;
CREATE POLICY "oct_comments_update_authenticated" ON oct_branch_comments FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "oct_comments_delete_authenticated" ON oct_branch_comments;
CREATE POLICY "oct_comments_delete_authenticated" ON oct_branch_comments FOR DELETE
  TO authenticated USING (true);

-- Reset the order number sequence to start at 7000
SELECT setval('orders_order_number_seq', 6999, true);
