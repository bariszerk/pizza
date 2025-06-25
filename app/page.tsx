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
				<p className="text-lg">Yükleniyor, lütfen bekleyin...</p>
			</div>
		);
	}

	// Eğer login olmamışsa veya user rolündeyse
	if (!role || role === 'user') {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen space-y-6 px-4 text-center">
				{!role && (
					// Henüz login olmamış kullanıcılar için
					<>
						<h1 className="text-2xl font-semibold">Hoş Geldiniz!</h1>
						<p className="text-muted-foreground">
							Devam etmek için lütfen giriş yapın veya yeni hesap oluşturun.
						</p>
						<div className="flex gap-4">
							<Link href="/login">
								<Button>Giriş Yap</Button>
							</Link>
							<Link href="/signup">
								<Button variant="outline">Kayıt Ol</Button>
							</Link>
						</div>
					</>
				)}
				{role === 'user' && (
					// Sadece user rolündeki kullanıcılar için
					<>
						<h1 className="text-2xl font-semibold">Hesabınız İnceleniyor</h1>
						<p className="text-muted-foreground max-w-md">
							Hesabınız oluşturuldu ve yönetici onayı için gönderildi.
							Yetkilendirme işleminiz tamamlandığında sisteme erişebileceksiniz.
							Anlayışınız için teşekkür ederiz.
						</p>
						{/* İsteğe bağlı: Çıkış yap butonu eklenebilir */}
						{/* <Link href="/logout"> <Button variant="link">Çıkış Yap</Button> </Link> */}
					</>
				)}
			</div>
		);
	}

	// admin, manager, branch_staff gibi roller için normal ana sayfa
	// Bu kısım genellikle kullanıcıyı doğrudan dashboard'a yönlendirir.
	// Şimdilik butonları bırakıyorum ama idealde useEffect ile redirect olmalı.
	return (
		<div className="flex flex-col items-center justify-center min-h-screen space-y-6 text-center px-4">
			<h1 className="text-3xl font-bold">Ana Sayfa</h1>
			<p className="text-muted-foreground">
				Hoş geldiniz, {role === 'admin' ? 'Yönetici' : role === 'manager' ? 'Müdür' : 'Personel'}.
			</p>
			<div className="flex flex-wrap gap-4 justify-center">
				<Link href="/dashboard">
					<Button size="lg">Kontrol Paneline Git</Button>
				</Link>
				{/* Başka linkler veya bilgiler eklenebilir */}
			</div>
		</div>
	);
}
