import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restaurant_id, whatsapp_number } = body;

    // Validate required fields
    if (!restaurant_id || !whatsapp_number) {
      return NextResponse.json(
        { error: 'restaurant_id and whatsapp_number are required' },
        { status: 400 }
      );
    }

    // Validate phone number format (Pakistani: starts with 03, 11 digits total)
    const cleanNumber = whatsapp_number.replace(/\s/g, '');
    if (!/^03\d{9}$/.test(cleanNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Create service role client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for duplicate number per restaurant
    const { data: existing } = await supabase
      .from('customer_contacts')
      .select('id')
      .eq('restaurant_id', restaurant_id)
      .eq('whatsapp_number', cleanNumber)
      .single();

    if (existing) {
      // Number already exists for this restaurant - return success anyway
      return NextResponse.json({ success: true, existing: true }, { status: 200 });
    }

    // Insert into customer_contacts table
    const { error } = await supabase
      .from('customer_contacts')
      .insert({
        restaurant_id,
        whatsapp_number: cleanNumber,
      });

    if (error) {
      console.error('Contact save error:', error);
      // Return 200 anyway to not break the menu experience
      return NextResponse.json({ success: false, error: error.message }, { status: 200 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Save contact API error:', error);
    // Fail silently - return 200 so menu experience isn't broken
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
