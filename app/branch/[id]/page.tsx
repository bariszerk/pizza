'use client';

import { LoadingSpinner } from '@/components/ui/loading-spinner'; // LoadingSpinner import edildi
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/utils/supabase/client';
import { format, isBefore, isSameDay, startOfDay, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
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
	const params = useParams();
	// URL'den gelen 'id' parametresini alıyoruz, bu branch'in UUID'si olmalı.
	const branchIdFromUrl = Array.isArray(params.id) ? params.id[0] : params.id;

	const [branchName, setBranchName] = useState<string | null>(null); // Şube adını saklamak için
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
       const { role, user } = useAuth();

	const today = useMemo(() => startOfDay(new Date()), []);
	const yesterday = useMemo(() => startOfDay(subDays(today, 1)), [today]);

	useEffect(() => {
		if (!branchIdFromUrl) {
			setIsLoadingData(false);
			toast.error('Şube kimliği URL\'de bulunamadı. Lütfen tekrar deneyin.');
			setIsFormDisabled(true);
			return;
		}

		const loadData = async (dateToLoad: Date) => {
			setIsLoadingData(true);
			setExpenses('');
			setEarnings('');
			setSummary('');
			setExistingRecordId(null);
			setIsFormDisabled(false);
			setBranchName(null); // Şube adını sıfırla

			// Şube ID'sinden şube adını al (kullanıcı arayüzünde göstermek için)
			const { data: branchData, error: branchError } = await supabase
				.from('branches')
				.select('name')
				.eq('id', branchIdFromUrl) // Artık 'id' ile sorguluyoruz
				.single();

			if (branchError || !branchData) {
				toast.error(
					`Şube (ID: ${branchIdFromUrl}) bulunamadı veya yüklenemedi.`
				);
				setIsLoadingData(false);
				setIsFormDisabled(true);
				return;
			}
			setBranchName(branchData.name); // Şube adını state'e kaydet

			const dateStr = format(dateToLoad, 'yyyy-MM-dd');

			try {
				const { data, error } = await supabase
					.from('branch_financials')
					.select('*')
					.eq('branch_id', branchIdFromUrl) // Doğrudan URL'den gelen ID'yi kullan
					.eq('date', dateStr)
					.single();

				if (error && error.code !== 'PGRST116') {
					// PGRST116: Kayıt bulunamadı, bu bir hata değil.
					throw error;
				}

                                let formShouldBeDisabled = role === 'branch_staff' ? false : true;
                                const allowEditToday = isSameDay(dateToLoad, today);
                                let allowEditYesterday = false;

				if (data) {
					setExpenses(data.expenses.toString());
					setEarnings(data.earnings.toString());
					setSummary(data.summary || '');
					setExistingRecordId(data.id);
                                        if (role !== 'branch_staff' && allowEditToday) {
                                                formShouldBeDisabled = false;
                                        }
				} else {
					allowEditYesterday = isSameDay(dateToLoad, yesterday);
                                        if (role !== 'branch_staff' && (allowEditToday || allowEditYesterday)) {
                                                formShouldBeDisabled = false;
                                        }
				}
				setIsFormDisabled(formShouldBeDisabled);
			} catch (error: unknown) {
				const errorMessage =
					error instanceof Error ? error.message : 'bilinmeyen bir hata oluştu';
				toast.error(`Finansal veri yüklenirken hata: ${errorMessage}`);
				setIsFormDisabled(true);
			} finally {
				setIsLoadingData(false);
			}
		};

		loadData(selectedDate);
	}, [selectedDate, branchIdFromUrl, supabase, today, yesterday]);

	const handleDateSelect = (newDate: Date | undefined) => {
		if (newDate && !isSameDay(newDate, selectedDate)) {
			setSelectedDate(startOfDay(newDate));
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isFormDisabled || isSubmitting || isLoadingData || !branchIdFromUrl) return;

		setIsSubmitting(true);

		// branchIdFromUrl zaten mevcut, tekrar sorgulamaya gerek yok.

		const expensesValue = parseFloat(expenses);
		const earningsValue = parseFloat(earnings);

		if (isNaN(expensesValue) || expensesValue < 0) {
			toast.error(
				'Harcamalar alanı boş bırakılamaz ve negatif bir değer alamaz.'
			);
			setIsSubmitting(false);
			return;
		}
		if (isNaN(earningsValue) || earningsValue < 0) {
			toast.error(
				'Kazançlar alanı boş bırakılamaz ve negatif bir değer alamaz.'
			);
			setIsSubmitting(false);
			return;
		}
		if (!summary.trim()) {
			toast.error('Günün özeti alanı boş bırakılamaz.');
			setIsSubmitting(false);
			return;
		}

		const payload: Omit<BranchFinancial, 'id' | 'created_at'> = {
			branch_id: branchIdFromUrl, // Doğrudan URL'den gelen ID'yi kullan
			expenses: expensesValue,
			earnings: earningsValue,
			summary,
			date: format(selectedDate, 'yyyy-MM-dd'),
		};

                try {
                        if (role === 'branch_staff') {
                                if (!existingRecordId && isSameDay(selectedDate, today)) {
                                        const { error, data: insertedData } = await supabase
                                                .from('branch_financials')
                                                .insert([payload])
                                                .select('id')
                                                .single();
                                        if (error) throw error;

                                        if (insertedData && user) {
                                                const logData = {
                                                        branch_id: branchIdFromUrl,
                                                        user_id: user.id,
                                                        action: 'FINANCIAL_DATA_ADDED',
                                                        data: payload,
                                                };
                                                await supabase.from('financial_logs').insert([logData]);
                                        }

                                        toast.success('Finansal veriler başarıyla kaydedildi!', {
                                                description: `${format(selectedDate, 'dd MMMM yyyy', {
                                                        locale: tr,
                                                })} tarihli yeni kayıt oluşturuldu.`,
                                        });
                                        if (insertedData) {
                                                setExistingRecordId(insertedData.id);
                                        }
                                } else {
                                        const { error } = await supabase.from('financial_change_requests').insert([
                                                {
                                                        branch_id: branchIdFromUrl,
                                                        date: payload.date,
                                                        expenses: expensesValue,
                                                        earnings: earningsValue,
                                                        summary,
                                                        requester_id: user?.id ?? null,
                                                        status: 'pending',
                                                },
                                        ]);
                                        if (error) throw error;
                                        toast.success('Değişiklik talebiniz yöneticilere iletildi.');
                                        setIsSubmitting(false);
                                        return;
                                }
                        } else if (existingRecordId) {
                                // Güncelleme
                                if (!isSameDay(selectedDate, today)) {
                                        toast.error(
                                                'Yalnızca bugünün finansal verileri güncellenebilir.'
                                        );
                                        setIsSubmitting(false);
                                        return;
                                }
                                const { error } = await supabase
                                        .from('branch_financials')
                                        .update(payload)
                                        .eq('id', existingRecordId);
                                if (error) throw error;

                                if (user) {
                                        const logData = {
                                                branch_id: branchIdFromUrl,
                                                user_id: user.id,
                                                action: 'FINANCIAL_DATA_UPDATED',
                                                data: payload,
                                        };
                                        await supabase.from('financial_logs').insert([logData]);
                                }

				toast.success('Finansal veriler başarıyla güncellendi!', {
					description: `${format(selectedDate, 'dd MMMM yyyy', {
						locale: tr,
					})} tarihli kayıt güncellendi.`,
				});
                        } else {
                                // Yeni kayıt
                                const { error, data: insertedData } = await supabase
                                        .from('branch_financials')
                                        .insert([payload])
                                        .select('id') // Sadece ID'yi al
                                        .single();
                                if (error) throw error;

                                if (insertedData && user) {
                                        const logData = {
                                                branch_id: branchIdFromUrl,
                                                user_id: user.id,
                                                action: 'FINANCIAL_DATA_ADDED',
                                                data: payload,
                                        };
                                        await supabase.from('financial_logs').insert([logData]);
                                }

				toast.success('Finansal veriler başarıyla kaydedildi!', {
					description: `${format(selectedDate, 'dd MMMM yyyy', {
						locale: tr,
					})} tarihli yeni kayıt oluşturuldu.`,
				});
                                if (insertedData) {
                                        setExistingRecordId(insertedData.id); // Yeni ID'yi sakla
                                }
                        }
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : 'bilinmeyen bir hata';
			toast.error(`İşlem sırasında bir hata oluştu: ${errorMessage}`, {
				description:
					'Lütfen girdiğiniz bilgileri kontrol edin ve tekrar deneyin.',
			});
		} finally {
			setIsSubmitting(false);
		}
	};

        const isDateDisabledForCalendar = (dateToTest: Date) => {
                // Sadece gelecek tarihler devre dışı olsun
                return isBefore(today, dateToTest);
        };

	return (
		<div className="container mx-auto px-4 py-8 md:py-12">
			<AnimatePresence>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -20 }}
					transition={{ duration: 0.4 }}
					className="w-full max-w-2xl mx-auto"
				>
					<Card className="shadow-xl">
						<CardHeader className="pb-4">
							<CardTitle className="text-2xl md:text-3xl font-semibold text-center">
								{branchName
									? `${branchName} Şubesi Finansal Özet Girişi`
									: 'Şube Finansal Özet Girişi'}
							</CardTitle>
							<p className="text-sm text-muted-foreground text-center">
								{format(selectedDate, 'dd MMMM yyyy, EEEE', { locale: tr })}
								{branchName && isLoadingData && (
									<span className="ml-2 text-xs">(Yükleniyor...)</span>
								)}
							</p>
						</CardHeader>
						<CardContent className="p-6 md:p-8 space-y-6">
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
								<div className="flex flex-col items-center lg:items-start">
									<Label className="mb-2 text-base font-medium self-start">
										İşlem Yapılacak Tarihi Seçin:
									</Label>
									<Calendar
										mode="single"
										selected={selectedDate}
										onSelect={handleDateSelect}
										disabled={isDateDisabledForCalendar}
										initialFocus
										className="rounded-md border shadow-sm p-3"
										locale={tr} // Takvim dilini Türkçe yap
									/>
                                                                        <p className="text-xs text-muted-foreground mt-2 text-center lg:text-left">
                                                                               Gelecekteki tarihler için işlem yapılamaz.
                                                                        </p>
								</div>

								<form onSubmit={handleSubmit} className="space-y-5">
									<div>
										<Label htmlFor="earnings" className="text-base font-medium">
											Toplam Kazanç (₺)
										</Label>
										<Input
											id="earnings"
											type="number"
											placeholder="Örn: 2500.75"
											value={earnings}
											onChange={(e) => setEarnings(e.target.value)}
											disabled={isFormDisabled || isLoadingData || isSubmitting}
											step="0.01"
											min="0"
											required
											className="mt-1.5 h-10 text-base"
										/>
									</div>
									<div>
										<Label htmlFor="expenses" className="text-base font-medium">
											Toplam Harcama (₺)
										</Label>
										<Input
											id="expenses"
											type="number"
											placeholder="Örn: 750.25"
											value={expenses}
											onChange={(e) => setExpenses(e.target.value)}
											disabled={isFormDisabled || isLoadingData || isSubmitting}
											step="0.01"
											min="0"
											required
											className="mt-1.5 h-10 text-base"
										/>
									</div>
									<div>
										<Label htmlFor="summary" className="text-base font-medium">
											Günün Özeti ve Notlar
										</Label>
										<Input
											id="summary"
											type="text"
											placeholder="Önemli olaylar, işlem detayları..."
											value={summary}
											onChange={(e) => setSummary(e.target.value)}
											disabled={isFormDisabled || isLoadingData || isSubmitting}
											required
											className="mt-1.5 h-10 text-base"
										/>
									</div>
									<Button
										type="submit"
										className="w-full h-11 text-md font-semibold"
										disabled={isFormDisabled || isLoadingData || isSubmitting}
									>
										{isSubmitting ? (
											<div className="flex items-center justify-center">
												<LoadingSpinner size={16} />
												<span className="ml-2">Kaydediliyor...</span>
											</div>
										) : isLoadingData ? (
											'Yükleniyor...'
										) : existingRecordId && isSameDay(selectedDate, today) ? (
											'Güncel Kaydı Düzenle'
										) : (
											'Yeni Kayıt Ekle'
										)}
									</Button>
								</form>
							</div>

							{isLoadingData && (
								<div className="text-sm text-center text-muted-foreground py-4 flex items-center justify-center space-x-2">
									<LoadingSpinner size={16} />
									<span>Seçili tarih için veriler yükleniyor, lütfen bekleyin...</span>
								</div>
							)}

							{isFormDisabled &&
								!isLoadingData &&
								!isSameDay(selectedDate, today) && // Bugün değilse
								!(
									isSameDay(selectedDate, yesterday) && !existingRecordId
								) && ( // Dün ve kayıt yoksa durumu hariç
									<p className="text-sm text-center text-orange-600 dark:text-orange-500 mt-4 p-3 bg-orange-50 dark:bg-orange-900/30 rounded-md border border-orange-200 dark:border-orange-800">
                                                                        Seçili tarih ({format(selectedDate, 'dd MMMM', { locale: tr })}) gelecekte olduğu için yalnızca veri görüntüleyebilirsiniz. <br />
                                                                               Yeni kayıt eklemek veya düzenleme yapmak için lütfen geçmiş bir tarih seçin.
                                                                        </p>
                                                                )}
						</CardContent>
					</Card>
				</motion.div>
			</AnimatePresence>
		</div>
	);
}
