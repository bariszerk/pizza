// components/navbar-top.tsx
'use client';

import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/ui/theme-toggle-button';
import { createClient } from '@/utils/supabase/client';
import { AnimatePresence, motion } from 'framer-motion';
import { MenuIcon, XIcon } from 'lucide-react'; // Hamburger ve kapatma ikonu için
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { UserStatus } from './user-status';

export function TopNavbar() {
	const supabase = createClient();
	const [role, setRole] = useState<string | null>(null);
	const [staffBranchId, setStaffBranchId] = useState<string | null>(null); // Şube personeli için şube ID'si
	const [loading, setLoading] = useState(true);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	useEffect(() => {
		const fetchUserData = async (userId: string) => {
			const { data: profile, error } = await supabase
				.from('profiles')
				.select('role, staff_branch_id') // staff_branch_id'yi de çekiyoruz
				.eq('id', userId)
				.single();

			if (!error && profile) {
				setRole(profile.role);
				if (profile.role === 'branch_staff') {
					setStaffBranchId(profile.staff_branch_id);
				} else {
					setStaffBranchId(null); // Diğer roller için null
				}
			} else {
				setRole(null);
				setStaffBranchId(null);
				if (error) {
					console.error('Error fetching profile:', error.message);
				}
			}
			setLoading(false);
		};

		supabase.auth.getUser().then(({ data: { user } }) => {
			if (user) {
				fetchUserData(user.id);
			} else {
				setRole(null);
				setStaffBranchId(null);
				setLoading(false);
			}
		});

		const { data: listener } = supabase.auth.onAuthStateChange(
			(_event, session) => {
				if (!session?.user) {
					setRole(null);
					setStaffBranchId(null);
					setLoading(false);
					return;
				}
				setLoading(true);
				fetchUserData(session.user.id);
			}
		);

		return () => {
			listener?.subscription?.unsubscribe();
		};
	}, [supabase]);

	// Yükleniyorken veya rol bilgisi henüz gelmediyse, temel bir navbar veya null gösterilebilir.
	// Ya da sadece kullanıcı giriş yapmışsa linkleri göster.
	// if (loading) return null; // veya bir iskelet (skeleton) navbar

	const baseNavLinks = [
		{
			href: '/dashboard',
			label: 'Dashboard',
			roles: ['manager', 'admin'],
		},
		// Şube linki dinamik olacak
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

	// branch_staff için dinamik şube linkini oluştur
	const dynamicNavLinks = [...baseNavLinks];
	if (role === 'branch_staff') {
		if (staffBranchId) {
			dynamicNavLinks.unshift({
				// En başa ekleyelim
				href: `/branch/${staffBranchId}`,
				label: 'Şubem',
				roles: ['branch_staff'],
			});
		} else {
			// Eğer şube ID'si yoksa (henüz atanmamışsa)
			// Şube linkini gösterme veya /authorization-pending'e yönlendirebilirsin
			// Şimdilik göstermeyelim veya disabled yapalım. Ya da farklı bir label ile.
			dynamicNavLinks.unshift({
				href: '/authorization-pending',
				label: 'Şubem (Atanmadı)',
				roles: ['branch_staff'],
			});
		}
	} else if (role === 'manager') {
		// Yöneticiler için belki "Şubelerim" gibi bir genel sayfa olabilir
		// Veya dashboard üzerinden şubelerini seçebilirler. Şimdilik manager için özel bir şube linki eklemiyoruz.
		// Dashboard'da kendi şubelerini görecekler.
	}

	const filteredLinks = dynamicNavLinks.filter(
		(link) => link.roles.includes(role ?? 'guest') // 'guest' rolü hiç link görmemeli (login olmamış)
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
						<Link href={role ? '/dashboard' : '/'}>Pizza Yönetim</Link>{' '}
						{/* Giriş yapılmadıysa ana sayfa */}
					</div>
				</div>

				<nav className="hidden lg:flex items-center space-x-1">
					{filteredLinks.map((link) => (
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
							{filteredLinks.map((link) => (
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
