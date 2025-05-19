'use client';

import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/ui/theme-toggle-button';
import { createClient } from '@/utils/supabase/client';
import { Session } from '@supabase/supabase-js'; // Session tipini import edelim
import { AnimatePresence, motion } from 'framer-motion';
import { MenuIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react'; // useRef eklendi
import { UserStatus } from './user-status';

export function TopNavbar() {
	const supabase = createClient();
	const router = useRouter();
	const pathname = usePathname();
	const [role, setRole] = useState<string | null>(null);
	const [staffBranchId, setStaffBranchId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true); // Başlangıçta yükleniyor
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	// Hangi kullanıcı ID'si için rolün başarıyla çekildiğini ve geçerli olduğunu takip eder.
	const [fetchedRoleForUserId, setFetchedRoleForUserId] = useState<
		string | null
	>(null);

	const mountedRef = useRef(true); // Komponentin mount durumunu takip etmek için

	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);

	const fetchUserData = useCallback(
		async (userId: string) => {
			if (!mountedRef.current) return;
			console.log('TopNavbar: Fetching user data for ID:', userId);
			setLoading(true); // Veri çekme işlemi başlarken

			const { data: profile, error } = await supabase
				.from('profiles')
				.select('role, staff_branch_id')
				.eq('id', userId)
				.single();

			if (!mountedRef.current) return;

			if (!error && profile && profile.role) {
				console.log(
					'TopNavbar: Profile fetched successfully. Role:',
					profile.role
				);
				setRole(profile.role);
				setFetchedRoleForUserId(userId); // Bu kullanıcı için rolün başarıyla alındığını işaretle
				if (profile.role === 'branch_staff') {
					setStaffBranchId(profile.staff_branch_id);
				} else {
					setStaffBranchId(null);
				}
			} else {
				console.warn(
					'TopNavbar: Profile fetch error or no profile/role. Clearing role. Error:',
					error?.message,
					'Profile data:',
					profile
				);
				setRole(null); // Profil alınamazsa veya rol yoksa rolü temizle
				setFetchedRoleForUserId(null); // Başarılı rol bilgisi olan kullanıcı yok
				setStaffBranchId(null);
			}
			setLoading(false); // Veri çekme işlemi bittiğinde
		},
		[supabase] // supabase bağımlılığı stabil olduğu sürece fetchUserData da stabil kalır
	);

	useEffect(() => {
		setLoading(true); // useEffect başladığında genel bir yükleme durumu

		supabase.auth.getSession().then(({ data: { session } }) => {
			if (!mountedRef.current) return;
			console.log('TopNavbar: Initial getSession. User ID:', session?.user?.id);
			if (session?.user) {
				// Eğer mevcut rol bu kullanıcı için değilse veya hiç rol yoksa fetch et
				if (fetchedRoleForUserId !== session.user.id || !role) {
					fetchUserData(session.user.id);
				} else {
					setLoading(false); // Zaten bu kullanıcı için rol var ve yüklü
				}
			} else {
				setRole(null);
				setFetchedRoleForUserId(null);
				setStaffBranchId(null);
				setLoading(false);
			}
		});

		const { data: listener } = supabase.auth.onAuthStateChange(
			async (_event: string, session: Session | null) => {
				// Session tipini belirtelim
				if (!mountedRef.current) return;
				console.log(
					'TopNavbar: onAuthStateChange event:',
					_event,
					'Session user ID:',
					session?.user?.id
				);

				if (_event === 'SIGNED_OUT') {
					setRole(null);
					setFetchedRoleForUserId(null);
					setStaffBranchId(null);
					setLoading(false);
					if (pathname !== '/login' && pathname !== '/signup') {
						router.push('/login');
					} else {
						router.refresh();
					}
					return;
				}

				if (session?.user) {
					// Sadece kullanıcı ID'si değiştiyse, ya da henüz bu kullanıcı için rol çekilmemişse,
					// ya da profil güncelleme olayı geldiyse (USER_UPDATED) yeniden veri çek.
					// TOKEN_REFRESHED gibi olaylarda, eğer kullanıcı aynıysa ve rol zaten varsa,
					// tekrar fetchUserData çağırmayarak rolün kaybolmasını engelleyebiliriz.
					if (
						fetchedRoleForUserId !== session.user.id ||
						!role || // Henüz bir rol set edilmemişse
						_event === 'USER_UPDATED' || // Kullanıcı bilgileri güncellendiğinde
						_event === 'SIGNED_IN' // Yeni giriş yapıldığında
					) {
						fetchUserData(session.user.id);
					} else if (
						_event === 'TOKEN_REFRESHED' &&
						fetchedRoleForUserId === session.user.id &&
						role
					) {
						console.log(
							'TopNavbar: Token refreshed for same user, role retained.'
						);
						setLoading(false); // Yükleme durumunu false yap, çünkü rol zaten var.
					} else if (!role && fetchedRoleForUserId !== session.user.id) {
						// Bu durum genellikle ilk INITIAL_SESSION sonrası session.user geldiğinde ve henüz fetchUserData çağrılmadığında olabilir.
						fetchUserData(session.user.id);
					}
				} else if (_event !== 'SIGNED_OUT' && !session?.user) {
					// Oturum beklenmedik bir şekilde null olduysa (SIGNED_OUT dışında)
					setRole(null);
					setFetchedRoleForUserId(null);
					setStaffBranchId(null);
					setLoading(false);
				}
			}
		);

		return () => {
			listener?.subscription?.unsubscribe();
		};
	}, [supabase, router, pathname, fetchUserData, role, fetchedRoleForUserId]); // role ve fetchedRoleForUserId bağımlılıkları eklendi.

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

	// Navigasyon linklerini gösterme koşulu: !loading && role
	// `loading` state'i fetchUserData içinde ve auth state değişikliklerinde yönetiliyor.
	const showLinks = !loading && role;

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
