import { cookies } from 'next/headers';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'platinum2024';

export const checkAdminAuth = async (): Promise<boolean> => {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get('admin_authenticated');
  
  if (!adminCookie) {
    return false;
  }
  
  try {
    const data = JSON.parse(adminCookie.value);
    return data.authenticated === true && data.password === ADMIN_PASSWORD;
  } catch {
    return false;
  }
};

export const setAdminAuth = async (password: string): Promise<void> => {
  const cookieStore = await cookies();
  
  if (password === ADMIN_PASSWORD) {
    cookieStore.set('admin_authenticated', JSON.stringify({
      authenticated: true,
      password: ADMIN_PASSWORD,
      timestamp: Date.now(),
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });
  }
};

export const clearAdminAuth = async (): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.delete('admin_authenticated');
};
