-- Add brand_config column to restaurants table for AI-extracted brand persona
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS brand_config JSONB;

-- Create index for brand_config queries
CREATE INDEX IF NOT EXISTS idx_restaurants_brand_config ON restaurants USING GIN (brand_config);
