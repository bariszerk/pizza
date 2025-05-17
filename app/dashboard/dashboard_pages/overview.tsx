// app/dashboard/dashboard_pages/overview.tsx dosyasında değişiklikler
'use client';

import { useTheme } from 'next-themes'; // useTheme import edildi
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
	data: { name: string; total: number }[];
};

export function Overview({ data }: OverviewProps) {
	const { resolvedTheme } = useTheme(); // Mevcut çözümlenmiş temayı al (light veya dark)

	// Tema'ya göre renkleri belirle
	const tickColor = resolvedTheme === 'dark' ? '#a1a1aa' : '#71717a'; // zinc-500 (dark) vs zinc-400 (light) - muted-foreground için
	const legendColor = resolvedTheme === 'dark' ? '#e4e4e7' : '#3f3f46'; // zinc-200 (dark) vs zinc-700 (light) - foreground/popover-foreground için
	const tooltipBgColor = resolvedTheme === 'dark' ? '#27272a' : '#ffffff'; // zinc-800 (dark) vs white (light) - popover için
	const tooltipTextColor = resolvedTheme === 'dark' ? '#e4e4e7' : '#09090b'; // zinc-200 (dark) vs zinc-950 (light) - popover-foreground için
	const tooltipBorderColor = resolvedTheme === 'dark' ? '#3f3f46' : '#e4e4e7'; // zinc-700 (dark) vs zinc-200 (light) - border için

	const barColor =
		resolvedTheme === 'dark'
			? 'hsl(210 40% 96.1%)' /* primary-foreground gibi açık bir renk */
			: 'hsl(222.2 47.4% 11.2%)'; /* primary */

	if (!data || data.length === 0) {
		return (
			<div className="flex items-center justify-center h-[350px]">
				<p style={{ color: tickColor }}>Genel bakış için veri bulunamadı.</p>
			</div>
		);
	}

	return (
		<ResponsiveContainer width="100%" height={350}>
			<BarChart data={data}>
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
					tickFormatter={(value) => `$${value}`}
				/>
				<RechartsTooltip
					formatter={(value: number) => [`$${value.toFixed(2)}`, 'Kazanç']}
					cursor={{
						fill:
							resolvedTheme === 'dark'
								? 'rgba(161, 161, 170, 0.3)'
								: 'rgba(228, 228, 231, 0.3)',
					}} // accent benzeri bir renk
					contentStyle={{
						backgroundColor: tooltipBgColor,
						border: `1px solid ${tooltipBorderColor}`,
						borderRadius: '0.5rem', // globals.css'deki --radius gibi
						color: tooltipTextColor,
					}}
					labelStyle={{ color: tooltipTextColor }}
					itemStyle={{ color: tooltipTextColor }}
				/>
				<Legend
					wrapperStyle={{
						fontSize: '12px',
						color: legendColor,
						paddingTop: '10px',
					}}
				/>
				<Bar
					dataKey="total"
					radius={[4, 4, 0, 0]}
					fill={barColor} // Doğrudan JavaScript değişkeninden rengi ata
					// className="fill-primary" yerine fill prop'unu kullanmak daha garantili olabilir
				/>
			</BarChart>
		</ResponsiveContainer>
	);
}
