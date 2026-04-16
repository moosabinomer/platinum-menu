// Database Types
export type Restaurant = {
  id: string;
  name: string;
  cuisine_type: string;
  contact: string;
  slug: string;
  published: boolean;
  theme_colors: string[] | null;
  brand_config: Record<string, string> | null;
  created_at: string;
};

export type AddOn = {
  name: string;
  price?: number;
};

export type MenuItem = {
  id: string;
  restaurant_id: string;
  name: string;
  category: string;
  price: number;
  description: string | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  image_url: string | null;
  add_ons: AddOn[] | null;
  approved: boolean;
  is_addon: boolean;
  created_at: string;
};

export type ExtractedMenuItem = {
  name: string;
  category: string;
  price: number;
};

export type EnhancedMenuItem = {
  description: string;
  macros: {
    protein: number;
    carbs: number;
    fats: number;
  };
  addOns: string[];
};

export type AddOnWithPrice = {
  name: string;
  price?: number;
};
