/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { generateSlug } from '@/lib/utils';
import { extractThemeColors } from '@/lib/color-extraction';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { PageHeader } from '@/components/admin/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { UtensilsCrossed, Upload, Loader2 } from 'lucide-react';
import type { BrandConfig } from '@/app/api/extract-menu/route';

export default function NewRestaurantPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [menuFile, setMenuFile] = useState<File | null>(null);
  const [menuPreview, setMenuPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors((prev) => ({ ...prev, menuFile: 'Please upload an image file (PNG/JPG/WEBP)' }));
        toast({ type: 'error', title: 'Invalid file type', description: 'Only image files are supported.' });
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, menuFile: 'File size must be less than 10MB' }));
        toast({ type: 'error', title: 'File too large', description: 'Please upload an image under 10MB.' });
        return;
      }

      setMenuFile(file);
      setErrors((prev) => {
        const next = { ...prev };
        delete next.menuFile;
        return next;
      });
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setMenuPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!formData.name.trim()) nextErrors.name = 'Restaurant name is required';
    if (!formData.contact.trim()) nextErrors.contact = 'Contact information is required';
    if (!menuFile) nextErrors.menuFile = 'Menu image is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!menuFile) return;

    setLoading(true);
    console.log('=== STARTING RESTAURANT CREATION ===');

    try {
      const supabase: any = createClient();
      console.log('Supabase client created');

      // Generate unique slug
      const baseSlug = generateSlug(formData.name);
      let slug = baseSlug;
      let counter = 1;
      
      // Check if slug exists and make it unique
      while (true) {
        const { data: existing } = await supabase
          .from('restaurants')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();
        
        if (!existing) break;
        
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Extract theme colors from menu image
      let themeColors: string[] | null = null;
      try {
        themeColors = await extractThemeColors(menuFile);
        console.log('Extracted theme colors:', themeColors);
      } catch (colorError) {
        console.warn('Failed to extract theme colors:', colorError);
        // Continue without theme colors if extraction fails
      }

      // Create restaurant record
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .insert({
          name: formData.name,
          contact: formData.contact,
          slug: slug,
          published: false,
          theme_colors: themeColors,
          cuisine_type: 'other', // Will be updated with AI-extracted value
        })
        .select()
        .single() as { data: { id: string; name: string; slug: string } | null; error: unknown };

      if (restaurantError) throw restaurantError;
      if (!restaurant) throw new Error('Failed to create restaurant');

      // Upload menu image to Supabase Storage using server-side API
      const uploadFormData = new FormData();
      uploadFormData.append('file', menuFile);
      uploadFormData.append('path', `${restaurant.id}-menu.${menuFile.name.split('.').pop()}`);
      
      const uploadResponse = await fetch('/api/upload-file', {
        method: 'POST',
        body: uploadFormData,
      });
      
      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.json();
        throw new Error(uploadError.error || 'Upload failed');
      }
      
      const uploadData = await uploadResponse.json();
      const imageUrl = uploadData.publicUrl;

      // Extract menu items with AI (pass the uploaded image URL)
      const extractionFormData = new FormData();
      extractionFormData.append('menu', menuFile);
      const extractionResponse = await fetch('/api/extract-menu', {
        method: 'POST',
        body: extractionFormData,
      });

      if (!extractionResponse.ok) {
        throw new Error('Menu extracted failed. Please verify your Gemini API setup.');
      }

      const extractionData = await extractionResponse.json() as {
        items?: Array<{ name: string; category: string; price: number }>;
        brandConfig?: BrandConfig;
        menuVibe?: string;
      };

      const extractedItems = (extractionData.items ?? [])
        .filter((item) => item.name && item.category && Number.isFinite(item.price))
        .map((item) => ({
          restaurant_id: restaurant.id,
          name: item.name.trim(),
          category: item.category.trim(),
          price: Number(item.price) || 0,
          approved: false,
        }));

      // Prepare brand config with primary color from theme colors
      const brandConfig = extractionData.brandConfig;
      const menuVibe = extractionData.menuVibe || 'warm_luxury';
      
      if (brandConfig && themeColors && themeColors.length > 0) {
        const brandConfigWithColor = {
          ...brandConfig,
          primary_color: themeColors[0],
        };

        // Update restaurant record with brand config and menu vibe
        const { error: updateError } = await supabase
          .from('restaurants')
          .update({ 
            brand_config: brandConfigWithColor,
            menu_vibe: menuVibe,
          })
          .eq('id', restaurant.id);
        
        if (updateError) {
          console.warn('Failed to save brand config:', updateError);
        }
      } else if (brandConfig) {
        // Update without primary color if theme colors not available
        const { error: updateError } = await supabase
          .from('restaurants')
          .update({ 
            brand_config: brandConfig,
            menu_vibe: menuVibe,
          })
          .eq('id', restaurant.id);
        
        if (updateError) {
          console.warn('Failed to save brand config:', updateError);
        }
      } else if (menuVibe) {
        // Update just menu_vibe if no brand config
        const { error: updateError } = await supabase
          .from('restaurants')
          .update({ menu_vibe: menuVibe })
          .eq('id', restaurant.id);
        
        if (updateError) {
          console.warn('Failed to save menu vibe:', updateError);
        }
      }

      if (extractedItems.length > 0) {
        const { error: insertItemsError } = await supabase.from('menu_items').insert(extractedItems);
        if (insertItemsError) throw insertItemsError;
      }

      // Redirect to enhance page
      toast({
        type: 'success',
        title: 'Restaurant created',
        description: `Extracted ${extractedItems.length} menu item${extractedItems.length === 1 ? '' : 's'}.`,
      });
      router.push(`/admin/enhance/${restaurant.id}`);
      
    } catch (error) {
      console.error('Error creating restaurant:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error details:', errorMessage);
      toast({
        type: 'error',
        title: 'Creation failed',
        description: `${errorMessage}. Check browser console for details.`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Add New Restaurant"
        description="Enter restaurant details and upload the menu for AI extraction"
      />

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Restaurant Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Restaurant Name */}
            <Input
              label="Restaurant Name *"
              placeholder="e.g., The Golden Spoon"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              error={errors.name}
              disabled={loading}
            />

            {/* Contact Info */}
            <Input
              label="Contact Information *"
              placeholder="Email or phone number"
              value={formData.contact}
              onChange={(e) => handleInputChange('contact', e.target.value)}
              error={errors.contact}
              disabled={loading}
            />

            {/* Menu Upload */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Menu Image *
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-stone-300 border-dashed rounded-lg hover:border-amber-500 transition-colors">
                <div className="space-y-1 text-center">
                  {menuPreview ? (
                    <div className="space-y-4">
                      <img
                        src={menuPreview}
                        alt="Menu preview"
                        className="mx-auto max-h-64 rounded-lg shadow-md"
                      />
                      <div className="flex justify-center space-x-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setMenuFile(null);
                            setMenuPreview(null);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto h-12 w-12 text-stone-400" />
                      <div className="flex text-sm text-stone-600 justify-center">
                        <label className="relative cursor-pointer rounded-md font-medium text-amber-600 hover:text-amber-500">
                          <span>Upload a file</span>
                          <input
                            type="file"
                            className="sr-only"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            onChange={handleFileChange}
                            disabled={loading}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-stone-500">
                        PNG, JPG, WEBP up to 10MB
                      </p>
                    </>
                  )}
                </div>
              </div>
              {errors.menuFile && <p className="mt-2 text-sm text-red-600">{errors.menuFile}</p>}
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading || !formData.name || !formData.contact || !menuFile}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UtensilsCrossed className="h-5 w-5 mr-2" />
                    Create Restaurant
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <UtensilsCrossed className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-900">What happens next?</h4>
              <ul className="mt-2 text-sm text-amber-800 space-y-1">
                <li>• Your restaurant will be created with the details provided</li>
                <li>• The menu image will be uploaded to secure storage</li>
                <li>• You&apos;ll be redirected to the enhancement page</li>
                <li>• AI will extract menu items from your image</li>
                <li>• You can then enhance each item with descriptions and macros</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
