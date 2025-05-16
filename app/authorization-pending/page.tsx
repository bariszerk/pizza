// app/authorization-pending/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AuthorizationPendingPage() {
	return (
		<div className="flex flex-col items-center justify-center min-h-auto space-y-6 px-4 text-center">
			<h1 className="text-3xl font-semibold">Yetkilendirme Bekleniyor</h1>
			<p className="text-gray-600 max-w-md">
				Hesabınıza yönetici tarafından rol ataması yapılana kadar bu alana
				erişiminiz kısıtlanmıştır. Lütfen daha sonra tekrar kontrol edin.
			</p>
			<Link href="/">
				<Button variant="outline">Ana Sayfaya Dön</Button>
			</Link>
		</div>
	);
}
