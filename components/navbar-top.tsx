'use client';

import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/ui/theme-toggle-button';
import { useAuth } from '@/hooks/use-auth';
import { AnimatePresence, motion } from 'framer-motion';
import { MenuIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react'; // useEffect eklendi
import { UserStatus } from './user-status';

export function TopNavbar() {
	const {
		role,
		staffBranchId,
		staffBranchName,
		loading: authLoading,
	} = useAuth();
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [hasPendingApprovals, setHasPendingApprovals] = useState(false);

	useEffect(() => {
		if (role === 'admin' || role === 'manager') {
			const fetchPendingCount = async () => {
				try {
					const response = await fetch('/api/approvals/pending-count');
					if (response.ok) {
						const data = await response.json();
						setHasPendingApprovals(data.count > 0);
					}
				} catch (error) {
					console.error('Failed to fetch pending approvals count:', error);
				}
			};

			fetchPendingCount();

			const interval = setInterval(fetchPendingCount, 30000);
			window.addEventListener('approvals-updated', fetchPendingCount);
			return () => {
				clearInterval(interval);
				window.removeEventListener('approvals-updated', fetchPendingCount);
			};
		} else {
			setHasPendingApprovals(false);
		}
	}, [role]);

	const baseNavLinks = useMemo(
		() => [
			{
				href: '/dashboard',
				label: 'Genel Durum Paneli',
				roles: ['manager', 'admin'],
			},
			{
				href: '/admin/roles',
				label: 'Roller',
				roles: ['admin'],
			},
			{
				href: '/admin/branches',
				label: 'Şube Yönetimi',
				roles: ['admin', 'manager'],
			},
			{
				href: '/admin/financial-approvals',
				label: 'Onaylar',
				roles: ['admin', 'manager'],
			},
			{
				href: '/admin/financial-logs',
				label: 'Loglar',
				roles: ['admin'],
			},
		],
		[]
	);

	const dynamicNavLinks = useMemo(() => {
		const links = [...baseNavLinks];
		if (role === 'branch_staff') {
			links.unshift({
				href: '/my-change-requests',
				label: 'Taleplerim',
				roles: ['branch_staff'],
			});

			if (staffBranchId) {
				links.unshift({
					href: `/branch/${encodeURIComponent(staffBranchId)}`,
					label: 'Şubem',
					roles: ['branch_staff'],
				});
			} else if (staffBranchId && !staffBranchName && !authLoading) {
				links.unshift({
					href: '/authorization-pending',
					label: 'Şubem (Bilgi Bekleniyor)',
					roles: ['branch_staff'],
				});
			} else {
				links.unshift({
					href: '/authorization-pending',
					label: 'Şubem (Atanmadı)',
					roles: ['branch_staff'],
				});
			}
		}
		return links;
	}, [role, staffBranchId, staffBranchName, authLoading, baseNavLinks]);

	const filteredLinks = useMemo(() => {
		if (authLoading) return [];
		return dynamicNavLinks.filter((link) =>
			link.roles.includes(role ?? 'guest')
		);
	}, [dynamicNavLinks, role, authLoading]);

	const toggleMobileMenu = () => {
		setIsMobileMenuOpen((prev) => !prev);
	};

        const showLinks = !authLoading && role && filteredLinks.length > 0;

        useEffect(() => {
                if (!showLinks) {
                        setIsMobileMenuOpen(false);
                }
        }, [showLinks]);

	const renderNavLink = (link: { href: string; label: string }) => {
		const isApprovalsLink = link.label === 'Onaylar';
		return (
			<Link key={link.href} href={link.href} passHref legacyBehavior>
				<Button asChild variant="ghost" className="text-sm relative">
					<a>
						{link.label}
						{isApprovalsLink && hasPendingApprovals && (
							<span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
								<span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
							</span>
						)}
					</a>
				</Button>
			</Link>
		);
	};

	const renderMobileNavLink = (link: { href: string; label: string }) => {
		const isApprovalsLink = link.label === 'Onaylar';
		return (
			<Link key={link.href} href={link.href} passHref legacyBehavior>
				<Button
					asChild
					variant="ghost"
					className="w-full justify-start text-base py-3 relative"
					onClick={() => setIsMobileMenuOpen(false)}
				>
					<a>
						{link.label}
						{isApprovalsLink && hasPendingApprovals && (
							<span className="absolute top-2 right-2 flex h-3 w-3">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
								<span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
							</span>
						)}
					</a>
				</Button>
			</Link>
		);
	};

	return (
		<header className="bg-background border-b border-border px-4 py-3 sticky top-0 z-50">
			<div className="container mx-auto flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                        {showLinks && (
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
                                        )}
					<div className="text-lg font-semibold">
						<Link href={role && role !== 'user' ? '/dashboard' : '/'}>
							Zerkify
						</Link>
					</div>
				</div>

				<nav className="hidden lg:flex items-center space-x-1">
					{showLinks && filteredLinks.map(renderNavLink)}
				</nav>

				<div className="flex items-center space-x-2 sm:space-x-4">
					<ModeToggle />
					<UserStatus />
				</div>
			</div>

                        <AnimatePresence>
                                {showLinks && isMobileMenuOpen && (
                                        <motion.nav
                                                initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="lg:hidden overflow-hidden border-t border-border"
					>
						<div className="flex flex-col space-y-1 px-2 pt-2 pb-3">
							{showLinks && filteredLinks.map(renderMobileNavLink)}
						</div>
					</motion.nav>
				)}
			</AnimatePresence>
		</header>
	);
}
