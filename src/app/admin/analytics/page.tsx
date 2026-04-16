'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BarChart, TrendingUp, Eye, Package, DollarSign, Users, Download } from 'lucide-react';

interface Restaurant {
  id: string;
  name: string;
}

interface AnalyticsData {
  menuViews: number;
  itemViews: number;
  mostViewedItem: { name: string; count: number } | null;
  topItems: Array<{
    id: string;
    name: string;
    category: string;
    views: number;
  }>;
  upsellValue: number;
  contactsCollected: number;
}

interface Contact {
  id: string;
  whatsapp_number: string;
  created_at: string;
}

interface BehaviorData {
  topItemsByInterest: Array<{
    id: string;
    name: string;
    openCount: number;
  }>;
  avgDwellTime: Array<{
    id: string;
    name: string;
    avgDwellSeconds: number;
  }>;
  topUpsellPairs: Array<{
    parentItem: string;
    addonItem: string;
    pairCount: number;
  }>;
  returningCustomers: number;
}

type DateRange = 'week' | 'month' | 'all';

export default function AnalyticsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [data, setData] = useState<AnalyticsData>({
    menuViews: 0,
    itemViews: 0,
    mostViewedItem: null,
    topItems: [],
    upsellValue: 0,
    contactsCollected: 0,
  });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [behavior, setBehavior] = useState<BehaviorData>({
    topItemsByInterest: [],
    avgDwellTime: [],
    topUpsellPairs: [],
    returningCustomers: 0,
  });
  const [loading, setLoading] = useState(true);

  // Fetch restaurants on mount
  useEffect(() => {
    const fetchRestaurants = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('restaurants')
        .select('id, name')
        .order('name') as { data: Restaurant[] | null };
      
      if (data) {
        setRestaurants(data);
        if (data.length > 0) {
          setSelectedRestaurant(data[0].id);
        }
      }
      setLoading(false);
    };

    fetchRestaurants();
  }, []);

  // Fetch analytics when selection changes
  useEffect(() => {
    if (!selectedRestaurant) return;

    const fetchAnalytics = async () => {
      const supabase = createClient();

      // Calculate date range
      let startDate: string | null = null;
      const now = new Date();
      
      if (dateRange === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString();
      } else if (dateRange === 'month') {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        startDate = monthAgo.toISOString();
      }

      // Build query for menu views
      let menuViewsQuery = supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', selectedRestaurant)
        .eq('event_type', 'menu_view');

      if (startDate) {
        menuViewsQuery = menuViewsQuery.gte('created_at', startDate);
      }

      const { count: menuViews } = await menuViewsQuery;

      // Build query for item views
      let itemViewsQuery = supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', selectedRestaurant)
        .eq('event_type', 'item_view');

      if (startDate) {
        itemViewsQuery = itemViewsQuery.gte('created_at', startDate);
      }

      const { count: itemViews } = await itemViewsQuery;

      // Fetch item view details with names
      let itemDetailsQuery = supabase
        .from('analytics_events')
        .select('menu_item_id, menu_items(name, category, add_ons, price)')
        .eq('restaurant_id', selectedRestaurant)
        .eq('event_type', 'item_view');

      if (startDate) {
        itemDetailsQuery = itemDetailsQuery.gte('created_at', startDate);
      }

      const { data: itemEvents } = await itemDetailsQuery;

      // Fetch contacts for this restaurant
      let contactsQuery = supabase
        .from('customer_contacts')
        .select('id, whatsapp_number, created_at')
        .eq('restaurant_id', selectedRestaurant)
        .order('created_at', { ascending: false });

      if (startDate) {
        contactsQuery = contactsQuery.gte('created_at', startDate);
      }

      const { data: contactsData } = await contactsQuery;
      const contactsList = (contactsData || []) as Contact[];
      setContacts(contactsList);

      // Fetch behavior insights - item detail open events
      let itemDetailOpenQuery = supabase
        .from('analytics_events')
        .select('menu_item_id, menu_items(name)')
        .eq('restaurant_id', selectedRestaurant)
        .eq('event_type', 'item_detail_open');
      if (startDate) itemDetailOpenQuery = itemDetailOpenQuery.gte('created_at', startDate);
      const { data: detailOpenEvents } = await itemDetailOpenQuery;

      // Fetch item detail close events with dwell time
      let itemDetailCloseQuery = supabase
        .from('analytics_events')
        .select('menu_item_id, menu_items(name), dwell_ms')
        .eq('restaurant_id', selectedRestaurant)
        .eq('event_type', 'item_detail_close')
        .gt('dwell_ms', 5000); // Filter > 5 seconds
      if (startDate) itemDetailCloseQuery = itemDetailCloseQuery.gte('created_at', startDate);
      const { data: detailCloseEvents } = await itemDetailCloseQuery;

      // Fetch addon tap events with parent item context
      let addonTapQuery = supabase
        .from('analytics_events')
        .select('menu_item_id, parent_item_id, menu_items!analytics_events_menu_item_id_fkey(name), parent:menu_items!analytics_events_parent_item_id_fkey(name)')
        .eq('restaurant_id', selectedRestaurant)
        .eq('event_type', 'addon_tap');
      if (startDate) addonTapQuery = addonTapQuery.gte('created_at', startDate);
      const { data: addonTapEvents } = await addonTapQuery;

      // Calculate returning customers (sessions on 2+ different dates)
      let sessionsQuery = supabase
        .from('analytics_events')
        .select('session_id, created_at')
        .eq('restaurant_id', selectedRestaurant)
        .not('session_id', 'is', null);
      if (startDate) sessionsQuery = sessionsQuery.gte('created_at', startDate);
      const { data: sessionEvents } = await sessionsQuery;

      // Process behavior data
      // Top items by interest (item_detail_open)
      const openCounts: Record<string, { name: string; count: number }> = {};
      detailOpenEvents?.forEach((event: any) => {
        if (!event.menu_item_id || !event.menu_items) return;
        const id = event.menu_item_id;
        if (!openCounts[id]) {
          openCounts[id] = { name: event.menu_items.name, count: 0 };
        }
        openCounts[id].count++;
      });
      const topItemsByInterest = Object.entries(openCounts)
        .map(([id, item]) => ({ id, name: item.name, openCount: item.count }))
        .sort((a, b) => b.openCount - a.openCount)
        .slice(0, 10);

      // Average dwell time per item
      const dwellSums: Record<string, { name: string; totalDwell: number; count: number }> = {};
      detailCloseEvents?.forEach((event: any) => {
        if (!event.menu_item_id || !event.menu_items || !event.dwell_ms) return;
        const id = event.menu_item_id;
        if (!dwellSums[id]) {
          dwellSums[id] = { name: event.menu_items.name, totalDwell: 0, count: 0 };
        }
        dwellSums[id].totalDwell += event.dwell_ms;
        dwellSums[id].count++;
      });
      const avgDwellTime = Object.entries(dwellSums)
        .map(([id, item]) => ({
          id,
          name: item.name,
          avgDwellSeconds: Math.round((item.totalDwell / item.count / 1000) * 10) / 10,
        }))
        .sort((a, b) => b.avgDwellSeconds - a.avgDwellSeconds)
        .slice(0, 10);

      // Calculate top upsell pairs (parent item + addon)
      const pairCounts: Record<string, { parentItem: string; addonItem: string; pairCount: number }> = {};
      addonTapEvents?.forEach((event: any) => {
        if (!event.menu_item_id || !event.parent_item_id || !event.menu_items || !event.parent) return;
        const parentName = event.parent.name;
        const addonName = event.menu_items.name;
        const pairKey = `${parentName}|${addonName}`;
        if (!pairCounts[pairKey]) {
          pairCounts[pairKey] = { parentItem: parentName, addonItem: addonName, pairCount: 0 };
        }
        pairCounts[pairKey].pairCount++;
      });
      const topUpsellPairs = Object.entries(pairCounts)
        .map(([_, pair]) => pair)
        .sort((a, b) => b.pairCount - a.pairCount)
        .slice(0, 10);

      // Calculate returning customers (sessions on 2+ different dates)
      const sessionDates: Record<string, Set<string>> = {};
      sessionEvents?.forEach((event: any) => {
        if (!event.session_id || !event.created_at) return;
        const sessionId = event.session_id;
        const date = event.created_at.split('T')[0];
        if (!sessionDates[sessionId]) sessionDates[sessionId] = new Set();
        sessionDates[sessionId].add(date);
      });
      const returningCustomers = Object.values(sessionDates).filter(dates => dates.size >= 2).length;

      setBehavior({
        topItemsByInterest,
        avgDwellTime,
        topUpsellPairs,
        returningCustomers,
      });

      // Calculate top items and most viewed
      const itemCounts: Record<string, { name: string; category: string; count: number; addOns?: any[]; price?: number }> = {};
      let totalUpsellValue = 0;

      itemEvents?.forEach((event: any) => {
        if (!event.menu_item_id || !event.menu_items) return;
        
        const itemId = event.menu_item_id;
        const item = event.menu_items;
        
        if (!itemCounts[itemId]) {
          itemCounts[itemId] = {
            name: item.name,
            category: item.category,
            count: 0,
            addOns: item.add_ons,
            price: item.price,
          };
        }
        itemCounts[itemId].count++;

        // Calculate upsell value for this item view
        if (item.add_ons && Array.isArray(item.add_ons) && item.add_ons.length > 0) {
          const addOnPrices = item.add_ons.map((addon: any) => {
            if (typeof addon === 'string') return 0;
            return addon.price || 0;
          });
          const avgAddOnValue = addOnPrices.reduce((a: number, b: number) => a + b, 0) / addOnPrices.length;
          totalUpsellValue += avgAddOnValue;
        }
      });

      const sortedItems = Object.entries(itemCounts)
        .map(([id, item]) => ({
          id,
          name: item.name,
          category: item.category,
          views: item.count,
        }))
        .sort((a, b) => b.views - a.views);

      const mostViewed = sortedItems.length > 0 
        ? { name: sortedItems[0].name, count: sortedItems[0].views }
        : null;

      setData({
        menuViews: menuViews || 0,
        itemViews: itemViews || 0,
        mostViewedItem: mostViewed,
        topItems: sortedItems.slice(0, 10),
        upsellValue: Math.round(totalUpsellValue),
        contactsCollected: contactsList.length,
      });
    };

    fetchAnalytics();
  }, [selectedRestaurant, dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-stone-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-stone-900">Analytics</h2>
          <p className="text-stone-600 mt-1">Track menu performance and customer engagement</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Restaurant Selector */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Select Restaurant
          </label>
          <select
            value={selectedRestaurant}
            onChange={(e) => setSelectedRestaurant(e.target.value)}
            className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            {restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>
                {restaurant.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Selector */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Date Range
          </label>
          <div className="flex rounded-lg border border-stone-300 bg-white p-1">
            {(['week', 'month', 'all'] as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-amber-100 text-amber-900'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {range === 'week' && 'This Week'}
                {range === 'month' && 'This Month'}
                {range === 'all' && 'All Time'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-600">
              Total Menu Views
            </CardTitle>
            <Eye className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-stone-900">
              {data.menuViews.toLocaleString()}
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Menu page loads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-600">
              Total Item Views
            </CardTitle>
            <Package className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-stone-900">
              {data.itemViews.toLocaleString()}
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Item detail views
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-600">
              Most Viewed Item
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-stone-900 truncate">
              {data.mostViewedItem?.name || 'N/A'}
            </div>
            <p className="text-xs text-stone-500 mt-1">
              {data.mostViewedItem ? `${data.mostViewedItem.count} views` : 'No data'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-600">
              Upsell Exposure
            </CardTitle>
            <BarChart className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-stone-900">
              {data.itemViews.toLocaleString()}
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Add-ons shown to customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-600">
              Contacts Collected
            </CardTitle>
            <Users className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-stone-900">
              {data.contactsCollected.toLocaleString()}
            </div>
            <p className="text-xs text-stone-500 mt-1">
              WhatsApp numbers saved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Items</CardTitle>
          <p className="text-sm text-stone-500">Most viewed menu items</p>
        </CardHeader>
        <CardContent>
          {data.topItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-stone-600">
                      Item Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-stone-600">
                      Category
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-stone-600">
                      Views
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-stone-600">
                      Add-ons Shown
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.topItems.map((item) => (
                    <tr key={item.id} className="border-b border-stone-100 last:border-0">
                      <td className="py-3 px-4 text-sm text-stone-900">{item.name}</td>
                      <td className="py-3 px-4 text-sm text-stone-600">{item.category}</td>
                      <td className="py-3 px-4 text-sm text-stone-900 text-right font-medium">
                        {item.views.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-stone-600 text-right">
                        {item.views.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-stone-500">
              No item views recorded yet. Start sharing your menu to collect data.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estimated Upsell Value */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Estimated Upsell Value</CardTitle>
            <p className="text-sm text-stone-500 mt-1">
              Potential revenue from add-on exposure
            </p>
          </div>
          <DollarSign className="h-8 w-8 text-amber-600" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-stone-900">
              Rs {data.upsellValue.toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-3">
            Based on add-on prices shown to customers this period. 
            Calculated from the average value of add-ons displayed with each item view.
          </p>
        </CardContent>
      </Card>

      {/* Customer Behavior Insights */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-stone-900">Customer Behavior Insights</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Items by Interest */}
          <Card>
            <CardHeader>
              <CardTitle>Top Items by Interest</CardTitle>
              <p className="text-sm text-stone-500">Most opened detail sheets</p>
            </CardHeader>
            <CardContent>
              {behavior.topItemsByInterest.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-stone-200">
                        <th className="text-left py-2 px-3 text-sm font-medium text-stone-600">Item Name</th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-stone-600">Opens</th>
                      </tr>
                    </thead>
                    <tbody>
                      {behavior.topItemsByInterest.map((item) => (
                        <tr key={item.id} className="border-b border-stone-100 last:border-0">
                          <td className="py-2 px-3 text-sm text-stone-900">{item.name}</td>
                          <td className="py-2 px-3 text-sm text-stone-900 text-right font-medium">
                            {item.openCount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-stone-500">No detail sheet opens recorded yet.</div>
              )}
            </CardContent>
          </Card>

          {/* Average Dwell Time */}
          <Card>
            <CardHeader>
              <CardTitle>Avg Dwell Time per Item</CardTitle>
              <p className="text-sm text-stone-500">Items with 5+ seconds attention</p>
            </CardHeader>
            <CardContent>
              {behavior.avgDwellTime.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-stone-200">
                        <th className="text-left py-2 px-3 text-sm font-medium text-stone-600">Item Name</th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-stone-600">Avg Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {behavior.avgDwellTime.map((item) => (
                        <tr key={item.id} className="border-b border-stone-100 last:border-0">
                          <td className="py-2 px-3 text-sm text-stone-900">{item.name}</td>
                          <td className="py-2 px-3 text-sm text-stone-900 text-right font-medium">
                            {item.avgDwellSeconds}s
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-stone-500">No dwell time data yet (min 5s).</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Upsell Pairs */}
          <Card>
            <CardHeader>
              <CardTitle>Top Upsell Pairs</CardTitle>
              <p className="text-sm text-stone-500">Main item + Add-on combinations</p>
            </CardHeader>
            <CardContent>
              {behavior.topUpsellPairs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-stone-200">
                        <th className="text-left py-2 px-3 text-sm font-medium text-stone-600">Main Item</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-stone-600">Add-on</th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-stone-600">Times Paired</th>
                      </tr>
                    </thead>
                    <tbody>
                      {behavior.topUpsellPairs.map((pair, idx) => (
                        <tr key={idx} className="border-b border-stone-100 last:border-0">
                          <td className="py-2 px-3 text-sm text-stone-900 font-medium">{pair.parentItem}</td>
                          <td className="py-2 px-3 text-sm text-stone-600">{pair.addonItem}</td>
                          <td className="py-2 px-3 text-sm text-stone-900 text-right font-medium">
                            {pair.pairCount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-stone-500">No upsell pairs recorded yet.</div>
              )}
            </CardContent>
          </Card>

          {/* Returning Customers */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Returning Customers</CardTitle>
                <p className="text-sm text-stone-500 mt-1">Repeat visitors this period</p>
              </div>
              <Users className="h-8 w-8 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-stone-900">
                  {behavior.returningCustomers.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-stone-500 mt-3">
                Customers who visited on 2 or more different days. 
                Indicates strong engagement with your menu.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Customer Contacts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Customer Contacts</CardTitle>
            <p className="text-sm text-stone-500 mt-1">
              Total: {data.contactsCollected} contacts collected
            </p>
          </div>
          <button
            onClick={() => {
              if (contacts.length === 0) return;
              
              const restaurantName = restaurants.find(r => r.id === selectedRestaurant)?.name || 'restaurant';
              const date = new Date().toISOString().split('T')[0];
              
              // Create CSV content
              const csvRows = [
                'WhatsApp Number,Date',
                ...contacts.map(contact => 
                  `${contact.whatsapp_number},${new Date(contact.created_at).toLocaleDateString()}`
                )
              ];
              const csvContent = csvRows.join('\n');
              
              // Create download link
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${restaurantName.toLowerCase().replace(/\s+/g, '-')}-contacts-${date}.csv`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
            }}
            disabled={contacts.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </CardHeader>
        <CardContent>
          {contacts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-stone-600">
                      WhatsApp Number
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-stone-600">
                      Date Collected
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr key={contact.id} className="border-b border-stone-100 last:border-0">
                      <td className="py-3 px-4 text-sm text-stone-900 font-medium">
                        {contact.whatsapp_number}
                      </td>
                      <td className="py-3 px-4 text-sm text-stone-600 text-right">
                        {new Date(contact.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-stone-500">
              No contacts collected yet. Customers can opt-in via the WhatsApp prompt on your menu.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
