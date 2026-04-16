import { Restaurant } from '@/types';
import { UtensilsCrossed } from 'lucide-react';

interface RestaurantHeaderProps {
  restaurant: Restaurant;
}

export default function RestaurantHeader({ restaurant }: RestaurantHeaderProps) {
  return (
    <header className="relative py-12 px-4 bg-gray-50">
      <div className="max-w-3xl mx-auto text-center">
        {/* Logo Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full shadow-2xl mb-6" style={{ background: `linear-gradient(135deg, var(--theme-accent), color-mix(in srgb, var(--theme-accent) 80%))` }}>
          <UtensilsCrossed className="w-10 h-10 text-white" />
        </div>

        {/* Restaurant Name */}
        <h1 className="text-4xl md:text-5xl font-bold mb-3 tracking-tight text-stone-900">
          {restaurant.name}
        </h1>

        {/* Decorative Line */}
        <div className="w-24 h-1 mx-auto mt-6 rounded-full" style={{ background: `linear-gradient(90deg, transparent, var(--theme-secondary), transparent)` }} />
      </div>
    </header>
  );
}
