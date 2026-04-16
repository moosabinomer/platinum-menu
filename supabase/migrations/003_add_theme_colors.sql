-- Add theme_colors column to restaurants table
ALTER TABLE restaurants 
ADD COLUMN theme_colors JSONB;

-- Add index for theme_colors for better query performance
CREATE INDEX IF NOT EXISTS idx_restaurants_theme_colors ON restaurants USING GIN(theme_colors);

-- Add comment to document the column
COMMENT ON COLUMN restaurants.theme_colors IS 'Array of 3 hex color strings for restaurant theme: [primary, accent, secondary]';
