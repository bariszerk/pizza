'use client';

import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/ui/theme-toggle-button';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { UserStatus } from './user-status';

export function TopNavbar() {
	const [role, setRole] = useState<string | null>(null);

	useEffect(() => {
		async function fetchRole() {
			const supabase = createClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (user) {
				const { data, error } = await supabase
					.from('profiles')
					.select('role')
					.eq('id', user.id)
					.single();
				if (!error) {
					setRole(data.role);
				}
			}
		}
		fetchRole();
	}, []);

	// Eğer henüz rol gelmemişse veya loading aşamasındaysa boş dönebiliriz
	if (role === null) {
		return null;
	}

	return (
		<header className="bg-background border-b border-border px-4 py-3">
			<div className="container mx-auto flex items-center justify-between">
				<nav className="flex items-center space-x-4">
					{/* Herkes Dashboard'a gidebilir */}
					<Link href="/dashboard">
						<Button variant="ghost">Dashboard</Button>
					</Link>

					{/* branch_staff ve manager için şube linki */}
					{(role === 'branch_staff' ||
						role === 'manager' ||
						role === 'admin') && (
						<Link href="/branch/adana">
							<Button variant="ghost">Şube</Button>
						</Link>
					)}

					{/* manager ve admin için settings */}
					{(role === 'manager' || role === 'admin') && (
						<Link href="/settings">
							<Button variant="ghost">Settings</Button>
						</Link>
					)}

					{/* Sadece admin */}
					{role === 'admin' && (
						<Link href="/admin/roles">
							<Button variant="ghost">Admin</Button>
						</Link>
					)}
				</nav>

				<div className="flex items-center space-x-4">
					<ModeToggle />
					{/* UserStatus, oturum bilgisini ve logout butonunu gösterir */}
					<UserStatus />
				</div>
			</div>
		</header>
	);
}
