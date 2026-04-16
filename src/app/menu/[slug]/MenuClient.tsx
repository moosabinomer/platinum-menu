'use client';

import { Restaurant, MenuItem } from '@/types';
import MenuHeader from '@/components/menu/MenuHeader';
import SpinningWheel from '@/components/menu/SpinningWheel';
import ItemDetailSheet from '@/components/menu/ItemDetailSheet';

interface MenuClientProps {
  restaurant: Restaurant;
  groupedItems: Record<string, MenuItem[]>;
}

export default function MenuClient({ restaurant, groupedItems }: MenuClientProps) {
  // Extract brand config values with defaults
  const brandConfig = restaurant.brand_config;
  const themeColors = restaurant.theme_colors;
  
  const primaryColor = themeColors?.[0] || brandConfig?.primary_color || '#C9A96E';
  const accentColor = themeColors?.[1] || primaryColor;
  const backgroundStyle = brandConfig?.background_style || 'light';
  const fontStyle = brandConfig?.font_style || 'sans';
  const tone = brandConfig?.tone || 'casual';
  const descriptionStyle = brandConfig?.description_style || 'punchy';

  // Build CSS variable map
  const cssVariables = {
    '--primary': primaryColor,
    '--accent': accentColor,
    '--bg-style': backgroundStyle,
    '--font-style': fontStyle,
    '--tone': tone,
    '--description-style': descriptionStyle,
  } as React.CSSProperties;

  return (
    <div 
      className="min-h-screen bg-[#FAFAF8]"
      style={cssVariables}
    >
      {/* Google Fonts + Custom CSS */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Outfit:wght@300;400;500;600;700&display=swap');
        
        /* Prevent page scrolling when over wheel */
        .wheel-container {
          overscroll-behavior: none;
          -webkit-overflow-scrolling: touch;
          touch-action: none;
        }
        
        /* Prevent body scroll when wheel is active */
        body.wheel-active {
          overflow: hidden;
          position: fixed;
          width: 100%;
        }
        
        /* Make wheel container capture all wheel events */
        .wheel-container:hover {
          overflow: hidden;
        }
      `}</style>

      {/* Sticky Header */}
      <MenuHeader restaurant={restaurant} />

      {/* Category Sections with Spinning Wheels */}
      <main className="pt-20">
        {Object.entries(groupedItems).map(([category, items]) => (
          <section key={category} className="mb-8">
            {/* Category Header */}
            <div className="px-6 py-4 bg-white/50 backdrop-blur-sm border-b border-stone-100">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-serif font-semibold" style={{ color: 'var(--accent)' }}>
                  {category}
                </h2>
                <span className="text-xs font-medium uppercase tracking-wider text-stone-400">
                  {items.length} items
                </span>
              </div>
            </div>

            {/* 3D Spinning Wheel */}
            <SpinningWheel items={items} />
          </section>
        ))}
      </main>

      {/* Item Detail Sheet */}
      <ItemDetailSheet accentColor={accentColor} />
    </div>
  );
}
