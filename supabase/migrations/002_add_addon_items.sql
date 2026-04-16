-- Migration: Add is_addon field to menu_items for add-ons and sauces that don't require images
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_addon BOOLEAN DEFAULT FALSE;

-- Create index for faster queries on add-on items
CREATE INDEX IF NOT EXISTS idx_menu_items_is_addon ON menu_items(is_addon);
