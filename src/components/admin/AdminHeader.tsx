import { UtensilsCrossed } from 'lucide-react';

export function AdminHeader() {
  return (
    <div className="flex items-center space-x-3">
      <UtensilsCrossed className="h-8 w-8 text-amber-500" />
      <div>
        <h1 className="text-xl font-bold text-white">Platinum Menu</h1>
        <p className="text-xs text-amber-200/80">Admin Panel</p>
      </div>
    </div>
  );
}
