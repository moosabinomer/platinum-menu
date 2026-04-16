-- Customer contacts table for WhatsApp opt-in
CREATE TABLE customer_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  whatsapp_number TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient restaurant-based queries
CREATE INDEX idx_contacts_restaurant ON customer_contacts(restaurant_id);
CREATE INDEX idx_contacts_created ON customer_contacts(created_at);

-- Disable RLS for simple contact collection
ALTER TABLE customer_contacts DISABLE ROW LEVEL SECURITY;
