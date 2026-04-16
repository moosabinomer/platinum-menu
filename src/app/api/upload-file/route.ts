import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  console.log('=== UPLOAD API CALLED ===');
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const path = formData.get('path') as string;
    
    console.log('File received:', !!file);
    console.log('Path:', path);
    
    if (!file) {
      console.error('No file provided');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!path) {
      console.error('No path specified');
      return NextResponse.json(
        { error: 'No path specified' },
        { status: 400 }
      );
    }

    // Create Supabase client with SERVICE ROLE key for full access
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    console.log('Supabase URL configured:', !!supabaseUrl);
    console.log('Service role key configured:', !!supabaseServiceKey);
    
    if (!supabaseServiceKey) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Supabase client created');

    // Upload file to menus bucket
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabase.storage
      .from('menus')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json(
        { error: 'Upload failed', details: error.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('menus')
      .getPublicUrl(path);

    return NextResponse.json({
      success: true,
      message: 'Upload successful!',
      path: data.path,
      publicUrl: urlData.publicUrl,
    });
  } catch (error) {
    console.error('Server upload error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Upload failed', details: message },
      { status: 500 }
    );
  }
}
