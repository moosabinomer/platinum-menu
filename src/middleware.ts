import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check if the request is for an admin route
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  
  // Skip middleware for login page and API routes
  if (request.nextUrl.pathname === '/admin/login' || 
      request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }
  
  // Get the admin authentication cookie
  const adminCookie = request.cookies.get('admin_authenticated')?.value;
  
  // Check if user is authenticated for admin routes
  if (isAdminRoute && !adminCookie) {
    // Redirect to login if not authenticated
    const loginUrl = new URL('/admin/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
