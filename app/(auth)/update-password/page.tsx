// app/(auth)/update-password/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';
import { toast } from 'sonner';

/**
 * Bu bileşen, kullanıcının yeni şifresini girmesi ve güncellemesi için
 * gerekli form alanlarını ve mantığı içerir.
 * Supabase'in `PASSWORD_RECOVERY` olayı, kullanıcının bu sayfaya
 * geldiğinde zaten geçici bir oturum açmasını sağlar. Bu nedenle
 * ek bir `useEffect` ile olayı dinlememize gerek yoktur.
 */
function UpdatePasswordFormComponent() {
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState('');
	const [error, setError] = useState('');
	const router = useRouter();

	// handleSubmit fonksiyonunu aktif hale getiriyoruz.
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault(); // Formun sayfayı yenilemesini engelle

		// Şifrelerin eşleşip eşleşmediğini kontrol et
		if (password !== confirmPassword) {
			const errorMessage = 'Şifreler eşleşmiyor.';
			setError(errorMessage);
			toast.error(errorMessage);
			return;
		}

		// Şifre en az 6 karakter olmalı (Supabase varsayılanı)
		if (password.length < 6) {
			const errorMessage = 'Şifre en az 6 karakter olmalıdır.';
			setError(errorMessage);
			toast.error(errorMessage);
			return;
		}

		setLoading(true);
		setMessage('');
		setError('');

		const supabase = createClient();
		// Kullanıcı şifre sıfırlama linki ile geldiği için zaten yetkilendirilmiş durumda.
		// Bu sayede updateUser fonksiyonunu güvenle çağırabiliriz.
		const { error: updateError } = await supabase.auth.updateUser({ password });

		setLoading(false);

		if (updateError) {
			const errorMessage = 'Şifre güncellenemedi: ' + updateError.message;
			setError(errorMessage);
			toast.error(errorMessage);
		} else {
			const successMessage =
				'Şifreniz başarıyla güncellendi. Şimdi giriş yapabilirsiniz.';
			setMessage(successMessage);
			toast.success(successMessage);
			// Kullanıcıyı 2 saniye sonra giriş sayfasına yönlendir
			setTimeout(() => {
				router.push('/login');
			}, 2000);
		}
	};

	return (
		<div className="flex min-h-auto w-full items-center justify-center p-6 md:p-10">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Yeni Şifrenizi Oluşturun</CardTitle>
					<CardDescription>
						Lütfen yeni şifrenizi girin ve onaylayın.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit}>
						<div className="grid gap-4">
							<div className="grid gap-2">
								<Label htmlFor="password">Yeni Şifre</Label>
								<Input
									id="password"
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									disabled={loading}
									placeholder="••••••••"
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="confirm-password">Yeni Şifreyi Onayla</Label>
								<Input
									id="confirm-password"
									type="password"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									required
									disabled={loading}
									placeholder="••••••••"
								/>
							</div>
							{message && <p className="text-sm text-green-600">{message}</p>}
							{error && <p className="text-sm text-red-600">{error}</p>}
							<Button type="submit" className="w-full" disabled={loading}>
								{loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}

// Sayfanın ana bileşeni, Suspense ile sarmalanmış.
export default function UpdatePasswordPage() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen w-full items-center justify-center">
					Yükleniyor...
				</div>
			}
		>
			<UpdatePasswordFormComponent />
		</Suspense>
	);
}
