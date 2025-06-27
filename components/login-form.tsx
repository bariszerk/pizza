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
import { cn } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link'; // Added Link import
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LoginForm({
	className,
	...props
}: React.ComponentProps<'div'>) {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setLoading(true);

		const { data, error } = await createClient().auth.signInWithPassword({
			email,
			password,
		});
		if (data) {
			console.log('Giriş başarılı:', data);
		}

		if (error) {
			// Kullanıcı adı veya şifre yanlışsa genel bir hata mesajı göster
			if (error.message === 'Invalid login credentials') {
				setError('Geçersiz e-posta veya şifre.');
				// E-posta doğrulanmamışsa verify-email sayfasına yönlendir
			} else if (error.message.includes('Email not confirmed')) {
				router.push('/verify-email');
				// setError('Lütfen e-posta adresinizi doğrulayın.'); // İsteğe bağlı: yönlendirme öncesi mesaj
				setLoading(false);
				return;
			} else {
				setError(error.message);
			}
			setLoading(false);
			return;
		}

		// Giriş başarılıysa ve kullanıcı bilgisi varsa yönlendirme yap
		if (data?.user) {
			// Kullanıcının e-postasının doğrulanıp doğrulanmadığını kontrol et
			// Supabase'den gelen user objesinde email_confirmed_at alanı bu bilgiyi tutar
			if (data.user.email_confirmed_at) {
				router.push('/dashboard');
			} else {
				// Bu durum normalde yukarıdaki error.message.includes('Email not confirmed') tarafından yakalanmalı
				// ancak ek bir güvenlik katmanı olarak burada da kontrol edilebilir.
				router.push('/verify-email');
			}
		} else {
			// data.user yoksa beklenmedik bir durum, genel hata
			setError('Giriş sırasında bir sorun oluştu. Lütfen tekrar deneyin.');
		}

		setLoading(false);
	}

	return (
		<div className={cn('flex flex-col gap-6', className)} {...props}>
			<Card>
				<CardHeader>
					<CardTitle>Hesabınıza Giriş Yapın</CardTitle>
					<CardDescription>
						Hesabınıza giriş yapmak için e-posta adresinizi ve şifrenizi girin
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit}>
						<div className="flex flex-col gap-6">
							<div className="grid gap-3">
								<Label htmlFor="email">E-posta</Label>
								<Input
									id="email"
									type="email"
									placeholder="ornek@example.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
								/>
							</div>
							<div className="grid gap-3">
								<div className="flex items-center">
									<Label htmlFor="password">Şifre</Label>
									<Link
										href="/forgot-password"
										className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
									>
										Şifrenizi mi unuttunuz?
									</Link>
								</div>
								<Input
									id="password"
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
								/>
							</div>
							{error && <div className="text-red-500 text-sm">{error}</div>}
							<div className="flex flex-col gap-3">
								<Button type="submit" className="w-full" disabled={loading}>
									{loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
								</Button>
							</div>
						</div>
						<div className="mt-4 text-center text-sm">
							Hesabınız yok mu?{' '}
							<a href="/signup" className="underline underline-offset-4">
								Kayıt Ol
							</a>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
