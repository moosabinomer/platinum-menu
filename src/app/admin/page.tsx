import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { PlusCircle, UtensilsCrossed, Eye, Settings } from 'lucide-react';

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient();
  
  // Fetch restaurants count
  const { count: restaurantCount } = await supabase
    .from('restaurants')
    .select('*', { count: 'exact', head: true });

  // Fetch menu items count
  const { count: menuItemCount } = await supabase
    .from('menu_items')
    .select('*', { count: 'exact', head: true });

  // Fetch published restaurants
  const { data: publishedRestaurants } = await supabase
    .from('restaurants')
    .select('id, name, slug, published')
    .eq('published', true) as { data: Array<{ id: string; name: string; slug: string; published: boolean }> | null };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-stone-900">Dashboard</h2>
          <p className="text-stone-600 mt-1">Manage your restaurants and menus</p>
        </div>
        <Link href="/admin/new-restaurant">
          <Button size="lg">
            <PlusCircle className="h-5 w-5 mr-2" />
            Add Restaurant
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
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
              {restaurantCount || 0}
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Active in the system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-600">
              Menu Items
            </CardTitle>
            <Settings className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-stone-900">
              {menuItemCount || 0}
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Across all restaurants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-600">
              Published Menus
            </CardTitle>
            <Eye className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-stone-900">
              {publishedRestaurants?.length || 0}
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Live and accessible
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Create</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-stone-700">
              Add a new restaurant to the system
            </p>
            <Link href="/admin/new-restaurant" className="block">
              <Button variant="primary" className="w-full">
                <PlusCircle className="h-4 w-4 mr-2" />
                New Restaurant
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-stone-700">
              View and manage all restaurants
            </p>
            <Link href="/admin/restaurants" className="block">
              <Button variant="outline" className="w-full">
                <UtensilsCrossed className="h-4 w-4 mr-2" />
                All Restaurants
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-stone-700">
              <li>Add a new restaurant with basic info</li>
              <li>Upload menu images for AI extraction</li>
              <li>Enhance items with AI descriptions</li>
              <li>Publish and generate QR codes</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Published Menus</CardTitle>
          </CardHeader>
          <CardContent>
            {publishedRestaurants && publishedRestaurants.length > 0 ? (
              <ul className="space-y-2">
                {publishedRestaurants.map((restaurant) => (
                  <li key={restaurant.id} className="flex items-center justify-between p-2 bg-stone-50 rounded">
                    <span className="text-stone-900">{restaurant.name}</span>
                    <Link
                      href={`/menu/${restaurant.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        View Menu
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-stone-500 text-sm">
                No published menus yet. Create a restaurant to get started.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
