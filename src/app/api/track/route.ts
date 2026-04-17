import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restaurant_id, menu_item_id, event_type, session_id, dwell_ms, parent_item_id } = body;

    // Validate required fields
    if (!restaurant_id || !event_type) {
      return NextResponse.json(
        { error: 'restaurant_id and event_type are required' },
        { status: 400 }
      );
    }

    // Create service role client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build insert payload
    const insertPayload: Record<string, unknown> = {
      restaurant_id,
      menu_item_id: menu_item_id || null,
      event_type,
    };
    if (session_id) insertPayload.session_id = session_id;
    if (dwell_ms !== undefined) insertPayload.dwell_ms = dwell_ms;
    if (parent_item_id) insertPayload.parent_item_id = parent_item_id;

    // Insert analytics event
    const { error } = await supabase
      .from('analytics_events')
      .insert(insertPayload);

    if (error) {
      console.error('Analytics tracking error:', error);
      // Return 200 anyway to not break the menu experience
      return NextResponse.json({ success: false, error: error.message }, { status: 200 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Track API error:', error);
    // Fail silently - return 200 so tracking never breaks the menu
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
