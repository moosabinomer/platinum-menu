# Platinum Menu - End-to-End Integration Test Guide

## ✅ Phase 7 Complete - Gemini Integration & End-to-End Flow

This guide walks you through testing the complete flow from restaurant creation to customer menu display.

---

## 🔄 Complete User Flow

```
1. Create Restaurant (Admin)
   ↓
2. Upload Menu Image (Admin)
   ↓
3. AI Extracts Items (Gemini API)
   ↓
4. Enhance Items with AI (Gemini API)
   ↓
5. Publish Restaurant
   ↓
6. Generate QR Code
   ↓
7. Customer Scans QR → Views Menu
```

---

## 📋 Pre-Flight Checklist

### Environment Setup
```bash
# Verify .env.local exists with all required keys
cp .env.example .env.local
```

**Required Environment Variables:**
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
GEMINI_API_KEY=your-gemini-api-key
ADMIN_PASSWORD=platinum2024
```

### Supabase Database Setup
Run these SQL migrations in order:

1. **`supabase/migrations/001_initial_schema.sql`**
   - Creates `restaurants` table
   - Creates `menu_items` table
   - Sets up indexes and RLS policies

2. **`supabase/migrations/002_storage_buckets.sql`**
   - Creates `menus` bucket for menu images
   - Creates `food-images` bucket for item photos
   - Sets up storage policies

---

## 🧪 Step-by-Step Testing

### Step 1: Start Development Server
```bash
npm run dev
```
Visit: `http://localhost:3000`

---

### Step 2: Admin Login
1. Navigate to: `http://localhost:3000/admin`
2. Enter password: `platinum2024`
3. Should redirect to admin dashboard

**Expected Result:** ✅ Dashboard loads with stats

---

### Step 3: Create New Restaurant
1. Click "Add Restaurant" or navigate to: `/admin/new-restaurant`
2. Fill out form:
   - **Restaurant Name:** "Test Bistro"
   - **Cuisine Type:** Select from dropdown
   - **Contact:** "test@bistro.com"
   - **Menu Image:** Upload a clear menu photo

**Backend Flow:**
```typescript
// File uploaded to Supabase Storage
await supabase.storage.from('menus').upload(...)

// Restaurant created
await supabase.from('restaurants').insert({
  name, cuisine_type, contact, slug, published: false
})
```

**Expected Result:** ✅ Redirects to `/admin/enhance/[id]`

---

### Step 4: AI Menu Extraction
After upload, the system should:
1. Send image to `/api/extract-menu`
2. Gemini Vision analyzes menu image
3. Extracts items with name, category, price
4. Populates menu items in database

**API Call:**
```typescript
POST /api/extract-menu
Body: FormData with menu image
Response: { items: [{ name, category, price }] }
```

**Prompt Used:** `MENU_EXTRACTION_PROMPT` from `/lib/gemini.ts`

**Expected Result:** ✅ Menu items appear in enhance page

---

### Step 5: Enhance Items with AI
For each menu item:

1. **Upload Food Image:**
   - Click upload button on item card
   - Select appetizing food photo
   - Image uploaded to `food-images` bucket

2. **Click "Enhance with AI":**
   - Calls `/api/enhance-item`
   - Gemini generates:
     - Premium description (sensory copywriting)
     - Macro estimates (protein, carbs, fats)
     - Add-on suggestions (3 items)

**API Call:**
```typescript
POST /api/enhance-item
Body: { itemName, itemCategory, imageUrl }
Response: {
  description: string,
  macros: { protein, carbs, fats },
  addOns: string[]
}
```

**Prompt Used:** `ENHANCEMENT_PROMPT` from `/lib/gemini.ts`

**Retry Logic:**
- Automatically retries on rate limit (429) or timeout
- Exponential backoff: 1s, 2s, 3s delays
- Max 3 retry attempts

**Expected Result:** ✅ AI content appears, editable before approval

---

### Step 6: Save & Approve Items
1. Review/edit AI-generated content:
   - Modify description if needed
   - Adjust macro estimates
   - Refine add-on suggestions
2. Click "Save & Approve"
3. Item marked as `approved: true`

**Database Update:**
```typescript
await supabase.from('menu_items').update({
  description, protein, carbs, fats, add_ons, approved: true
}).eq('id', itemId);
```

**Expected Result:** ✅ Green checkmark appears, progress bar fills

---

### Step 7: Publish Restaurant
1. Click "Continue to Publish"
2. Review final menu preview
3. Click "Publish Menu"
4. System sets `published: true` and generates unique slug

**Backend Flow:**
```typescript
// Generate unique slug
const slug = generateSlug(restaurant.name);

// Publish restaurant
await supabase.from('restaurants').update({
  published: true,
  slug: slug
}).eq('id', restaurantId);
```

**Expected Result:** ✅ QR code appears with public URL

---

### Step 8: Download QR Code
1. Click "Download QR Code"
2. PNG generated with:
   - High-resolution QR code (1024x1024)
   - White background padding
   - Restaurant name at bottom
3. Auto-downloads to Downloads folder

**Filename:** `{restaurant-name}-qr-code.png`

**Expected Result:** ✅ PNG file saved, scannable with phone

---

### Step 9: View Customer Menu
1. Click "View Live Menu" or scan QR code
2. Opens: `http://localhost:3000/menu/[slug]`

**Server-Side Fetching:**
```typescript
// Fetch restaurant (must be published)
const { data: restaurant } = await supabase
  .from('restaurants')
  .select('*')
  .eq('slug', params.slug)
  .eq('published', true)
  .single();

// Fetch approved items only
const { data: menuItems } = await supabase
  .from('menu_items')
  .select('*')
  .eq('restaurant_id', restaurant.id)
  .eq('approved', true)
  .order('category, name');
```

**Expected Result:** ✅ Beautiful mobile-first menu displays

---

### Step 10: Verify Customer Menu Features
Check all elements render correctly:

**Restaurant Header:**
- ✅ Logo icon (utensils crossed)
- ✅ Restaurant name (large, bold)
- ✅ Cuisine type subtitle
- ✅ Amber gradient background

**Menu Sections:**
- ✅ Items grouped by category
- ✅ Category headers with amber underlines

**Item Cards:**
- ✅ Enhanced food images (with CSS filters)
- ✅ Item name and price prominent
- ✅ AI-generated premium descriptions
- ✅ Macros strip (P/C/F with color dots)
- ✅ "Goes well with" add-on chips

**Mobile Responsiveness:**
- ✅ Touch-friendly card sizes
- ✅ Readable text without zoom
- ✅ Fast scroll performance
- ✅ Images load properly

---

## 🔍 Error Handling Tests

### Test 1: Invalid Menu Image
- Upload non-image file
- **Expected:** Alert about file type validation

### Test 2: Large File Upload
- Upload image > 10MB
- **Expected:** Alert about file size limit

### Test 3: Unpublished Menu Access
- Try accessing `/menu/[slug]` for unpublished restaurant
- **Expected:** 404 page

### Test 4: Empty Menu
- Publish restaurant with no items
- **Expected:** "Menu is being prepared" message

### Test 5: Gemini API Rate Limit
- Rapid-fire enhancement requests
- **Expected:** Retry logic kicks in, eventual success

---

## 📊 Database State Verification

### Check Restaurant Status
```sql
SELECT id, name, slug, published, created_at
FROM restaurants
ORDER BY created_at DESC
LIMIT 5;
```

### Check Menu Items
```sql
SELECT 
  mi.name,
  mi.category,
  mi.price,
  mi.description,
  mi.protein,
  mi.carbs,
  mi.fats,
  mi.approved,
  r.name as restaurant_name
FROM menu_items mi
JOIN restaurants r ON mi.restaurant_id = r.id
ORDER BY r.created_at DESC, mi.category, mi.name;
```

### Check Storage Files
In Supabase Dashboard → Storage:
- **menus/** bucket: Should contain uploaded menu images
- **food-images/** bucket: Should contain enhanced item photos

---

## 🎯 Success Criteria

The full flow is working if:

1. ✅ Can create restaurant with menu image
2. ✅ AI extracts items accurately from menu
3. ✅ Can enhance items with descriptions, macros, add-ons
4. ✅ Can approve individual items
5. ✅ Publishing generates unique slug and QR code
6. ✅ QR code downloads as branded PNG
7. ✅ Scanning QR opens beautiful customer menu
8. ✅ All items display correctly with images and AI content
9. ✅ Mobile experience is smooth and responsive
10. ✅ Retry logic handles API rate limits gracefully

---

## 🐛 Troubleshooting

### Issue: Menu extraction fails
**Solution:** Check GEMINI_API_KEY is valid and has quota remaining

### Issue: Images not uploading
**Solution:** Verify Supabase storage buckets exist and policies allow uploads

### Issue: QR code shows wrong URL
**Solution:** Ensure `window.location.origin` matches your deployment domain

### Issue: Customer menu 404s
**Solution:** Verify restaurant has `published: true` and valid slug

### Issue: AI content not saving
**Solution:** Check database permissions and RLS policies

---

## 🚀 Production Deployment

### Vercel Setup
1. Push code to GitHub
2. Import project in Vercel
3. Set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
   - `ADMIN_PASSWORD`
4. Deploy

### Post-Deployment
1. Update Supabase CORS settings
2. Test with production domain
3. Regenerate QR codes with live URL
4. Monitor Gemini API usage

---

## 📈 Next Steps (Post-MVP)

- [ ] Add analytics tracking
- [ ] Implement multi-language support
- [ ] Add restaurant owner accounts
- [ ] Enable online ordering
- [ ] Add customer reviews/ratings
- [ ] Integrate payment processing
- [ ] Create menu templates/themes
- [ ] Add scheduled menu updates

---

## 🎉 Congratulations!

You've successfully built and tested the complete Platinum Menu MVP!

**Full Stack Features:**
- ✅ Next.js 14 App Router
- ✅ Supabase Database + Storage
- ✅ Google Gemini AI Integration
- ✅ Admin Authentication
- ✅ Restaurant Management
- ✅ AI Menu Extraction
- ✅ AI Content Enhancement
- ✅ QR Code Generation
- ✅ Mobile-First Customer Menu
- ✅ Premium UI/UX Throughout

**Tech Stack Validated:**
- Server Components for performance
- Client Components for interactivity
- API Routes for AI integration
- TypeScript for type safety
- Tailwind CSS for styling
- Retry logic for reliability
