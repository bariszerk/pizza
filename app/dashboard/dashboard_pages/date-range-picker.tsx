// app/dashboard/dashboard_pages/date-range-picker.tsx
'use client';

import {
	endOfDay, // Eklendi
	endOfMonth,
	endOfWeek,
	format,
	isSameDay,
	isValid,
	startOfDay,
	startOfMonth,
	startOfWeek,
	subDays,
	subMonths,
} from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import * as React from 'react';
import { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface EnhancedDateRangePickerProps
	extends React.HTMLAttributes<HTMLDivElement> {
	onDateChange: (data: {
		range: DateRange | undefined;
		preset: string | undefined;
	}) => void; // Güncellendi
	initialDateRange?: DateRange;
	initialPresetValue?: string; // Yeni prop
	className?: string;
}

export type Preset = {
	label: string;
	value: string;
	getDateRange: () => DateRange;
};

// PRESETS ve getDefaultPresetValue DashboardPage'e taşındığı için buradan kaldırılabilir veya ortak yerden import edilebilir.
// Şimdilik burada bırakıyorum, ancak ideal olanı tek bir yerden yönetmek.
// Eğer DashboardPage'den prop olarak almıyorsanız, burada tanımlı olmalı.
export const PRESETS_LOCAL: Preset[] = [
	// Farklı isimle tanımlayalım, karışmasın
	{
		label: 'Bugün',
		value: 'today',
		getDateRange: () => ({
			from: startOfDay(new Date()),
			to: endOfDay(new Date()),
		}),
	},
	{
		label: 'Dün',
		value: 'yesterday',
		getDateRange: () => {
			const d = subDays(new Date(), 1);
			return { from: startOfDay(d), to: endOfDay(d) };
		},
	},
	{
		label: 'Son 3 Gün',
		value: 'last_3_days',
		getDateRange: () => ({
			from: startOfDay(subDays(new Date(), 2)),
			to: endOfDay(new Date()),
		}),
	},
	{
		label: 'Son 7 Gün',
		value: 'last_7_days',
		getDateRange: () => ({
			from: startOfDay(subDays(new Date(), 6)),
			to: endOfDay(new Date()),
		}),
	},
	{
		label: 'Son 30 Gün',
		value: 'last_30_days',
		getDateRange: () => ({
			from: startOfDay(subDays(new Date(), 29)),
			to: endOfDay(new Date()),
		}),
	},
	{
		label: 'Bu Hafta',
		value: 'this_week',
		getDateRange: () => ({
			from: startOfWeek(new Date(), { weekStartsOn: 1 }),
			to: endOfWeek(new Date(), { weekStartsOn: 1 }),
		}),
	},
	{
		label: 'Geçen Hafta',
		value: 'last_week',
		getDateRange: () => {
			const lw = subDays(new Date(), 7);
			return {
				from: startOfWeek(lw, { weekStartsOn: 1 }),
				to: endOfWeek(lw, { weekStartsOn: 1 }),
			};
		},
	},
	{
		label: 'Bu Ay',
		value: 'this_month',
		getDateRange: () => ({
			from: startOfMonth(new Date()),
			to: endOfMonth(new Date()),
		}),
	},
	{
		label: 'Geçen Ay',
		value: 'last_month',
		getDateRange: () => {
			const lm = subMonths(new Date(), 1);
			return { from: startOfMonth(lm), to: endOfMonth(lm) };
		},
	},
	{
		label: 'Özel Aralık...',
		value: 'custom',
		getDateRange: () => ({ from: new Date(), to: new Date() }),
	},
];

export const getDefaultPresetValueLocal = (range?: DateRange): string => {
	if (!range || !range.from || !range.to) return 'last_7_days';
	// range.from ve range.to'nun Date objesi ve geçerli olduğundan emin olalım
	if (
		!(range.from instanceof Date) ||
		!isValid(range.from) ||
		!(range.to instanceof Date) ||
		!isValid(range.to)
	) {
		return 'custom';
	}

	for (const preset of PRESETS_LOCAL) {
		if (preset.value === 'custom') continue;
		const presetRange = preset.getDateRange(); // Bu her zaman { from: Date, to: Date } döndürmeli
		if (
			isSameDay(range.from, presetRange.from) &&
			isSameDay(range.to, presetRange.to)
		) {
			return preset.value;
		}
	}
	return 'custom';
};

export function EnhancedDateRangePicker({
	className,
	onDateChange,
	initialDateRange,
	initialPresetValue, // Yeni prop
}: EnhancedDateRangePickerProps) {
	const [selectedPreset, setSelectedPreset] = React.useState<string>(
		initialPresetValue || getDefaultPresetValueLocal(initialDateRange)
	);

	const [currentAppliedDate, setCurrentAppliedDate] = React.useState<
		DateRange | undefined
	>(() => {
		const presetValue =
			initialPresetValue || getDefaultPresetValueLocal(initialDateRange);
		const foundPreset = PRESETS_LOCAL.find((p) => p.value === presetValue);
		if (presetValue !== 'custom' && foundPreset) {
			return foundPreset.getDateRange();
		}
		return (
			initialDateRange ||
			PRESETS_LOCAL.find((p) => p.value === 'last_7_days')!.getDateRange()
		);
	});

	const [pendingCustomDate, setPendingCustomDate] = React.useState<
		DateRange | undefined
	>(currentAppliedDate);
	const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

	// Dışarıdan gelen initial props değişirse state'leri güncelle
	React.useEffect(() => {
		const newPresetValue =
			initialPresetValue || getDefaultPresetValueLocal(initialDateRange);
		setSelectedPreset(newPresetValue);

		let newRangeToApply: DateRange | undefined;
		if (newPresetValue !== 'custom') {
			const preset = PRESETS_LOCAL.find((p) => p.value === newPresetValue);
			newRangeToApply = preset?.getDateRange();
		} else {
			newRangeToApply = initialDateRange;
		}

		if (newRangeToApply) {
			setCurrentAppliedDate(newRangeToApply);
			setPendingCustomDate(newRangeToApply);
		}
	}, [initialDateRange, initialPresetValue]);

	const handlePresetChange = (presetValue: string) => {
		setSelectedPreset(presetValue);
		if (presetValue === 'custom') {
			setPendingCustomDate(
				currentAppliedDate ||
					PRESETS_LOCAL.find((p) => p.value === 'today')!.getDateRange()
			);
			setIsPopoverOpen(true);
		} else {
			const preset = PRESETS_LOCAL.find((p) => p.value === presetValue);
			if (preset) {
				const newRange = preset.getDateRange();
				setCurrentAppliedDate(newRange);
				setPendingCustomDate(newRange);
				onDateChange({ range: newRange, preset: presetValue }); // preset bilgisini de gönder
				setIsPopoverOpen(false);
			}
		}
	};

	const handleCustomDateApply = () => {
		if (pendingCustomDate?.from && isValid(pendingCustomDate.from)) {
			const from = startOfDay(pendingCustomDate.from);
			const to =
				pendingCustomDate.to && isValid(pendingCustomDate.to)
					? endOfDay(pendingCustomDate.to)
					: endOfDay(from); // Eğer to yoksa veya geçersizse from ile aynı gün sonu

			const newAppliedRange = { from, to: to < from ? from : to }; // to, from'dan önce olamaz

			setCurrentAppliedDate(newAppliedRange);
			onDateChange({ range: newAppliedRange, preset: 'custom' }); // preset "custom" olarak gönder
			setSelectedPreset('custom');
		}
		setIsPopoverOpen(false);
	};

	const handlePopoverOpenChange = (open: boolean) => {
		setIsPopoverOpen(open);
		if (open) {
			setPendingCustomDate(currentAppliedDate);
		} else {
			// Dışarı tıklayarak kapanırsa, seçili preset'i currentAppliedDate'e göre ayarla
			const newPresetValueBasedOnApplied =
				getDefaultPresetValueLocal(currentAppliedDate);
			if (selectedPreset !== newPresetValueBasedOnApplied) {
				setSelectedPreset(newPresetValueBasedOnApplied);
			}
			setPendingCustomDate(currentAppliedDate); // Pending'i de geri al
		}
	};

	const displayLabel = React.useMemo(() => {
		if (!currentAppliedDate?.from || !isValid(currentAppliedDate.from))
			return 'Tarih Seçin';

		const currentPresetObj = PRESETS_LOCAL.find(
			(p) => p.value === selectedPreset
		);
		// Eğer seçili preset "custom" değilse ve currentAppliedDate bu preset ile eşleşiyorsa preset label'ını kullan
		if (selectedPreset !== 'custom' && currentPresetObj) {
			const presetRange = currentPresetObj.getDateRange();
			if (
				currentAppliedDate.to &&
				isValid(currentAppliedDate.to) &&
				presetRange.from &&
				isValid(presetRange.from) &&
				isSameDay(
					startOfDay(currentAppliedDate.from),
					startOfDay(presetRange.from)
				) && // Başlangıçları karşılaştır
				presetRange.to &&
				isValid(presetRange.to) &&
				isSameDay(endOfDay(currentAppliedDate.to), endOfDay(presetRange.to))
			) {
				// Bitişleri karşılaştır
				return currentPresetObj.label;
			}
		}

		const { from, to } = currentAppliedDate;
		// `to` undefined veya from ile aynı gün olabilir
		if (to && isValid(to) && !isSameDay(from, to)) {
			return `${format(from, 'LLL dd, y')} - ${format(to, 'LLL dd, y')}`;
		}
		return format(from, 'LLL dd, y'); // Tek gün veya 'to' tanımsızsa
	}, [currentAppliedDate, selectedPreset]);

	return (
		<div className={cn('flex items-center gap-2', className)}>
			<Select value={selectedPreset} onValueChange={handlePresetChange}>
				<SelectTrigger className="w-auto min-w-[150px] h-10 data-[state=open]:ring-ring/50 data-[state=open]:border-ring data-[state=open]:ring-[3px]">
					<SelectValue placeholder="Tarih Aralığı Seçin" />
				</SelectTrigger>
				<SelectContent>
					{PRESETS_LOCAL.map((preset) => (
						<SelectItem key={preset.value} value={preset.value}>
							{preset.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<Popover open={isPopoverOpen} onOpenChange={handlePopoverOpenChange}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						size="icon"
						className={cn(
							'h-10 w-10',
							selectedPreset !== 'custom' && 'text-muted-foreground'
						)}
						onClick={() => {
							setSelectedPreset('custom');
							setPendingCustomDate(
								currentAppliedDate ||
									PRESETS_LOCAL.find((p) => p.value === 'today')!.getDateRange()
							);
							setIsPopoverOpen(true);
						}}
						aria-label="Özel tarih aralığı seç"
					>
						<CalendarIcon className="h-4 w-4" />
					</Button>
				</PopoverTrigger>
				{isPopoverOpen && ( // selectedPreset === "custom" kontrolünü kaldırdım, popover'ın açılıp kapanmasını sadece isPopoverOpen yönetiyor
					<PopoverContent className="w-auto p-0" align="start">
						<Calendar
							initialFocus
							mode="range"
							defaultMonth={
								pendingCustomDate?.from && isValid(pendingCustomDate.from)
									? pendingCustomDate.from
									: new Date()
							}
							selected={pendingCustomDate}
							onSelect={setPendingCustomDate}
							numberOfMonths={2}
							disabled={{ after: new Date() }}
						/>
						<Separator className="my-2" />
						<div className="flex justify-end gap-2 p-3 pt-0">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									setIsPopoverOpen(false);
									const prevPreset =
										getDefaultPresetValueLocal(currentAppliedDate);
									setSelectedPreset(prevPreset);
									setPendingCustomDate(currentAppliedDate);
								}}
							>
								Vazgeç
							</Button>
							<Button
								size="sm"
								onClick={handleCustomDateApply}
								disabled={
									!pendingCustomDate?.from ||
									!isValid(pendingCustomDate.from) ||
									(pendingCustomDate.to !== undefined &&
										!isValid(pendingCustomDate.to))
								}
							>
								Uygula
							</Button>
						</div>
					</PopoverContent>
				)}
			</Popover>

			<div className="flex h-10 items-center justify-center rounded-md border border-input bg-transparent px-3 py-2 text-sm text-muted-foreground min-w-[200px] max-w-[300px] truncate text-center">
				<span title={displayLabel}>{displayLabel}</span>
			</div>
		</div>
	);
}
