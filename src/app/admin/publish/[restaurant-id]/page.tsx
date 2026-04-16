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
import { generateSlug } from '@/lib/utils';
import { CheckCircle, AlertCircle, Loader2, Download, ExternalLink, QrCode, Share2, Copy, Check } from 'lucide-react';
import QRCode from 'react-qr-code';

interface MenuItem {
  id: string;
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
}

interface Restaurant {
  id: string;
  name: string;
  contact: string;
  slug: string;
  published: boolean;
}

export default function PublishRestaurantPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const restaurantId = params['restaurant-id'] as string;
  
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [publicUrl, setPublicUrl] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchRestaurantData = useCallback(async () => {
    try {
      const supabase: any = createClient();
      
      const { data: restData }: any = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single();

      if (restData) {
        setRestaurant(restData);
        
        // Generate public URL if slug exists
        if (restData.slug) {
          const baseUrl = typeof window !== 'undefined'
            ? window.location.origin
            : 'https://your-domain.com';
          const url = `${baseUrl}/menu/${restData.slug}`;
          setPublicUrl(url);
          
          // If already published, show QR code immediately
          if (restData.published) {
            setShowQRCode(true);
          }
        }
      }

      const { data: items }: any = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('category, name');

      if (items) {
        setMenuItems(items);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ type: 'error', title: 'Could not load publish data' });
    } finally {
      setLoading(false);
    }
  }, [restaurantId, toast]);

  useEffect(() => {
    fetchRestaurantData();
  }, [fetchRestaurantData]);

  const handlePublish = async () => {
    const unapprovedCount = menuItems.filter(item => !item.approved).length;
    
    if (unapprovedCount > 0) {
      const confirm = window.confirm(
        `You have ${unapprovedCount} unapproved items. They won't be visible to customers. Continue?`
      );
      if (!confirm) return;
    }

    setPublishing(true);

    try {
      const supabase: any = createClient();
      
      // Ensure slug exists
      let slug = restaurant?.slug;
      if (!slug) {
        slug = generateSlug(restaurant!.name);
        // Make slug unique
        let counter = 1;
        while (true) {
          const { data: existing }: any = await supabase
            .from('restaurants')
            .select('id')
            .eq('slug', slug)
            .neq('id', restaurantId)
            .single();
          
          if (!existing) break;
          
          slug = `${generateSlug(restaurant!.name)}-${counter}`;
          counter++;
        }
      }

      // Update restaurant to published
      const { error }: any = await (supabase
        .from('restaurants')
        .update({
          published: true,
          slug: slug,
        } as any)
        .eq('id', restaurantId) as any);

      if (error) throw error;

      // Update local state
      setRestaurant(prev => prev ? { ...prev, published: true, slug: slug! } : null);
      
      // Generate public URL
      const baseUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : 'https://your-domain.com';
      const url = `${baseUrl}/menu/${slug}`;
      setPublicUrl(url);
      setShowQRCode(true);
      toast({ type: 'success', title: 'Menu published', description: 'Your QR code and live URL are ready.' });

    } catch (error) {
      console.error('Error publishing:', error);
      toast({ type: 'error', title: 'Publish failed', description: 'Please try again.' });
    } finally {
      setPublishing(false);
    }
  };

  const handleDownloadQRCode = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) {
      toast({ type: 'error', title: 'QR code not ready yet' });
      return;
    }

    // Get the SVG element
    const svgElement = svg.querySelector('svg');
    if (!svgElement) return;

    // Convert SVG to canvas
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size (higher resolution)
      const size = 1024;
      canvas.width = size;
      canvas.height = size;
      
      // White background
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw QR code centered
        const padding = 50;
        const qrSize = size - (padding * 2);
        ctx.drawImage(img, padding, padding, qrSize, qrSize);
        
        // Add restaurant name at bottom
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(restaurant?.name || '', size / 2, size - 30);
        
        // Download
        canvas.toDataURL('image/png');
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `${restaurant?.name || 'menu'}-qr-code.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        toast({ type: 'success', title: 'QR downloaded', description: 'PNG saved to your default downloads folder.' });
      }
      
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  const approvedCount = menuItems.filter(item => item.approved).length;
  const unapprovedCount = menuItems.length - approvedCount;
  const groupedItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Publish: ${restaurant?.name}`}
        description="Review your menu and publish to generate a shareable QR code"
      />

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-600">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-stone-900">{menuItems.length}</div>
          </CardContent>
        </Card>

        <Card className={unapprovedCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-600">Approved Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${unapprovedCount > 0 ? 'text-amber-900' : 'text-green-900'}`}>
              {approvedCount}
            </div>
            {unapprovedCount > 0 && (
              <p className="text-xs text-amber-700 mt-1">
                {unapprovedCount} items not approved
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-600">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-stone-900">{Object.keys(groupedItems).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Menu Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Menu Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {menuItems.length === 0 ? (
            <p className="text-stone-500 text-center py-8">No menu items found</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-lg font-semibold text-stone-900 mb-3 border-b pb-2">
                    {category}
                  </h3>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-start justify-between p-3 rounded-lg ${
                          item.approved ? 'bg-white' : 'bg-amber-50 opacity-75'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-stone-900">{item.name}</span>
                            {item.approved ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-amber-600" />
                            )}
                          </div>
                          <p className="text-sm text-stone-600 mt-1">
                            {item.description || 'No description'}
                          </p>
                          {item.protein !== null && (
                            <p className="text-xs text-stone-500 mt-1">
                              P: {item.protein}g • C: {item.carbs}g • F: {item.fats}g
                            </p>
                          )}
                        </div>
                        <span className="font-semibold text-stone-900">
                          {formatCurrencyWithDecimals(item.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Publish Actions */}
      <Card className={restaurant?.published ? 'bg-green-50 border-green-200' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {restaurant?.published ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Published</span>
              </>
            ) : (
              <>
                <QrCode className="h-5 w-5 text-amber-600" />
                <span>Ready to Publish</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!restaurant?.published ? (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-amber-900 mb-2">Before Publishing:</h4>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• Review all menu items for accuracy</li>
                  <li>• Ensure important items are approved</li>
                  <li>• Unapproved items won&apos;t be visible to customers</li>
                  <li>• You can update items after publishing</li>
                </ul>
              </div>

              <Button
                onClick={handlePublish}
                disabled={publishing || menuItems.length === 0}
                size="lg"
                className="w-full"
              >
                {publishing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Publish Menu
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              {showQRCode && publicUrl && (
                <>
                  {/* QR Code Display */}
                  <div className="flex flex-col items-center space-y-4 bg-white p-6 rounded-lg border">
                    <div id="qr-code-svg" className="p-4 bg-white">
                      <QRCode
                        value={publicUrl}
                        size={256}
                        level="H"
                      />
                    </div>
                    <p className="text-sm text-stone-600 text-center break-all">
                      {publicUrl}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      onClick={handleDownloadQRCode}
                      variant="primary"
                      size="lg"
                      className="w-full"
                    >
                      <Download className="h-5 w-5 mr-2" />
                      Download QR Code
                    </Button>

                    <Button
                      onClick={() => {
                        window.open(publicUrl, '_blank');
                        toast({ type: 'info', title: 'Opened live menu', description: 'Preview opened in a new tab.' });
                      }}
                      variant="outline"
                      size="lg"
                      className="w-full"
                    >
                      <ExternalLink className="h-5 w-5 mr-2" />
                      View Live Menu
                    </Button>
                  </div>

                  {/* Share Buttons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      onClick={() => {
                        const shareText = `Scan our menu here: ${publicUrl}`;
                        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
                        window.open(whatsappUrl, '_blank');
                      }}
                      variant="outline"
                      size="lg"
                      className="w-full"
                    >
                      <Share2 className="h-5 w-5 mr-2" />
                      Share on WhatsApp
                    </Button>

                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(publicUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                        toast({ type: 'success', title: 'Copied!', description: 'Menu link copied to clipboard.' });
                      }}
                      variant="outline"
                      size="lg"
                      className="w-full"
                    >
                      {copied ? (
                        <>
                          <Check className="h-5 w-5 mr-2 text-green-600" />
                          <span className="text-green-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-5 w-5 mr-2" />
                          Copy Link
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Pro Tips:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Print the QR code for table placement</li>
                      <li>• Share the URL on social media</li>
                      <li>• Add to your website for online ordering</li>
                      <li>• Test scan with multiple phone cameras</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={() => router.push('/admin/enhance/' + restaurantId)}
        >
          ← Back to Enhancement
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push('/admin')}
        >
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
