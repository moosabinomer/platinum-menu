import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { MenuItem, Restaurant } from '@/types';
import MenuClient from './MenuClient';

interface MenuDataProviderProps {
  slug: string;
}

export default async function MenuDataProvider({ slug }: MenuDataProviderProps) {
  const supabase = await createServerSupabaseClient();
  
  // Fetch restaurant by slug (must be published)
  const { data: restaurant }: { data: Restaurant | null } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single();

  if (!restaurant) {
    notFound();
  }

  // Fetch approved menu items for this restaurant
  const { data: menuItems }: { data: MenuItem[] | null } = await supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .eq('approved', true)
    .order('category, name');

  if (!menuItems || menuItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
        <div className="text-center text-stone-600">
          <h1 className="text-2xl font-bold mb-2">{restaurant.name}</h1>
          <p className="text-stone-500">Menu is being prepared. Please check back soon!</p>
        </div>
      </div>
    );
  }

  // Group items by category
  const groupedItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <MenuClient 
      restaurant={restaurant}
      groupedItems={groupedItems}
    />
  );
}
