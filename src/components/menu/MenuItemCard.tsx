import { MenuItem, AddOn } from '@/types';
import { premiumImageFilters, formatCurrency } from '@/lib/utils';
import { formatAddOnDisplay } from '@/lib/addon-pricing';

interface MenuItemCardProps {
  item: MenuItem;
}

export default function MenuItemCard({ item }: MenuItemCardProps) {
  const addOns = Array.isArray(item.add_ons) ? item.add_ons : [];
  
  console.log('=== MENU ITEM CARD DEBUG ===');
  console.log('MenuItemCard rendering:', {
    itemName: item.name,
    rawAddOns: item.add_ons,
    parsedAddOns: addOns,
    firstAddOnType: addOns.length > 0 ? typeof addOns[0] : 'empty'
  });

  if (addOns.length > 0) {
    console.log('Add-ons to render:', addOns.map((addOn, index) => ({
      index,
      type: typeof addOn,
      value: addOn,
      formatted: typeof addOn === 'string' ? addOn : 
              (addOn && typeof addOn === 'object' && 'name' in addOn) ? formatAddOnDisplay(addOn as AddOn) : String(addOn)
    })));
  }
  console.log('=== END MENU ITEM CARD DEBUG ===');

  return (
    <article className="rounded-2xl overflow-hidden border shadow-lg transition-all duration-300 bg-white" style={{ borderColor: 'color-mix(in srgb, var(--theme-secondary) 30%, transparent)' }}>
      {/* Food Image */}
      {item.image_url && (
        <div className="relative h-48 md:h-64 overflow-hidden">
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
            style={premiumImageFilters}
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 opacity-80" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }} />
        </div>
      )}

      {/* Content */}
      <div className={`p-5 ${!item.image_url ? 'rounded-2xl' : ''}`}>
        {/* Name and Price Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-bold flex-1 pr-3 text-stone-900">
            {item.name}
          </h3>
          <span className="text-lg font-semibold whitespace-nowrap" style={{ color: 'var(--theme-accent)' }}>
            {formatCurrency(item.price)}
          </span>
        </div>

        {/* Description */}
        {item.description && (
          <p className="text-sm leading-relaxed mb-4 text-stone-700">
            {item.description}
          </p>
        )}

        {/* Macros Strip */}
        {(item.protein !== null || item.carbs !== null || item.fats !== null) && (
          <div className="flex items-center space-x-4 mb-4 pb-4" style={{ borderBottom: `1px solid color-mix(in srgb, var(--theme-secondary) 20%, transparent)` }}>
            {item.protein !== null && (
              <div className="flex items-center space-x-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="text-xs text-stone-500">P:</span>
                <span className="text-sm font-semibold text-blue-600">{item.protein}g</span>
              </div>
            )}
            {item.carbs !== null && (
              <div className="flex items-center space-x-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-xs text-stone-500">C:</span>
                <span className="text-sm font-semibold text-green-600">{item.carbs}g</span>
              </div>
            )}
            {item.fats !== null && (
              <div className="flex items-center space-x-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                <span className="text-xs text-stone-500">F:</span>
                <span className="text-sm font-semibold text-yellow-600">{item.fats}g</span>
              </div>
            )}
          </div>
        )}

        {/* Add-on Suggestions */}
        {addOns.length > 0 && (
          <div className="rounded-xl p-4 mt-4 bg-gray-50">
            <h4 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--theme-secondary)' }}>
              Goes well with
            </h4>
            <div className="flex flex-wrap gap-2">
              {addOns.map((addOn, index: number) => {
                // Handle both string and object formats
                let displayText: string;
                
                if (typeof addOn === 'string') {
                  // Legacy string format
                  displayText = addOn;
                } else if (addOn && typeof addOn === 'object' && 'name' in addOn) {
                  // New object format
                  displayText = formatAddOnDisplay(addOn as AddOn);
                } else {
                  // Fallback
                  displayText = String(addOn);
                }

                return (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1.5 text-sm rounded-lg border"
                    style={{ backgroundColor: 'white', borderColor: 'color-mix(in srgb, var(--theme-secondary) 30%, transparent)', color: 'text-stone-700' }}
                  >
                    {displayText}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
