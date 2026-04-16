-- Create storage buckets for menu images and food images
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('menus', 'menus', TRUE),
  ('food-images', 'food-images', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to menus bucket
CREATE POLICY "Allow public read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'menus');

-- Allow authenticated users to upload to menus bucket
CREATE POLICY "Allow authenticated users to upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'menus');

-- Allow public read access to food-images bucket
CREATE POLICY "Allow public read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'food-images');

-- Allow authenticated users to upload to food-images bucket
CREATE POLICY "Allow authenticated users to upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'food-images');
