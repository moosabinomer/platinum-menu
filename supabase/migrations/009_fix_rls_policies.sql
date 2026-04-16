-- Fix RLS policies for analytics_events, customer_contacts, and restaurants tables
-- This resolves 404/401 errors from the frontend

-- ============================================
-- CREATE TABLES IF THEY DON'T EXIST
-- ============================================

-- Create analytics_events table if missing
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  session_id TEXT,
  dwell_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create customer_contacts table if missing
CREATE TABLE IF NOT EXISTS customer_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  whatsapp_number TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ANALYTICS_EVENTS TABLE
-- ============================================

-- Add session tracking columns if not exists
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS dwell_ms INTEGER;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS parent_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Allow anon select" ON analytics_events;
DROP POLICY IF EXISTS "Allow anon insert" ON analytics_events;

-- Create permissive policies for anon role
CREATE POLICY "Allow anon select" ON analytics_events FOR SELECT USING (true);
CREATE POLICY "Allow anon insert" ON analytics_events FOR INSERT WITH CHECK (true);

-- Add session tracking columns if not exists
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS dwell_ms INTEGER;

-- Add index for session queries
CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events(session_id);

-- ============================================
-- CUSTOMER_CONTACTS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow anon select contacts" ON customer_contacts;
DROP POLICY IF EXISTS "Allow anon insert contacts" ON customer_contacts;

-- Create permissive policies for anon role
CREATE POLICY "Allow anon select contacts" ON customer_contacts FOR SELECT USING (true);
CREATE POLICY "Allow anon insert contacts" ON customer_contacts FOR INSERT WITH CHECK (true);

-- ============================================
-- RESTAURANTS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow anon select restaurants" ON restaurants;
DROP POLICY IF EXISTS "Allow anon insert restaurants" ON restaurants;
DROP POLICY IF EXISTS "Allow anon update restaurants" ON restaurants;

-- Create permissive policies for anon role
-- Note: In production, you may want to restrict these more
CREATE POLICY "Allow anon select restaurants" ON restaurants FOR SELECT USING (true);
CREATE POLICY "Allow anon insert restaurants" ON restaurants FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update restaurants" ON restaurants FOR UPDATE USING (true);

-- ============================================
-- MENU_ITEMS TABLE (for completeness)
-- ============================================

-- Enable RLS if not already
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow anon select menu_items" ON menu_items;
DROP POLICY IF EXISTS "Allow anon insert menu_items" ON menu_items;
DROP POLICY IF EXISTS "Allow anon update menu_items" ON menu_items;
DROP POLICY IF EXISTS "Allow anon delete menu_items" ON menu_items;

-- Create permissive policies
CREATE POLICY "Allow anon select menu_items" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Allow anon insert menu_items" ON menu_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update menu_items" ON menu_items FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete menu_items" ON menu_items FOR DELETE USING (true);
