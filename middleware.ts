// middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from './utils/supabase/client';
import { updateSession } from './utils/supabase/middleware';

// Supabase servis rolü client’ı
const serviceSupabase = createClient();

export async function middleware(request: NextRequest) {
  // 1) Supabase session cookie’larını güncelle
  const response = await updateSession(request);

  // 2) “-auth-token” ile biten cookie’yi bul
  const allCookies = request.cookies.getAll();
  const authCookieObj = allCookies.find(c => c.name.endsWith('-auth-token'));
  const raw = authCookieObj?.value;

  if (!raw) {
    console.log('No auth-token cookie found');
    return response; // cookie yoksa fallback olarak izin veriyoruz
  }

  // 3) Base64-JSON’u decode et
  // Cookie değeri "base64-<encodedJson>" formatında geliyor
  interface SessionData {
    user?: {
      id?: string;
    };
  }
  let sessionData: SessionData;
  try {
    const b64 = raw.startsWith('base64-') ? raw.slice('base64-'.length) : raw;
    const json = atob(b64);
    sessionData = JSON.parse(json);
  } catch (err) {
    console.error('Failed to parse session cookie JSON', err);
    return response;
  }

  // 4) İçinden userId’yi al
  const userId: string | undefined = sessionData?.user?.id;
  if (!userId) {
    console.log('No user.id in session JSON');
    return response;
  }

  // 5) Servis client ile profilden rolü çek
  let userRole = 'user';
  try {
    const { data, error } = await serviceSupabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    if (!error && data) {
      userRole = data.role;
    } else {
      console.error('Could not fetch role:', error);
    }
  } catch (err) {
    console.error('Error querying profiles table:', err);
  }

  // 6) Rol bazlı yönlendirmeler
  const url = request.nextUrl.clone();
  const path = url.pathname;

  if (userRole === 'admin') {
    return response;
  }
  if (userRole === 'manager' && path.startsWith('/admin/roles')) {
    return NextResponse.redirect(new URL('/authorization-pending', request.url));
  }
  if (userRole === 'branch_staff' && !path.startsWith('/branch')) {
    return NextResponse.redirect(new URL('/authorization-pending', request.url));
  }
  if (
    userRole === 'user' &&
    !['/', '/login', '/signup', '/authorization-pending'].includes(path)
  ) {
    return NextResponse.redirect(new URL('/authorization-pending', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|(?:login|signup)(?:/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
