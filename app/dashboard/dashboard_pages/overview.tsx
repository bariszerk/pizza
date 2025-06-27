// app/dashboard/dashboard_pages/overview.tsx
'use client';

import { useTheme } from 'next-themes';
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
	// LabelList, // LabelList kullanılmıyorsa kaldırılabilir
} from 'recharts';
import { TooltipProps } from 'recharts'; // TooltipProps'u import et
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'; // Gerekli tipleri import et


import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

// Grafik üzerindeki her bir veri noktası için tip
export type OverviewChartDataPoint = {
	name: string; // Gösterim için formatlanmış tarih (örn: 19 May)
	originalDate: string; // "yyyy-MM-dd" formatında, tıklama olayı için
	kazanc: number;
	netKar: number;
	// gider alanı artık burada olmak zorunda değil, CustomTooltip içinde hesaplanacak
};

type OverviewProps = {
	data: OverviewChartDataPoint[];
	onBarClick?: (dataPoint: OverviewChartDataPoint, index: number) => void; // Tıklama işleyicisi prop'u
};

// Özel Tooltip İçeriği
const CustomTooltipContent = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  const { resolvedTheme } = useTheme();
  const tooltipBgColor = resolvedTheme === 'dark' ? '#27272a' : '#ffffff';
  const tooltipTextColor = resolvedTheme === 'dark' ? '#e4e4e7' : '#09090b';
  const tooltipBorderColor = resolvedTheme === 'dark' ? '#3f3f46' : '#e4e4e7';
  const giderColor = resolvedTheme === 'dark' ? 'hsl(0 62.8% 50.4%)' : 'hsl(0 72.2% 50.6%)';


  if (active && payload && payload.length) {
    const data = payload[0].payload as OverviewChartDataPoint;
    const formattedDate = format(parseISO(data.originalDate), 'dd MMMM yyyy', { locale: tr });
    const gider = data.kazanc - data.netKar;

    return (
      <div
        style={{
          backgroundColor: tooltipBgColor,
          border: `1px solid ${tooltipBorderColor}`,
          borderRadius: '0.5rem',
          padding: '10px',
          color: tooltipTextColor,
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          fontSize: '12px', // Tooltip yazı boyutu
        }}
      >
        <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>{formattedDate}</p>
        {payload.map((pld, index) => (
          <p key={index} style={{ color: pld.color || tooltipTextColor, margin: '2px 0' }}>
            {`${pld.name === 'kazanc' ? 'Günlük Kazanç' : pld.name === 'netKar' ? 'Günlük Net Kâr' : pld.name}: ₺${Number(pld.value).toFixed(2)}`}
          </p>
        ))}
        <p style={{ color: giderColor, margin: '2px 0' }}>
          {`Günlük Gider: ₺${gider.toFixed(2)}`}
        </p>
      </div>
    );
  }

  return null;
};


export function Overview({ data, onBarClick }: OverviewProps) {
	const { resolvedTheme } = useTheme();

	const tickColor = resolvedTheme === 'dark' ? '#a1a1aa' : '#71717a';
	const legendColor = resolvedTheme === 'dark' ? '#e4e4e7' : '#3f3f46';
	// tooltipBgColor, tooltipTextColor, tooltipBorderColor CustomTooltipContent içinde tanımlı

	const kazancBarColor =
		resolvedTheme === 'dark'
			? 'hsl(142.1 70.6% 45.3%)'
			: 'hsl(142.1 76.2% 36.3%)';
	const netKarLineColor =
		resolvedTheme === 'dark'
			? 'hsl(262.1 83.3% 57.8%)'
			: 'hsl(262.1 83.3% 57.8%)';
	// const giderBarColor = // Gider için ayrı bir seri olmadığından bu renk sadece legend için gerekiyordu, legend'dan da çıkarıldı.
	// 	resolvedTheme === 'dark'
	// 		? 'hsl(0 62.8% 50.4%)'
	// 		: 'hsl(0 72.2% 50.6%)';

	// processedData'ya artık gerek yok, CustomTooltipContent gideri kendi hesaplıyor
	// const processedData = data.map(item => ({
	// 	...item,
	// 	gider: item.kazanc - item.netKar,
	// }));

	if (!data || data.length === 0) { // Orijinal data kontrolü
		return (
			<div className="flex items-center justify-center h-[350px]">
				<p style={{ color: tickColor }}>Genel bakış için veri bulunamadı.</p>
			</div>
		);
	}

	return (
		<ResponsiveContainer width="100%" height={350}>
			<ComposedChart
				data={data} // Orijinal datayı kullan
				margin={{ top: 20, right: 20, left: -20, bottom: 5 }}
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
					tickFormatter={(value) => `₺${value.toFixed(0)}`}
				/>
				<RechartsTooltip
          content={<CustomTooltipContent />}
					cursor={{
						fill:
							resolvedTheme === 'dark'
								? 'rgba(161, 161, 170, 0.1)'
								: 'rgba(228, 228, 231, 0.2)',
					}}
          // contentStyle, labelStyle, itemStyle artık CustomTooltipContent tarafından yönetiliyor
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
						// Gider için legend girdisi kaldırıldı, çünkü ayrı bir serisi yok ve tooltip'te gösteriliyor.
						// {
						// 	value: 'Günlük Gider',
						// 	type: 'square',
						// 	id: 'gider',
						// 	color: giderBarColor,
						// },
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
					}
				>
					{data.map((entry, index) => ( // Orijinal datayı kullan
						<Cell key={`cell-kazanc-${index}`} cursor="pointer" />
					))}
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
