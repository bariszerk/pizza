'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LoadingSpinner } from '@/components/ui/loading-spinner'; // LoadingSpinner import edildi
import { createClient } from '@/utils/supabase/client';
import { Session } from '@supabase/supabase-js';
import { LogOutIcon, SettingsIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react'; // useTransition import edildi

export function UserStatus() {
	const [session, setSession] = useState<Session | null>(null);
	const [isLoggingOut, startLogoutTransition] = useTransition(); // Çıkış işlemi için transition
	const router = useRouter();
	const supabase = createClient();

	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session);
		});

		const { data: subscription } = supabase.auth.onAuthStateChange(
			(_event, session) => {
				setSession(session);
			}
		);

		return () => subscription?.subscription?.unsubscribe();
	}, [supabase.auth]);

	async function handleLogout() {
		startLogoutTransition(async () => {
			const response = await fetch('/logout', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
			});

			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					await supabase.auth.signOut();
					router.push('/login');
					router.refresh();
				} else {
					console.error('Logout failed:', data.error);
					// Kullanıcıya hata mesajı gösterilebilir (örn: toast)
				}
			} else {
				console.error('Logout request failed:', response.statusText);
				// Kullanıcıya hata mesajı gösterilebilir
			}
		});
	}

	if (session) {
		const user = {
			name: session.user.email,
			email: session.user.email,
			avatar: '/placeholder-avatar.png', // Replace with your user's avatar if available
		};

		return (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button className="flex items-center focus:outline-none">
						<Avatar className="h-10 w-10 rounded-full">
							<AvatarImage src={user.avatar} alt={user.name} />
							<AvatarFallback>
								{user.name?.[0]?.toUpperCase() || 'U'}
							</AvatarFallback>
						</Avatar>
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-40" align="end">
                                        <DropdownMenuItem asChild>
                                                <Link href="/settings">
							<div className="flex items-center">
								<SettingsIcon className="mr-2 h-4 w-4" />
								Ayarlar
							</div>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={handleLogout} disabled={isLoggingOut}>
						<div className="flex items-center">
							{isLoggingOut ? (
								<LoadingSpinner size={16} />
							) : (
								<LogOutIcon className="mr-2 h-4 w-4" />
							)}
							<span className="ml-2">
								{isLoggingOut ? 'Çıkış Yapılıyor...' : 'Çıkış Yap'}
							</span>
						</div>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		);
	}

	// If there's no session, display a Login button.
	return (
		<Link href="/login">
			<Button variant="ghost">Giriş Yap</Button>
		</Link>
	);
}
