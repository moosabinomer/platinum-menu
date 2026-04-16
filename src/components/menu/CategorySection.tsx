import { MenuItem } from '@/types';
import MenuItemCard from './MenuItemCard';

interface CategorySectionProps {
  category: string;
  items: MenuItem[];
}

export default function CategorySection({ category, items }: CategorySectionProps) {
  return (
    <section>
      {/* Category Header */}
      <div className="mb-6 pb-3" style={{ borderBottom: `1px solid color-mix(in srgb, var(--theme-secondary) 30%, transparent)` }}>
        <h2 className="text-2xl md:text-3xl font-bold text-stone-900" style={{ color: 'var(--theme-accent)' }}>
          {category}
        </h2>
        <div className="w-16 h-0.5 mt-2 rounded-full" style={{ backgroundColor: 'var(--theme-secondary)' }} />
      </div>

      {/* Menu Items Grid */}
      <div className="space-y-6">
        {items.map((item) => (
          <MenuItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
