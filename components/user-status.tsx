'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createClient } from '@/utils/supabase/client';
import { Session } from '@supabase/supabase-js';
import { LogOutIcon, SettingsIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // useRouter import edildi
import { useEffect, useState } from 'react';

export function UserStatus() {
	const [session, setSession] = useState<Session | null>(null);
	const router = useRouter(); // useRouter hook'u kullanıldı
	const supabase = createClient();

	useEffect(() => {
		// Check for an existing session on component mount
		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session);
		});

		// Listen for auth state changes
		const { data: subscription } = supabase.auth.onAuthStateChange(
			(_event, session) => {
				setSession(session);
			}
		);

		return () => subscription?.subscription?.unsubscribe();
	}, [supabase.auth]);

	async function handleLogout() {
		const response = await fetch('/logout', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
		});

		if (response.ok) {
			const data = await response.json();
			if (data.success) {
				// İstemci tarafında session'ı temizle ve yönlendir
				await supabase.auth.signOut(); // Bu hala gerekli olabilir, session'ı client'ta temizler
				router.push('/login');
				router.refresh(); // Sayfayı yenileyerek state'in güncellenmesini sağla
			} else {
				console.error('Logout failed:', data.error);
			}
		} else {
			console.error('Logout request failed:', response.statusText);
		}
	}

	if (session) {
		// You can adjust the user object properties as needed.
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
						<Link href="/private">
							<div className="flex items-center">
								<SettingsIcon className="mr-2 h-4 w-4" />
								Ayarlar
							</div>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={handleLogout}>
						<div className="flex items-center">
							<LogOutIcon className="mr-2 h-4 w-4" />
							Çıkış Yap
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
