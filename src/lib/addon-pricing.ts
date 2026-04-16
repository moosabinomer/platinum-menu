import { AddOn, MenuItem } from '@/types';

export async function enrichAddOnsWithPrices(
  addOns: string[],
  restaurantId: string,
  allMenuItems: MenuItem[]
): Promise<AddOn[]> {
  const enrichedAddOns: AddOn[] = [];

  for (const addOnName of addOns) {
    // Look for exact matches first, then partial matches
    let matchingItem = allMenuItems.find(item => 
      item.name.toLowerCase() === addOnName.toLowerCase()
    );

    // If no exact match, try partial matching
    if (!matchingItem) {
      matchingItem = allMenuItems.find(item => 
        item.name.toLowerCase().includes(addOnName.toLowerCase()) ||
        addOnName.toLowerCase().includes(item.name.toLowerCase())
      );
    }

    enrichedAddOns.push({
      name: addOnName,
      price: matchingItem?.price
    });
  }

  return enrichedAddOns;
}

export function formatAddOnDisplay(addOn: AddOn): string {
  if (addOn.price !== undefined) {
    return `${addOn.name} — Rs ${addOn.price}`;
  }
  return addOn.name;
}
