'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { LayoutDashboard, PlusCircle, LogOut, UtensilsCrossed, BarChart } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart },
  { name: 'New Restaurant', href: '/admin/new-restaurant', icon: PlusCircle },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    toast({ type: 'info', title: 'Logged out successfully' });
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Top Navigation Bar */}
      <nav className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 border-b border-amber-600/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-3">
              <UtensilsCrossed className="h-8 w-8 text-amber-500" />
              <div>
                <h1 className="text-xl font-bold text-white">Platinum Menu</h1>
                <p className="text-xs text-amber-200/80">Admin Panel</p>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-amber-600 text-white'
                        : 'text-stone-300 hover:text-white hover:bg-stone-700/50'
                    )}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* Logout Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-amber-600/30 text-amber-200 hover:bg-amber-600/20"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
