// app/dashboard/dashboard_pages/date-range-picker.tsx
'use client';

import {
	endOfDay,
	endOfMonth,
	endOfWeek,
	format,
	isBefore, // isBefore eklendi
	isSameDay, // isSameDay eklendi
	isValid,
	startOfDay,
	startOfMonth,
	startOfWeek,
	subDays,
	subMonths,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react'; // ChevronDown kaldırıldı, kullanılmıyordu
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
];

// FONKSİYON BURAYA EKLENDİ VE EXPORT EDİLDİ
export const getDefaultPresetValueLocal = (range?: DateRange): string => {
	if (!range || !range.from || !range.to) {
		return 'last_7_days';
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
		// 'custom' preset'i bu karşılaştırmada atla
		// if (preset.value === 'custom') continue; // Bu satır PRESETS_LOCAL'de custom olmadığı için gereksiz

		const presetRange = preset.getDateRange();
		const presetFrom = presetRange.from;
		const presetTo = presetRange.to;

		if (
			presetFrom &&
			presetTo &&
			presetFrom instanceof Date &&
			isValid(presetFrom) &&
			presetTo instanceof Date &&
			isValid(presetTo)
		) {
			if (
				isSameDay(startOfDay(fromDate), startOfDay(presetFrom)) &&
				isSameDay(endOfDay(toDate), endOfDay(presetTo))
			) {
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
	const [selectedPreset, setSelectedPreset] = React.useState<string>(() => {
		// initialPresetValue varsa ve geçerliyse onu kullan, yoksa getDefaultPresetValueLocal ile hesapla
		if (
			initialPresetValue &&
			PRESETS_LOCAL.find((p) => p.value === initialPresetValue)
		) {
			return initialPresetValue;
		}
		return getDefaultPresetValueLocal(initialDateRange);
	});

	const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
		() => {
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
			// initialPresetValue'ye göre ilk aralığı ayarla
			const presetToUse =
				initialPresetValue || getDefaultPresetValueLocal(initialDateRange);
			const defaultPreset = PRESETS_LOCAL.find((p) => p.value === presetToUse);
			return defaultPreset ? defaultPreset.getDateRange() : undefined;
		}
	);

	const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
	const [activeDateField, setActiveDateField] = React.useState<
		'from' | 'to' | null
	>(null);

	React.useEffect(() => {
		let newRange: DateRange | undefined = undefined;
		let newPreset =
			initialPresetValue || getDefaultPresetValueLocal(initialDateRange);

		const presetEntry = PRESETS_LOCAL.find((p) => p.value === newPreset);

		if (newPreset !== 'custom' && presetEntry) {
			newRange = presetEntry.getDateRange();
		} else if (
			initialDateRange?.from &&
			initialDateRange?.to &&
			isValid(initialDateRange.from) &&
			isValid(initialDateRange.to)
		) {
			newRange = {
				from: startOfDay(initialDateRange.from),
				to: endOfDay(initialDateRange.to),
			};
			newPreset = 'custom';
		} else if (presetEntry) {
			// Fallback to default if initialDateRange is bad and preset is not custom
			newRange = presetEntry.getDateRange();
		}

		if (newRange?.from && isValid(newRange.from)) {
			newRange.from = startOfDay(newRange.from);
		}
		if (newRange?.to && isValid(newRange.to)) {
			newRange.to = endOfDay(newRange.to);
		}

		setDateRange(newRange);
		setSelectedPreset(newPreset);
	}, [initialDateRange, initialPresetValue]);

	const handlePresetChange = (presetValue: string) => {
		setSelectedPreset(presetValue);
		const preset = PRESETS_LOCAL.find((p) => p.value === presetValue);
		if (preset) {
			const newRange = preset.getDateRange();
			setDateRange(newRange);
			onDateChange({ range: newRange, preset: presetValue });
			setIsPopoverOpen(false);
		}
	};

	const handleDateInputClick = (field: 'from' | 'to') => {
		setActiveDateField(field);
		setIsPopoverOpen(true);
	};

	const handleCalendarSelect = (selectedDay: Date | undefined) => {
		if (!selectedDay || !activeDateField) return;

		const newDate = startOfDay(selectedDay);
		const newRange = { from: dateRange?.from, to: dateRange?.to }; // Mevcut aralığı koru

		if (activeDateField === 'from') {
			newRange.from = newDate;
			// Eğer yeni başlangıç tarihi, mevcut bitiş tarihinden sonraysa, bitişi de başlangıca eşitle veya null yap.
			if (newRange.to && isBefore(newRange.to, newDate)) {
				newRange.to = newDate; // Veya newRange.to = undefined;
			}
		} else {
			// activeDateField === 'to'
			newRange.to = endOfDay(newDate);
			// Eğer yeni bitiş tarihi, mevcut başlangıç tarihinden önceyse, başlangıcı da bitişe eşitle veya null yap.
			if (newRange.from && isBefore(newDate, newRange.from)) {
				newRange.from = newDate; // Veya newRange.from = undefined;
			}
		}

		// Eğer sadece tek bir tarih seçiliyse (diğeri undefined ise), onu da set et.
		if (activeDateField === 'from' && !newRange.to) {
			newRange.to = endOfDay(newDate);
		} else if (activeDateField === 'to' && !newRange.from) {
			newRange.from = startOfDay(newDate);
		}

		setDateRange(newRange as DateRange);
		setSelectedPreset('custom');
		onDateChange({ range: newRange as DateRange, preset: 'custom' });
		setIsPopoverOpen(false);
		setActiveDateField(null);
	};

	const formatDateForDisplay = (date: Date | undefined) => {
		if (!date || !isValid(date)) return 'Tarih Seçin';
		return format(date, 'dd MMM yyyy', { locale: tr }); // Yıl eklendi
	};

	const currentMonthForCalendar = (): Date => {
		if (
			activeDateField === 'from' &&
			dateRange?.from &&
			isValid(dateRange.from)
		) {
			return dateRange.from;
		}
		if (activeDateField === 'to' && dateRange?.to && isValid(dateRange.to)) {
			return dateRange.to;
		}
		if (dateRange?.from && isValid(dateRange.from)) {
			return dateRange.from;
		}
		return new Date();
	};

	return (
                <div
                        className={cn(
                                'flex flex-row flex-wrap items-stretch sm:items-center gap-2',
                                className
                        )}
                >
                       <Select value={selectedPreset} onValueChange={handlePresetChange}>
                                <SelectTrigger className="w-auto sm:w-[280px] h-10">
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

                        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                                <div className="flex flex-row flex-wrap items-stretch space-y-2 sm:space-y-0 sm:space-x-2 sm:gap-0 sm:w-[280px]">
                                        <PopoverTrigger asChild>
                                                <Button
                                                        variant="outline"
                                                        className={cn(
                                                                'min-w-[120px] flex-1 justify-start text-left font-normal h-10',
                                                                !dateRange?.from && 'text-muted-foreground'
                                                        )}
                                                        onClick={() => handleDateInputClick('from')}
                                                >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {formatDateForDisplay(dateRange?.from)}
                                                </Button>
                                        </PopoverTrigger>
                                        <span className="text-muted-foreground hidden sm:inline">-</span>
                                        <PopoverTrigger asChild>
                                                <Button
                                                        variant="outline"
                                                        className={cn(
                                                                'min-w-[120px] flex-1 justify-start text-left font-normal h-10',
                                                                !dateRange?.to && 'text-muted-foreground'
                                                        )}
                                                        onClick={() => handleDateInputClick('to')}
                                                >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {formatDateForDisplay(dateRange?.to)}
                                                </Button>
					</PopoverTrigger>
				</div>
				<PopoverContent className="w-auto p-0" align="end">
					<Calendar
						mode="single"
						selected={
							activeDateField === 'from'
								? dateRange?.from
								: activeDateField === 'to'
								? dateRange?.to
								: undefined // Eğer aktif alan yoksa hiçbirini seçili gösterme
						}
						onSelect={handleCalendarSelect}
						defaultMonth={currentMonthForCalendar()}
						locale={tr}
						captionLayout="dropdown"
						className="rounded-lg border"
						disabled={{ after: endOfDay(new Date()) }}
					/>
				</PopoverContent>
			</Popover>
		</div>
	);
}
