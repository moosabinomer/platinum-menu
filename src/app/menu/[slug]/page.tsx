'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
import Head from 'next/head';
import { getTheme, ThemeConfig } from '@/lib/themes';
import { getSessionId } from '@/lib/session';
import { motion } from 'framer-motion';

// Analytics tracking helper - fails silently
async function trackEvent(
  restaurantId: string,
  menuItemId: string | null,
  eventType: string,
  dwellMs?: number,
  parentItemId?: string | null
) {
  try {
    const payload: Record<string, unknown> = {
      restaurant_id: restaurantId,
      menu_item_id: menuItemId,
      event_type: eventType,
      session_id: getSessionId(),
    };
    if (dwellMs !== undefined) {
      payload.dwell_ms = dwellMs;
    }
    if (parentItemId) {
      payload.parent_item_id = parentItemId;
    }
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Fail silently - tracking should never break the menu
  }
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  image_url: string | null;
  add_ons: { name: string; price?: number }[] | string[] | null;
}

interface Restaurant {
  id: string;
  name: string;
  theme_colors: string[] | null;
  menu_vibe: string | null;
}

interface GroupedItems {
  [category: string]: MenuItem[];
}

const ITEM_H = 44;

export default function CustomerMenuPage({ params }: { params: { slug: string } }) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [groupedItems, setGroupedItems] = useState<GroupedItems>({});
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetOpenTimeRef = useRef<number>(0);
  
  // WhatsApp opt-in state
  const [showOptIn, setShowOptIn] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [optInLoading, setOptInLoading] = useState(false);

  // Check localStorage for opt-in status and fetch data
  useEffect(() => {
    // Check if user already opted in or skipped for this restaurant
    const optInKey = `optin_${params.slug}`;
    const hasOptedIn = typeof window !== 'undefined' && localStorage.getItem(optInKey);
    
    const fetchData = async () => {
      const supabase = createClient();
      
      // Fetch restaurant
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id, name, theme_colors, menu_vibe')
        .eq('slug', params.slug)
        .eq('published', true)
        .single();

      if (restaurantError || !restaurantData) {
        setLoading(false);
        return;
      }

      const restaurant = restaurantData as Restaurant;
      setRestaurant(restaurant);

      // Track menu view
      trackEvent(restaurant.id, null, 'menu_view');

      // Fetch approved menu items
      const { data: itemsData } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('approved', true)
        .order('created_at', { ascending: true });

      // Group by category
      const grouped: GroupedItems = {};
      (itemsData || []).forEach((item) => {
        const menuItem = item as unknown as MenuItem;
        if (!grouped[menuItem.category]) {
          grouped[menuItem.category] = [];
        }
        grouped[menuItem.category].push(menuItem);
      });

      // Sort categories: main dishes first, add-ons/sauces last
      const sortedGrouped: GroupedItems = {};
      const supportingKeywords = ['add', 'sauce', 'glaze', 'glazing', 'extra', 'dip', 'condiment', 'topping'];
      
      const entries = Object.entries(grouped);
      const mainCategories = entries.filter(([category]) => {
        const lowerCat = category.toLowerCase();
        return !supportingKeywords.some(keyword => lowerCat.includes(keyword));
      });
      const supportingCategories = entries.filter(([category]) => {
        const lowerCat = category.toLowerCase();
        return supportingKeywords.some(keyword => lowerCat.includes(keyword));
      });
      
      // Add main categories first, then supporting categories
      [...mainCategories, ...supportingCategories].forEach(([category, items]) => {
        sortedGrouped[category] = items;
      });

      setGroupedItems(sortedGrouped);
      setLoading(false);
      
      // Show opt-in screen if user hasn't seen it for this restaurant
      if (!hasOptedIn) {
        setShowOptIn(true);
      }
    };

    fetchData();
  }, [params.slug]);
  
  // Handle phone number validation (Pakistani format: 03 followed by 9 digits)
  const validatePhone = (number: string): boolean => {
    const cleanNumber = number.replace(/\s/g, '');
    return /^03\d{9}$/.test(cleanNumber);
  };
  
  // Handle opt-in submit
  const handleOptInSubmit = async () => {
    if (!validatePhone(phoneNumber)) {
      setPhoneError('Please enter a valid number (03 followed by 9 digits)');
      return;
    }
    
    if (!restaurant) return;
    
    setOptInLoading(true);
    setPhoneError('');
    
    try {
      await fetch('/api/save-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          whatsapp_number: phoneNumber.replace(/\s/g, ''),
        }),
      });
      
      // Mark as opted in
      localStorage.setItem(`optin_${params.slug}`, 'true');
      setShowOptIn(false);
    } catch {
      // Fail silently - just show the menu
      setShowOptIn(false);
    } finally {
      setOptInLoading(false);
    }
  };
  
  // Handle skip
  const handleOptInSkip = () => {
    localStorage.setItem(`optin_${params.slug}`, 'skipped');
    setShowOptIn(false);
  };

  // Get theme configuration
  const theme: ThemeConfig = getTheme(
    restaurant?.menu_vibe || null,
    restaurant?.theme_colors?.[1] || null
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-stone-500">Loading...</div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-stone-500">Restaurant not found</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Outfit:wght@300;400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      
      {/* WhatsApp Opt-in Overlay */}
      {showOptIn && (
        <div 
          className={`optin-overlay ${theme.isPremiumDark ? 'optin-dark' : 'optin-light'}`}
          style={{
            '--accent': theme.accent,
            '--page-bg': theme.pageBg,
            '--name-color': theme.nameColor,
            '--sub-color': theme.subColor,
          } as React.CSSProperties}
        >
          <div className="optin-content">
            <div className="optin-restaurant">{restaurant.name}</div>
            <h2 className="optin-heading">Get exclusive deals & offers directly on WhatsApp</h2>
            
            <div className="optin-form">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  setPhoneError('');
                }}
                placeholder="03XX XXXXXXX"
                className="optin-input"
                maxLength={11}
              />
              {phoneError && <div className="optin-error">{phoneError}</div>}
              
              <button
                onClick={handleOptInSubmit}
                disabled={optInLoading}
                className="optin-button"
                style={{ background: theme.accent }}
              >
                {optInLoading ? 'Saving...' : 'Save & View Menu'}
              </button>
            </div>
            
            <button
              onClick={handleOptInSkip}
              className="optin-skip"
            >
              Skip, just browse
            </button>
          </div>
        </div>
      )}
      
      <div 
        className={`page ${theme.isPremiumDark ? 'premium-dark' : ''}`}
        style={{
          '--accent': theme.accent,
          '--page-bg': theme.pageBg,
          '--header-bg': theme.headerBg,
          '--wheel-bg': theme.wheelBg,
          '--name-color': theme.nameColor,
          '--sub-color': theme.subColor,
          '--category-font': theme.categoryFont,
          '--restaurant-font': theme.restaurantFont,
          '--active-item-color': theme.activeItemColor,
          '--inactive-item-color': theme.inactiveItemColor,
          '--category-title-color': theme.categoryTitleColor,
          '--category-count-color': theme.categoryCountColor,
          '--ink': theme.ink || theme.pageBg,
          '--card': theme.card || theme.wheelBg,
          '--accent-lo': theme.accentLo || `${theme.accent}1A`,
          '--accent-mid': theme.accentMid || `${theme.accent}38`,
        } as React.CSSProperties}
      >
        {theme.isPremiumDark ? (
          <div className="header-premium">
            <div className="header-ghost">{restaurant.name}</div>
            <div className="header-content">
              <div className="live-pill">
                <span className="pulse-dot"></span>
                Live Menu
              </div>
              <div className="restaurant-row">
                <div className="restaurant-name-premium">{restaurant.name}</div>
                <div className="restaurant-meta">
                  <span className="meta-city">Menu</span>
                </div>
              </div>
              <div className="gradient-bar"></div>
            </div>
          </div>
        ) : (
          <div className="header">
            {theme.restaurantStyle === 'italic-dot' && (
              <div className="restaurant-name">
                {restaurant.name}<em>.</em>
              </div>
            )}
            {theme.restaurantStyle === 'bold' && (
              <div className="restaurant-name bold-uppercase">
                {restaurant.name}
              </div>
            )}
            {theme.restaurantStyle === 'bold-accent-word' && (
              <div className="restaurant-name">
                {restaurant.name.split(' ').slice(0, -1).join(' ')} <span className="accent-word">{restaurant.name.split(' ').pop()}</span>
              </div>
            )}
            <div className="location">Menu</div>
          </div>
        )}

        {Object.entries(groupedItems).map(([category, items]) => (
          <CategoryWheel
            key={category}
            category={category}
            items={items}
            theme={theme}
            onItemClick={(item) => {
              // Track item view before opening sheet
              if (restaurant) {
                trackEvent(restaurant.id, item.id, 'item_view');
              }
              setSelectedItem(item);
            }}
            onSheetOpen={() => {
              // Track item detail open
              if (restaurant) {
                trackEvent(restaurant.id, selectedItem?.id || null, 'item_detail_open');
                sheetOpenTimeRef.current = Date.now();
              }
              setSheetOpen(true);
            }}
          />
        ))}
      </div>

      <div 
        className={`backdrop ${sheetOpen ? 'open' : ''}`}
        onClick={() => {
          // Track item detail close with dwell time
          if (restaurant && selectedItem && sheetOpenTimeRef.current > 0) {
            const dwellMs = Date.now() - sheetOpenTimeRef.current;
            trackEvent(restaurant.id, selectedItem.id, 'item_detail_close', dwellMs);
          }
          setSheetOpen(false);
        }}
      />
      
      <DetailSheet 
        item={selectedItem} 
        allMenuItems={Object.values(groupedItems).flat()}
        open={sheetOpen} 
        onClose={() => {
          // Track item detail close with dwell time
          if (restaurant && selectedItem && sheetOpenTimeRef.current > 0) {
            const dwellMs = Date.now() - sheetOpenTimeRef.current;
            trackEvent(restaurant.id, selectedItem.id, 'item_detail_close', dwellMs);
          }
          setSheetOpen(false);
        }}
        restaurant={restaurant}
        theme={theme}
      />

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        html, body {
          font-family: 'Outfit', sans-serif;
          background: var(--page-bg, #FAFAF8);
          color: var(--name-color, #1C1917);
          min-height: 100%;
        }
        
        .page {
          max-width: 420px;
          margin: 0 auto;
          padding: 0 0 80px;
          background: var(--page-bg, #FAFAF8);
          min-height: 100vh;
        }
        
        .page.premium-dark {
          background: var(--ink, #060606);
        }
        
        .header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: var(--header-bg, #FAFAF8);
          padding: 20px 24px 12px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
        }
        
        .restaurant-name {
          font-family: var(--restaurant-font, 'Cormorant Garamond', serif);
          font-size: 28px;
          font-weight: 600;
          color: var(--name-color, #1C1917);
          letter-spacing: -0.5px;
        }
        
        .restaurant-name.bold-uppercase {
          text-transform: uppercase;
          font-weight: 700;
        }
        
        .restaurant-name em {
          color: var(--accent);
          font-style: italic;
        }
        
        .restaurant-name .accent-word {
          color: var(--accent);
        }
        
        .location {
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--sub-color, #888);
          margin-top: 2px;
        }
        
        /* Premium Dark Header */
        .header-premium {
          position: sticky;
          top: 0;
          z-index: 100;
          background: var(--ink, #060606);
          padding: 24px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          overflow: hidden;
        }
        
        .header-ghost {
          position: absolute;
          bottom: -20px;
          right: -10px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 120px;
          font-weight: 800;
          color: rgba(255,255,255,0.018);
          text-transform: uppercase;
          white-space: nowrap;
          z-index: 1;
          pointer-events: none;
          line-height: 1;
        }
        
        .header-content {
          position: relative;
          z-index: 2;
        }
        
        .live-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 20px;
          padding: 6px 12px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.9);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 16px;
        }
        
        .pulse-dot {
          width: 6px;
          height: 6px;
          background: var(--accent);
          border-radius: 50%;
          animation: pulse 1.5s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        
        .restaurant-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        
        .restaurant-name-premium {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 48px;
          font-weight: 800;
          color: #fff;
          text-transform: uppercase;
          letter-spacing: -2.5px;
          line-height: 1;
        }
        
        .restaurant-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }
        
        .meta-city {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 10px;
          font-weight: 500;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 1.5px;
        }
        
        .gradient-bar {
          height: 3px;
          background: linear-gradient(90deg, var(--accent) 0%, transparent 100%);
          border-radius: 2px;
        }
        
        .category-section {
          padding: 28px 0 0;
          background: transparent;
        }
        
        .category-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          padding: 0 24px 14px;
          background: transparent;
        }
        
        .category-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          font-weight: 600;
          color: var(--category-title-color, var(--accent));
        }
        
        .category-count {
          font-size: 10px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--category-count-color, #aaa);
        }
        
        /* Premium Dark Category Header */
        .category-header-premium {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px 14px;
        }
        
        .category-pip-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .pink-pip {
          width: 4px;
          height: 20px;
          background: var(--accent);
          border-radius: 2px;
        }
        
        .category-label {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 12px;
          font-weight: 700;
          color: #fff;
          text-transform: uppercase;
          letter-spacing: 3px;
        }
        
        .category-count-premium {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 10px;
          font-weight: 500;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
          letter-spacing: 1.5px;
        }
        
        .wheel-container {
          margin: 0 16px;
          background: var(--wheel-bg, #1C1917);
          border-radius: 20px;
          position: relative;
          overflow: hidden;
          height: 200px;
          cursor: grab;
          user-select: none;
          touch-action: none;
          overscroll-behavior: contain;
        }
        
        .wheel-container:active {
          cursor: grabbing;
        }
        
        .wheel-fade-top {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 60px;
          background: linear-gradient(to bottom, var(--wheel-bg, #1C1917), transparent);
          z-index: 2;
          pointer-events: none;
        }
        
        .wheel-fade-bottom {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 60px;
          background: linear-gradient(to top, var(--wheel-bg, #1C1917), transparent);
          z-index: 2;
          pointer-events: none;
        }
        
        .highlight-strip {
          position: absolute;
          top: 50%;
          left: 16px;
          right: 16px;
          height: 44px;
          transform: translateY(-50%);
          border-top: 1px solid var(--accent);
          border-bottom: 1px solid var(--accent);
          opacity: 0.3;
          z-index: 1;
          pointer-events: none;
        }
        
        .wheel-track {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          will-change: transform;
        }
        
        .wheel-item {
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          transition: opacity 0.1s, transform 0.1s;
          cursor: pointer;
        }
        
        .wheel-item-name {
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          font-weight: 500;
          color: var(--inactive-item-color, rgba(255,255,255,0.5));
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 65%;
        }
        
        .wheel-item-price {
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 400;
          color: var(--inactive-item-color, rgba(255,255,255,0.35));
          white-space: nowrap;
        }
        
        .wheel-item.active .wheel-item-name {
          color: var(--active-item-color, #fff);
          font-weight: 600;
          font-size: 16px;
        }
        
        .wheel-item.active .wheel-item-price {
          color: var(--accent);
          font-weight: 500;
        }
        
        /* Premium Dark Wheel Styles */
        .wheel-container-premium {
          background: var(--card, #0F0F0F);
          border: 1px solid rgba(255,255,255,0.07);
          height: 212px;
        }
        
        .wheel-fade-premium {
          background: linear-gradient(to bottom, var(--card, #0F0F0F) 0%, var(--card, #0F0F0F) 20%, transparent 100%);
          height: 60px;
        }
        
        .wheel-fade-premium.wheel-fade-bottom {
          background: linear-gradient(to top, var(--card, #0F0F0F) 0%, var(--card, #0F0F0F) 20%, transparent 100%);
        }
        
        .highlight-strip-premium {
          background: var(--accent-lo, rgba(255,20,130,0.10));
          border-top: 1px solid var(--accent-mid, rgba(255,20,130,0.22));
          border-bottom: 1px solid var(--accent-mid, rgba(255,20,130,0.22));
          border-radius: 10px;
          height: 44px;
          opacity: 1;
        }
        
        .wheel-item-premium {
          height: 52px;
          padding: 0 28px;
        }
        
        .wheel-item-name-premium {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.20);
        }
        
        .wheel-item-price-premium {
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: rgba(255,255,255,0.12);
        }
        
        .wheel-item-premium.active .wheel-item-name-premium {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: #fff;
        }
        
        .wheel-item-premium.active .wheel-item-price-premium {
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: var(--accent);
        }
        
        .backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 200;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s;
        }
        
        .backdrop.open {
          opacity: 1;
          pointer-events: all;
        }
        
        .sheet {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          max-width: 420px;
          margin: 0 auto;
          background: #fff;
          border-radius: 24px 24px 0 0;
          z-index: 201;
          transform: translateY(100%);
          transition: transform 0.35s cubic-bezier(0.32,0.72,0,1);
          max-height: 88vh;
          overflow-y: auto;
        }
        
        .sheet.open {
          transform: translateY(0);
        }
        
        .sheet-pill {
          width: 36px;
          height: 4px;
          background: #e0e0e0;
          border-radius: 2px;
          margin: 12px auto 0;
        }
        
        .sheet-close {
          position: absolute;
          top: 16px;
          right: 20px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #f5f5f5;
          border: none;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
        }
        
        .sheet-image {
          width: 100%;
          background: #f5f0e8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 72px;
          margin-top: 8px;
        }
        
        .sheet-image img {
          width: 100%;
          height: auto;
          display: block;
        }
        
        .sheet-body {
          padding: 20px 24px 0;
        }
        
        .sheet-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 26px;
          font-weight: 600;
          color: #1C1917;
          margin-bottom: 4px;
        }
        
        .sheet-price {
          font-size: 18px;
          font-weight: 600;
          color: var(--accent);
          margin-bottom: 16px;
        }
        
        .sheet-description {
          font-style: italic;
          font-size: 14px;
          line-height: 1.7;
          color: #555;
          border-left: 3px solid var(--accent);
          padding-left: 14px;
          margin-bottom: 20px;
        }
        
        .macros-row {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        
        .macro-pill {
          background: #f5f5f5;
          border-radius: 20px;
          padding: 6px 14px;
          font-size: 12px;
          color: #555;
          font-weight: 500;
        }
        
        .macro-pill span {
          color: #1C1917;
          font-weight: 600;
        }
        
        .addons-title {
          font-size: 11px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #aaa;
          margin-bottom: 10px;
        }
        
        .addon-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
          font-size: 14px;
        }
        
        .addon-name {
          color: #333;
        }
        
        .addon-price {
          color: var(--accent);
          font-weight: 500;
        }
        
        .waiter-note {
          margin: 20px 0 32px;
          background: #fdf8f0;
          border-radius: 12px;
          padding: 14px 18px;
          font-size: 13px;
          color: #a07840;
          text-align: center;
        }
        
        /* Premium Dark Detail Sheet Styles */
        .backdrop.open {
          background: rgba(0,0,0,0.85);
        }
        
        .sheet-premium {
          background: var(--card, #0F0F0F);
          border-radius: 24px 24px 0 0;
        }
        
        .sheet-pill-premium {
          background: rgba(255,255,255,0.15);
        }
        
        .sheet-close-premium {
          color: rgba(255,255,255,0.6);
        }
        
        .sheet-hero-premium {
          position: relative;
          width: 100%;
        }
        
        .sheet-hero-premium img {
          width: 100%;
          height: auto;
          display: block;
          object-fit: cover;
        }
        
        .hero-badges {
          position: absolute;
          top: 16px;
          left: 16px;
          right: 16px;
          display: flex;
          justify-content: space-between;
          z-index: 10;
        }
        
        .hero-badge-tag {
          background: var(--accent);
          color: #fff;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 6px 12px;
          border-radius: 20px;
        }
        
        .hero-badge-kcal {
          background: rgba(0,0,0,0.6);
          color: rgba(255,255,255,0.9);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 11px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 20px;
          backdrop-filter: blur(8px);
        }
        
        .sheet-body-premium {
          padding: 20px;
        }
        
        .sheet-name-row-premium {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        
        .sheet-name-premium {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: #fff;
        }
        
        .sheet-price-premium {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: var(--accent);
        }
        
        .sheet-description-premium {
          font-style: italic;
          font-size: 13px;
          line-height: 1.6;
          color: rgba(255,255,255,0.38);
          border-left: 2px solid var(--accent-mid);
          background: rgba(255,255,255,0.03);
          border-radius: 10px;
          padding: 12px 14px;
          margin-bottom: 20px;
        }
        
        .macros-row-premium {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 20px;
        }
        
        .macro-pill-premium {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          padding: 10px 8px;
          text-align: center;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 9px;
          font-weight: 500;
          color: rgba(255,255,255,0.5);
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .macro-pill-premium span {
          display: block;
          font-size: 14px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 2px;
        }
        
        .addons-title-premium {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 10px;
          font-weight: 600;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 12px;
        }
        
        .addon-item-premium {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 8px;
          padding: 12px 14px;
          margin-bottom: 8px;
          font-size: 14px;
        }
        
        .addon-name-premium {
          color: rgba(255,255,255,0.7);
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 500;
        }
        
        .addon-price-premium {
          color: var(--accent);
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
        }
        
        .waiter-note-premium {
          background: var(--accent-lo);
          border: 1px solid var(--accent-mid);
          color: var(--accent);
          opacity: 0.65;
          border-radius: 10px;
          text-align: center;
          padding: 14px 18px;
          margin: 20px 0 32px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 12px;
          font-weight: 500;
        }
        
        /* Upsell Section Styles */
        .upsell-section {
          margin: 20px 0;
        }
        
        .upsell-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          padding: 0 4px;
        }
        
        .upsell-title {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .upsell-fire {
          font-size: 14px;
        }
        
        .upsell-text {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #fff;
        }
        
        .upsell-hint {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 400;
          color: rgba(255,255,255,0.4);
        }
        
        .upsell-scroll {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding-bottom: 4px;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        
        .upsell-scroll::-webkit-scrollbar {
          display: none;
        }
        
        .upsell-card {
          width: 130px;
          flex-shrink: 0;
          border: 1px solid;
          border-radius: 14px;
          overflow: hidden;
        }
        
        .upsell-card-image {
          height: 90px;
          width: 100%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .upsell-card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .upsell-card-body {
          padding: 10px;
          position: relative;
          min-height: 60px;
        }
        
        .upsell-card-name {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.3;
          margin-bottom: 4px;
          max-width: 85%;
        }
        
        .upsell-card-price {
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 600;
        }
        
        .upsell-card-add {
          position: absolute;
          bottom: 10px;
          right: 10px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #fff;
          line-height: 1;
        }

        /* Add-on card tap animation */
        .upsell-card {
          transition: transform 0.15s ease-out, border-color 0.15s ease-out;
        }

        .upsell-card-tapped {
          animation: upsellTap 0.3s ease-out;
          border-color: #22c55e !important;
          border-width: 2px !important;
        }

        @keyframes upsellTap {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }
        
        /* WhatsApp Opt-in Overlay Styles */
        .optin-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        
        .optin-dark {
          background: var(--ink, #060606);
        }
        
        .optin-light {
          background: var(--page-bg, #FAFAF8);
        }
        
        .optin-content {
          max-width: 360px;
          width: 100%;
          text-align: center;
        }
        
        .optin-restaurant {
          font-family: var(--restaurant-font, 'Cormorant Garamond', serif);
          font-size: 32px;
          font-weight: 600;
          color: var(--name-color, #1C1917);
          margin-bottom: 40px;
          letter-spacing: -0.5px;
        }
        
        .optin-dark .optin-restaurant {
          color: #fff;
          font-family: 'Space Grotesk', sans-serif;
        }
        
        .optin-heading {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 22px;
          font-weight: 600;
          line-height: 1.4;
          color: var(--name-color, #1C1917);
          margin-bottom: 32px;
        }
        
        .optin-dark .optin-heading {
          color: #fff;
        }
        
        .optin-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }
        
        .optin-input {
          width: 100%;
          padding: 16px 20px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.12);
          background: #fff;
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          text-align: center;
          outline: none;
          transition: border-color 0.2s;
        }
        
        .optin-dark .optin-input {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.15);
          color: #fff;
        }
        
        .optin-input:focus {
          border-color: var(--accent);
        }
        
        .optin-error {
          color: #FF1482;
          font-size: 13px;
          font-family: 'Outfit', sans-serif;
          text-align: center;
        }
        
        .optin-button {
          width: 100%;
          padding: 16px 24px;
          border-radius: 12px;
          border: none;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
        }
        
        .optin-button:hover {
          opacity: 0.9;
        }
        
        .optin-button:active {
          transform: scale(0.98);
        }
        
        .optin-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .optin-skip {
          background: none;
          border: none;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 400;
          color: var(--sub-color, #888);
          cursor: pointer;
          padding: 8px;
          text-decoration: underline;
          text-decoration-color: transparent;
          transition: text-decoration-color 0.2s;
        }
        
        .optin-skip:hover {
          text-decoration-color: var(--sub-color, #888);
        }
        
        .optin-dark .optin-skip {
          color: rgba(255,255,255,0.4);
        }
        
        .optin-dark .optin-skip:hover {
          text-decoration-color: rgba(255,255,255,0.4);
        }
      `}</style>
    </>
  );
}

// Individual category wheel component with exact physics from reference
function CategoryWheel({
  category,
  items,
  theme,
  onItemClick,
  onSheetOpen,
}: {
  category: string;
  items: MenuItem[];
  theme: ThemeConfig;
  onItemClick: (item: MenuItem) => void;
  onSheetOpen: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ startY: 0, lastY: 0, lastTime: 0, vel: 0 });
  const rafRef = useRef<number>();
  const activeIndexRef = useRef(0);
  
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Dynamic dimensions based on theme
  const isPremiumDark = theme.isPremiumDark;
  const itemHeight = isPremiumDark ? 52 : ITEM_H;
  const wheelHeight = isPremiumDark ? 212 : 200;
  const centerY = wheelHeight / 2;
  const maxOffset = centerY - itemHeight / 2;
  const minOffset = centerY - itemHeight / 2 - (items.length - 1) * itemHeight;

  const clampOffset = useCallback((o: number) => {
    return Math.max(minOffset, Math.min(maxOffset, o));
  }, [minOffset, maxOffset]);

  const getIndexFromOffset = useCallback((o: number) => {
    const idx = Math.round((centerY - itemHeight / 2 - o) / itemHeight);
    return Math.max(0, Math.min(items.length - 1, idx));
  }, [items.length, centerY, itemHeight]);

  const snapToIndex = useCallback((idx: number) => {
    return centerY - itemHeight / 2 - idx * itemHeight;
  }, [centerY, itemHeight]);

  // Animation loop - exact from reference
  const animate = useCallback(() => {
    if (!isDragging) {
      const target = snapToIndex(getIndexFromOffset(offset));
      const diff = target - offset;
      
      if (Math.abs(dragState.current.vel) < 0.5 && Math.abs(diff) < 0.5) {
        setOffset(target);
        dragState.current.vel = 0;
        return;
      }
      
      if (Math.abs(dragState.current.vel) > 0.5) {
        setOffset(prev => {
          const newOffset = clampOffset(prev + dragState.current.vel);
          const newIndex = getIndexFromOffset(newOffset);
          activeIndexRef.current = newIndex;
          setActiveIndex(newIndex);
          return newOffset;
        });
        dragState.current.vel *= 0.92;
      } else {
        setOffset(prev => {
          const newOffset = prev + diff * 0.18;
          const newIndex = getIndexFromOffset(newOffset);
          activeIndexRef.current = newIndex;
          setActiveIndex(newIndex);
          return newOffset;
        });
      }
    }
    
    rafRef.current = requestAnimationFrame(animate);
  }, [isDragging, offset, clampOffset, getIndexFromOffset, snapToIndex]);

  // Start animation loop
  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  // Prevent page scroll when wheel is being used - per container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setOffset(prev => clampOffset(prev - e.deltaY * 0.5));
      dragState.current.vel = -e.deltaY * 0.3;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
    };
    
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, [clampOffset]);

  const getY = (e: React.MouseEvent | React.TouchEvent) => {
    return 'touches' in e ? e.touches[0].clientY : e.clientY;
  };

  const onStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const y = getY(e);
    dragState.current = { startY: y, lastY: y, lastTime: Date.now(), vel: 0 };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);
  };

  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const y = getY(e);
    const dy = y - dragState.current.lastY;
    const dt = Date.now() - dragState.current.lastTime;
    dragState.current.vel = dt > 0 ? (dy / dt) * 16 : 0;
    setOffset(prev => {
      const newOffset = clampOffset(prev + dy);
      const newIndex = getIndexFromOffset(newOffset);
      activeIndexRef.current = newIndex;
      setActiveIndex(newIndex);
      return newOffset;
    });
    dragState.current.lastY = y;
    dragState.current.lastTime = Date.now();
  };

  const onEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    
    let totalDrag = 0;
    if ('changedTouches' in e) {
      totalDrag = Math.abs(e.changedTouches[0].clientY - dragState.current.startY);
    } else {
      totalDrag = Math.abs((e as React.MouseEvent).clientY - dragState.current.startY);
    }
    
    if (totalDrag < 5) {
      onItemClick(items[activeIndexRef.current]);
      onSheetOpen();
    }
  };

  return (
    <div className="category-section">
      {isPremiumDark ? (
        <div className="category-header-premium">
          <div className="category-pip-title">
            <div className="pink-pip"></div>
            <div className="category-label">{category.toUpperCase()}</div>
          </div>
          <div className="category-count-premium">{items.length} items</div>
        </div>
      ) : (
        <div className="category-header">
          <div 
            className="category-title"
            style={{
              fontFamily: theme.categoryFont,
              textTransform: theme.categoryTextTransform,
              letterSpacing: theme.categoryLetterSpacing,
              color: 'var(--category-title-color)',
            }}
          >
            {theme.categoryTextTransform === 'uppercase' ? category.toUpperCase() : category}
          </div>
          <div 
            className="category-count"
            style={{ color: 'var(--category-count-color)' }}
          >
            {items.length} items
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className={`wheel-container ${isPremiumDark ? 'wheel-container-premium' : ''}`}
        onMouseDown={onStart}
        onMouseMove={onMove}
        onMouseUp={onEnd}
        onMouseLeave={onEnd}
        onTouchStart={onStart}
        onTouchMove={(e) => { onMove(e); }}
        onTouchEnd={onEnd}
      >
        <div className={`wheel-fade-top ${isPremiumDark ? 'wheel-fade-premium' : ''}`} />
        <div className={`wheel-fade-bottom ${isPremiumDark ? 'wheel-fade-premium' : ''}`} />
        <div className={`highlight-strip ${isPremiumDark ? 'highlight-strip-premium' : ''}`} />
        <div
          ref={trackRef}
          className="wheel-track"
          style={{ transform: `translateY(${offset}px)` }}
        >
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.08, ease: 'easeOut' }}
              whileTap={{ scale: 0.97 }}
              className={`wheel-item ${index === activeIndex ? 'active' : ''} ${isPremiumDark ? 'wheel-item-premium' : ''}`}
            >
              <span className={`wheel-item-name ${isPremiumDark ? 'wheel-item-name-premium' : ''}`}>{item.name}</span>
              <span className={`wheel-item-price ${isPremiumDark ? 'wheel-item-price-premium' : ''}`}>Rs {item.price}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Detail sheet component
function DetailSheet({
  item,
  allMenuItems,
  open,
  onClose,
  restaurant,
  theme,
}: {
  item: MenuItem | null;
  allMenuItems: MenuItem[];
  open: boolean;
  onClose: () => void;
  restaurant: Restaurant | null;
  theme: ThemeConfig;
}) {
  // Track which add-on card is being animated - must be before any early returns
  const [tappedAddon, setTappedAddon] = useState<string | null>(null);

  if (!item) return null;

  const kcal = Math.round(
    (item.protein || 0) * 4 + (item.carbs || 0) * 4 + (item.fats || 0) * 9
  );

  // Handle both string[] and {name, price}[] formats
  const addOns = Array.isArray(item.add_ons) ? item.add_ons : [];
  
  // Look up add-on images from menu items
  const addOnsWithImages = addOns.map(addon => {
    const name = typeof addon === 'string' ? addon : addon.name;
    const price = typeof addon === 'string' ? null : addon.price;
    // Find matching menu item by name
    const matchingItem = allMenuItems.find(menuItem => 
      menuItem.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
    return { name, price, imageUrl: matchingItem?.image_url || null };
  });
  
  const isPremiumDark = theme.isPremiumDark;
  
  // Theme-specific card colors
  const getCardStyles = () => {
    if (isPremiumDark) {
      return {
        background: '#1a1a1a',
        border: 'rgba(255,255,255,0.08)',
        nameColor: '#fff',
        priceColor: theme.accent,
        placeholderBg: '#252525',
      };
    }
    // warm_luxury
    if (theme.restaurantStyle === 'italic-dot') {
      return {
        background: '#f5f0e8',
        border: 'rgba(0,0,0,0.08)',
        nameColor: '#1C1917',
        priceColor: theme.accent,
        placeholderBg: '#e8e4dc',
      };
    }
    // fresh_clean
    return {
      background: '#e8f0e8',
      border: 'rgba(0,0,0,0.08)',
      nameColor: '#1A2E1A',
      priceColor: theme.accent,
      placeholderBg: '#dce8dc',
    };
  };
  
  const cardStyles = getCardStyles();

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`sheet ${open ? 'open' : ''} ${isPremiumDark ? 'sheet-premium' : ''}`}
      style={{
        '--accent': theme.accent,
        '--accent-lo': theme.accentLo || `${theme.accent}1A`,
        '--accent-mid': theme.accentMid || `${theme.accent}38`,
        '--card': theme.card || theme.wheelBg,
      } as React.CSSProperties}
    >
      <div className={`sheet-pill ${isPremiumDark ? 'sheet-pill-premium' : ''}`} />
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          zIndex: 50,
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          border: '0.5px solid rgba(255,255,255,0.2)',
          color: '#ffffff',
          fontSize: '16px',
        }}
      >
        ✕
      </button>
      
      {isPremiumDark && item.image_url && (
        <div className="sheet-hero-premium">
          <div className="hero-badges">
            <div className="hero-badge-tag">Fan Fave</div>
            <div className="hero-badge-kcal">{kcal} kcal</div>
          </div>
          <img src={item.image_url} alt={item.name} />
        </div>
      )}
      
      {!isPremiumDark && (
        <div className="sheet-image">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} />
          ) : (
            <span>🍽</span>
          )}
        </div>
      )}
      
      <div className={`sheet-body ${isPremiumDark ? 'sheet-body-premium' : ''}`}>
        <div className={`sheet-name-row ${isPremiumDark ? 'sheet-name-row-premium' : ''}`}>
          <div className={`sheet-name ${isPremiumDark ? 'sheet-name-premium' : ''}`}>{item.name}</div>
          <div className={`sheet-price ${isPremiumDark ? 'sheet-price-premium' : ''}`}>Rs {item.price}</div>
        </div>
        
        {item.description && (
          <div className={`sheet-description ${isPremiumDark ? 'sheet-description-premium' : ''}`}>
            {item.description}
          </div>
        )}
        
        <div className={`macros-row ${isPremiumDark ? 'macros-row-premium' : ''}`}>
          <div className={`macro-pill ${isPremiumDark ? 'macro-pill-premium' : ''}`}>
            <span>{kcal}</span> kcal
          </div>
          <div className={`macro-pill ${isPremiumDark ? 'macro-pill-premium' : ''}`}>
            <span>{item.protein || 0}g</span> protein
          </div>
          <div className={`macro-pill ${isPremiumDark ? 'macro-pill-premium' : ''}`}>
            <span>{item.carbs || 0}g</span> carbs
          </div>
          <div className={`macro-pill ${isPremiumDark ? 'macro-pill-premium' : ''}`}>
            <span>{item.fats || 0}g</span> fat
          </div>
        </div>
        
        {addOnsWithImages.length > 0 && (
          <div className="upsell-section">
            <div className="upsell-header">
              <div className="upsell-title">
                <span className="upsell-fire">🔥</span>
                <span className="upsell-text">Make it a meal</span>
              </div>
              <div className="upsell-hint">Swipe to explore</div>
            </div>
            <div className="upsell-scroll">
              {addOnsWithImages.map((addon, idx) => {
                // Find the addon item ID for tracking
                const addonItem = allMenuItems.find(menuItem =>
                  menuItem.name.toLowerCase().trim() === addon.name.toLowerCase().trim()
                );
                return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.07, ease: 'easeOut' }}
                  className={`upsell-card ${tappedAddon === addon.name ? 'upsell-card-tapped' : ''}`}
                  style={{
                    background: cardStyles.background,
                    borderColor: tappedAddon === addon.name ? '#22c55e' : cardStyles.border,
                    '--card-border-color': cardStyles.border,
                  } as React.CSSProperties}
                  onClick={() => {
                    // Track addon tap with parent context
                    if (restaurant && addonItem && item) {
                      trackEvent(restaurant.id, addonItem.id, 'addon_tap', undefined, item.id);
                    }
                    // Trigger visual feedback animation
                    setTappedAddon(addon.name);
                    setTimeout(() => setTappedAddon(null), 300);
                  }}
                >
                  <div
                    className="upsell-card-image"
                    style={{
                      backgroundColor: addon.imageUrl ? 'transparent' : cardStyles.placeholderBg,
                    }}
                  >
                    {addon.imageUrl ? (
                      <img src={addon.imageUrl} alt={addon.name} />
                    ) : null}
                  </div>
                  <div className="upsell-card-body">
                    <div
                      className="upsell-card-name"
                      style={{ color: cardStyles.nameColor }}
                    >
                      {addon.name}
                    </div>
                    {addon.price != null && (
                      <div
                        className="upsell-card-price"
                        style={{ color: cardStyles.priceColor }}
                      >
                        Rs {addon.price}
                      </div>
                    )}
                    <div
                      className="upsell-card-add"
                      style={{ background: theme.accent }}
                    >
                      +
                    </div>
                  </div>
                </motion.div>
              );
              })}
            </div>
          </div>
        )}
        
        <div className={`waiter-note ${isPremiumDark ? 'waiter-note-premium' : ''}`}>
          Please order at the front desk or with your waiter
        </div>
      </div>
    </motion.div>
  );
}
