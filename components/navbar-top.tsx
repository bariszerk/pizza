'use client';

import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/ui/theme-toggle-button';
import { createClient } from '@/utils/supabase/client';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { UserStatus } from './user-status';

export function TopNavbar() {
	const supabase = createClient();
	const [role, setRole] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	// Hamburger menü açık mı?
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	// Rol bilgisini çek
	useEffect(() => {
		const fetchRole = async (userId: string) => {
			const { data, error } = await supabase
				.from('profiles')
				.select('role')
				.eq('id', userId)
				.single();
			if (!error && data) {
				setRole(data.role);
			} else {
				setRole(null);
			}
			setLoading(false);
		};

		supabase.auth.getUser().then(({ data: { user } }) => {
			if (user) {
				fetchRole(user.id);
			} else {
				setRole(null);
				setLoading(false);
			}
		});

		const { data: listener } = supabase.auth.onAuthStateChange(
			(_event, session) => {
				if (!session?.user) {
					setRole(null);
					setLoading(false);
					return;
				}
				setLoading(true);
				fetchRole(session.user.id);
			}
		);

		return () => {
			listener.subscription.unsubscribe();
		};
	}, [supabase]);

	if (loading) return null;

	// Menüde gösterilecek linkler (role bazlı)
	const navLinks = [
		{
			href: '/dashboard',
			label: 'Dashboard',
			roles: ['branch_staff', 'manager', 'admin'],
		},
		{
			href: '/branch/adana',
			label: 'Şube',
			roles: ['branch_staff', 'manager', 'admin'],
		},
		{ href: '/admin/roles', label: 'Roles', roles: ['admin'] },
		{ href: '/admin/branches', label: 'Branches', roles: ['admin'] },
	];

	const filteredLinks = navLinks.filter((link) =>
		link.roles.includes(role ?? 'guest')
	);

	// Hamburger menü toggle
	const toggleMobileMenu = () => {
		setIsMobileMenuOpen((prev) => !prev);
	};

	return (
		<header className="bg-background border-b border-border px-4 py-3">
			<div className="container mx-auto flex items-center justify-between">
				{/* Sol taraf: Hamburger (mobil) + Logo */}
				<div className="flex items-center space-x-3">
					{/* Hamburger butonu (küçük ekranlarda görünür, lg: gizli) */}
					<button
						className="block lg:hidden p-2 focus:outline-none"
						onClick={toggleMobileMenu}
						aria-label="Open Menu"
					>
						{/* Basit bir hamburger ikonu (3 çizgi) */}
						<div className="w-5 h-0.5 bg-foreground mb-1 transition-all" />
						<div className="w-5 h-0.5 bg-foreground mb-1 transition-all" />
						<div className="w-5 h-0.5 bg-foreground transition-all" />
					</button>

					{/* Logo / Brand */}
					<div className="text-lg font-semibold">
						<Link href="/dashboard">Ana Sayfa</Link>
					</div>
				</div>

				{/* Desktop Nav (lg: görünür), mobilde gizle */}
				<nav className="hidden lg:flex items-center space-x-4">
					{filteredLinks.map((link) => (
						<Link key={link.href} href={link.href}>
							<Button variant="ghost">{link.label}</Button>
						</Link>
					))}
				</nav>

				{/* Sağ taraf: ModeToggle + User Avatar (her zaman görünür) */}
				<div className="flex items-center space-x-4">
					<ModeToggle />
					<UserStatus />
				</div>
			</div>

			{/* Mobil menü - Framer Motion ile aç/kapa animasyonu */}
			<AnimatePresence>
				{isMobileMenuOpen && (
					<motion.nav
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.3 }}
						className="lg:hidden overflow-hidden"
					>
						<div className="flex flex-col space-y-2 px-4 pt-2 pb-4">
							{filteredLinks.map((link) => (
								<Link
									key={link.href}
									href={link.href}
									onClick={() => setIsMobileMenuOpen(false)}
								>
									<Button variant="ghost" className="w-full text-left">
										{link.label}
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
