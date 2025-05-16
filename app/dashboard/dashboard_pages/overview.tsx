// app/dashboard/dashboard_pages/overview.tsx
'use client';

import {
	Bar,
	BarChart,
	Legend,
	Tooltip as RechartsTooltip,
	ResponsiveContainer,
	XAxis,
	YAxis,
} from 'recharts';

type OverviewProps = {
	data: { name: string; total: number }[]; // Gelen veri tipi
};

export function Overview({ data }: OverviewProps) {
	// data prop'unu al
	if (!data || data.length === 0) {
		return (
			<div className="flex items-center justify-center h-[350px]">
				<p>Genel bakış için veri bulunamadı.</p>
			</div>
		);
	}
	return (
		<ResponsiveContainer width="100%" height={350}>
			<BarChart data={data}>
				<XAxis
					dataKey="name"
					stroke="hsl(var(--muted-foreground))" // Tailwind değişkeni kullanıldı
					fontSize={12}
					tickLine={false}
					axisLine={false}
				/>
				<YAxis
					stroke="hsl(var(--muted-foreground))" // Tailwind değişkeni kullanıldı
					fontSize={12}
					tickLine={false}
					axisLine={false}
					tickFormatter={(value) => `$${value}`}
				/>
				<RechartsTooltip
					formatter={(value: number) => [`$${value.toFixed(2)}`, 'Kazanç']}
					cursor={{ fill: 'transparent' }}
					contentStyle={{
						backgroundColor: 'hsl(var(--background))',
						border: '1px solid hsl(var(--border))',
						borderRadius: 'var(--radius)',
					}}
					labelStyle={{ color: 'hsl(var(--foreground))' }}
				/>
				<Legend wrapperStyle={{ fontSize: '12px' }} />
				<Bar
					dataKey="total"
					//   fill="hsl(var(--primary))" // Tailwind değişkeni kullanıldı
					radius={[4, 4, 0, 0]}
					className="fill-primary" // Shadcn/ui'nin primary rengini kullanır
				/>
			</BarChart>
		</ResponsiveContainer>
	);
}
