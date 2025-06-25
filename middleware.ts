// middleware.ts (Projenizin kök dizinindeki)
import { createServerClient, type CookieOptions } from '@supabase/ssr'; // Doğrudan @supabase/ssr'dan import
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { updateSession } from './utils/supabase/middleware'; // Bu, cookie'leri güncelleyip response döndürür

export async function middleware(request: NextRequest) {
    const response = await updateSession(request); // Bu, NextResponse döndürür

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({ name, value, ...options });
                    // response'u yeniden oluşturmamız gerekebilir veya mevcut olana ekleyebiliriz.
                    // updateSession zaten bir response döndürdüğü için, onun üzerinde işlem yapıyoruz.
                    response.cookies.set({ name, value, ...options });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: '', ...options });
                    response.cookies.set({ name, value: '', ...options });
                },
            },
        }
    );

    const { pathname } = request.nextUrl;

    // Logout yolunu middleware işlemesinden hariç tut (veya en başta ele al)
    // Eğer /logout bir API rotası değilse (ki app router'da route handler'lar sayfa gibi işlenir),
    // ve sadece session'ı temizleyip yönlendirme yapıyorsa, middleware'in normal akışına girmemeli.
    // Ancak, updateSession'ın çalışması yine de önemli olabilir.
    // En temizi, matcher ile hariç tutmak veya burada çok erken bir return yapmak.
    // Ama /logout POST olduğu için ve cookie'leri temizlemesi gerektiği için updateSession'dan geçmesi iyi olabilir.
    // Sadece getUser() ve rol bazlı yönlendirmelerden muaf tutalım.

    if (pathname === '/logout') {
        // /logout POST isteği route handler tarafından işlenecek.
        // Middleware burada sadece session'ı güncel tutmuş olmalı.
        // Ek bir yönlendirme yapmamalı.
        return response;
    }

    const { data: { user } } = await supabase.auth.getUser();

    const publicPaths = ['/login', '/signup', '/auth'];
    if (publicPaths.some(path => pathname.startsWith(path))) {
        if (user && (pathname.startsWith('/login') || pathname.startsWith('/signup'))) {
            const { data: profile } = await supabase.from('profiles').select('role, staff_branch_id').eq('id', user.id).single();
            if (profile?.role === 'branch_staff' && profile?.staff_branch_id) {
                return NextResponse.redirect(new URL(`/branch/${profile.staff_branch_id}`, request.url), { headers: response.headers });
            }
            return NextResponse.redirect(new URL('/dashboard', request.url), { headers: response.headers });
        }
        return response;
    }

    if (!user) {
        if (pathname === '/' || pathname.startsWith('/authorization-pending')) {
            return response;
        }
        return NextResponse.redirect(new URL('/login', request.url), { headers: response.headers });
    }

    let userRole: string | null = null;
    let staffBranchId: string | null = null;

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, staff_branch_id')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) {
        console.error(`Middleware: Profil çekme hatası (user ID: ${user.id}):`, profileError?.message);
        if (pathname !== '/authorization-pending' && pathname !== '/login') {
             const redirectUrl = new URL('/login', request.url);
             return NextResponse.redirect(redirectUrl, { headers: response.headers });
        }
        return response;
    }

    userRole = profile.role;
    staffBranchId = profile.staff_branch_id;

    // ---- ROL BAZLI YÖNLENDİRMELER (Önceki yanıttaki gibi) ----
    if (userRole === 'admin') {
        return response;
    }

    if (userRole === 'manager') {
        if (pathname.startsWith('/admin/roles')) {
            return NextResponse.redirect(new URL('/dashboard', request.url), { headers: response.headers });
        }
        const allowedManagerPaths = ['/dashboard', '/admin/branches', '/private'];
        if (allowedManagerPaths.some(p => pathname.startsWith(p)) || pathname === '/') {
            return response;
        }
        return NextResponse.redirect(new URL('/dashboard', request.url), { headers: response.headers });
    }

    if (userRole === 'branch_staff') {
        if (pathname.startsWith('/dashboard')) { // Dashboard'a girmesin
            if (staffBranchId) {
                return NextResponse.redirect(new URL(`/branch/${staffBranchId}`, request.url), { headers: response.headers });
            }
            return NextResponse.redirect(new URL('/authorization-pending', request.url), { headers: response.headers });
        }
        const isAtOwnBranchPage = staffBranchId && pathname === `/branch/${staffBranchId}`;
        const isAtPrivate = pathname.startsWith('/private');
        const isAtRoot = pathname === '/';
        if (isAtOwnBranchPage || isAtPrivate || isAtRoot) {
            return response;
        }
        if (staffBranchId) {
            return NextResponse.redirect(new URL(`/branch/${staffBranchId}`, request.url), { headers: response.headers });
        } else {
            if (pathname !== '/authorization-pending') {
                return NextResponse.redirect(new URL('/authorization-pending', request.url), { headers: response.headers });
            }
            return response;
        }
    }

    if (userRole === 'user') {
        const allowedUserPaths = ['/authorization-pending', '/private', '/'];
        if (allowedUserPaths.includes(pathname)) {
            return response;
        }
        return NextResponse.redirect(new URL('/authorization-pending', request.url), { headers: response.headers });
    }
    // ---- ROL BAZLI YÖNLENDİRMELER BİTİŞ ----


    console.warn(`Middleware: Bilinmeyen rol veya yetkisiz durum. Rol: ${userRole}, Path: ${pathname}`);
    if (!publicPaths.includes(pathname) && pathname !== '/authorization-pending' && pathname !== '/') {
        return NextResponse.redirect(new URL('/login', request.url), { headers: response.headers });
    }

    return response;
}

export const config = {
    matcher: [
        // API rotalarını ve logout'u hariç tutmak için güncellendi:
        '/((?!api|_next/static|_next/image|favicon.ico|logout|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};