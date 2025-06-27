'use client';

import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/ui/theme-toggle-button';
import { useAuth } from '@/hooks/use-auth'; // Import the custom hook
import { AnimatePresence, motion } from 'framer-motion';
import { MenuIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react'; // useMemo import edildi
import { UserStatus } from './user-status';

export function TopNavbar() {
	const { role, staffBranchId, staffBranchName, loading: authLoading } = useAuth(); // staffBranchName eklendi
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	// useEffect(() => {
	//  // Optional: Log auth state changes for debugging
	//  console.log('TopNavbar auth state:', { role, staffBranchId, staffBranchName, authLoading });
	// }, [role, staffBranchId, staffBranchName, authLoading]);

	const baseNavLinks = useMemo(
		() => [
			{
				href: '/dashboard',
				label: 'Genel Durum Paneli',
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
		],
		[]
	);

	const dynamicNavLinks = useMemo(() => {
		const links = [...baseNavLinks];
		if (role === 'branch_staff') {
			if (staffBranchName) { // staffBranchId yerine staffBranchName kontrolü
				links.unshift({
					href: `/branch/${encodeURIComponent(staffBranchName)}`, // Şube adını kullan ve URL encode et
					label: 'Şubem',
					roles: ['branch_staff'],
				});
			} else if (staffBranchId && !staffBranchName && !authLoading) {
				// ID var ama isim henüz yüklenmemişse veya bulunamamışsa (ve yükleme bitmişse)
				links.unshift({
					href: '/authorization-pending', // Ya da bir hata/bekleme sayfasına yönlendir
					label: 'Şubem (Bilgi Bekleniyor)',
					roles: ['branch_staff'],
				});
			} else { // Ne ID ne de isim varsa (veya authLoading ise, bu durum filteredLinks'te ele alınır)
				links.unshift({
					href: '/authorization-pending',
					label: 'Şubem (Atanmadı)',
					roles: ['branch_staff'],
				});
			}
		}
		return links;
	}, [role, staffBranchId, staffBranchName, authLoading, baseNavLinks]); // staffBranchName ve authLoading eklendi

	const filteredLinks = useMemo(() => {
		if (authLoading) return []; // Yükleniyorsa hiç link gösterme
		return dynamicNavLinks.filter((link) =>
			link.roles.includes(role ?? 'guest')
		);
	}, [dynamicNavLinks, role, authLoading]);

	const toggleMobileMenu = () => {
		setIsMobileMenuOpen((prev) => !prev);
	};

	// Navigasyon linklerini gösterme koşulu: !loading && role ve filtrelenmiş link varsa
	const showLinks = !authLoading && role && filteredLinks.length > 0;

	return (
		<header className="bg-background border-b border-border px-4 py-3 sticky top-0 z-50">
			<div className="container mx-auto flex items-center justify-between">
				<div className="flex items-center space-x-3">
					<button
						className="lg:hidden p-2 focus:outline-none"
						onClick={toggleMobileMenu}
						aria-label="Menüyü Aç"
					>
						{isMobileMenuOpen ? (
							<XIcon className="h-6 w-6" />
						) : (
							<MenuIcon className="h-6 w-6" />
						)}
					</button>
					<div className="text-lg font-semibold">
						<Link href={role && role !== 'user' ? '/dashboard' : '/'}>
							Zerkify
						</Link>
					</div>
				</div>

				<nav className="hidden lg:flex items-center space-x-1">
					{showLinks &&
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
							{showLinks &&
								filteredLinks.map((link) => (
									<Link
										key={link.href}
										href={link.href}
										passHref
										legacyBehavior
									>
										<Button
											asChild
											variant="ghost"
											className="w-full justify-start text-base py-3"
											onClick={() => setIsMobileMenuOpen(false)}
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
