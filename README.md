# Platinum Menu MVP

A full-stack web app that transforms restaurant menus into premium digital experiences using AI.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL + Storage)
- **AI:** Google Gemini API
- **QR Code:** react-qr-code
- **Deployment:** Vercel-ready

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- Google Gemini API key
- Vercel account (for deployment)

### Installation

1. **Clone and install dependencies**
   ```bash
   cd platinum-menu
   npm install
   ```

2. **Set up environment variables**
   
   Copy `.env.example` to `.env.local` and fill in your values:
   ```bash
   cp .env.example .env.local
   ```
   
   Required variables:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
   - `GEMINI_API_KEY` - Google Gemini API key
   - `ADMIN_PASSWORD` - Hardcoded admin password (default: `platinum2024`)

3. **Set up Supabase database**
   
   - Go to your Supabase dashboard
   - Create a new project
   - Navigate to SQL Editor
   - Run the migrations in order:
     - `supabase/migrations/001_initial_schema.sql`
     - `supabase/migrations/002_storage_buckets.sql`

4. **Run the development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/              # Admin panel (protected)
│   │   ├── login/          # Admin login page
│   │   ├── new-restaurant/ # Add new restaurant
│   │   ├── enhance/        # Enhance menu items
│   │   └── publish/        # Publish menus
│   ├── api/                # API routes
│   ├── menu/               # Public customer menus
│   └── layout.tsx          # Root layout
├── components/             # React components
│   ├── admin/              # Admin-specific components
│   ├── menu/               # Menu display components
│   └── ui/                 # Reusable UI components
├── lib/                    # Utilities and configurations
│   ├── auth.ts             # Authentication logic
│   ├── gemini.ts           # Google Gemini AI client
│   ├── supabase.ts         # Supabase client setup
│   └── utils.ts            # Helper functions
└── types/                  # TypeScript type definitions
```

## Features (MVP)

### Admin Panel (`/admin`)
- Password-protected access
- Create new restaurants
- Upload menu images for AI extraction
- Enhance menu items with AI:
  - Premium descriptions
  - Macro estimates (protein, carbs, fats)
  - Add-on suggestions
- Publish menus with QR code generation

### Customer Menu (`/menu/[slug]`)
- Mobile-first, premium design
- Browse menus by category
- Enhanced item descriptions
- Nutrition information
- Add-on suggestions

## Database Schema

### restaurants
- `id` (UUID) - Primary key
- `name` (TEXT) - Restaurant name
- `cuisine_type` (TEXT) - Type of cuisine
- `contact` (TEXT) - Contact information
- `slug` (TEXT) - Unique URL identifier
- `published` (BOOLEAN) - Publication status
- `created_at` (TIMESTAMP)

### menu_items
- `id` (UUID) - Primary key
- `restaurant_id` (UUID) - Foreign key
- `name` (TEXT) - Item name
- `category` (TEXT) - Menu category
- `price` (NUMERIC) - Item price
- `description` (TEXT) - AI-enhanced description
- `protein` (INTEGER) - Protein content (g)
- `carbs` (INTEGER) - Carbohydrates (g)
- `fats` (INTEGER) - Fat content (g)
- `image_url` (TEXT) - Food image URL
- `add_ons` (JSONB) - Complementary items
- `approved` (BOOLEAN) - Approval status
- `created_at` (TIMESTAMP)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Deployment

Deploy to Vercel:

1. Push code to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy

## Security Notes

- Admin authentication uses HTTP-only cookies
- RLS policies protect database tables
- Service role key used server-side only
- Password protection is simple (MVP) - upgrade for production

## License

Private - Platinum Menu Team
