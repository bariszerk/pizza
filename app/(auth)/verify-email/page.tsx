// app/(auth)/verify-email/page.tsx
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';

export default function VerifyEmailPage() {
	return (
		<div className="flex min-h-auto w-full items-center justify-center p-6 md:p-10">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>E-postanızı Doğrulayın</CardTitle>
					<CardDescription>
						Kayıt işleminizi tamamlamak için lütfen e-posta adresinize
						gönderilen doğrulama bağlantısına tıklayın. E-postayı gelen
						kutunuzda bulamıyorsanız, lütfen spam veya gereksiz e-posta
						klasörlerinizi de kontrol edin.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						Doğrulama linkine tıkladıktan sonra giriş yapabilirsiniz.
					</p>
					<div className="mt-6 flex flex-col items-center">
						<Link
							href="/login"
							className="text-sm text-primary hover:underline"
						>
							Giriş sayfasına dön
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
