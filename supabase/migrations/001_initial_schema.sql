-- Create restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cuisine_type TEXT NOT NULL,
  contact TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  description TEXT,
  protein INTEGER,
  carbs INTEGER,
  fats INTEGER,
  image_url TEXT,
  add_ons JSONB,
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_restaurants_published ON restaurants(published);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_approved ON menu_items(approved);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);

-- Enable Row Level Security (RLS)
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access to published restaurants and their menu items
CREATE POLICY "Allow public read access to published restaurants"
  ON restaurants FOR SELECT
  USING (published = TRUE);

CREATE POLICY "Allow public read access to approved menu items"
  ON menu_items FOR SELECT
  USING (approved = TRUE);

-- Create policy for admin to manage all data (using service role key in app)
-- Note: Admin writes will use Supabase service role key in server-side code
-- No additional RLS policies needed for service role
