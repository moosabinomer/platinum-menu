import { NextResponse } from 'next/server';
import { generateFromImage, MENU_EXTRACTION_PROMPT, MENU_VERIFICATION_PROMPT, BRAND_PERSONA_PROMPT, VIBE_DETECTION_PROMPT, parseJsonResponse } from '@/lib/gemini';

// Brand config type definition
export interface BrandConfig {
  background_style: 'light' | 'dark' | 'warm' | 'cool';
  font_style: 'serif' | 'sans' | 'bold' | 'playful';
  tone: 'premium' | 'casual' | 'fun' | 'bold' | 'family';
  cuisine_type: 'fast_food' | 'fine_dining' | 'cafe' | 'desi' | 'fusion';
  description_style: 'poetic' | 'punchy' | 'playful' | 'minimal';
  restaurant_personality: string;
}

export interface MenuItem {
  name: string;
  category: string;
  price: number;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('menu') as File;

    if (!imageFile) {
      return NextResponse.json(
        { error: 'Menu image is required' },
        { status: 400 }
      );
    }

    // Convert image to base64 for multiple uses
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const base64Image = `data:${imageFile.type};base64,${buffer.toString('base64')}`;

    // Step 1: Initial extraction with temperature 0 (deterministic)
    const initialResponse = await generateFromImage(imageFile, MENU_EXTRACTION_PROMPT, 0);
    const initialExtracted = parseJsonResponse<{ items: MenuItem[] }>(initialResponse);
    
    console.log('Initial extraction:', initialExtracted.items.length, 'items');

    // Step 2: Verification call to catch missed items
    const verificationPrompt = MENU_VERIFICATION_PROMPT(initialExtracted.items);
    const verificationResponse = await generateFromImage(imageFile, verificationPrompt, 0);
    const verificationResult = parseJsonResponse<{ missingItems: MenuItem[] }>(verificationResponse);
    
    console.log('Verification found:', verificationResult.missingItems?.length || 0, 'missing items');

    // Step 3: Merge and deduplicate by name (case-insensitive)
    const allItems = [...initialExtracted.items];
    const existingNames = new Set(allItems.map(item => item.name.toLowerCase().trim()));
    
    if (verificationResult.missingItems && verificationResult.missingItems.length > 0) {
      for (const item of verificationResult.missingItems) {
        const normalizedName = item.name.toLowerCase().trim();
        if (!existingNames.has(normalizedName)) {
          allItems.push(item);
          existingNames.add(normalizedName);
        }
      }
    }

    console.log('Final merged:', allItems.length, 'items');

    // Step 4: Brand persona extraction
    const brandResponse = await generateFromImage(base64Image, BRAND_PERSONA_PROMPT, 0);
    const brandConfig = parseJsonResponse<BrandConfig>(brandResponse);

    // Step 5: Vibe detection for theme selection
    const vibeResponse = await generateFromImage(base64Image, VIBE_DETECTION_PROMPT, 0);
    const menuVibe = vibeResponse.trim().toLowerCase();
    // Validate vibe is one of the allowed values
    const validVibes = ['dark_bold', 'warm_luxury', 'fresh_clean'];
    const validatedVibe = validVibes.includes(menuVibe) ? menuVibe : 'warm_luxury';

    return NextResponse.json({
      items: allItems,
      brandConfig,
      menuVibe: validatedVibe,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error extracting menu:', error);
    console.error('Error details:', message);
    return NextResponse.json(
      { 
        error: 'Menu extraction failed',
        details: message,
      },
      { status: 500 }
    );
  }
}
