// app/dashboard/dashboard_pages/date-range-picker.tsx
'use client';

import {
	endOfDay,
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
import { tr } from 'date-fns/locale';
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
	}) => void;
	initialDateRange?: DateRange;
	initialPresetValue?: string;
	className?: string;
}

export type Preset = {
	label: string;
	value: string;
	getDateRange: () => DateRange;
};

export const PRESETS_LOCAL: Preset[] = [
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
		getDateRange: () => ({ from: new Date(), to: new Date() }), // Varsayılan özel aralık için
	},
];

export const getDefaultPresetValueLocal = (range?: DateRange): string => {
	if (!range || !range.from || !range.to) {
		return 'last_7_days'; // Veya uygun bir varsayılan
	}

	const fromDate = range.from;
	const toDate = range.to;

	if (
		!(fromDate instanceof Date) ||
		!isValid(fromDate) ||
		!(toDate instanceof Date) ||
		!isValid(toDate)
	) {
		return 'custom';
	}

	for (const preset of PRESETS_LOCAL) {
		if (preset.value === 'custom') continue;

		const presetRange = preset.getDateRange();
		const presetFrom = presetRange.from;
		const presetTo = presetRange.to;

		if (
			presetFrom && // Kontrol et
			presetTo && // Kontrol et
			presetFrom instanceof Date && // Tipini doğrula
			isValid(presetFrom) && // Geçerliliğini doğrula
			presetTo instanceof Date && // Tipini doğrula
			isValid(presetTo) // Geçerliliğini doğrula
		) {
			// fromDate ve toDate zaten yukarıda Date ve isValid olarak doğrulandı.
			if (isSameDay(fromDate, presetFrom) && isSameDay(toDate, presetTo)) {
				return preset.value;
			}
		}
	}
	return 'custom';
};

export function DateRangePicker({
	className,
	onDateChange,
	initialDateRange,
	initialPresetValue,
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
			const range = foundPreset.getDateRange();
			// getDateRange'den dönen değerlerin Date olduğundan emin olalım
			if (range.from && range.to && isValid(range.from) && isValid(range.to)) {
				return { from: startOfDay(range.from), to: endOfDay(range.to) };
			}
		}
		if (
			initialDateRange?.from &&
			initialDateRange?.to &&
			isValid(initialDateRange.from) &&
			isValid(initialDateRange.to)
		) {
			return {
				from: startOfDay(initialDateRange.from),
				to: endOfDay(initialDateRange.to),
			};
		}
		const defaultPreset = PRESETS_LOCAL.find((p) => p.value === 'last_7_days');
		if (defaultPreset) {
			const range = defaultPreset.getDateRange();
			if (range.from && range.to && isValid(range.from) && isValid(range.to)) {
				return { from: startOfDay(range.from), to: endOfDay(range.to) };
			}
		}
		return undefined; // Veya uygun bir varsayılan
	});

	const [pendingCustomDate, setPendingCustomDate] = React.useState<
		DateRange | undefined
	>(currentAppliedDate);
	const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

	React.useEffect(() => {
		const newPresetValue =
			initialPresetValue || getDefaultPresetValueLocal(initialDateRange);
		setSelectedPreset(newPresetValue);

		let newRangeToApply: DateRange | undefined;
		if (newPresetValue !== 'custom') {
			const preset = PRESETS_LOCAL.find((p) => p.value === newPresetValue);
			if (preset) {
				const range = preset.getDateRange();
				if (
					range.from &&
					range.to &&
					isValid(range.from) &&
					isValid(range.to)
				) {
					newRangeToApply = {
						from: startOfDay(range.from),
						to: endOfDay(range.to),
					};
				}
			}
		} else if (
			initialDateRange?.from &&
			initialDateRange?.to &&
			isValid(initialDateRange.from) &&
			isValid(initialDateRange.to)
		) {
			newRangeToApply = {
				from: startOfDay(initialDateRange.from),
				to: endOfDay(initialDateRange.to),
			};
		}

		if (newRangeToApply) {
			setCurrentAppliedDate(newRangeToApply);
			setPendingCustomDate(newRangeToApply);
		}
	}, [initialDateRange, initialPresetValue]);

	const handlePresetChange = (presetValue: string) => {
		setSelectedPreset(presetValue);
		if (presetValue === 'custom') {
			const currentOrToday =
				currentAppliedDate ||
				PRESETS_LOCAL.find((p) => p.value === 'today')?.getDateRange();
			if (
				currentOrToday?.from &&
				currentOrToday?.to &&
				isValid(currentOrToday.from) &&
				isValid(currentOrToday.to)
			) {
				setPendingCustomDate({
					from: startOfDay(currentOrToday.from),
					to: endOfDay(currentOrToday.to),
				});
			} else {
				// Fallback
				const todayRange = PRESETS_LOCAL.find(
					(p) => p.value === 'today'
				)!.getDateRange();
				setPendingCustomDate({
					from: startOfDay(todayRange.from!),
					to: endOfDay(todayRange.to!),
				});
			}
			setIsPopoverOpen(true);
		} else {
			const preset = PRESETS_LOCAL.find((p) => p.value === presetValue);
			if (preset) {
				const newRangeRaw = preset.getDateRange();
				if (
					newRangeRaw.from &&
					newRangeRaw.to &&
					isValid(newRangeRaw.from) &&
					isValid(newRangeRaw.to)
				) {
					const newRange = {
						from: startOfDay(newRangeRaw.from),
						to: endOfDay(newRangeRaw.to),
					};
					setCurrentAppliedDate(newRange);
					setPendingCustomDate(newRange);
					onDateChange({ range: newRange, preset: presetValue });
				}
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
					: endOfDay(from);

			const newAppliedRange = { from, to: to < from ? from : to };

			setCurrentAppliedDate(newAppliedRange);
			onDateChange({ range: newAppliedRange, preset: 'custom' });
			setSelectedPreset('custom');
		}
		setIsPopoverOpen(false);
	};

	const handlePopoverOpenChange = (open: boolean) => {
		setIsPopoverOpen(open);
		if (open) {
			if (
				currentAppliedDate?.from &&
				currentAppliedDate?.to &&
				isValid(currentAppliedDate.from) &&
				isValid(currentAppliedDate.to)
			) {
				setPendingCustomDate({
					from: startOfDay(currentAppliedDate.from),
					to: endOfDay(currentAppliedDate.to),
				});
			}
		} else {
			const newPresetValueBasedOnApplied =
				getDefaultPresetValueLocal(currentAppliedDate);
			if (selectedPreset !== newPresetValueBasedOnApplied) {
				setSelectedPreset(newPresetValueBasedOnApplied);
			}
			if (
				currentAppliedDate?.from &&
				currentAppliedDate?.to &&
				isValid(currentAppliedDate.from) &&
				isValid(currentAppliedDate.to)
			) {
				setPendingCustomDate({
					from: startOfDay(currentAppliedDate.from),
					to: endOfDay(currentAppliedDate.to),
				});
			}
		}
	};

	const displayLabel = React.useMemo(() => {
		if (!currentAppliedDate?.from || !isValid(currentAppliedDate.from))
			return 'Tarih Seçin';

		const currentFrom = startOfDay(currentAppliedDate.from); // Normalleştir

		const currentPresetObj = PRESETS_LOCAL.find(
			(p) => p.value === selectedPreset
		);

		if (selectedPreset !== 'custom' && currentPresetObj) {
			const presetRange = currentPresetObj.getDateRange();
			if (
				presetRange.from &&
				presetRange.to &&
				isValid(presetRange.from) &&
				isValid(presetRange.to)
			) {
				const presetFrom = startOfDay(presetRange.from); // Normalleştir
				const presetTo = endOfDay(presetRange.to); // Normalleştir

				if (currentAppliedDate.to && isValid(currentAppliedDate.to)) {
					const currentTo = endOfDay(currentAppliedDate.to); // Normalleştir
					if (
						isSameDay(currentFrom, presetFrom) &&
						isSameDay(currentTo, presetTo)
					) {
						return currentPresetObj.label;
					}
				}
			}
		}

		const { from, to } = currentAppliedDate;
		if (from && isValid(from)) {
			if (to && isValid(to) && !isSameDay(from, to)) {
				return `${format(from, 'dd MMM yy', { locale: tr })} - ${format(
					to,
					'dd MMM yy',
					{ locale: tr }
				)}`; // Türkçe format
			}
			return format(from, 'dd MMM yy', { locale: tr }); // Türkçe format
		}
		return 'Tarih Seçin'; // Fallback
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
							const currentOrToday =
								currentAppliedDate ||
								PRESETS_LOCAL.find((p) => p.value === 'today')?.getDateRange();
							if (
								currentOrToday?.from &&
								currentOrToday?.to &&
								isValid(currentOrToday.from) &&
								isValid(currentOrToday.to)
							) {
								setPendingCustomDate({
									from: startOfDay(currentOrToday.from),
									to: endOfDay(currentOrToday.to),
								});
							} else {
								const todayRange = PRESETS_LOCAL.find(
									(p) => p.value === 'today'
								)!.getDateRange();
								setPendingCustomDate({
									from: startOfDay(todayRange.from!),
									to: endOfDay(todayRange.to!),
								});
							}
							setIsPopoverOpen(true);
						}}
						aria-label="Özel tarih aralığı seç"
					>
						<CalendarIcon className="h-4 w-4" />
					</Button>
				</PopoverTrigger>
				{isPopoverOpen && (
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
							onSelect={(newRange) => {
								if (newRange?.from && isValid(newRange.from)) {
									const from = startOfDay(newRange.from);
									const to =
										newRange.to && isValid(newRange.to)
											? endOfDay(newRange.to)
											: undefined; // `to` tanımsız olabilir
									setPendingCustomDate({ from, to });
								} else {
									setPendingCustomDate(newRange); // veya undefined/null
								}
							}}
							locale={tr} // Takvim için Türkçe locale
							numberOfMonths={2}
							disabled={{ after: endOfDay(new Date()) }} // Bugünün sonundan sonrasını devre dışı bırak
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
									if (
										currentAppliedDate?.from &&
										currentAppliedDate?.to &&
										isValid(currentAppliedDate.from) &&
										isValid(currentAppliedDate.to)
									) {
										setPendingCustomDate({
											from: startOfDay(currentAppliedDate.from),
											to: endOfDay(currentAppliedDate.to),
										});
									}
								}}
							>
								Vazgeç
							</Button>
							<Button
								size="sm"
								onClick={handleCustomDateApply}
								disabled={
									!pendingCustomDate?.from || !isValid(pendingCustomDate.from)
									// `to` tanımsız olabilir, bu yüzden onun için bir disable koşulu eklemeyin
									// Eğer `to` zorunluysa, `|| !pendingCustomDate.to || !isValid(pendingCustomDate.to)` eklenebilir
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
