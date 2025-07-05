// app/page.tsx
'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
        const [loading, setLoading] = useState(true);
        const router = useRouter();

	useEffect(() => {
		async function fetchRole() {
			const supabase = createClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				router.push('/login');
				return;
			}

			const { data, error } = await supabase
				.from('profiles')
				.select('role')
				.eq('id', user.id)
				.single();

			if (error || !data) {
				console.error('Error fetching profile:', error);
				// Handle error, maybe redirect to a generic error page or login
				router.push('/login');
				return;
			}

                        const userRole = data.role;

			if (userRole === 'user') {
				router.push('/authorization-pending');
			} else {
				router.push('/dashboard');
			}
			setLoading(false);
		}
		fetchRole();
	}, [router]);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<p className="text-lg">Yükleniyor, lütfen bekleyin...</p>
			</div>
		);
	}

	return null; // No content to render, as redirection handles everything
}
