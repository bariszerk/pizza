// app/admin/branch-financials/[branchId]/page.tsx
'use client';

import { LoadingSpinner } from '@/components/ui/loading-spinner'; // LoadingSpinner import edildi
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/utils/supabase/client';
import { format, isBefore, isSameDay, startOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation'; // useRouter eklendi
import { useEffect, useMemo, useState, useCallback } from 'react'; // useCallback eklendi
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

type Profile = {
	id: string;
	role: string;
};

export default function AdminBranchFinancialsPage() {
	const { branchId: branchNameFromUrl } = useParams(); // Dosya yolu [branchId] olduğu için parametre adı branchId olmalı. Değer şube adını taşıyacak.
	const branchNameParam = Array.isArray(branchNameFromUrl)
		? branchNameFromUrl[0]
		: branchNameFromUrl;
	const router = useRouter(); // useRouter hook'u
	const supabase = createClient();

	const [expenses, setExpenses] = useState('');
	const [earnings, setEarnings] = useState('');
	const [summary, setSummary] = useState('');
	const [selectedDate, setSelectedDate] = useState<Date>(
		startOfDay(new Date())
	);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isLoadingData, setIsLoadingData] = useState(true);
	const [isFormDisabled, setIsFormDisabled] = useState(true); // Başlangıçta true, yetki kontrolünden sonra false olur
	const [existingRecordId, setExistingRecordId] = useState<number | null>(null);
	const [branchName, setBranchName] = useState<string>('');
	const [isAuthorized, setIsAuthorized] = useState<boolean>(false); // Yetki durumu için state

	const today = useMemo(() => startOfDay(new Date()), []);

	// Yetkilendirme ve Şube Adı Yükleme Fonksiyonu
	const authorizeAndLoadBranchName = useCallback(async () => {
		setIsLoadingData(true);
		if (!branchNameParam) {
			toast.error('Şube adı URL\'de bulunamadı.');
			router.push('/admin/branches'); // Admin şube listesine yönlendir
			return;
		}

		// Şube adından şube kimliğini al
                const { data: branchByName, error: branchByNameError } = await supabase
                        .from('branches')
                        .select('id, name')
                        .eq('name', decodeURIComponent(branchNameParam)) // URL'den gelen adı decode et
                        .eq('archived', false)
                        .single();

		if (branchByNameError || !branchByName) {
			toast.error(`'${decodeURIComponent(branchNameParam)}' adlı şube bulunamadı veya alınamadı.`);
			router.push('/admin/branches');
			setIsLoadingData(false);
			return;
		}
		const branchId = branchByName.id;
		setBranchName(branchByName.name); // State'i gerçek şube adıyla güncelle


		const { data: { user } } = await supabase.auth.getUser();
		if (!user) {
			toast.error('Lütfen giriş yapın.');
			router.push('/login');
			return;
		}

		const { data: profile, error: profileError } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single<Profile>();

		if (profileError || !profile) {
			toast.error('Kullanıcı profili alınamadı veya bulunamadı.');
			router.push('/login');
			return;
		}

		let hasPermission = false;
		if (profile.role === 'admin') {
			hasPermission = true;
		} else if (profile.role === 'manager') {
			const { data: assignment, error: assignmentError } = await supabase
				.from('manager_branch_assignments')
				.select('branch_id')
				.eq('manager_id', user.id)
				.eq('branch_id', branchId)
				.maybeSingle(); // .single() yerine .maybeSingle() daha güvenli

			if (assignmentError) {
				toast.error('Şube yetki kontrolünde bir hata oluştu.');
				hasPermission = false;
			} else if (assignment) {
				hasPermission = true;
			} else {
				toast.error('Bu şube için işlem yapma yetkiniz bulunmamaktadır.');
			}
		} else {
			toast.error('Bu sayfaya erişim yetkiniz bulunmamaktadır.');
		}

		if (!hasPermission) {
			setIsAuthorized(false);
			setIsLoadingData(false);
			setIsFormDisabled(true);
			router.push(profile.role === 'manager' ? '/admin/branches' : '/dashboard'); // Yetkisizse yönlendir
			return;
		}

		setIsAuthorized(true);

		// Şube adı zaten branchByName.name ile setBranchName aracılığıyla ayarlandı.
		// Bu yüzden burada tekrar çekmeye gerek yok.

		// Formu burada etkinleştirmiyoruz, loadFinancialData içinde yapacağız
	}, [branchNameParam, supabase, router]); // branchId yerine branchNameParam bağımlılığı

	// Finansal Veri Yükleme Fonksiyonu
	const loadFinancialData = useCallback(async (dateToLoad: Date) => {
		// branchId'yi almak için branchNameParam'ı kullan
		if (!branchNameParam) {
			setIsLoadingData(false);
			return;
		}
                const { data: branchData, error: branchError } = await supabase
                        .from('branches')
                        .select('id')
                        .eq('name', decodeURIComponent(branchNameParam))
                        .eq('archived', false)
                        .single();

		if (branchError || !branchData) {
			toast.error("Finansal veri yüklenirken şube kimliği alınamadı.");
			setIsLoadingData(false);
			return;
		}
		const branchId = branchData.id;


		if (!isAuthorized || !branchId) {
			// Yetki yoksa veya branchId yoksa veri yükleme
			setIsLoadingData(false);
			return;
		}
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

			if (error && error.code !== 'PGRST116') { // PGRST116: Kayıt yok, bu bir hata değil.
				throw error;
			}

			if (data) {
				setExpenses(data.expenses.toString());
				setEarnings(data.earnings.toString());
				setSummary(data.summary || '');
				setExistingRecordId(data.id);
			}
			setIsFormDisabled(false);

		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu';
			toast.error(`Finansal veri yüklenirken hata: ${errorMessage}`);
			setIsFormDisabled(true); // Hata durumunda formu devre dışı bırak
		} finally {
			setIsLoadingData(false);
		}
	}, [branchNameParam, supabase, isAuthorized]); // branchId yerine branchNameParam

	// İlk Yükleme (Yetki ve Şube Adı)
	useEffect(() => {
		authorizeAndLoadBranchName();
	}, [authorizeAndLoadBranchName]);

	// Seçili Tarih veya Yetki Değiştiğinde Finansal Verileri Yükle
	useEffect(() => {
		if (isAuthorized && branchNameParam) { // Yetki varsa ve branchNameParam mevcutsa finansal verileri yükle
			loadFinancialData(selectedDate);
		}
	}, [selectedDate, isAuthorized, branchNameParam, loadFinancialData]); // branchId yerine branchNameParam


	const handleDateSelect = (newDate: Date | undefined) => {
		if (newDate && !isSameDay(newDate, selectedDate)) {
				setSelectedDate(startOfDay(newDate));
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isFormDisabled || isSubmitting || isLoadingData || !isAuthorized) return;

		// Gelecek tarih kontrolü
		if (isBefore(today, selectedDate)) {
			toast.error('Gelecek bir tarih için veri kaydedilemez.');
			return;
		}

		setIsSubmitting(true);

		// branchId'yi almak için branchNameParam'ı kullan
		if (!branchNameParam) {
			toast.error('Şube adı geçersiz. İşlem yapılamıyor.');
			setIsSubmitting(false);
			return;
		}
                const { data: branchData, error: branchError } = await supabase
                        .from('branches')
                        .select('id')
                        .eq('name', decodeURIComponent(branchNameParam))
                        .eq('archived', false)
                        .single();

		if (branchError || !branchData) {
			toast.error("İşlem sırasında şube kimliği alınamadı.");
			setIsSubmitting(false);
			return;
		}
		const branchId = branchData.id;


		const expensesValue = parseFloat(expenses);
		const earningsValue = parseFloat(earnings);

		if (isNaN(expensesValue) || expensesValue < 0) {
			toast.error('Harcamalar alanı boş bırakılamaz ve negatif bir değer alamaz.');
			setIsSubmitting(false);
			return;
		}
		if (isNaN(earningsValue) || earningsValue < 0) {
			toast.error('Kazançlar alanı boş bırakılamaz ve negatif bir değer alamaz.');
			setIsSubmitting(false);
			return;
		}
		if (!summary.trim()) {
			toast.error('Günün özeti alanı boş bırakılamaz.');
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
				const { error } = await supabase
					.from('branch_financials')
					.update(payload)
					.eq('id', existingRecordId);
				if (error) throw error;

				const { data: { user } } = await supabase.auth.getUser();
				if (user) {
					const logData = {
						branch_id: branchId,
						user_id: user.id,
						action: 'FINANCIAL_DATA_UPDATED',
						data: payload,
					};
					await supabase.from('financial_logs').insert([logData]);
				}

				toast.success('Finansal veriler başarıyla güncellendi!', {
					description: `${branchName} - ${format(selectedDate, 'dd MMMM yyyy', {
						locale: tr,
					})} tarihli kayıt güncellendi.`,
				});
			} else {
				const { error, data: insertedData } = await supabase
					.from('branch_financials')
					.insert([payload])
					.select('id')
					.single();
				if (error) throw error;

				const { data: { user } } = await supabase.auth.getUser();
				if (insertedData && user) {
					const logData = {
						branch_id: branchId,
						user_id: user.id,
						action: 'FINANCIAL_DATA_ADDED',
						data: payload,
					};
					await supabase.from('financial_logs').insert([logData]);
				}

				toast.success('Finansal veriler başarıyla kaydedildi!', {
					description: `${branchName} - ${format(selectedDate, 'dd MMMM yyyy', {
						locale: tr,
					})} tarihli yeni kayıt oluşturuldu.`,
				});
				if (insertedData) {
					setExistingRecordId(insertedData.id);
				}
			}
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir hata';
			toast.error(`İşlem sırasında bir hata oluştu: ${errorMessage}`, {
				description: 'Lütfen girdiğiniz bilgileri kontrol edin ve tekrar deneyin.',
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const isDateDisabledForCalendar = () => {
		return false;
	};

	if (isLoadingData && !branchName) { // Henüz şube adı veya yetki yüklenmemişse genel yükleme
		return (
                    <div className="container mx-auto px-4 py-4 md:py-6 text-center flex flex-col items-center justify-center space-y-2">
				<LoadingSpinner size={32} />
				<p>Sayfa yükleniyor, lütfen bekleyin...</p>
			</div>
		);
	}

	if (!isAuthorized && !isLoadingData) { // Yetki yok ve yükleme bittiyse
                return (
                        <div className="container mx-auto px-4 py-4 md:py-6 text-center">
				<Card className="shadow-xl max-w-md mx-auto">
					<CardHeader>
						<CardTitle className="text-xl text-destructive">Erişim Reddedildi</CardTitle>
					</CardHeader>
					<CardContent>
						<p>Bu sayfayı görüntüleme veya bu şube için işlem yapma yetkiniz bulunmamaktadır.</p>
						<Button onClick={() => router.push('/admin/branches')} className="mt-4">
							Şube Listesine Dön
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}


	return (
                <div className="container mx-auto px-4 py-4 md:py-6">
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
								{branchName ? `${branchName} Şubesi` : 'Şube'} Finansal Veri Girişi
							</CardTitle>
							<p className="text-sm text-muted-foreground text-center">
								Yönetici Paneli - {format(selectedDate, 'dd MMMM yyyy, EEEE', { locale: tr })}
							</p>
						</CardHeader>
                                                <CardContent className="p-4 md:p-6 space-y-4">
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
										locale={tr}
									/>
									<p className="text-xs text-muted-foreground mt-2 text-center lg:text-left">
										Geçmiş herhangi bir tarihe veri girebilir/düzenleyebilirsiniz.
									</p>
								</div>

                                                                <form onSubmit={handleSubmit} className="space-y-4">
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
										) : existingRecordId ? (
											'Kaydı Güncelle'
										) : (
											'Yeni Kayıt Ekle'
										)}
									</Button>
								</form>
							</div>

							{isLoadingData && !isSubmitting && (
								<div className="text-sm text-center text-muted-foreground py-4 flex items-center justify-center space-x-2">
									<LoadingSpinner size={16} />
									<span>Seçili tarih için veriler yükleniyor, lütfen bekleyin...</span>
								</div>
							)}
						</CardContent>
					</Card>
				</motion.div>
			</AnimatePresence>
		</div>
	);
}
