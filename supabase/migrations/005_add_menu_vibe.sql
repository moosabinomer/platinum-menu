-- Add menu_vibe column for automatic theme detection
ALTER TABLE restaurants ADD COLUMN menu_vibe TEXT DEFAULT 'warm_luxury';

-- Add comment for documentation
COMMENT ON COLUMN restaurants.menu_vibe IS 'Auto-detected theme vibe: dark_bold, warm_luxury, or fresh_clean';
