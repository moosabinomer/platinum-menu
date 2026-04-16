import { Restaurant } from '@/types';

interface MenuHeaderProps {
  restaurant: Restaurant;
}

export default function MenuHeader({ restaurant }: MenuHeaderProps) {
  // Split restaurant name to make last letter italic
  const nameParts = restaurant.name.split(' ');
  const lastName = nameParts[nameParts.length - 1];
  const firstName = nameParts.slice(0, -1).join(' ');
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-100">
      <div className="px-6 py-4">
        <h1 className="text-3xl font-serif font-semibold text-stone-900">
          {firstName && <span>{firstName} </span>}
          <span className="italic" style={{ color: 'var(--accent)' }}>
            {lastName}
          </span>
        </h1>
        <p className="text-xs font-medium uppercase tracking-wider text-stone-500 mt-1">
          {restaurant.slug}
        </p>
      </div>
    </header>
  );
}
