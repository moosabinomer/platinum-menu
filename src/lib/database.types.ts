// Supabase Database Types
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string;
          name: string;
          cuisine_type: string;
          contact: string;
          slug: string;
          published: boolean;
          theme_colors: string[] | null;
          brand_config: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          cuisine_type: string;
          contact: string;
          slug?: string;
          published?: boolean;
          theme_colors?: string[] | null;
          brand_config?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          cuisine_type?: string;
          contact?: string;
          slug?: string;
          published?: boolean;
          theme_colors?: string[] | null;
          brand_config?: Json | null;
          created_at?: string;
        };
      };
      menu_items: {
        Row: {
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
          add_ons: Json | null;
          approved: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          category: string;
          price: number;
          description?: string | null;
          protein?: number | null;
          carbs?: number | null;
          fats?: number | null;
          image_url?: string | null;
          add_ons?: Json | null;
          approved?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          name?: string;
          category?: string;
          price?: number;
          description?: string | null;
          protein?: number | null;
          carbs?: number | null;
          fats?: number | null;
          image_url?: string | null;
          add_ons?: Json | null;
          approved?: boolean;
          created_at?: string;
        };
      };
    };
    Views: { [key: string]: never };
    Functions: { [key: string]: never };
  };
}
