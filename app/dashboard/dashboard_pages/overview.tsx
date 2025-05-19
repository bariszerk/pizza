// app/dashboard/dashboard_pages/overview.tsx
'use client';

import { useTheme } from 'next-themes';
import {
	Bar,
	CartesianGrid,
	Cell,
	ComposedChart,
	Legend,
	Line,
	Tooltip as RechartsTooltip,
	ResponsiveContainer,
	XAxis,
	YAxis,
} from 'recharts';

import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

// Grafik üzerindeki her bir veri noktası için tip
export type OverviewChartDataPoint = {
	name: string; // Gösterim için formatlanmış tarih (örn: 19 May)
	originalDate: string; // "yyyy-MM-dd" formatında, tıklama olayı için
	kazanc: number;
	netKar: number;
};

type OverviewProps = {
	data: OverviewChartDataPoint[];
	onBarClick?: (dataPoint: OverviewChartDataPoint, index: number) => void; // Tıklama işleyicisi prop'u
};

export function Overview({ data, onBarClick }: OverviewProps) {
	const { resolvedTheme } = useTheme();

	const tickColor = resolvedTheme === 'dark' ? '#a1a1aa' : '#71717a';
	const legendColor = resolvedTheme === 'dark' ? '#e4e4e7' : '#3f3f46';
	const tooltipBgColor = resolvedTheme === 'dark' ? '#27272a' : '#ffffff';
	const tooltipTextColor = resolvedTheme === 'dark' ? '#e4e4e7' : '#09090b';
	const tooltipBorderColor = resolvedTheme === 'dark' ? '#3f3f46' : '#e4e4e7';

	const kazancBarColor =
		resolvedTheme === 'dark'
			? 'hsl(142.1 70.6% 45.3%)'
			: 'hsl(142.1 76.2% 36.3%)';
	const netKarLineColor =
		resolvedTheme === 'dark'
			? 'hsl(262.1 83.3% 57.8%)'
			: 'hsl(262.1 83.3% 57.8%)';

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
				// onClick={(chartData) => { // Bu genel tıklama, belirli bir bar için değil
				//   if (chartData && chartData.activePayload && chartData.activePayload.length > 0 && onBarClick) {
				//     const clickedData = chartData.activePayload[0].payload as OverviewChartDataPoint;
				//     // activeTooltipIndex, tıklanan bar'ın index'ini verir.
				//     if (chartData.activeTooltipIndex !== undefined) {
				//        onBarClick(clickedData, chartData.activeTooltipIndex);
				//     }
				//   }
				// }}
			>
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
					tickFormatter={(value) => `₺${value.toFixed(0)}`} // Küsüratsız
				/>
				<RechartsTooltip
					formatter={(value: number, nameKey: string) => {
						const currencyValue = `₺${value.toFixed(2)}`;
						if (nameKey === 'kazanc') return [currencyValue, 'Günlük Kazanç'];
						if (nameKey === 'netKar') return [currencyValue, 'Günlük Net Kâr'];
						return [currencyValue, nameKey];
					}}
					labelFormatter={(label, payload) => {
						// payload genellikle bir array, ilk elemanını alalım
						if (payload && payload.length > 0) {
							const dataPoint = payload[0].payload as OverviewChartDataPoint;
							// originalDate'i dd MMMM yyyy formatına çevirerek gösterelim
							try {
								return format(
									parseISO(dataPoint.originalDate),
									'dd MMMM yyyy',
									{ locale: tr }
								);
							} catch (_) {
								return dataPoint.name; // Hata durumunda XAxis'teki name'i kullan
							}
						}
						return label;
					}}
					cursor={{
						fill:
							resolvedTheme === 'dark'
								? 'rgba(161, 161, 170, 0.1)'
								: 'rgba(228, 228, 231, 0.2)',
					}}
					contentStyle={{
						backgroundColor: tooltipBgColor,
						border: `1px solid ${tooltipBorderColor}`,
						borderRadius: '0.5rem',
						color: tooltipTextColor,
						boxShadow:
							'0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
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
					name="kazanc"
					fill={kazancBarColor}
					radius={[4, 4, 0, 0]}
					barSize={20}
					onClick={
						onBarClick
							? (barData, index) =>
									onBarClick(barData as OverviewChartDataPoint, index)
							: undefined
					} // Tıklama işleyicisini Bar'a ekle
				>
					{data.map(
						(
							entry,
							index // Tıklanabilirliği artırmak için her bara bir Cell
						) => (
							<Cell key={`cell-${index}`} cursor="pointer" />
						)
					)}
				</Bar>
				<Line
					type="monotone"
					dataKey="netKar"
					name="netKar"
					stroke={netKarLineColor}
					strokeWidth={2}
					dot={{ r: 4, strokeWidth: 2, fill: netKarLineColor }}
					activeDot={{ r: 6, strokeWidth: 2 }}
				/>
			</ComposedChart>
		</ResponsiveContainer>
	);
}
