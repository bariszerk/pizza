// middleware.ts (Projenizin kök dizinindeki)
import { createServerClient, type CookieOptions } from '@supabase/ssr'; // Doğrudan @supabase/ssr'dan import
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { updateSession } from './utils/supabase/middleware'; // Bu, cookie'leri güncelleyip response döndürür

export async function middleware(request: NextRequest) {
	const response = await updateSession(request); // Bu, NextResponse döndürür

	// updateSession bir yönlendirme yapmış olabilir (örneğin, session yoksa /login'e).
	// Eğer bir yönlendirme başlığı varsa, bu response'u hemen döndür.
	if (response.headers.has('Location')) {
		return response;
	}

	// updateSession'dan gelen response'u kullanarak createServerClient'ı oluştur.
	// Bu, cookie'lerin response'a doğru şekilde eklendiğinden emin olmak için önemlidir.
	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				get(name: string) {
					return request.cookies.get(name)?.value;
				},
				set(name: string, value: string, options: CookieOptions) {
					// Burada request.cookies'i güncellemek önemli, çünkü sonraki
					// supabase.auth.getUser() çağrısı güncel cookie'leri kullanmalı.
					request.cookies.set({ name, value, ...options });
					// updateSession'dan gelen response objesini güncelle.
					response.cookies.set({ name, value, ...options });
				},
				remove(name: string, options: CookieOptions) {
					request.cookies.set({ name, value: '', ...options });
					response.cookies.set({ name, value: '', ...options });
				},
			},
		}
	);

	// ÖNEMLİ: supabase.auth.getUser() çağrısı, session'ı yenileyebilir ve
	// cookie'leri güncelleyebilir. Bu nedenle, yukarıdaki `set` ve `remove` metodlarının
	// hem `request.cookies` hem de `response.cookies` üzerinde işlem yapması kritiktir.
	// `updateSession` zaten `NextResponse.next({ request })` ile bir response oluşturur
	// ve cookie'leri ayarlar. `createServerClient` içindeki `cookies` metodları
	// bu response üzerinde çalışmaya devam etmelidir.

	const {
		data: { user },
	} = await supabase.auth.getUser();

	// getUser çağrısından sonra session değişmiş ve cookie'ler güncellenmiş olabilir.
	// Bu cookie'ler zaten `response.cookies.set` aracılığıyla `response` objesine eklendi.

	const { pathname } = request.nextUrl;

	if (pathname === '/logout') {
		// /logout POST isteği route handler tarafından işlenecek.
		// Middleware session'ı güncel tuttu ve cookie'ler response'a eklendi.
		// Ek bir yönlendirme yapmamalı.
		return response;
	}

	const publicPaths = [
		'/login',
		'/signup',
		'/auth',
		'/verify-email',
		'/forgot-password',
		'/update-password',
	];
	if (publicPaths.some((path) => pathname.startsWith(path))) {
		// Kullanıcı giriş yapmışsa ve login/signup sayfalarına gitmeye çalışıyorsa ana sayfasına yönlendir.
		if (
			user &&
			(pathname.startsWith('/login') || pathname.startsWith('/signup'))
		) {
			const { data: profile } = await supabase
				.from('profiles')
				.select('role, staff_branch_id')
				.eq('id', user.id)
				.single();
			if (profile?.role === 'branch_staff' && profile?.staff_branch_id) {
				return NextResponse.redirect(
					new URL(`/branch/${profile.staff_branch_id}`, request.url),
					{ headers: response.headers }
				);
			}
			return NextResponse.redirect(new URL('/dashboard', request.url), {
				headers: response.headers,
			});
		}
		// Diğer public yollara (forgot-password, update-password, verify-email) her zaman izin ver.
		return response;
	}

	// Eğer public bir yol değilse ve kullanıcı yoksa, /login'e yönlendir.
	// Ana sayfa ('/') ve yetkilendirme bekleyen sayfa ('/authorization-pending') hariç.
	if (!user) {
		if (pathname === '/' || pathname.startsWith('/authorization-pending')) {
			return response;
		}
		return NextResponse.redirect(new URL('/login', request.url), {
			headers: response.headers,
		});
	}

	// E-posta doğrulaması kontrolü (giriş yapmış kullanıcılar için)
	// user.email_confirmed_at will exist if email is confirmed
	// user.new_email will exist if user is trying to change email - this flow is not implemented yet, but good to be aware
	if (!user.email_confirmed_at && pathname !== '/verify-email') {
		// If email is not confirmed and user is not already on verify-email page, redirect them.
		// Also ensure we don't block API calls or static assets needed by the verify-email page itself,
		// though the matcher should handle most of this.
		console.log(
			`Middleware: User ${user.id} email not confirmed. Redirecting to /verify-email.`
		);
		return NextResponse.redirect(new URL('/verify-email', request.url), {
			headers: response.headers,
		});
	}

	let userRole: string | null = null;
	let staffBranchId: string | null = null;

	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('role, staff_branch_id')
		.eq('id', user.id)
		.single();

	if (profileError || !profile) {
		console.error(
			`Middleware: Profil çekme hatası (user ID: ${user.id}):`,
			profileError?.message
		);
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
			return NextResponse.redirect(new URL('/dashboard', request.url), {
				headers: response.headers,
			});
		}
		// Yöneticinin erişebileceği yollara /admin/branch-financials eklendi
		// YENİ HALİ
		const allowedManagerPaths = [
			'/dashboard',
			'/admin/branches',
			'/admin/branch-financials',
			'/admin/financial-approvals',
			'/admin/financial-logs',
			'/private',
			'/branch/',
		];
		if (
			allowedManagerPaths.some((p) => pathname.startsWith(p)) ||
			pathname === '/'
		) {
			return response;
		}
		// Eğer izin verilen yollardan biri değilse ve /admin altında bir yere gitmeye çalışıyorsa /admin/branches'e,
		// aksi halde /dashboard'a yönlendir.
		if (pathname.startsWith('/admin/')) {
			return NextResponse.redirect(new URL('/admin/branches', request.url), {
				headers: response.headers,
			});
		}
		return NextResponse.redirect(new URL('/dashboard', request.url), {
			headers: response.headers,
		});
	}

	if (userRole === 'branch_staff') {
		if (pathname.startsWith('/dashboard')) {
			// Dashboard'a girmesin
			if (staffBranchId) {
				return NextResponse.redirect(
					new URL(`/branch/${staffBranchId}`, request.url),
					{ headers: response.headers }
				);
			}
			return NextResponse.redirect(
				new URL('/authorization-pending', request.url),
				{ headers: response.headers }
			);
		}
		const isAtOwnBranchPage =
			staffBranchId && pathname === `/branch/${staffBranchId}`;
		const isAtPrivate = pathname.startsWith('/private');
		const isAtRoot = pathname === '/';
		if (isAtOwnBranchPage || isAtPrivate || isAtRoot) {
			return response;
		}
		if (staffBranchId) {
			return NextResponse.redirect(
				new URL(`/branch/${staffBranchId}`, request.url),
				{ headers: response.headers }
			);
		} else {
			if (pathname !== '/authorization-pending') {
				return NextResponse.redirect(
					new URL('/authorization-pending', request.url),
					{ headers: response.headers }
				);
			}
			return response;
		}
	}

	if (userRole === 'user') {
		const allowedUserPaths = ['/authorization-pending', '/private', '/'];
		if (allowedUserPaths.includes(pathname)) {
			return response;
		}
		return NextResponse.redirect(
			new URL('/authorization-pending', request.url),
			{ headers: response.headers }
		);
	}
	// ---- ROL BAZLI YÖNLENDİRMELER BİTİŞ ----

	console.warn(
		`Middleware: Bilinmeyen rol veya yetkisiz durum. Rol: ${userRole}, Path: ${pathname}`
	);
	if (
		!publicPaths.includes(pathname) &&
		pathname !== '/authorization-pending' &&
		pathname !== '/'
	) {
		return NextResponse.redirect(new URL('/login', request.url), {
			headers: response.headers,
		});
	}

	return response;
}

export const config = {
	matcher: [
		// API rotalarını ve logout'u hariç tutmak için güncellendi:
		'/((?!api|_next/static|_next/image|favicon.ico|logout|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
	],
};
