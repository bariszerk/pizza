// app/dashboard/dashboard_pages/net-profit-chart.tsx
'use client';

import { useTheme } from 'next-themes';
import {
	AreaChart,
	Area,
	CartesianGrid,
	Tooltip as RechartsTooltip,
	ResponsiveContainer,
	XAxis,
	YAxis,
	Legend,
} from 'recharts';
import { TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

// Grafik üzerindeki her bir veri noktası için tip (Overview'dan gelen data ile uyumlu)
export type NetProfitChartDataPoint = {
	name: string; // Gösterim için formatlanmış tarih (örn: 19 May)
	originalDate: string; // "yyyy-MM-dd"
	netKar: number;
	// kazanc bu grafikte doğrudan kullanılmayacak ama data içinde olabilir
	kazanc?: number;
};

type NetProfitChartProps = {
	data: NetProfitChartDataPoint[];
	// Bu grafikte tıklama olmayacaksa onBarClick kaldırılabilir.
};

// Özel Tooltip İçeriği (Sadece Net Kâr için)
const CustomNetProfitTooltip = ({ active, payload }: TooltipProps<ValueType, NameType>) => {
  const { resolvedTheme } = useTheme();
  const tooltipBgColor = resolvedTheme === 'dark' ? '#27272a' : '#ffffff';
  const tooltipTextColor = resolvedTheme === 'dark' ? '#e4e4e7' : '#09090b';
  const tooltipBorderColor = resolvedTheme === 'dark' ? '#3f3f46' : '#e4e4e7';

  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload as NetProfitChartDataPoint;
    const formattedDate = format(parseISO(dataPoint.originalDate), 'dd MMMM yyyy', { locale: tr });

    return (
      <div
        style={{
          backgroundColor: tooltipBgColor,
          border: `1px solid ${tooltipBorderColor}`,
          borderRadius: '0.5rem',
          padding: '10px',
          color: tooltipTextColor,
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          fontSize: '12px',
        }}
      >
        <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>{formattedDate}</p>
        <p style={{ color: payload[0].color || tooltipTextColor, margin: '2px 0' }}>
          {`Günlük Net Kâr: ₺${Number(payload[0].value).toFixed(2)}`}
        </p>
      </div>
    );
  }
  return null;
};

export function NetProfitChart({ data }: NetProfitChartProps) {
	const { resolvedTheme } = useTheme();

	const tickColor = resolvedTheme === 'dark' ? '#a1a1aa' : '#71717a';
	const legendColor = resolvedTheme === 'dark' ? '#e4e4e7' : '#3f3f46';

	const netKarAreaColor =
		resolvedTheme === 'dark'
			? 'hsl(262.1 83.3% 57.8%)' // Mor tonu
			: 'hsl(262.1 83.3% 67.8%)'; // Biraz daha açık mor

	const netKarAreaStrokeColor =
		resolvedTheme === 'dark'
			? 'hsl(262.1 83.3% 47.8%)'
			: 'hsl(262.1 83.3% 57.8%)';


	if (!data || data.length === 0) {
		return (
			<div className="flex items-center justify-center h-[350px]">
				<p style={{ color: tickColor }}>Net kâr verisi bulunamadı.</p>
			</div>
		);
	}

	// Net kar 0'ın altına düşerse alan rengini değiştirmek için bir gradient tanımlayabiliriz.
	// Bu, `<defs>` ve `<linearGradient>` kullanımını gerektirir.
	const gradientId = "netKarGradient";

	return (
		<ResponsiveContainer width="100%" height={350}>
			<AreaChart
				data={data}
				margin={{ top: 20, right: 20, left: -20, bottom: 5 }}
			>
				<defs>
					<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
						<stop offset="5%" stopColor={netKarAreaColor} stopOpacity={0.8}/>
						<stop offset="95%" stopColor={netKarAreaColor} stopOpacity={0.1}/>
					</linearGradient>
					{/* Negatif değerler için ayrı bir gradient de eklenebilir veya şartlı fill kullanılabilir. */}
					{/* Şimdilik tek gradient. */}
				</defs>
				<CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
				<XAxis
					dataKey="name" // originalDate'den formatlanmış tarih
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
					tickFormatter={(value) => `₺${value.toFixed(0)}`}
					// Negatif değerleri de gösterebilmesi için domain ayarlanabilir.
					// domain={['auto', 'auto']} // veya ['dataMin - buffer', 'dataMax + buffer']
				/>
				<RechartsTooltip
          content={<CustomNetProfitTooltip />}
					cursor={{
						stroke: netKarAreaStrokeColor,
						strokeWidth: 1,
						fill: resolvedTheme === 'dark' ? 'rgba(161, 161, 170, 0.1)' : 'rgba(228, 228, 231, 0.2)',
					}}
				/>
				<Legend
					wrapperStyle={{
						fontSize: '12px',
						color: legendColor,
						paddingTop: '10px',
					}}
					payload={[
						{
							value: 'Günlük Net Kâr',
							type: 'rect', // Alan grafiği için daha uygun olabilir
							id: 'netKar',
							color: netKarAreaColor, // Alanın ana rengi
						},
					]}
				/>
				<Area
					type="monotone"
					dataKey="netKar"
					name="netKar" // Tooltip için
					stroke={netKarAreaStrokeColor}
					strokeWidth={2}
					fillOpacity={1}
					fill={`url(#${gradientId})`} // Gradient fill
					activeDot={{ r: 6, strokeWidth: 2, fill: netKarAreaStrokeColor }}
					dot={{ r: 3, strokeWidth: 1, fill: netKarAreaStrokeColor }}
				/>
			</AreaChart>
		</ResponsiveContainer>
	);
}
