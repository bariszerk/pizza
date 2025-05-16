// app/dashboard/dashboard_pages/recent-sales.tsx
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type Sale = {
	id: string; // veya number
	name: string; // Örn: Kullanıcı adı veya Şube Adı
	email: string; // Örn: Kullanıcı emaili veya özet
	amount: number;
};

type RecentSalesProps = {
	data: Sale[];
};

export function RecentSales({ data }: RecentSalesProps) {
	if (!data || data.length === 0) {
		return (
			<div className="text-sm text-muted-foreground">
				Yakın zamanda satış bulunamadı.
			</div>
		);
	}
	return (
		<div className="space-y-6">
			{' '}
			{/* Space-y-8 yerine 6 yapıldı, daha sıkı olabilir */}
			{data.map((sale) => (
				<div key={sale.id} className="flex items-center">
					<Avatar className="h-9 w-9">
						{/* <AvatarImage src="/avatars/01.png" alt={sale.name} /> */}
						<AvatarFallback>
							{sale.name?.substring(0, 2).toUpperCase() || '??'}
						</AvatarFallback>
					</Avatar>
					<div className="ml-4 space-y-1">
						<p className="text-sm font-medium leading-none">{sale.name}</p>
						<p
							className="text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]"
							title={sale.email}
						>
							{sale.email}
						</p>
					</div>
					<div
						className={`ml-auto font-medium ${
							sale.amount >= 0 ? 'text-green-600' : 'text-red-600'
						}`}
					>
						{sale.amount >= 0 ? '+' : ''}${Math.abs(sale.amount).toFixed(2)}
					</div>
				</div>
			))}
		</div>
	);
}
