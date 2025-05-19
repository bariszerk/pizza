// app/branch/[id]/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/utils/supabase/client';
import { format, isBefore, isSameDay, startOfDay, subDays } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react'; // useMemo importu zaten vardı
import { toast } from 'sonner';

type BranchFinancial = {
	id?: number;
	branch_id: string;
	expenses: number;
	earnings: number;
	summary: string;
	date: string;
	created_at?: string;
};

export default function BranchPage() {
	const { id: branchIdString } = useParams();
	const branchId = Array.isArray(branchIdString)
		? branchIdString[0]
		: branchIdString;

	const [expenses, setExpenses] = useState('');
	const [earnings, setEarnings] = useState('');
	const [summary, setSummary] = useState('');
	const [selectedDate, setSelectedDate] = useState<Date>(
		startOfDay(new Date())
	);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isLoadingData, setIsLoadingData] = useState(true);
	const [isFormDisabled, setIsFormDisabled] = useState(false);
	const [existingRecordId, setExistingRecordId] = useState<number | null>(null);

	const supabase = createClient();

	const today = useMemo(() => startOfDay(new Date()), []);
	const yesterday = useMemo(() => startOfDay(subDays(today, 1)), [today]);

	useEffect(() => {
		if (!branchId) {
			setIsLoadingData(false);
			toast.error("Şube ID'si bulunamadı.");
			return;
		}

		const loadData = async (dateToLoad: Date) => {
			setIsLoadingData(true);
			setExpenses('');
			setEarnings('');
			setSummary('');
			setExistingRecordId(null);

			const dateStr = format(dateToLoad, 'yyyy-MM-dd');

			try {
				const { data, error } = await supabase
					.from('branch_financials')
					.select('*')
					.eq('branch_id', branchId)
					.eq('date', dateStr)
					.single();

				if (error && error.code !== 'PGRST116') {
					throw error;
				}

				let formShouldBeDisabled = true;
				const allowEditToday = isSameDay(dateToLoad, today);
				let allowEditYesterday = false;

				if (data) {
					setExpenses(data.expenses.toString());
					setEarnings(data.earnings.toString());
					setSummary(data.summary || '');
					setExistingRecordId(data.id);
					if (allowEditToday) {
						formShouldBeDisabled = false;
					}
				} else {
					allowEditYesterday = isSameDay(dateToLoad, yesterday);
					if (allowEditToday || allowEditYesterday) {
						formShouldBeDisabled = false;
					}
				}
				setIsFormDisabled(formShouldBeDisabled);
			} catch (error: unknown) {
				if (error instanceof Error) {
					toast.error(`Veri çekilirken hata: ${error.message}`);
				} else {
					toast.error('Veri çekilirken bilinmeyen bir hata oluştu.');
				}
				setIsFormDisabled(true);
			} finally {
				setIsLoadingData(false);
			}
		};

		loadData(selectedDate);
	}, [selectedDate, branchId, supabase, today, yesterday]);

	const handleDateSelect = (newDate: Date | undefined) => {
		if (newDate) {
			setSelectedDate(startOfDay(newDate));
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isFormDisabled || isSubmitting) return;

		setIsSubmitting(true);

		if (!branchId) {
			toast.error("Şube ID'si bulunamadı.");
			setIsSubmitting(false);
			return;
		}

		const expensesValue = parseFloat(expenses);
		const earningsValue = parseFloat(earnings);

		if (isNaN(expensesValue) || expensesValue < 0) {
			toast.error('Harcamalar geçerli bir pozitif sayı olmalıdır.');
			setIsSubmitting(false);
			return;
		}
		if (isNaN(earningsValue) || earningsValue < 0) {
			toast.error('Kazançlar geçerli bir pozitif sayı olmalıdır.');
			setIsSubmitting(false);
			return;
		}
		if (!summary.trim()) {
			toast.error('Özet alanı boş bırakılamaz.');
			setIsSubmitting(false);
			return;
		}

		const payload: Omit<BranchFinancial, 'id' | 'created_at'> = {
			branch_id: branchId,
			expenses: expensesValue,
			earnings: earningsValue,
			summary,
			date: format(selectedDate, 'yyyy-MM-dd'),
		};

		try {
			if (existingRecordId) {
				if (!isSameDay(selectedDate, today)) {
					toast.error('Sadece bugünün verileri güncellenebilir.');
					setIsSubmitting(false);
					return;
				}
				const { error } = await supabase
					.from('branch_financials')
					.update(payload)
					.eq('id', existingRecordId);
				if (error) throw error;
				toast.success('Veri başarıyla güncellendi!', {
					description:
						format(selectedDate, 'dd MMMM yyyy') + ' için kayıt işlendi.',
				});
			} else {
				const { error, data: insertedData } = await supabase // data'yı alalım
					.from('branch_financials')
					.insert([payload])
					.select() // Eklenen veriyi geri döndür
					.single(); // Tek kayıt eklediğimiz için
				if (error) throw error;
				toast.success('Veri başarıyla kaydedildi!', {
					description:
						format(selectedDate, 'dd MMMM yyyy') + ' için kayıt işlendi.',
				});
				setExpenses('');
				setEarnings('');
				setSummary('');
				if (insertedData) {
					// Yeni eklenen kaydın ID'sini al
					setExistingRecordId(insertedData.id);
				}
			}
			// Başarılı işlemden sonra inputları deaktif etme durumunu yeniden değerlendir.
			// (Eğer bugünse hala açık kalabilir, dünkü yeni girilmişse bugün için disable olabilir)
			// Veya basitçe loadData'yı tekrar çağırabiliriz.
			const { data: newData } = await supabase // Bu satır kaldırılabilir eğer insert'ten ID alıyorsak
				.from('branch_financials')
				.select('id')
				.eq('branch_id', branchId)
				.eq('date', payload.date)
				.single();
			if (newData) setExistingRecordId(newData.id);
		} catch (error: unknown) {
			if (error instanceof Error) {
				toast.error(`Hata: ${error.message}`, {
					description: 'Lütfen girdilerinizi kontrol edin ve tekrar deneyin.',
				});
			} else {
				toast.error('Bilinmeyen bir hata oluştu.', {
					description: 'Lütfen girdilerinizi kontrol edin ve tekrar deneyin.',
				});
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	const isDateDisabledForCalendar = (dateToTest: Date) => {
		if (isBefore(today, dateToTest)) return true;
		if (isBefore(dateToTest, subDays(today, 6))) return true;
		return false;
	};

	return (
		// Sayfanın tamamını kaplamak yerine, içeriği bir container ile sarmalayıp
		// dikeyde padding vererek daha iyi bir görünüm elde edebiliriz.
		// min-h-screen ve items-center kaldırıldı, justify-center da.
		// Bunun yerine ana div'e padding ekleyelim.
		<div className="container mx-auto px-4 py-8 md:py-12">
			<AnimatePresence>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -20 }}
					transition={{ duration: 0.4 }}
					// Card'ı ortalamak için mx-auto ve max-w-xl veya max-w-2xl kullanılabilir.
					className="w-full max-w-2xl mx-auto"
				>
					<Card className="shadow-xl">
						{' '}
						{/* Daha belirgin bir gölge eklendi */}
						<CardHeader className="pb-4">
							{' '}
							{/* Padding ayarlandı */}
							<CardTitle className="text-2xl md:text-3xl font-semibold text-center">
								{' '}
								{/* Punto ve ortalama */}
								Şube Finansal Özeti
							</CardTitle>
							<p className="text-sm text-muted-foreground text-center">
								{format(selectedDate, 'dd MMMM yyyy')}
							</p>
						</CardHeader>
						<CardContent className="p-6 md:p-8 space-y-6">
							{/* Takvim ve Formu yan yana veya alt alta daha iyi düzenleyelim */}
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
								<div className="flex flex-col items-center lg:items-start">
									<Label className="mb-2 text-base font-medium self-start">
										Tarih Seçin
									</Label>
									<Calendar
										mode="single"
										selected={selectedDate}
										onSelect={handleDateSelect}
										disabled={isDateDisabledForCalendar}
										initialFocus
										className="rounded-md border shadow-sm p-3" // Takvime biraz stil
									/>
								</div>

								<form onSubmit={handleSubmit} className="space-y-5">
									{' '}
									{/* Boşluk artırıldı */}
									<div>
										<Label htmlFor="earnings" className="text-base font-medium">
											Kazançlar (₺)
										</Label>
										<Input
											id="earnings"
											type="number"
											placeholder="Örn: 1500.00"
											value={earnings}
											onChange={(e) => setEarnings(e.target.value)}
											disabled={isFormDisabled || isLoadingData || isSubmitting}
											step="0.01"
											min="0"
											className="mt-1.5 h-10 text-base" // Yükseklik ve punto ayarlandı
										/>
									</div>
									<div>
										<Label htmlFor="expenses" className="text-base font-medium">
											Harcamalar (₺)
										</Label>
										<Input
											id="expenses"
											type="number"
											placeholder="Örn: 350.50"
											value={expenses}
											onChange={(e) => setExpenses(e.target.value)}
											disabled={isFormDisabled || isLoadingData || isSubmitting}
											step="0.01"
											min="0"
											className="mt-1.5 h-10 text-base"
										/>
									</div>
									<div>
										<Label htmlFor="summary" className="text-base font-medium">
											Günün Özeti
										</Label>
										<Input // Textarea olabilirdi ama şimdilik Input
											id="summary"
											type="text"
											placeholder="Yapılan işlemler, notlar..."
											value={summary}
											onChange={(e) => setSummary(e.target.value)}
											disabled={isFormDisabled || isLoadingData || isSubmitting}
											className="mt-1.5 h-10 text-base"
										/>
									</div>
									<Button
										type="submit"
										className="w-full h-11 text-md font-semibold" // Buton boyutu ve punto
										disabled={isFormDisabled || isLoadingData || isSubmitting}
									>
										{isSubmitting
											? 'Kaydediliyor...'
											: existingRecordId && isSameDay(selectedDate, today)
											? 'Güncelle'
											: 'Kaydet'}
									</Button>
								</form>
							</div>

							{isLoadingData && (
								<p className="text-sm text-center text-muted-foreground py-4">
									Veriler yükleniyor...
								</p>
							)}

							{isFormDisabled &&
								!isLoadingData &&
								!isSameDay(selectedDate, today) &&
								!(isSameDay(selectedDate, yesterday) && !existingRecordId) && (
									<p className="text-sm text-center text-orange-600 dark:text-orange-500 mt-4 p-3 bg-orange-50 dark:bg-orange-900/30 rounded-md border border-orange-200 dark:border-orange-800">
										Bu tarih için sadece veri görüntüleyebilirsiniz. <br />
										Yeni kayıt veya düzenleme için lütfen bugünü veya (veri
										girilmemişse) dünü seçin.
									</p>
								)}
						</CardContent>
					</Card>
				</motion.div>
			</AnimatePresence>
		</div>
	);
}
