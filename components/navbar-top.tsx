// components/navbar-top.tsx
'use client';

import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/ui/theme-toggle-button';
import { createClient } from '@/utils/supabase/client';
import { AnimatePresence, motion } from 'framer-motion';
import { MenuIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; // 1. useRouter import edildi
import { useCallback, useEffect, useState } from 'react';
import { UserStatus } from './user-status';

export function TopNavbar() {
	const supabase = createClient();
	const router = useRouter();
	const pathname = usePathname(); // Mevcut yolu almak için
	const [role, setRole] = useState<string | null>(null);
	const [staffBranchId, setStaffBranchId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	// fetchUserData'yı useCallback ile sarmala, çünkü useEffect bağımlılıklarında kullanılacak
	const fetchUserData = useCallback(
		async (userId: string) => {
			console.log('TopNavbar: Fetching user data for ID:', userId);
			const { data: profile, error } = await supabase
				.from('profiles')
				.select('role, staff_branch_id')
				.eq('id', userId)
				.single();

			if (!error && profile) {
				console.log(
					'TopNavbar: Profile fetched successfully. Role:',
					profile.role
				);
				setRole(profile.role);
				if (profile.role === 'branch_staff') {
					setStaffBranchId(profile.staff_branch_id);
				} else {
					setStaffBranchId(null);
				}
			} else {
				console.warn(
					'TopNavbar: Profile fetch error or no profile. Setting role to null. Error:',
					error?.message
				);
				setRole(null);
				setStaffBranchId(null);
			}
			setLoading(false);
		},
		[supabase]
	); // supabase bağımlılığı

	useEffect(() => {
		console.log('TopNavbar: useEffect for auth state initiated.');
		// Bileşen yüklendiğinde mevcut kullanıcıyı kontrol et
		supabase.auth.getSession().then(({ data: { session } }) => {
			console.log('TopNavbar: Initial getSession. User ID:', session?.user?.id);
			if (session?.user) {
				fetchUserData(session.user.id);
			} else {
				setRole(null);
				setStaffBranchId(null);
				setLoading(false);
			}
		});

		// Auth durumundaki değişiklikleri dinle
		const { data: listener } = supabase.auth.onAuthStateChange(
			async (_event, session) => {
				if (_event === 'SIGNED_OUT' || !session?.user) {
					setRole(null);
					setStaffBranchId(null);
					setLoading(false);
					// Mevcut yol /login değilse yönlendir.
					// Bu, sayfa zaten /login ise gereksiz yönlendirmeyi önler.
					if (pathname !== '/login' && pathname !== '/signup') {
						console.log('TopNavbar: Redirecting to /login from:', pathname);
						router.push('/login');
					} else {
						router.refresh(); // Login sayfasındaysa bile refresh et ki her şey güncel kalsın.
					}
					return;
				}

				// SIGNED_IN veya USER_UPDATED gibi diğer durumlar
				if (session?.user) {
					setLoading(true);
					await fetchUserData(session.user.id);
				}
			}
		);

		return () => {
			listener?.subscription?.unsubscribe();
		};
	}, [supabase, router, fetchUserData, pathname]); // pathname eklendi

	// ... (geri kalan kod aynı) ...

	const baseNavLinks = [
		{
			href: '/dashboard',
			label: 'Dashboard',
			roles: ['manager', 'admin'],
		},
		{
			href: '/admin/roles',
			label: 'Rol Yönetimi',
			roles: ['admin'],
		},
		{
			href: '/admin/branches',
			label: 'Şube Yönetimi',
			roles: ['admin', 'manager'],
		},
	];

	const dynamicNavLinks = [...baseNavLinks];
	if (role === 'branch_staff') {
		if (staffBranchId) {
			dynamicNavLinks.unshift({
				href: `/branch/${staffBranchId}`,
				label: 'Şubem',
				roles: ['branch_staff'],
			});
		} else {
			dynamicNavLinks.unshift({
				href: '/authorization-pending',
				label: 'Şubem (Atanmadı)',
				roles: ['branch_staff'],
			});
		}
	}

	const filteredLinks = dynamicNavLinks.filter((link) =>
		link.roles.includes(role ?? 'guest')
	);

	const toggleMobileMenu = () => {
		setIsMobileMenuOpen((prev) => !prev);
	};

	return (
		<header className="bg-background border-b border-border px-4 py-3 sticky top-0 z-50">
			<div className="container mx-auto flex items-center justify-between">
				<div className="flex items-center space-x-3">
					<button
						className="lg:hidden p-2 focus:outline-none"
						onClick={toggleMobileMenu}
						aria-label="Open Menu"
					>
						{isMobileMenuOpen ? (
							<XIcon className="h-6 w-6" />
						) : (
							<MenuIcon className="h-6 w-6" />
						)}
					</button>
					<div className="text-lg font-semibold">
						<Link href={role && role !== 'user' ? '/dashboard' : '/'}>
							Pizza Yönetim
						</Link>
					</div>
				</div>

				<nav className="hidden lg:flex items-center space-x-1">
					{/* Sadece loading false ve rol varsa linkleri göster */}
					{!loading &&
						role &&
						filteredLinks.map((link) => (
							<Link key={link.href} href={link.href} passHref legacyBehavior>
								<Button asChild variant="ghost" className="text-sm">
									<a>{link.label}</a>
								</Button>
							</Link>
						))}
				</nav>

				<div className="flex items-center space-x-2 sm:space-x-4">
					<ModeToggle />
					<UserStatus />
				</div>
			</div>

			<AnimatePresence>
				{isMobileMenuOpen && (
					<motion.nav
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="lg:hidden overflow-hidden border-t border-border"
					>
						<div className="flex flex-col space-y-1 px-2 pt-2 pb-3">
							{/* Sadece loading false ve rol varsa linkleri göster */}
							{!loading &&
								role &&
								filteredLinks.map((link) => (
									<Link
										key={link.href}
										href={link.href}
										passHref
										legacyBehavior
										onClick={() => setIsMobileMenuOpen(false)}
									>
										<Button
											asChild
											variant="ghost"
											className="w-full justify-start text-base py-3"
										>
											<a>{link.label}</a>
										</Button>
									</Link>
								))}
						</div>
					</motion.nav>
				)}
			</AnimatePresence>
		</header>
	);
}
