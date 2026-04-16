import { NextResponse } from 'next/server';
import { generateFromImage, ENHANCEMENT_PROMPT, parseJsonResponse } from '@/lib/gemini';

interface MenuItemForContext {
  name: string;
  category: string;
  price: number;
}

interface EnhancedData {
  description: string;
  macros: {
    protein: number;
    carbs: number;
    fats: number;
  };
  addOns: string[];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { itemName, itemCategory, imageUrl, menuItems } = body;

    if (!itemName || !itemCategory) {
      return NextResponse.json(
        { error: 'Item name and category are required' },
        { status: 400 }
      );
    }

    // Build the enhancement prompt with menu items for add-on suggestions
    const prompt = ENHANCEMENT_PROMPT(itemName, itemCategory, !!imageUrl, menuItems);

    // Generate content with or without image
    let responseText: string;
    
    if (imageUrl) {
      // Use image analysis
      responseText = await generateFromImage(imageUrl, prompt);
    } else {
      // Text-only enhancement
      const { generateText } = await import('@/lib/gemini');
      responseText = await generateText(prompt);
    }

    // Parse the JSON response
    const enhanced = parseJsonResponse<EnhancedData>(responseText);

    console.log('=== AI ENHANCEMENT DEBUG ===');
    console.log('Raw AI response:', responseText);
    console.log('Parsed enhanced data:', enhanced);
    console.log('AI suggested add-ons:', enhanced.addOns);
    console.log('Provided menu items for matching:', menuItems.map((item: MenuItemForContext) => ({ name: item.name, price: item.price })));

    // Enrich add-ons with prices from the provided menu items
    const enrichedAddOns = enhanced.addOns.map(addOnName => {
      // Find matching menu item by name (case-insensitive)
      const matchingItem = menuItems.find((item: MenuItemForContext) => 
        item.name.toLowerCase().includes(addOnName.toLowerCase()) ||
        addOnName.toLowerCase().includes(item.name.toLowerCase())
      );

      const result = {
        name: addOnName,
        price: matchingItem?.price
      };
      
      console.log('Add-on processing:', {
        suggestedName: addOnName,
        foundItem: matchingItem?.name,
        price: matchingItem?.price,
        result: result
      });

      return result;
    });

    console.log('Final enriched add-ons to save:', enrichedAddOns);
    console.log('=== END AI ENHANCEMENT DEBUG ===');

    return NextResponse.json({
      description: enhanced.description,
      macros: enhanced.macros,
      addOns: enrichedAddOns,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error enhancing menu item:', error);
    return NextResponse.json(
      { 
        error: 'An error occurred while enhancing the item',
        details: message,
      },
      { status: 500 }
    );
  }
}
