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
			setError(error.message);
			setLoading(false);
			return;
		}

		// Giriş başarılıysa yönlendirme yapabilirsiniz, örneğin dashboard'a
		router.push('/dashboard');
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
									<a
										href="#"
										className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
									>
										Şifrenizi mi unuttunuz?
									</a>
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
