/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { PageHeader } from '@/components/admin/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { formatCurrencyWithDecimals } from '@/lib/utils';
import { Sparkles, Upload, CheckCircle, Loader2, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

interface MenuItem {
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
  add_ons: any;
  approved: boolean;
  is_addon: boolean;
  created_at: string;
}

export default function EnhanceRestaurantPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const restaurantId = params['restaurant-id'] as string;
  
  const [loading, setLoading] = useState(true);
  const [enhancingItemId, setEnhancingItemId] = useState<string | null>(null);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [enhancedImages, setEnhancedImages] = useState<Record<string, string>>({});
  
  // Bulk enhancement state
  const [bulkEnhancing, setBulkEnhancing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkFailedItems, setBulkFailedItems] = useState<MenuItem[]>([]);
  const [bulkComplete, setBulkComplete] = useState(false);
  const [restaurantSlug, setRestaurantSlug] = useState<string>('');

  const fetchRestaurantData = useCallback(async () => {
    try {
      const supabase: any = createClient();
      
      const { data: restaurant }: any = await supabase
        .from('restaurants')
        .select('name, slug')
        .eq('id', restaurantId)
        .single();

      if (restaurant) {
        setRestaurantName(restaurant.name);
        setRestaurantSlug(restaurant.slug);
      }

      const { data: items }: any = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: true });

      if (items) {
        setMenuItems(items);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ type: 'error', title: 'Could not load menu data' });
    } finally {
      setLoading(false);
    }
  }, [restaurantId, toast]);

  useEffect(() => {
    fetchRestaurantData();
  }, [fetchRestaurantData]);

  const handleEnhanceItem = async (item: MenuItem) => {
    if (!item.image_url) {
      toast({ type: 'error', title: 'Image required', description: 'Upload a food image before AI enhancement.' });
      return;
    }

    setEnhancingItemId(item.id);

    try {
      // Get all other menu items from the same restaurant for add-on suggestions
      const otherMenuItems = menuItems
        .filter(i => i.id !== item.id) // Exclude current item
        .map(i => ({ name: i.name, category: i.category, price: i.price }));

      const response = await fetch('/api/enhance-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: item.name,
          itemCategory: item.category,
          imageUrl: item.image_url,
          menuItems: otherMenuItems, // Pass other menu items for context-aware add-on suggestions
        }),
      });

      if (!response.ok) throw new Error('Enhancement failed');

      const enhanced: any = await response.json();

      console.log('API response for enhancement:', {
        'itemName': item.name,
        'enhancedAddOns': enhanced.addOns,
        'enhancedAddOnsType': enhanced.addOns ? typeof enhanced.addOns[0] : 'null'
      });

      setMenuItems(prev => prev.map(i => 
        i.id === item.id
          ? {
              ...i,
              description: enhanced.description,
              protein: enhanced.macros.protein,
              carbs: enhanced.macros.carbs,
              fats: enhanced.macros.fats,
              add_ons: enhanced.addOns,
            }
          : i
      ));

      // Store enhanced version of image (same image but will be displayed with enhanced filters)
      if (item.image_url) {
        setEnhancedImages(prev => ({
          ...prev,
          [item.id]: item.image_url!,
        }));
      }

      // Auto-expand to show enhanced content
      setExpandedItems(prev => {
        const next = new Set(prev);
        next.add(item.id);
        return next;
      });
      
      toast({ 
        type: 'success', 
        title: `${item.name} enhanced with AI`, 
        description: 'AI-generated description, macros, and add-on suggestions are ready for review.',
      });
    } catch (error) {
      console.error('Error enhancing item:', error);
      toast({ type: 'error', title: 'Enhancement failed', description: 'Please try again in a moment.' });
    } finally {
      setEnhancingItemId(null);
    }
  };

  const handleSaveItem = async (item: MenuItem) => {
    setSavingItemId(item.id);

    try {
      const supabase: any = createClient();
      
      const { error } = await (supabase
        .from('menu_items')
        .update({
          description: item.description,
          protein: item.protein,
          carbs: item.carbs,
          fats: item.fats,
          add_ons: item.add_ons,
          approved: true,
        } as any)
        .eq('id', item.id) as unknown as Promise<{ error: any }>);
      if (error) throw error;

      setMenuItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, approved: true } : i
      ));
      toast({ type: 'success', title: `${item.name} saved`, description: 'Item approved and ready for publishing.' });
    } catch (error) {
      console.error('Error saving item:', error);
      toast({ type: 'error', title: 'Save failed', description: 'Please check the item details and retry.' });
    } finally {
      setSavingItemId(null);
    }
  };

  const handleImageUpload = async (itemId: string, file: File, autoEnhance = false) => {
    if (!file.type.startsWith('image/')) {
      toast({ type: 'error', title: 'Invalid file type', description: 'Only image files are supported.' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ type: 'error', title: 'File too large', description: 'Image must be under 10MB.' });
      return;
    }

    setUploadingItemId(itemId);
    try {
      const supabase: any = createClient();
      const fileExt = file.name.split('.').pop();
      // Use timestamp + random + counter to ensure truly unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      const counter = Math.floor(Math.random() * 1000);
      const fileName = `${restaurantId}/${itemId}-${timestamp}-${random}-${counter}.${fileExt}`;

      console.log('Uploading with unique filename:', fileName);

      // Upload with unique filename - should never conflict
      const { error: uploadError }: any = await supabase.storage
        .from('food-images')
        .upload(fileName, file, {
          contentType: file.type,
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful');

      const { data: urlData }: any = supabase.storage
        .from('food-images')
        .getPublicUrl(fileName);

      const { error: updateError }: any = await supabase
        .from('menu_items')
        .update({ image_url: urlData.publicUrl } as any)
        .eq('id', itemId);

      if (updateError) throw updateError;

      setMenuItems(prev => prev.map(i => 
        i.id === itemId ? { ...i, image_url: urlData.publicUrl } : i
      ));

      // Remove enhanced image when new image is uploaded (since it's a new base)
      setEnhancedImages(prev => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });

      // Auto-enhance if requested
      if (autoEnhance) {
        const item = menuItems.find(i => i.id === itemId);
        if (item) {
          toast({ type: 'success', title: 'Image updated', description: 'Enhancing with new image...' });
          await handleEnhanceItem({ ...item, image_url: urlData.publicUrl });
        }
      } else {
        toast({ type: 'success', title: 'Image uploaded', description: 'You can now run AI enhancement or upload again.' });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({ type: 'error', title: 'Upload failed', description: 'Please retry with another image.' });
    } finally {
      setUploadingItemId(null);
    }
  };

  const handleRemoveImage = async (itemId: string) => {
    const confirmed = window.confirm('Are you sure you want to remove this image? You will need to upload a new one.');
    if (!confirmed) return;

    try {
      const supabase: any = createClient();
      const existingItem = menuItems.find(i => i.id === itemId);
      
      // Delete from storage
      if (existingItem?.image_url) {
        const existingFileName = existingItem.image_url.split('/').pop();
        if (existingFileName) {
          await supabase.storage.from('food-images').remove([`${restaurantId}/${existingFileName}`]);
        }
      }

      // Update database
      await supabase
        .from('menu_items')
        .update({ image_url: null } as any)
        .eq('id', itemId);

      setMenuItems(prev => prev.map(i => 
        i.id === itemId ? { ...i, image_url: null } : i
      ));

      // Remove enhanced image
      setEnhancedImages(prev => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });

      toast({ type: 'success', title: 'Image removed', description: 'Upload a new image to enhance.' });
    } catch (error) {
      console.error('Error removing image:', error);
      toast({ type: 'error', title: 'Remove failed', description: 'Could not remove image.' });
    }
  };

  // Add new add-on item (no image required)
  const handleAddAddonItem = async (name: string, category: string, price: number) => {
    try {
      const supabase: any = createClient();
      
      const { data, error } = await supabase
        .from('menu_items')
        .insert({
          restaurant_id: restaurantId,
          name: name.trim(),
          category: category.trim(),
          price: price,
          is_addon: true,
          approved: false,
        })
        .select()
        .single();

      if (error) throw error;

      setMenuItems(prev => [...prev, data]);
      setShowAddItemModal(false);
      toast({ type: 'success', title: 'Add-on added', description: `${name} added. Enhance with AI to generate description and macros.` });
    } catch (error) {
      console.error('Error adding add-on:', error);
      toast({ type: 'error', title: 'Failed to add', description: 'Could not add the add-on item.' });
    }
  };

  // Enhance add-on item without image
  const handleEnhanceAddon = async (item: MenuItem) => {
    setEnhancingItemId(item.id);

    try {
      // Get all other menu items for add-on suggestions
      const otherMenuItems = menuItems
        .filter(i => i.id !== item.id)
        .map(i => ({ name: i.name, category: i.category, price: i.price }));

      const response = await fetch('/api/enhance-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: item.name,
          itemCategory: item.category,
          // No imageUrl - text only enhancement
          menuItems: otherMenuItems,
        }),
      });

      if (!response.ok) throw new Error('Enhancement failed');

      const enhanced: any = await response.json();

      setMenuItems(prev => prev.map(i => 
        i.id === item.id
          ? {
              ...i,
              description: enhanced.description,
              protein: enhanced.macros.protein,
              carbs: enhanced.macros.carbs,
              fats: enhanced.macros.fats,
              add_ons: enhanced.addOns,
            }
          : i
      ));

      // Auto-expand to show enhanced content
      setExpandedItems(prev => {
        const next = new Set(prev);
        next.add(item.id);
        return next;
      });
      
      toast({ 
        type: 'success', 
        title: `${item.name} enhanced`, 
        description: 'AI-generated description, macros, and add-on suggestions are ready for review.',
      });
    } catch (error) {
      console.error('Error enhancing add-on:', error);
      toast({ type: 'error', title: 'Enhancement failed', description: 'Please try again.' });
    } finally {
      setEnhancingItemId(null);
    }
  };

  // Bulk enhance all unapproved items
  const handleEnhanceAll = async () => {
    const unapprovedItems = menuItems.filter(item => !item.approved);
    if (unapprovedItems.length === 0) {
      toast({ type: 'info', title: 'No items to enhance', description: 'All items are already approved.' });
      return;
    }

    setBulkEnhancing(true);
    setBulkProgress({ current: 0, total: unapprovedItems.length });
    setBulkFailedItems([]);
    setBulkComplete(false);

    const failed: MenuItem[] = [];
    const enhanced: MenuItem[] = [];

    for (let i = 0; i < unapprovedItems.length; i++) {
      const item = unapprovedItems[i];
      setBulkProgress({ current: i + 1, total: unapprovedItems.length });

      try {
        // Get all menu items for add-on suggestions context
        const otherMenuItems = menuItems
          .filter(mi => mi.id !== item.id)
          .map(mi => ({ name: mi.name, category: mi.category, price: mi.price }));

        // Build request body - include imageUrl only if exists
        const requestBody: any = {
          itemName: item.name,
          itemCategory: item.category,
          menuItems: otherMenuItems,
        };
        if (item.image_url) {
          requestBody.imageUrl = item.image_url;
        }

        const response = await fetch('/api/enhance-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) throw new Error('Enhancement failed');

        const enhancedData: any = await response.json();

        // Update local state
        setMenuItems(prev => prev.map(mi => 
          mi.id === item.id
            ? {
                ...mi,
                description: enhancedData.description,
                protein: enhancedData.macros.protein,
                carbs: enhancedData.macros.carbs,
                fats: enhancedData.macros.fats,
                add_ons: enhancedData.addOns,
              }
            : mi
        ));

        // Track enhanced item with updated data
        enhanced.push({
          ...item,
          description: enhancedData.description,
          protein: enhancedData.macros.protein,
          carbs: enhancedData.macros.carbs,
          fats: enhancedData.macros.fats,
          add_ons: enhancedData.addOns,
        });

        // Auto-expand to show enhanced content
        setExpandedItems(prev => {
          const next = new Set(prev);
          next.add(item.id);
          return next;
        });

      } catch (error) {
        console.error(`Error enhancing item ${item.name}:`, error);
        failed.push(item);
      }
    }

    setBulkEnhancing(false);

    // If any failed, show failure UI
    if (failed.length > 0) {
      setBulkFailedItems(failed);
      toast({ 
        type: 'error', 
        title: `${failed.length} items failed`, 
        description: 'Review failed items and retry.',
      });
      return;
    }

    // All succeeded - show success message
    toast({ 
      type: 'success', 
      title: 'All items enhanced successfully', 
      description: 'Review and publish when ready.',
    });
  };

  const handlePublishAll = async () => {
    try {
      const supabase: any = createClient();

      // Batch approve all menu items for this restaurant
      const { data: items }: any = await supabase
        .from('menu_items')
        .select('id')
        .eq('restaurant_id', restaurantId);

      if (items) {
        for (const item of items) {
          const { error } = await supabase
            .from('menu_items')
            .update({ approved: true })
            .eq('id', item.id);
          
          if (error) throw error;
        }
      }

      // Publish restaurant
      const { error: publishError } = await supabase
        .from('restaurants')
        .update({ published: true })
        .eq('id', restaurantId);

      if (publishError) {
        console.error('Publish error details:', publishError);
        throw new Error(publishError.message);
      }

      toast({ type: 'success', title: 'Menu published successfully!' });
      // Redirect to publish page
      router.push(`/admin/publish/${restaurantId}`);
    } catch (error: any) {
      console.error('Publish error:', error);
      toast({ type: 'error', title: 'Publish failed', description: error.message || 'Please try again' });
    }
  };

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Unapprove menu item (remove from publication) - allows re-editing and re-approval
  const handleUnapproveItem = async (item: MenuItem) => {
    const confirmed = window.confirm(
      `Remove "${item.name}" from publication? This will allow you to edit and re-approve it.`
    );
    if (!confirmed) return;

    try {
      const supabase: any = createClient();

      // Set approved to false (unpublish)
      const { error } = await supabase
        .from('menu_items')
        .update({ approved: false })
        .eq('id', item.id);

      if (error) throw error;

      // Update local state
      setMenuItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, approved: false } : i
      ));

      toast({ type: 'success', title: 'Item unpublished', description: `${item.name} can now be edited and re-approved.` });
    } catch (error) {
      console.error('Error unapproving item:', error);
      toast({ type: 'error', title: 'Failed to unpublish', description: 'Could not remove item from publication.' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  const approvedCount = menuItems.filter(item => item.approved).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Enhance Menu: ${restaurantName}`}
        description="Upload food images and enhance items with AI. Each item can be enhanced and approved independently."
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-stone-700">Approval Progress</span>
            <span className="text-sm text-stone-600">
              {approvedCount} / {menuItems.length} items approved
            </span>
          </div>
          <div className="w-full bg-stone-200 rounded-full h-2 mb-4">
            <div
              className="bg-amber-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${menuItems.length > 0 ? (approvedCount / menuItems.length) * 100 : 0}%` }}
            />
          </div>
          
          {/* Bulk Enhancement UI */}
          {!bulkEnhancing && !bulkComplete && bulkFailedItems.length === 0 && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button
                onClick={handleEnhanceAll}
                disabled={menuItems.filter(i => !i.approved).length === 0}
                className="flex-1"
                variant="outline"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Enhance All Unapproved Items ({menuItems.filter(i => !i.approved).length})
              </Button>
              <Button
                onClick={handlePublishAll}
                className="flex-1"
                style={{ backgroundColor: '#16a34a', color: 'white', border: 'none' }}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Publish All
              </Button>
            </div>
          )}
          
          {/* Progress Indicator */}
          {bulkEnhancing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-600">
                  Enhancing item {bulkProgress.current} of {bulkProgress.total}...
                </span>
                <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
              </div>
              <div className="w-full bg-stone-200 rounded-full h-2">
                <div
                  className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Failed Items UI */}
          {bulkFailedItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-600">
                <span className="text-sm font-medium">
                  {bulkFailedItems.length} item{bulkFailedItems.length === 1 ? '' : 's'} failed to enhance
                </span>
              </div>
              <div className="text-sm text-stone-600">
                Failed items: {bulkFailedItems.map(i => i.name).join(', ')}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleEnhanceAll}
                  variant="outline"
                  className="flex-1"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Retry All
                </Button>
                <Button
                  onClick={() => setBulkFailedItems([])}
                  variant="ghost"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}
          
          {/* Completion UI */}
          {bulkComplete && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">
                  All items enhanced and published!
                </span>
              </div>
              <Button
                onClick={() => router.push(`/menu/${restaurantSlug}`)}
                className="w-full"
              >
                View Menu →
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {menuItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-stone-500">
              No menu items found. Items will appear here after menu extraction.
            </CardContent>
          </Card>
        ) : (
          menuItems.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      {item.approved && <CheckCircle className="h-5 w-5 text-green-600" />}
                    </div>
                    <p className="text-sm text-stone-500 mt-1">
                      {item.category} • {formatCurrencyWithDecimals(item.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => toggleExpand(item.id)}>
                      {expandedItems.has(item.id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleUnapproveItem(item)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expandedItems.has(item.id) && (
                <CardContent className="space-y-4">
                  {/* Image Upload Section */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">Food Image (Optional)</label>
                    {item.image_url ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 max-w-md">
                          <div className="relative group">
                            <div className="aspect-square rounded-lg overflow-hidden bg-stone-100 max-h-40">
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                style={{ filter: 'contrast(1.1) saturate(1.2) brightness(1.05)' }}
                              />
                            </div>
                            <div className="absolute -top-2 left-2 px-2 py-1 bg-stone-900 text-white text-xs font-semibold rounded">Original</div>
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center gap-2">
                              <label className="cursor-pointer">
                                <span className="text-white text-xs font-semibold flex items-center gap-1">
                                  <Upload className="h-3 w-3" /> Replace
                                </span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  disabled={uploadingItemId === item.id}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleImageUpload(item.id, file, true);
                                  }}
                                />
                              </label>
                              <button
                                onClick={() => handleRemoveImage(item.id)}
                                disabled={uploadingItemId === item.id}
                                className="text-white text-xs font-semibold flex items-center gap-1 hover:text-red-300 transition-colors"
                              >
                                <Trash2 className="h-3 w-3" /> Remove
                              </button>
                            </div>
                          </div>

                          <div className="relative group">
                            <div className="aspect-square rounded-lg overflow-hidden bg-stone-100 max-h-40">
                              {enhancedImages[item.id] ? (
                                <img
                                  src={enhancedImages[item.id]}
                                  alt={`${item.name} enhanced`}
                                  className="w-full h-full object-cover"
                                  style={{ filter: 'contrast(1.15) saturate(1.3) brightness(1.08)' }}
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 p-2 text-center">
                                  <Sparkles className="h-6 w-6 mb-2" />
                                  <span className="text-xs">Enhanced version</span>
                                </div>
                              )}
                            </div>
                            <div className="absolute -top-2 left-2 px-2 py-1 bg-amber-600 text-white text-xs font-semibold rounded flex items-center gap-1">
                              <Sparkles className="h-3 w-3" /> Enhanced
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={uploadingItemId === item.id}
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) handleImageUpload(item.id, file, false);
                              };
                              input.click();
                            }}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {uploadingItemId === item.id ? 'Uploading...' : 'Upload New'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-stone-300 rounded-lg p-4 text-center">
                        <Upload className="h-6 w-6 text-stone-400 mx-auto mb-2" />
                        <p className="text-sm text-stone-600 mb-2">Upload a food image (optional)</p>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingItemId === item.id}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(item.id, file, false);
                          }}
                          className="text-sm"
                        />
                        {uploadingItemId === item.id && (
                          <p className="mt-2 text-sm text-stone-500">Uploading image...</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Enhancement Buttons */}
                  {!item.description && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleEnhanceAddon(item)}
                        disabled={enhancingItemId === item.id}
                        className="flex-1"
                        variant="outline"
                      >
                        {enhancingItemId === item.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Enhancing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Enhance Description Only
                          </>
                        )}
                      </Button>
                      {item.image_url && (
                        <Button
                          onClick={() => handleEnhanceItem(item)}
                          disabled={enhancingItemId === item.id}
                          className="flex-1"
                        >
                          {enhancingItemId === item.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Enhancing...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Full AI Enhance
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}

                  {item.description && (
                    <div className="space-y-4 bg-stone-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-stone-200">
                        <Sparkles className="h-4 w-4 text-amber-600" />
                        <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">AI-Enhanced</span>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">
                          Description <span className="text-xs text-stone-500 font-normal">(Editable)</span>
                        </label>
                        <textarea
                          value={item.description || ''}
                          onChange={(e) => {
                            setMenuItems(prev => prev.map(i => 
                              i.id === item.id ? { ...i, description: e.target.value } : i
                            ));
                          }}
                          rows={3}
                          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          placeholder="AI-generated description..."
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-stone-700">Nutrition (Optional)</label>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-stone-600 mb-1">Protein (g)</label>
                            <input
                              type="number"
                              value={item.protein || ''}
                              onChange={(e) => {
                                setMenuItems(prev => prev.map(i => 
                                  i.id === item.id ? { ...i, protein: parseInt(e.target.value) || 0 } : i
                                ));
                              }}
                              className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-stone-600 mb-1">Carbs (g)</label>
                            <input
                              type="number"
                              value={item.carbs || ''}
                              onChange={(e) => {
                                setMenuItems(prev => prev.map(i => 
                                  i.id === item.id ? { ...i, carbs: parseInt(e.target.value) || 0 } : i
                                ));
                              }}
                              className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-stone-600 mb-1">Fats (g)</label>
                            <input
                              type="number"
                              value={item.fats || ''}
                              onChange={(e) => {
                                setMenuItems(prev => prev.map(i => 
                                  i.id === item.id ? { ...i, fats: parseInt(e.target.value) || 0 } : i
                                ));
                              }}
                              className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Add-on Suggestions</label>
                        <div className="space-y-2">
                          {(item.add_ons || []).map((addon: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={typeof addon === 'object' ? addon.name : addon}
                                onChange={(e) => {
                                  const newAddOns = [...(item.add_ons || [])];
                                  if (typeof newAddOns[idx] === 'object' && newAddOns[idx].price !== undefined) {
                                    newAddOns[idx] = { ...newAddOns[idx], name: e.target.value };
                                  } else {
                                    newAddOns[idx] = e.target.value;
                                  }
                                  setMenuItems(prev => prev.map(i => 
                                    i.id === item.id ? { ...i, add_ons: newAddOns } : i
                                  ));
                                }}
                                className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm"
                                placeholder={`Suggestion ${idx + 1}`}
                              />
                              {typeof addon === 'object' && addon.price && (
                                <span className="text-sm text-stone-600 whitespace-nowrap">Rs {addon.price}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button
                        onClick={() => handleSaveItem(item)}
                        disabled={savingItemId === item.id}
                        variant={item.approved ? 'secondary' : 'primary'}
                        className="w-full"
                      >
                        {savingItemId === item.id ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                        ) : item.approved ? (
                          '✓ Approved'
                        ) : (
                          'Save & Approve'
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))
        )}
        
        {/* Add New Item Card */}
        <Card className="border-dashed border-2 border-stone-300 bg-stone-50/50">
          <CardContent className="py-8">
            <div className="text-center">
              <div className="text-2xl font-semibold text-stone-700 mb-2">+ Add New Item</div>
              <p className="text-sm text-stone-500 mb-4">Add a new menu item without requiring an image</p>
              
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleAddAddonItem(
                    formData.get('name') as string,
                    formData.get('category') as string,
                    parseFloat(formData.get('price') as string) || 0
                  );
                  e.currentTarget.reset();
                }}
                className="space-y-3 max-w-md mx-auto text-left"
              >
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Item name (e.g., Garlic Sauce)"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <div className="flex gap-2">
                  <input
                    name="category"
                    type="text"
                    required
                    placeholder="Category"
                    className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <input
                    name="price"
                    type="number"
                    required
                    min="0"
                    step="1"
                    placeholder="Price (PKR)"
                    className="w-28 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <Button type="submit" variant="outline" className="w-full">
                  Add to Menu
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => router.push('/admin')}>
          Back to Dashboard
        </Button>
        <Button
          onClick={() => router.push(`/admin/publish/${restaurantId}`)}
          disabled={approvedCount === 0}
        >
          Continue to Publish →
        </Button>
      </div>
    </div>
  );
}
