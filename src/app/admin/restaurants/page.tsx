'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { PageHeader } from '@/components/admin/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { PlusCircle, Edit, Trash2, Eye, ExternalLink, UtensilsCrossed, QrCode, Loader2 } from 'lucide-react';

interface Restaurant {
  id: string;
  name: string;
  contact: string;
  slug: string;
  published: boolean;
  created_at: string;
}

export default function RestaurantsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  const fetchRestaurants = useCallback(async () => {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setRestaurants(data);
      }
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      toast({ 
        type: 'error', 
        title: 'Could not load restaurants',
        description: 'Please refresh the page and try again.'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const handleDelete = async (restaurantId: string, restaurantName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${restaurantName}"? This action cannot be undone and will delete all associated menu items.`
    );

    if (!confirmed) return;

    setDeletingId(restaurantId);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', restaurantId);

      if (error) {
        console.error('Delete failed:', error);
        alert('Failed to delete: ' + error.message);
        return;
      }

      setRestaurants(prev => prev.filter(r => r.id !== restaurantId));
      toast({
        type: 'success',
        title: 'Restaurant deleted',
        description: `"${restaurantName}" has been removed.`
      });
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      alert('Failed to delete: ' + errorMsg);
      toast({
        type: 'error',
        title: 'Deletion failed',
        description: 'Please try again or contact support.'
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Restaurants"
        description="Manage all your restaurants and their menus"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-600">
              Total Restaurants
            </CardTitle>
            <UtensilsCrossed className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-stone-900">
              {restaurants.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-600">
              Published
            </CardTitle>
            <QrCode className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">
              {restaurants.filter(r => r.published).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-600">
              Draft
            </CardTitle>
            <Eye className="h-4 w-4 text-stone-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-stone-900">
              {restaurants.filter(r => !r.published).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-stone-600">
            {restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''} in the system
          </p>
        </div>
        <Button onClick={() => router.push('/admin/new-restaurant')}>
          <PlusCircle className="h-5 w-5 mr-2" />
          Add Restaurant
        </Button>
      </div>

      {/* Restaurants List */}
      {restaurants.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UtensilsCrossed className="h-12 w-12 text-stone-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-stone-900 mb-2">No restaurants yet</h3>
            <p className="text-stone-600 mb-6">Get started by creating your first restaurant.</p>
            <Button onClick={() => router.push('/admin/new-restaurant')}>
              <PlusCircle className="h-5 w-5 mr-2" />
              Create Restaurant
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {restaurants.map((restaurant) => (
            <Card key={restaurant.id} className={restaurant.published ? 'border-green-200 bg-green-50/50' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-xl">{restaurant.name}</CardTitle>
                      {restaurant.published && (
                        <span className="px-2 py-1 bg-green-600 text-white text-xs font-semibold rounded-full">
                          Published
                        </span>
                      )}
                      {!restaurant.published && (
                        <span className="px-2 py-1 bg-stone-600 text-white text-xs font-semibold rounded-full">
                          Draft
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-stone-600">
                      <span className="flex items-center gap-1">
                        <ExternalLink className="h-4 w-4" />
                        {restaurant.slug ? `/menu/${restaurant.slug}` : 'No slug'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3 pt-4 border-t">
                  {/* Enhance Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/admin/enhance/${restaurant.id}`)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Enhance
                  </Button>

                  {/* Publish Button */}
                  <Button
                    variant={restaurant.published ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={() => router.push(`/admin/publish/${restaurant.id}`)}
                  >
                    {restaurant.published ? (
                      <>
                        <QrCode className="h-4 w-4 mr-2" />
                        Update
                      </>
                    ) : (
                      <>
                        <QrCode className="h-4 w-4 mr-2" />
                        Publish
                      </>
                    )}
                  </Button>

                  {/* View QR Button - only for published restaurants */}
                  {restaurant.published && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/admin/publish/${restaurant.id}`)}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      View QR
                    </Button>
                  )}

                  {/* View Menu Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!restaurant.published || !restaurant.slug}
                    onClick={() => {
                      if (restaurant.slug) {
                        window.open(`/menu/${restaurant.slug}`, '_blank');
                      }
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Menu
                  </Button>

                  {/* Edit Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // For now, redirect to enhance page as edit
                      // Could be extended to have a dedicated edit page
                      router.push(`/admin/enhance/${restaurant.id}`);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Details
                  </Button>

                  {/* Delete Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deletingId === restaurant.id}
                    onClick={() => handleDelete(restaurant.id, restaurant.name)}
                    className="ml-auto text-red-600 hover:text-red-700 hover:border-red-300"
                  >
                    {deletingId === restaurant.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => router.push('/admin')}>
          ← Back to Dashboard
        </Button>
        <Button onClick={() => router.push('/admin/new-restaurant')}>
          <PlusCircle className="h-5 w-5 mr-2" />
          Add New Restaurant
        </Button>
      </div>
    </div>
  );
}
