import Groq from 'groq-sdk';

const apiKey = process.env.GROQ_API_KEY!;
export const groq = new Groq({ apiKey });

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Model names
export const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
export const TEXT_MODEL = 'llama-3.3-70b-versatile';

// Sleep utility for retry delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry wrapper for API calls
async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (retries > 0 && (message.includes('429') || message.includes('timeout'))) {
      console.log(`Retrying... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`);
      await sleep(RETRY_DELAY * (MAX_RETRIES - retries + 1)); // Exponential backoff
      return withRetry(fn, retries - 1);
    }
    throw error;
  }
}

// Generate content from image and text prompt using vision model
export const generateFromImage = async (
  image: File | string,
  prompt: string,
  temperature: number = 0.7,
): Promise<string> => {
  return withRetry(async () => {
    let imageData: { type: 'image_url'; image_url: { url: string } };
    
    if (typeof image === 'string') {
      // Image URL - use directly
      imageData = {
        type: 'image_url',
        image_url: { url: image },
      };
    } else {
      // File object - convert to base64 data URL
      const buffer = await image.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const mimeType = image.type;
      imageData = {
        type: 'image_url',
        image_url: { url: `data:${mimeType};base64,${base64}` },
      };
    }
    
    const completion = await groq.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            imageData,
          ],
        },
      ],
      temperature,
    });
    
    return completion.choices[0]?.message?.content || '';
  });
};

// Generate text content using text-only model
export const generateText = async (prompt: string): Promise<string> => {
  return withRetry(async () => {
    const completion = await groq.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });
    
    return completion.choices[0]?.message?.content || '';
  });
};

// ==================== PROMPT TEMPLATES ====================

/**
 * Menu Extraction Prompt
 * Used to extract menu items from uploaded menu images
 */
export const MENU_EXTRACTION_PROMPT = `You are a precise menu extraction system. Extract EVERY SINGLE menu item visible in this image without exception. For each item return name, category, and price in PKR. If a price is not visible, use 0. If a category is not labeled, infer it from context. Return ONLY a valid JSON array. Missing even one item is a failure.

Respond in EXACTLY this JSON format (no additional text):
{
  "items": [
    {
      "name": "Item Name",
      "category": "Category Name",
      "price": 1500
    },
    ...
  ]
}`;

export const MENU_VERIFICATION_PROMPT = (extractedItems: Array<{ name: string; category: string; price: number }>) => {
  const itemsList = extractedItems.map(item => `- ${item.name} (${item.category}) - PKR ${item.price}`).join('\n');
  
  return `Here is a menu image and a list of extracted items. Identify any menu items visible in the image that are NOT in this list and return them as a JSON array.

Extracted items:
${itemsList}

Return ONLY a JSON array of missing items in this exact format (no additional text):
{
  "missingItems": [
    {
      "name": "Item Name",
      "category": "Category Name",
      "price": 1500
    },
    ...
  ]
}

If no items are missing, return { "missingItems": [] }. Be thorough - check every item on the menu image.`;
};
export const ENHANCEMENT_PROMPT = (
  itemName: string, 
  itemCategory: string, 
  hasImage: boolean,
  menuItems?: Array<{ name: string; category: string; price: number }>
) => {
  // Create a list of available menu items for add-on suggestions
  const availableItemsList = menuItems && menuItems.length > 0
    ? menuItems.map(item => `- ${item.name} (${item.category}) - PKR ${item.price.toFixed(0)}`).join('\n')
    : 'No other items available';

  return `You are a premium restaurant menu copywriter and nutrition analyst. Enhance the following menu item with appetizing descriptions and nutritional estimates.

Menu Item: ${itemName}
Category: ${itemCategory}
${hasImage ? 'Food Image: [Image provided]' : ''}

${menuItems && menuItems.length > 0 ? `AVAILABLE MENU ITEMS FOR ADD-ON SUGGESTIONS:
You MUST ONLY suggest add-ons from this exact list of items that exist on the same menu. Do NOT suggest any item that is not listed here.

${availableItemsList}

IMPORTANT: Select 2-3 items from the list above that would complement "${itemName}". Choose items from different categories when possible (e.g., a side, a beverage, or a dessert). NEVER invent or suggest items that are not in this list.` : ''}

Provide your response in EXACTLY this JSON format (no additional text):
{
  "description": "A luxurious, sensory-rich description (2-3 sentences). Use evocative language about flavors, textures, cooking methods, and premium ingredients. Make it sound irresistible.",
  "macros": {
    "protein": number (grams, estimate based on typical portion),
    "carbs": number (grams, estimate based on typical portion),
    "fats": number (grams, estimate based on typical portion)
  },
  "addOns": [
    "Exact item name from the available menu list",
    "Exact item name from the available menu list",
    "Exact item name from the available menu list"
  ]
}

Guidelines:
- Description: Premium, appetizing tone (like high-end restaurant menus)
- Macros: Realistic estimates for standard restaurant portions
- Add-ons: ${menuItems && menuItems.length > 0 ? 'MUST be exact item names from the available menu list above. Do not make up new items.' : 'Items that pair well with this dish (sides, drinks, desserts)'}`;
};

/**
 * Description Generation Helper
 */
export const DESCRIPTION_SYSTEM_PROMPT = `You are a professional restaurant menu copywriter specializing in premium, sensory-rich descriptions. Your writing style is:
- Evocative and appetizing
- Highlights cooking methods, flavors, and textures
- Mentions premium ingredients
- Creates desire and anticipation
- Concise but vivid (2-3 sentences max)`;

/**
 * Macro Estimation Helper
 */
export const MACRO_ESTIMATION_PROMPT = (itemName: string, category: string) => `Estimate the macronutrient content for this restaurant menu item.

Item: ${itemName}
Category: ${category}

Provide realistic estimates in grams for a standard restaurant portion:
- Protein (g)
- Carbohydrates (g)  
- Fats (g)

Consider typical recipes, portion sizes, and cooking methods for this type of dish.`;

/**
 * Add-on Suggestion Helper
 */
export const ADDON_SUGGESTION_PROMPT = (itemName: string, category: string) => `Suggest 2-3 complementary items that would pair well with this menu item.

Item: ${itemName}
Category: ${category}

Suggestions should be:
- Natural pairings (sides, beverages, desserts, or appetizers)
- Items commonly found in restaurants
- Appropriate for the cuisine type
- Specific and appealing (not generic)

Format as a JSON array: ["suggestion 1", "suggestion 2", "suggestion 3"]`;

/**
 * Vibe Detection Prompt
 * Used to detect restaurant theme/vibe from menu image for automatic theme selection
 */
export const VIBE_DETECTION_PROMPT = `Analyze this restaurant menu image and determine its overall vibe and aesthetic. Respond with ONLY one of these exact values, nothing else: dark_bold, warm_luxury, fresh_clean.

dark_bold = dark backgrounds, high contrast, street food/burger/urban feel.
warm_luxury = warm tones, elegant, café/fine dining/Italian feel.
fresh_clean = light colors, minimal, health food/brunch/smoothie feel.`;

/**
 * Brand Persona Extraction Prompt
 * Used to analyze menu design and extract brand identity
 */
export const BRAND_PERSONA_PROMPT = `Look at this restaurant menu image. Based on the visual design, colors, fonts, item names and overall aesthetic, return ONLY a JSON object describing the brand identity with these fields:
- background_style: One of "light", "dark", "warm", "cool"
- font_style: One of "serif", "sans", "bold", "playful"
- tone: One of "premium", "casual", "fun", "bold", "family"
- cuisine_type: One of "fast_food", "fine_dining", "cafe", "desi", "fusion"
- description_style: One of "poetic", "punchy", "playful", "minimal"
- restaurant_personality: A one sentence description of the brand vibe (e.g., "A cozy neighborhood cafe serving comfort food with a modern twist")

Respond in EXACTLY this JSON format (no additional text):
{
  "background_style": "light",
  "font_style": "sans",
  "tone": "casual",
  "cuisine_type": "cafe",
  "description_style": "punchy",
  "restaurant_personality": "A warm and welcoming spot for friends to gather over hearty meals"
}

Analyze the visual elements carefully - the color palette, typography, layout style, and food items all contribute to the brand identity.`;

/**
 * Parse JSON Response Utility
 */
export function parseJsonResponse<T>(text: string): T {
  try {
    // Clean up the response (remove markdown code blocks if present)
    const cleanedText = text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error('Failed to parse JSON response:', error);
    console.log('Raw response:', text);
    throw new Error('Failed to parse AI response as JSON');
  }
}
