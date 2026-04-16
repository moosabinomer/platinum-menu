'use client';

import { useState, useEffect } from 'react';
import { MenuItem } from '@/types';

interface ItemDetailSheetProps {
  accentColor: string;
}

export default function ItemDetailSheet({ accentColor }: ItemDetailSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    const handleOpenDetail = (event: CustomEvent) => {
      // Immediately set the selected item and open the sheet
      setSelectedItem(event.detail);
      setIsOpen(true);
    };

    window.addEventListener('openItemDetail', handleOpenDetail as EventListener);
    return () => window.removeEventListener('openItemDetail', handleOpenDetail as EventListener);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    // Clear the item after animation completes
    setTimeout(() => setSelectedItem(null), 300);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Pre-calculate values to ensure immediate rendering
  const renderContent = (item: MenuItem) => {
    // Calculate total calories (rough estimate: 4 cal per protein/carb, 9 cal per fat)
    const totalCalories = Math.round(
      (item.protein || 0) * 4 + 
      (item.carbs || 0) * 4 + 
      (item.fats || 0) * 9
    );

    return (
      <>
        {/* Hero Image/Emoji */}
        <div className="w-full h-48 bg-gradient-to-br from-stone-100 to-stone-200 rounded-2xl mb-6 flex items-center justify-center">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover rounded-2xl"
            />
          ) : (
            <span className="text-6xl">🍽️</span>
          )}
        </div>

        {/* Item Name and Price */}
        <div className="mb-6">
          <h2 className="text-3xl font-serif font-semibold text-stone-900 mb-2">
            {item.name}
          </h2>
          <p className="text-2xl font-semibold" style={{ color: accentColor }}>
            Rs {item.price}
          </p>
        </div>

        {/* Description */}
        {item.description && (
          <div className="mb-6">
            <div
              className="pl-4 border-l-2 italic text-stone-700 leading-relaxed"
              style={{ borderColor: accentColor }}
            >
              {item.description}
            </div>
          </div>
        )}

        {/* Nutrition Macros */}
        <div className="mb-6">
          <h3 className="text-sm font-medium uppercase tracking-wider text-stone-500 mb-3">
            Nutrition
          </h3>
          <div className="flex flex-wrap gap-2">
            <div className="px-3 py-1.5 bg-stone-100 rounded-full text-sm">
              <span className="font-medium">{totalCalories}</span> kcal
            </div>
            {(item.protein !== null && item.protein > 0) && (
              <div className="px-3 py-1.5 bg-stone-100 rounded-full text-sm">
                <span className="font-medium">{item.protein}g</span> protein
              </div>
            )}
            {(item.carbs !== null && item.carbs > 0) && (
              <div className="px-3 py-1.5 bg-stone-100 rounded-full text-sm">
                <span className="font-medium">{item.carbs}g</span> carbs
              </div>
            )}
            {(item.fats !== null && item.fats > 0) && (
              <div className="px-3 py-1.5 bg-stone-100 rounded-full text-sm">
                <span className="font-medium">{item.fats}g</span> fat
              </div>
            )}
          </div>
        </div>

        {/* Add-ons */}
        {item.add_ons && item.add_ons.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium uppercase tracking-wider text-stone-500 mb-3">
              Goes well with
            </h3>
            <div className="space-y-2">
              {item.add_ons.map((addOn, index) => (
                <div key={index} className="flex justify-between items-center py-2">
                  <span className="text-stone-700">
                    {typeof addOn === 'string' ? addOn : addOn.name}
                  </span>
                  {typeof addOn === 'object' && addOn.price && (
                    <span className="font-medium" style={{ color: accentColor }}>
                      Rs {addOn.price}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Order Note */}
        <div
          className="p-4 rounded-xl text-center"
          style={{
            backgroundColor: `${accentColor}10`,
            color: accentColor,
          }}
        >
          <p className="text-sm font-medium">
            Please order at the front desk or with your waiter
          </p>
        </div>
      </>
    );
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 transition-opacity duration-300"
          onClick={handleBackdropClick}
        />
      )}

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 transition-transform duration-300 ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '85vh' }}
      >
        {/* Drag Pill */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1 bg-stone-300 rounded-full" />
        </div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 transition-colors"
        >
          <span className="text-stone-600 text-lg">×</span>
        </button>

        {/* Content - Render immediately when item is available */}
        <div className="px-6 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 60px)' }}>
          {selectedItem && renderContent(selectedItem)}
        </div>
      </div>
    </>
  );
}
