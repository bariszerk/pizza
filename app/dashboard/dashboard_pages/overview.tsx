// app/dashboard/dashboard_pages/overview.tsx
'use client';

import { useTheme } from 'next-themes';
import {
	Bar,
	CartesianGrid,
	ComposedChart,
	Legend, // ComposedChart eklendi
	Line,
	Tooltip as RechartsTooltip,
	ResponsiveContainer,
	XAxis,
	YAxis,
} from 'recharts';

type OverviewProps = {
	data: { name: string; kazanc: number; netKar: number }[]; // Data tipi güncellendi
};

export function Overview({ data }: OverviewProps) {
	const { resolvedTheme } = useTheme();

	const tickColor = resolvedTheme === 'dark' ? '#a1a1aa' : '#71717a';
	const legendColor = resolvedTheme === 'dark' ? '#e4e4e7' : '#3f3f46';
	const tooltipBgColor = resolvedTheme === 'dark' ? '#27272a' : '#ffffff';
	const tooltipTextColor = resolvedTheme === 'dark' ? '#e4e4e7' : '#09090b';
	const tooltipBorderColor = resolvedTheme === 'dark' ? '#3f3f46' : '#e4e4e7';

	// Renkler tema değişkenlerinden alınabilir veya sabit kalabilir
	const kazancBarColor =
		resolvedTheme === 'dark'
			? 'hsl(142.1 70.6% 45.3%)'
			: 'hsl(142.1 76.2% 36.3%)'; // Yeşil tonu
	const netKarLineColor =
		resolvedTheme === 'dark'
			? 'hsl(262.1 83.3% 57.8%)'
			: 'hsl(262.1 83.3% 57.8%)'; // Mor/Mavi tonu (veya farklı bir bar için başka bir renk)
	// const netKarBarColor = resolvedTheme === 'dark' ? 'hsl(210 40% 96.1%)' : 'hsl(222.2 47.4% 11.2%)'; // Örnek renk

	if (!data || data.length === 0) {
		return (
			<div className="flex items-center justify-center h-[350px]">
				<p style={{ color: tickColor }}>Genel bakış için veri bulunamadı.</p>
			</div>
		);
	}

	return (
		<ResponsiveContainer width="100%" height={350}>
			<ComposedChart
				data={data}
				margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
			>
				{' '}
				{/* Margin ayarlandı */}
				<CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
				<XAxis
					dataKey="name"
					stroke={tickColor}
					fontSize={12}
					tickLine={false}
					axisLine={false}
				/>
				<YAxis
					stroke={tickColor}
					fontSize={12}
					tickLine={false}
					axisLine={false}
					tickFormatter={(value) => `₺${value}`}
				/>
				<RechartsTooltip
					formatter={(value: number, name: string) => {
						const currencyValue = `₺${value.toFixed(2)}`;
						if (name === 'kazanc') return [currencyValue, 'Günlük Kazanç'];
						if (name === 'netKar') return [currencyValue, 'Günlük Net Kâr'];
						return [currencyValue, name];
					}}
					cursor={{
						fill:
							resolvedTheme === 'dark'
								? 'rgba(161, 161, 170, 0.1)' // Daha transparan
								: 'rgba(228, 228, 231, 0.2)', // Daha transparan
					}}
					contentStyle={{
						backgroundColor: tooltipBgColor,
						border: `1px solid ${tooltipBorderColor}`,
						borderRadius: '0.5rem',
						color: tooltipTextColor,
						boxShadow:
							'0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', // Hafif gölge
					}}
					labelStyle={{
						color: tooltipTextColor,
						fontWeight: 'bold',
						marginBottom: '4px',
					}}
					itemStyle={{ color: tooltipTextColor }}
				/>
				<Legend
					wrapperStyle={{
						fontSize: '12px',
						color: legendColor,
						paddingTop: '10px',
					}}
					payload={[
						// Legend'ı manuel olarak tanımlayabiliriz
						{
							value: 'Günlük Kazanç',
							type: 'square',
							id: 'kazanc',
							color: kazancBarColor,
						},
						{
							value: 'Günlük Net Kâr',
							type: 'line',
							id: 'netKar',
							color: netKarLineColor,
						},
					]}
				/>
				<Bar
					dataKey="kazanc"
					name="kazanc" // Tooltip ve Legend için
					fill={kazancBarColor}
					radius={[4, 4, 0, 0]}
					barSize={20} // Bar kalınlığını ayarlayabilirsiniz
				/>
				<Line
					type="monotone"
					dataKey="netKar"
					name="netKar" // Tooltip ve Legend için
					stroke={netKarLineColor}
					strokeWidth={2}
					dot={{ r: 4, strokeWidth: 2, fill: netKarLineColor }}
					activeDot={{ r: 6, strokeWidth: 2 }}
				/>
			</ComposedChart>
		</ResponsiveContainer>
	);
}
