// app/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Home() {
	const [role, setRole] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

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
			setLoading(false);
		}
		fetchRole();
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<p>Yükleniyor...</p>
			</div>
		);
	}

	// Eğer login olmamışsa veya user rolündeyse
	if (!role || role === 'user') {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen space-y-4 px-4 text-center">
				{!role && (
					// Henüz login olmamış kullanıcılar için
					<Link href="/login">
						<Button variant="outline">Go to Login</Button>
					</Link>
				)}
				{role === 'user' && (
					// Sadece user rolündeki kullanıcılar için
					<p className="text-gray-600">
						Yetkilendirme işleminiz için lütfen bekleyiniz.
					</p>
				)}
			</div>
		);
	}

	// admin, manager, branch_staff gibi roller için normal ana sayfa
	return (
		<div className="flex flex-col items-center justify-center min-h-screen space-y-4">
			<Link href="/login">
				<Button variant="outline">Go to Login</Button>
			</Link>
			<Link href="/dashboard">
				<Button variant="outline">Go to Dashboard</Button>
			</Link>
		</div>
	);
}
