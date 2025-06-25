// components/sign-up-form.tsx
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
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SignUpForm({
	className,
	...props
}: React.ComponentProps<'div'>) {
	const [email, setEmail] = useState('');
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);

		if (password !== confirmPassword) {
			setError('Şifreler eşleşmiyor');
			return;
		}

		setLoading(true);

		const supabase = createClient();

		// Auth üzerinden kayıt işlemi
		const { data, error: signUpError } = await supabase.auth.signUp({
			email,
			password,
		});

		if (signUpError) {
			setError(signUpError.message);
			setLoading(false);
			return;
		}

		// Eğer kullanıcı başarılı bir şekilde oluşturulduysa,
		// Supabase trigger'ı sayesinde profiles tablosuna otomatik olarak id ve email eklenmiştir.
		// Şimdi profili güncelleyerek ek bilgiler (first_name, last_name, role) ekleyelim.
		if (data?.user) {
			const { error: updateError } = await supabase
				.from('profiles')
				.update({
					first_name: firstName,
					last_name: lastName,
					role: 'user', // Örneğin varsayılan bir rol atayabilirsiniz
				})
				.eq('id', data.user.id);

			if (updateError) {
				setError(updateError.message);
				setLoading(false);
				return;
			}

			console.log('Kayıt ve profil güncelleme başarılı:', data);
			// Redirect to the email verification page
			router.push('/verify-email');
		}

		setLoading(false);
	}

	return (
		<div className={cn('flex flex-col gap-6', className)} {...props}>
			<Card>
				<CardHeader>
					<CardTitle>Yeni Hesap Oluştur</CardTitle>
					<CardDescription>
						Yeni bir hesap oluşturmak için e-posta, ad, soyad ve şifrenizi
						girin.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit}>
						<div className="flex flex-col gap-6">
							{/* E-posta */}
							<div className="grid gap-3">
								<Label htmlFor="email">E-posta</Label>
								<Input
									id="email"
									type="email"
									placeholder="ornek@eposta.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
								/>
							</div>
							{/* Ad */}
							<div className="grid gap-3">
								<Label htmlFor="first-name">Ad</Label>
								<Input
									id="first-name"
									type="text"
									placeholder="Ahmet"
									value={firstName}
									onChange={(e) => setFirstName(e.target.value)}
									required
								/>
							</div>
							{/* Soyad */}
							<div className="grid gap-3">
								<Label htmlFor="last-name">Soyad</Label>
								<Input
									id="last-name"
									type="text"
									placeholder="Yılmaz"
									value={lastName}
									onChange={(e) => setLastName(e.target.value)}
									required
								/>
							</div>
							{/* Şifre */}
							<div className="grid gap-3">
								<Label htmlFor="password">Şifre</Label>
								<Input
									id="password"
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
								/>
							</div>
							{/* Şifreyi Onayla */}
							<div className="grid gap-3">
								<Label htmlFor="confirm-password">Şifreyi Onayla</Label>
								<Input
									id="confirm-password"
									type="password"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									required
								/>
							</div>
							{error && <div className="text-red-500 text-sm">{error}</div>}
							<div className="flex flex-col gap-3">
								<Button type="submit" className="w-full" disabled={loading}>
									{loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
								</Button>
							</div>
						</div>
						<div className="mt-4 text-center text-sm">
							Zaten hesabınız var mı?{' '}
							<a href="/login" className="underline underline-offset-4">
								Giriş Yapın
							</a>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
