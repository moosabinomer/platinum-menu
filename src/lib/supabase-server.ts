import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import fs from 'node:fs';
import path from 'node:path';
import type { Database } from './database.types';
import { getSupabaseEnv } from './env';

function readEnvLocalVar(key: string): string {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) return '';

    const content = fs.readFileSync(envPath, 'utf8');
    const line = content
      .split('\n')
      .map((entry: string) => entry.trim())
      .find((entry: string) => entry.startsWith(`${key}=`));
    if (!line) return '';
    return line.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, '');
  } catch {
    return '';
  }
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  let { url, anonKey } = getSupabaseEnv();

  // If shell exports are stale placeholders, prefer .env.local on server.
  if (url.includes('your-supabase-url')) {
    const localUrl = readEnvLocalVar('NEXT_PUBLIC_SUPABASE_URL');
    if (localUrl) url = localUrl;
  }
  if (anonKey.includes('your-supabase-anon-key')) {
    const localAnon = readEnvLocalVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    if (localAnon) anonKey = localAnon;
  }

  return createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
