export type MenuVibe = 'dark_bold' | 'warm_luxury' | 'fresh_clean';

export interface ThemeConfig {
  pageBg: string;
  headerBg: string;
  wheelBg: string;
  accent: string;
  nameColor: string;
  subColor: string;
  categoryFont: string;
  restaurantFont: string;
  activeItemColor: string;
  inactiveItemColor: string;
  categoryTextTransform: 'uppercase' | 'none';
  categoryLetterSpacing: string;
  restaurantTextTransform: 'uppercase' | 'none';
  restaurantStyle: 'bold' | 'italic-dot' | 'bold-accent-word';
  categoryTitleColor: string;
  categoryCountColor: string;
  // Premium dark_bold specific
  ink?: string;
  card?: string;
  accentLo?: string;
  accentMid?: string;
  isPremiumDark?: boolean;
}

export const themes: Record<MenuVibe, ThemeConfig> = {
  dark_bold: {
    pageBg: '#060606',
    headerBg: '#060606',
    wheelBg: '#0F0F0F',
    accent: '#FF1482',
    nameColor: '#FFFFFF',
    subColor: 'rgba(255,255,255,0.3)',
    categoryFont: "'Space Grotesk', sans-serif",
    restaurantFont: "'Space Grotesk', sans-serif",
    activeItemColor: '#FFFFFF',
    inactiveItemColor: 'rgba(255,255,255,0.20)',
    categoryTextTransform: 'uppercase',
    categoryLetterSpacing: '3px',
    restaurantTextTransform: 'uppercase',
    restaurantStyle: 'bold',
    categoryTitleColor: '#FFFFFF',
    categoryCountColor: 'rgba(255,255,255,0.3)',
    // Premium dark specific
    ink: '#060606',
    card: '#0F0F0F',
    accentLo: 'rgba(255,20,130,0.10)',
    accentMid: 'rgba(255,20,130,0.22)',
    isPremiumDark: true,
  },
  warm_luxury: {
    pageBg: '#FAFAF5',
    headerBg: '#FAFAF5',
    wheelBg: '#1C1917',
    accent: '#B5763A',
    nameColor: '#1C1917',
    subColor: '#999999',
    categoryFont: "'Cormorant Garamond', serif",
    restaurantFont: "'Cormorant Garamond', serif",
    activeItemColor: '#FFFFFF',
    inactiveItemColor: 'rgba(255,255,255,0.35)',
    categoryTextTransform: 'none',
    categoryLetterSpacing: '0px',
    restaurantTextTransform: 'none',
    restaurantStyle: 'italic-dot',
    categoryTitleColor: 'var(--accent)',
    categoryCountColor: '#aaa',
  },
  fresh_clean: {
    pageBg: '#F0F4F0',
    headerBg: '#F0F4F0',
    wheelBg: '#1A2E1A',
    accent: '#3D7A3D',
    nameColor: '#1A2E1A',
    subColor: '#7A9A7A',
    categoryFont: "'Outfit', sans-serif",
    restaurantFont: "'Outfit', sans-serif",
    activeItemColor: '#FFFFFF',
    inactiveItemColor: 'rgba(255,255,255,0.35)',
    categoryTextTransform: 'uppercase',
    categoryLetterSpacing: '2px',
    restaurantTextTransform: 'none',
    restaurantStyle: 'bold-accent-word',
    categoryTitleColor: 'var(--accent)',
    categoryCountColor: '#aaa',
  },
};

export function getTheme(vibe: string | null, themeColor: string | null): ThemeConfig {
  const validVibe = (vibe as MenuVibe) || 'warm_luxury';
  const baseTheme = themes[validVibe] || themes.warm_luxury;
  
  // Use provided theme color or fallback to theme default
  const accentColor = themeColor || baseTheme.accent;
  
  // For premium dark theme, compute accent opacity variants
  if (validVibe === 'dark_bold' && baseTheme.isPremiumDark) {
    // Convert hex to RGB for rgba (handles both 3 and 6 char hex)
    const hexToRgb = (hex: string) => {
      let clean = hex.replace('#', '');
      // Handle 3-character hex
      if (clean.length === 3) {
        clean = clean.split('').map(c => c + c).join('');
      }
      const r = parseInt(clean.substring(0, 2), 16);
      const g = parseInt(clean.substring(2, 4), 16);
      const b = parseInt(clean.substring(4, 6), 16);
      return { r: isNaN(r) ? 255 : r, g: isNaN(g) ? 20 : g, b: isNaN(b) ? 130 : b };
    };
    
    const { r, g, b } = hexToRgb(accentColor);
    
    return {
      ...baseTheme,
      accent: accentColor,
      accentLo: `rgba(${r},${g},${b},0.10)`,
      accentMid: `rgba(${r},${g},${b},0.22)`,
    };
  }
  
  // For other themes, just update accent color
  if (themeColor) {
    return {
      ...baseTheme,
      accent: themeColor,
    };
  }
  
  return baseTheme;
}
