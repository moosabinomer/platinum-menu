-- Add DELETE policy for restaurants table to allow anon users to delete
CREATE POLICY IF NOT EXISTS "Allow anon delete on restaurants" ON restaurants FOR DELETE USING (true);
