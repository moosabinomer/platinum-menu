-- Add session tracking columns to analytics_events
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS dwell_ms INTEGER;

-- Add index for session-based queries
CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events(session_id);
