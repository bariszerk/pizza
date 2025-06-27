// app/dashboard/dashboard_pages/income-expense-chart.tsx
'use client';

import { useTheme } from 'next-themes';
import {
	Bar,
	CartesianGrid,
	Cell,
	ComposedChart, // Veya sadece BarChart da olabilir eğer sadece barlar olacaksa
	Legend,
	Tooltip as RechartsTooltip,
	ResponsiveContainer,
	XAxis,
	YAxis,
} from 'recharts';
import { TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

// Grafik üzerindeki her bir veri noktası için tip
export type IncomeExpenseChartDataPoint = {
	name: string; // Gösterim için formatlanmış tarih (örn: 19 May)
	originalDate: string; // "yyyy-MM-dd" formatında, tıklama olayı için
	kazanc: number;
	gider: number; // Gider eklendi
	netKar?: number; // Tooltip'te veya başka bir yerde gerekirse diye eklenebilir
};

type IncomeExpenseChartProps = {
	data: IncomeExpenseChartDataPoint[];
	onBarClick?: (dataPoint: IncomeExpenseChartDataPoint, index: number) => void;
};

// Özel Tooltip İçeriği (Kazanç ve Gider için)
const CustomIncomeExpenseTooltip = ({ active, payload }: TooltipProps<ValueType, NameType>) => {
  const { resolvedTheme } = useTheme();
  const tooltipBgColor = resolvedTheme === 'dark' ? '#27272a' : '#ffffff';
  const tooltipTextColor = resolvedTheme === 'dark' ? '#e4e4e7' : '#09090b';
  const tooltipBorderColor = resolvedTheme === 'dark' ? '#3f3f46' : '#e4e4e7';

  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload as IncomeExpenseChartDataPoint;
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
        {payload.map((pld, index) => (
          <p key={index} style={{ color: pld.color || tooltipTextColor, margin: '2px 0' }}>
            {`${pld.name === 'kazanc' ? 'Günlük Kazanç' : 'Günlük Gider'}: ₺${Number(pld.value).toFixed(2)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};


export function IncomeExpenseChart({ data, onBarClick }: IncomeExpenseChartProps) {
	const { resolvedTheme } = useTheme();

	const tickColor = resolvedTheme === 'dark' ? '#a1a1aa' : '#71717a';
	const legendColor = resolvedTheme === 'dark' ? '#e4e4e7' : '#3f3f46';

	const kazancBarColor =
		resolvedTheme === 'dark'
			? 'hsl(142.1 70.6% 45.3%)' // Yeşil
			: 'hsl(142.1 76.2% 36.3%)';
	const giderBarColor =
		resolvedTheme === 'dark'
			? 'hsl(0 62.8% 50.4%)' // Kırmızı
			: 'hsl(0 72.2% 50.6%)';

	if (!data || data.length === 0) {
		return (
			<div className="flex items-center justify-center h-[350px]">
				<p style={{ color: tickColor }}>Kazanç/Gider verisi bulunamadı.</p>
			</div>
		);
	}

	return (
		<ResponsiveContainer width="100%" height={350}>
			{/* Grouped Bar Chart için ComposedChart veya BarChart kullanılabilir. */}
			{/* BarChart daha spesifik olabilir. */}
			<ComposedChart // Şimdilik ComposedChart kalsın, gerekirse BarChart'a çevrilir.
				data={data}
				margin={{ top: 20, right: 20, left: -20, bottom: 5 }}
				barGap={4} // Gruplar arası boşluk
        barCategoryGap="20%" // Aynı kategorideki barlar arası boşluk yüzdesi
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
          content={<CustomIncomeExpenseTooltip />}
					cursor={{
						fill:
							resolvedTheme === 'dark'
								? 'rgba(161, 161, 170, 0.1)'
								: 'rgba(228, 228, 231, 0.2)',
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
							value: 'Günlük Kazanç',
							type: 'square',
							id: 'kazanc',
							color: kazancBarColor,
						},
						{
							value: 'Günlük Gider',
							type: 'square',
							id: 'gider',
							color: giderBarColor,
						},
					]}
				/>
				<Bar
					dataKey="kazanc"
					name="kazanc" // Tooltip için önemli
					fill={kazancBarColor}
					radius={[4, 4, 0, 0]}
					barSize={10} // Grup içinde daha ince barlar
					onClick={
						onBarClick // Tıklama her iki bar için de aynı dataPoint'i verecek
							? (barData, index) =>
									onBarClick(barData as IncomeExpenseChartDataPoint, index)
							: undefined
					}
				>
					{data.map((entry, index) => (
						<Cell key={`cell-kazanc-${index}`} cursor="pointer" />
					))}
				</Bar>
				<Bar
					dataKey="gider"
					name="gider" // Tooltip için önemli
					fill={giderBarColor}
					radius={[4, 4, 0, 0]}
					barSize={10} // Grup içinde daha ince barlar
					onClick={
						onBarClick
							? (barData, index) =>
									onBarClick(barData as IncomeExpenseChartDataPoint, index)
							: undefined
					}
				>
					{data.map((entry, index) => (
						<Cell key={`cell-gider-${index}`} cursor="pointer" />
					))}
				</Bar>
			</ComposedChart>
		</ResponsiveContainer>
	);
}
