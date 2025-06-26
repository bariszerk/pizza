// app/dashboard/page.tsx
'use client';

import {
	endOfDay,
	format,
	isSameDay,
	isValid,
	parseISO,
	startOfDay,
	subDays,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import {
	AlertTriangle,
	CheckCircle2,
	FileText,
	ListChecks,
	TrendingDown,
	TrendingUp,
	XCircle,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { type DateRange } from 'react-day-picker';

// useAuth hook'unu import et
import { useAuth } from '@/hooks/use-auth';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import {
	DateRangePicker,
	PRESETS_LOCAL,
	getDefaultPresetValueLocal,
} from './dashboard_pages/date-range-picker';
import {
	Overview,
	type OverviewChartDataPoint,
} from './dashboard_pages/overview';

type BranchInfo = {
	id: string;
	name: string;
};

type FinancialRecord = {
	id: string;
	branch_id: string;
	branch_name?: string;
	expenses: number;
	earnings: number;
	summary: string;
	date: string;
};

type DashboardData = {
	userRole: string | null;
	availableBranches: BranchInfo[];
	selectedBranchId?: string | null;
	overviewData: OverviewChartDataPoint[];
	totalRevenue: number;
	totalExpenses: number;
	totalNetProfit: number;
	totalTransactions: number;
	cardTitleTotalRevenue: string;
	cardTitleTotalExpenses: string;
	cardTitleTotalNetProfit: string;
	cardTitleTotalTransactions: string;
	cardTitleDataEntryStatus: string;
	dataEntryStatusToday: boolean;
	dailyBreakdown?: FinancialRecord[] | null;
};

type DailyDetailData = {
	date: string;
	branchName: string;
	earnings: number;
	expenses: number;
	netProfit: number;
	summary: string;
};

const LOCAL_STORAGE_BRANCH_KEY = 'lastSelectedBranchId'; // Bu anahtar değişmemeli

function DashboardContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const {
		user,
		role: userRoleFromAuth, // userRole olarak yeniden adlandırıldı
		loading: authLoading,
		error: authError,
	} = useAuth();
	const today = startOfDay(new Date());

	const currentSelectedDateRangeRef = useRef<DateRange | undefined>(undefined);
	const currentPresetValueRef = useRef<string | undefined>(undefined);

	const getInitialDateRange = useCallback((): DateRange => {
		const fromParam = searchParams.get('from');
		const toParam = searchParams.get('to');
		const presetParam = searchParams.get('preset');

		if (presetParam && presetParam !== 'custom') {
			const preset = PRESETS_LOCAL.find((p) => p.value === presetParam);
			if (preset) return preset.getDateRange();
		}
		if (fromParam && isValid(parseISO(fromParam))) {
			const fromDate = startOfDay(parseISO(fromParam));
			const toDate =
				toParam && isValid(parseISO(toParam))
					? endOfDay(parseISO(toParam))
					: endOfDay(fromDate);
			return { from: fromDate, to: toDate };
		}
		const defaultPreset = PRESETS_LOCAL.find((p) => p.value === 'last_7_days'); // Son 7 gün varsayılan
		return defaultPreset
			? defaultPreset.getDateRange()
			: { from: subDays(today, 6), to: today };
	}, [searchParams, today]);

	const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
	const [selectedDateRange, setSelectedDateRange] = useState<
		DateRange | undefined
	>(getInitialDateRange);
	const [currentPresetValue, setCurrentPresetValue] = useState<
		string | undefined
	>(
		() =>
			searchParams.get('preset') ||
			getDefaultPresetValueLocal(getInitialDateRange())
	);

	const [dashboardData, setDashboardData] = useState<DashboardData | null>(
		null
	);
	const [error, setError] = useState<string | null>(null); // Page specific errors
	const [pageLoading, setPageLoading] = useState(true); // Page specific loading

	const [showBranchSelectModal, setShowBranchSelectModal] = useState(false);
	const [modalSelectedBranch, setModalSelectedBranch] = useState<string | null>(
		null
	);

	const [showDailyDetailModal, setShowDailyDetailModal] = useState(false);
	const [selectedDayDetail, setSelectedDayDetail] =
		useState<DailyDetailData | null>(null);

	// Auth check effect
	useEffect(() => {
		if (!authLoading) {
			if (authError) {
				setError(`Auth Hatası: ${authError.message}`);
				setPageLoading(false);
				return;
			}
			if (!user) {
				router.push('/login?message=Giriş yapmanız gerekiyor.');
				return;
			}
			if (userRoleFromAuth !== 'admin' && userRoleFromAuth !== 'manager') {
				router.push('/?message=Bu sayfaya erişim yetkiniz yok.');
				return;
			}
		}
	}, [user, userRoleFromAuth, authLoading, authError, router]);

	useEffect(() => {
		currentSelectedDateRangeRef.current = selectedDateRange;
	}, [selectedDateRange]);

	useEffect(() => {
		currentPresetValueRef.current = currentPresetValue;
	}, [currentPresetValue]);

	const updateURL = useCallback(
		(newRange?: DateRange, newPreset?: string, newBranchId?: string | null) => {
			const params = new URLSearchParams(searchParams.toString());
			const rangeToUse = newRange || currentSelectedDateRangeRef.current;
			const presetToUse = newPreset || currentPresetValueRef.current;

			if (rangeToUse?.from)
				params.set('from', format(rangeToUse.from, 'yyyy-MM-dd'));
			else params.delete('from');
			if (rangeToUse?.to) params.set('to', format(rangeToUse.to, 'yyyy-MM-dd'));
			else params.delete('to');
			if (presetToUse) params.set('preset', presetToUse);
			else params.delete('preset');

			if (newBranchId === null) params.delete('branch');
			else if (newBranchId) params.set('branch', newBranchId);

			router.replace(`/dashboard?${params.toString()}`, { scroll: false });
		},
		[router, searchParams]
	);

	const fetchDashboardData = useCallback(
		async (branchIdToFetch: string | null, dateRangeToFetch: DateRange) => {
			if (authLoading || !user) return;
			if (!dateRangeToFetch?.from) {
				setError('Veri çekmek için lütfen bir başlangıç tarihi seçin.');
				setPageLoading(false);
				return;
			}
			if (!branchIdToFetch) return;

			setPageLoading(true);
			setError(null);
			const fromDate = format(dateRangeToFetch.from, 'yyyy-MM-dd');
			const toDate = dateRangeToFetch.to
				? format(dateRangeToFetch.to, 'yyyy-MM-dd')
				: fromDate;

			try {
				const response = await fetch(
					`/api/dashboard-data?from=${fromDate}&to=${toDate}&branch=${branchIdToFetch}`
				);
				if (!response.ok) {
					if (response.status === 401) {
						router.push(
							'/login?message=Oturumunuz sonlanmış, lütfen tekrar giriş yapın.'
						);
						return;
					}
					const errorData = await response.json();
					throw new Error(
						errorData.error ||
							`API Hatası: Sunucudan ${response.status} kodu alındı.`
					);
				}
				const data: DashboardData = await response.json();
				setDashboardData((prev) => ({
					...prev,
					...data,
					userRole: userRoleFromAuth,
				}));
			} catch (err) {
				if (
					err instanceof Error &&
					err.message.includes('Oturumunuz sonlanmış')
				) {
				} else if (err instanceof Error) setError(err.message);
				else
					setError(
						'Gösterge paneli verileri yüklenirken bilinmeyen bir hata oluştu.'
					);
				setDashboardData(null);
			} finally {
				setPageLoading(false);
			}
		},
		[
			authLoading,
			user,
			router,
			userRoleFromAuth,
			setDashboardData,
			setError,
			setPageLoading,
		]
	);

	const initializeDashboard = useCallback(async () => {
		if (authLoading || !user || !userRoleFromAuth) return;
		if (userRoleFromAuth !== 'admin' && userRoleFromAuth !== 'manager') {
			setPageLoading(false);
			return;
		}

		setPageLoading(true);
		setError(null);

		try {
			const initialRange = getInitialDateRange(); // Bu getInitialDateRange'in useCallback'e eklenmesi gerek.
			const fromDate = format(initialRange.from!, 'yyyy-MM-dd');
			const toDate = initialRange.to
				? format(initialRange.to, 'yyyy-MM-dd')
				: fromDate;

			const branchListRes = await fetch(
				`/api/dashboard-data?from=${fromDate}&to=${toDate}`
			);
			if (!branchListRes.ok) {
				if (branchListRes.status === 401) {
					router.push(
						'/login?message=Oturumunuz sonlanmış, lütfen tekrar giriş yapın.'
					);
					return;
				}
				const err = await branchListRes.json();
				throw new Error(err.error || 'Şube bilgileri alınamadı.');
			}
			const { availableBranches: fetchedBranches } = await branchListRes.json();

			setDashboardData((prev) => ({
				...(prev || {
					overviewData: [],
					totalRevenue: 0,
					totalExpenses: 0,
					totalNetProfit: 0,
					totalTransactions: 0,
					cardTitleTotalRevenue: '',
					cardTitleTotalExpenses: '',
					cardTitleTotalNetProfit: '',
					cardTitleTotalTransactions: '',
					cardTitleDataEntryStatus: '',
					dataEntryStatusToday: false,
					dailyBreakdown: [],
				}),
				userRole: userRoleFromAuth,
				availableBranches: fetchedBranches || [],
				selectedBranchId: prev?.selectedBranchId || null,
			}));

			const urlBranch = searchParams.get('branch');
			const lastBranch =
				typeof window !== 'undefined'
					? localStorage.getItem(LOCAL_STORAGE_BRANCH_KEY)
					: null;
			let branchToSet: string | null = null;

			if (
				urlBranch &&
				fetchedBranches?.some((b: BranchInfo) => b.id === urlBranch)
			)
				branchToSet = urlBranch;
			else if (
				lastBranch &&
				fetchedBranches?.some((b: BranchInfo) => b.id === lastBranch)
			)
				branchToSet = lastBranch;
			else if (fetchedBranches?.length === 1)
				branchToSet = fetchedBranches[0].id;

			if (branchToSet) {
				setSelectedBranchId(branchToSet);
				if (typeof window !== 'undefined')
					localStorage.setItem(LOCAL_STORAGE_BRANCH_KEY, branchToSet);
				if (!urlBranch) {
					updateURL(initialRange, currentPresetValueRef.current, branchToSet);
				}
				await fetchDashboardData(branchToSet, initialRange);
			} else if (fetchedBranches?.length > 0) {
				setShowBranchSelectModal(true);
				setPageLoading(false);
			} else {
				setError(
					'Sistemde size atanmış veya erişebileceğiniz bir şube bulunmamaktadır.'
				);
				setPageLoading(false);
			}
		} catch (e) {
			if (e instanceof Error && e.message.includes('Oturumunuz sonlanmış')) {
			} else
				setError(
					e instanceof Error
						? e.message
						: 'Gösterge paneli başlatılırken beklenmedik bir hata oluştu.'
				);
			setPageLoading(false);
		}
	}, [
		authLoading,
		user,
		userRoleFromAuth,
		router,
		getInitialDateRange,
		searchParams,
		updateURL,
		setDashboardData,
		setError,
		setPageLoading,
		setSelectedBranchId,
		setShowBranchSelectModal,
		// currentPresetValueRef doğrudan bağımlılık olamaz, değeri kullanılmalı veya state'e çevrilmeli. Şimdilik .current ile erişiliyor.
	]);

	useEffect(() => {
		if (!authLoading && user && userRoleFromAuth) {
			initializeDashboard();
		}
	}, [user, userRoleFromAuth, authLoading]);

	useEffect(() => {
		// Şube seçimi modalını gösterme: Auth ve sayfa yüklemesi tamamlandıktan sonra,
		// eğer şube seçilmemişse, modal açık değilse ve görüntülenecek şubeler varsa modalı açar.
		// Auth ve sayfa yüklemesi tamamlandıktan sonra, eğer şube seçilmemişse ve modal açık değilse
		// ve görüntülenecek şubeler varsa modalı açar.
		if (
			!authLoading &&
			!pageLoading && // Auth ve sayfa yüklemesi bitmişse
			!selectedBranchId && // Şube seçilmemişse
			!showBranchSelectModal && // Modal zaten açık değilse
			(dashboardData?.availableBranches?.length ?? 0) > 0 // Ve seçilebilecek şube varsa
		) {
			setShowBranchSelectModal(true);
		}
	}, [
		authLoading,
		pageLoading,
		dashboardData?.availableBranches,
		selectedBranchId,
		showBranchSelectModal,
	]);

	const handleDateChange = useCallback(
		({
			range,
			preset,
		}: {
			range: DateRange | undefined;
			preset: string | undefined;
		}) => {
			setSelectedDateRange(range);
			setCurrentPresetValue(preset);
			updateURL(range, preset, selectedBranchId);
		},
		[updateURL, selectedBranchId]
	);

	const handleBranchChange = useCallback(
		(branchId: string | null) => {
			if (branchId) {
				setSelectedBranchId(branchId);
				if (typeof window !== 'undefined')
					localStorage.setItem(LOCAL_STORAGE_BRANCH_KEY, branchId);
			} else {
				setSelectedBranchId(null);
				if (typeof window !== 'undefined')
					localStorage.removeItem(LOCAL_STORAGE_BRANCH_KEY);
			}
			updateURL(selectedDateRange, currentPresetValue, branchId);
		},
		[updateURL, selectedDateRange, currentPresetValue]
	);

	// Removed effect that automatically calls updateURL on dependency changes

	const handleModalBranchSelectAndApply = () => {
		if (
			modalSelectedBranch &&
			dashboardData?.availableBranches.some((b) => b.id === modalSelectedBranch)
		) {
			setShowBranchSelectModal(false);
			handleBranchChange(modalSelectedBranch);
			setError(null);
			setPageLoading(true); // Veri çekimi başlayacağı için yükleme durumunu başlat
		} else {
			setError('Lütfen listeden geçerli bir şube seçiniz.');
		}
	};

	const handleChartBarClick = (
		data: OverviewChartDataPoint,
		_index: number
	) => {
		const clickedDateStr = data.originalDate;

		const dailyRecord = dashboardData?.dailyBreakdown?.find(
			(record) => record.date === clickedDateStr
		);

		const branchName =
			dashboardData?.availableBranches.find((b) => b.id === selectedBranchId)
				?.name || 'Bilinmeyen Şube';

		if (dailyRecord) {
			setSelectedDayDetail({
				date: format(parseISO(dailyRecord.date), 'dd MMMM yyyy, EEEE', {
					locale: tr,
				}),
				branchName: branchName,
				earnings: dailyRecord.earnings,
				expenses: dailyRecord.expenses,
				netProfit: dailyRecord.earnings - dailyRecord.expenses,
				summary: dailyRecord.summary || 'Bu gün için özet girilmemiş.',
			});
		} else {
			setSelectedDayDetail({
				date: format(parseISO(clickedDateStr), 'dd MMMM yyyy, EEEE', {
					locale: tr,
				}),
				branchName: branchName,
				earnings: data.kazanc,
				expenses: data.kazanc - data.netKar,
				netProfit: data.netKar,
				summary: 'Bu gün için detaylı özet kaydı bulunamadı.',
			});
		}
		setShowDailyDetailModal(true);
	};

	const renderSkeletons = () => (
		<div className="space-y-4">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
				<div>
					<Skeleton className="h-9 w-48 mb-1" />
					<Skeleton className="h-5 w-64" />
				</div>
				<div className="flex items-center space-x-2">
					<Skeleton className="h-10 w-40" />
					<Skeleton className="h-10 w-[280px]" />
				</div>
			</div>
			<Tabs defaultValue="overview" className="space-y-4">
				<TabsContent value="overview" className="space-y-4">
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
						{[...Array(5)].map((_, i) => (
							<Card key={i}>
								<CardHeader className="pb-2">
									<Skeleton className="h-5 w-3/4" />
								</CardHeader>
								<CardContent>
									<Skeleton className="h-8 w-1/2" />
								</CardContent>
							</Card>
						))}
					</div>
					<div className="grid grid-cols-1 gap-4">
						<Card className="col-span-1">
							<CardHeader>
								<Skeleton className="h-6 w-1/3" />
							</CardHeader>
							<CardContent className="pl-2">
								<Skeleton className="h-[350px] w-full" />
							</CardContent>
						</Card>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);

	// Auth Yükleniyor Durumu
	if (authLoading) {
		return <div className="flex-1 space-y-4 p-8 pt-6">{renderSkeletons()}</div>;
	}

	// Sayfa Hatası Durumu (Auth hatası veya sayfa içi diğer hatalar)
	if (error && !showBranchSelectModal) {
		// Modal açıkken ana hata mesajını gösterme
		return (
			<div className="flex-1 space-y-4 p-8 pt-6 text-center">
				<Card className="max-w-md mx-auto shadow-lg">
					<CardHeader>
						<CardTitle className="text-destructive flex items-center justify-center text-xl">
							<AlertTriangle className="mr-2 h-6 w-6" /> Bir Sorun Oluştu
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground mb-4">
							{error || 'Gösterge paneli yüklenirken bir hata meydana geldi.'}
						</p>
						<Button
							onClick={() => {
								setError(null);
								setPageLoading(true);
								// Yeniden başlatma mantığı eklenebilir veya sayfa yenileme
								window.location.reload();
							}}
						>
							Sayfayı Yeniden Yükle
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (showBranchSelectModal) {
		return (
			<>
				{(!dashboardData || pageLoading) && renderSkeletons()}
				<Dialog
					open={showBranchSelectModal}
					onOpenChange={(open) => {
						if (
							!open && // Modal kapanıyorsa
							!selectedBranchId && // Hala şube seçilmemişse
							dashboardData?.availableBranches &&
							dashboardData.availableBranches.length > 0 // Ve seçilebilecek şube varsa
						) {
							// Modalı tekrar açmaya zorla veya bir hata mesajı göster
							setShowBranchSelectModal(true); // Tekrar aç
							setError(
								'Devam edebilmek için lütfen bir şube seçmeniz gerekmektedir.'
							);
						} else {
							setShowBranchSelectModal(open); // Normal davranış
						}
					}}
				>
					<DialogContent
						className="sm:max-w-[425px]"
						onInteractOutside={(e) => {
							// Kullanıcının dışarı tıklayarak kapatmasını engelle (eğer şube seçimi zorunluysa)
							if (
								!selectedBranchId &&
								dashboardData?.availableBranches &&
								dashboardData.availableBranches.length > 0
							) {
								e.preventDefault();
							}
						}}
						onEscapeKeyDown={(e) => {
							if (
								!selectedBranchId &&
								dashboardData?.availableBranches &&
								dashboardData.availableBranches.length > 0
							) {
								e.preventDefault();
							}
						}}
					>
						<DialogHeader>
							<DialogTitle>Şube Seçimi Yapın</DialogTitle>
							<DialogDescription>
								Lütfen verilerini görüntülemek istediğiniz şubeyi seçin. Bu
								tercihiniz tarayıcınızda saklanacaktır.
							</DialogDescription>
						</DialogHeader>
						<div className="grid gap-4 py-4">
							<Select
								onValueChange={setModalSelectedBranch}
								value={modalSelectedBranch || undefined}
								disabled={
									!dashboardData?.availableBranches ||
									dashboardData.availableBranches.length === 0 ||
									pageLoading
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Bir şube seçiniz..." />
								</SelectTrigger>
								<SelectContent>
									{dashboardData?.availableBranches?.map((branch) => (
										<SelectItem key={branch.id} value={branch.id}>
											{branch.name}
										</SelectItem>
									))}
									{(!dashboardData?.availableBranches ||
										dashboardData.availableBranches.length === 0) && (
										<div className="p-2 text-sm text-muted-foreground text-center">
											Seçilebilecek uygun şube bulunamadı.
										</div>
									)}
								</SelectContent>
							</Select>
							{error &&
								!pageLoading && ( // Yükleme sırasında hata gösterme
									<p className="text-sm text-destructive">{error}</p>
								)}
						</div>
						<DialogFooter>
							<Button
								onClick={handleModalBranchSelectAndApply}
								disabled={!modalSelectedBranch || pageLoading}
							>
								{pageLoading ? 'Yükleniyor...' : 'Seçili Şubeyi Uygula'}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</>
		);
	}

	// selectedBranchId null ise ve modal kapalıysa (örneğin hiç şube yoksa) iskelet göster.
	if (
		pageLoading ||
		!dashboardData ||
		(!selectedBranchId && (dashboardData?.availableBranches?.length ?? 0) > 0)
	) {
		return <div className="flex-1 space-y-4 p-8 pt-6">{renderSkeletons()}</div>;
	}
	// Eğer hiç şube yoksa ve selectedBranchId null ise, bir mesaj göster
	if (
		!selectedBranchId &&
		(dashboardData?.availableBranches?.length ?? 0) === 0 &&
		!pageLoading
	) {
		return (
			<div className="flex-1 space-y-4 p-8 pt-6 text-center">
				<Card className="max-w-md mx-auto shadow-lg">
					<CardHeader>
						<CardTitle className="text-orange-600 flex items-center justify-center text-xl">
							<AlertTriangle className="mr-2 h-6 w-6" /> Şube Bulunamadı
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground mb-4">
							{error ||
								'Sistemde size atanmış veya görüntülenebilecek aktif bir şube bulunmamaktadır. Lütfen yöneticinizle iletişime geçin.'}
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	const {
		userRole,
		availableBranches,
		overviewData,
		totalRevenue,
		totalExpenses,
		totalNetProfit,
		totalTransactions,
		cardTitleTotalRevenue, // API'den geliyor, dokunmuyoruz
		cardTitleTotalExpenses, // API'den geliyor
		cardTitleTotalNetProfit, // API'den geliyor
		cardTitleTotalTransactions, // API'den geliyor
		cardTitleDataEntryStatus, // API'den geliyor
		dataEntryStatusToday,
	} = dashboardData;

	const { dateDisplay, branchDisplay } = (() => {
		let dDisplay = 'Tarih Aralığı Seçilmedi';
		if (selectedDateRange?.from && isValid(selectedDateRange.from)) {
			const fromFormatted = format(selectedDateRange.from, 'dd LLL yy', {
				locale: tr,
			});
			if (
				selectedDateRange.to &&
				isValid(selectedDateRange.to) &&
				!isSameDay(selectedDateRange.from, selectedDateRange.to)
			) {
				dDisplay = `${fromFormatted} - ${format(
					selectedDateRange.to,
					'dd LLL yy',
					{ locale: tr }
				)}`;
			} else {
				dDisplay = fromFormatted; // Tek gün seçiliyse sadece o günü göster
			}
		}

		let bDisplay = 'Şube Seçilmedi';
		if (selectedBranchId) {
			const foundBranch = availableBranches.find(
				(b) => b.id === selectedBranchId
			);
			if (foundBranch) bDisplay = foundBranch.name;
			else bDisplay = 'Bilinmeyen Şube'; // Normalde olmamalı
		} else if (availableBranches.length === 0) {
			bDisplay = 'Atanmış Şube Yok';
		}
		return { dateDisplay: dDisplay, branchDisplay: bDisplay };
	})();

	return (
		<>
			<div className="hidden flex-col md:flex">
				<div className="flex-1 space-y-4 p-8 pt-6">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
						<div>
							<h2 className="text-3xl font-bold tracking-tight">
								Genel Durum Paneli (
								{userRole === 'admin' ? 'Yönetici' : 'Müdür'})
							</h2>
							<p className="text-sm text-muted-foreground mt-1">
								{branchDisplay} / {dateDisplay}
							</p>
						</div>
						<div className="flex items-center space-x-2">
							{availableBranches &&
								availableBranches.length > 1 && ( // Sadece 1'den fazla şube varsa göster
									<Select
										value={selectedBranchId || undefined}
										onValueChange={(value) => handleBranchChange(value)}
										disabled={pageLoading || availableBranches.length === 0}
									>
										<SelectTrigger className="w-auto min-w-[180px] h-10">
											<SelectValue placeholder="Bir şube seçin..." />
										</SelectTrigger>
										<SelectContent>
											{availableBranches.map((branch) => (
												<SelectItem key={branch.id} value={branch.id}>
													{branch.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							{availableBranches && availableBranches.length === 0 && (
								<div className="h-10 px-3 py-2 text-sm text-muted-foreground border rounded-md flex items-center">
									Atanmış Şube Bulunmamaktadır
								</div>
							)}
							<DateRangePicker
								onDateChange={handleDateChange}
								initialDateRange={selectedDateRange}
								initialPresetValue={currentPresetValue}
								className="min-w-max"
							/>
						</div>
					</div>

					<Tabs defaultValue="overview" className="space-y-4">
						<TabsContent value="overview" className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
								<Card>
									<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
										<CardTitle className="text-sm font-medium">
											{cardTitleTotalRevenue || 'Toplam Gelir'}
										</CardTitle>
										<span className="h-4 w-4 text-muted-foreground flex items-center justify-center text-lg">
											₺
										</span>
									</CardHeader>
									<CardContent>
										<div className="text-2xl font-bold">
											₺{totalRevenue.toFixed(2)}
										</div>
									</CardContent>
								</Card>
								<Card>
									<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
										<CardTitle className="text-sm font-medium">
											{cardTitleTotalExpenses || 'Toplam Gider'}
										</CardTitle>
										<TrendingDown className="h-4 w-4 text-destructive" />
									</CardHeader>
									<CardContent>
										<div className="text-2xl font-bold text-destructive">
											₺{totalExpenses.toFixed(2)}
										</div>
									</CardContent>
								</Card>
								<Card>
									<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
										<CardTitle className="text-sm font-medium">
											{cardTitleTotalNetProfit || 'Net Kâr'}
										</CardTitle>
										<TrendingUp className="h-4 w-4 text-green-600" />
									</CardHeader>
									<CardContent>
										<div
											className={`text-2xl font-bold ${
												totalNetProfit >= 0 ? 'text-green-600' : 'text-red-600'
											}`}
										>
											₺{totalNetProfit.toFixed(2)}
										</div>
									</CardContent>
								</Card>
								<Card>
									<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
										<CardTitle className="text-sm font-medium">
											{cardTitleTotalTransactions || 'Toplam İşlem Sayısı'}
										</CardTitle>
										<FileText className="h-4 w-4 text-muted-foreground" />
									</CardHeader>
									<CardContent>
										<div className="text-2xl font-bold">
											{totalTransactions}
										</div>
									</CardContent>
								</Card>
								<Card>
									<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
										<CardTitle className="text-sm font-medium">
											{cardTitleDataEntryStatus || 'Bugünkü Veri Girişi'}
										</CardTitle>
										{dataEntryStatusToday ? (
											<CheckCircle2 className="h-4 w-4 text-green-500" />
										) : (
											<XCircle className="h-4 w-4 text-red-500" />
										)}
									</CardHeader>
									<CardContent>
										<div className="flex items-center text-lg font-bold">
											{dataEntryStatusToday ? (
												<span className="text-green-500">Giriş Yapıldı</span>
											) : (
												<span className="text-red-500">Giriş Bekleniyor</span>
											)}
										</div>
									</CardContent>
								</Card>
							</div>

							<div className="grid grid-cols-1 gap-4">
								<Card className="col-span-1">
									<CardHeader>
										<CardTitle>Günlük Kazanç ve Net Kâr Grafiği</CardTitle>
									</CardHeader>
									<CardContent className="pl-2">
										{overviewData && overviewData.length > 0 ? (
											<Overview
												data={overviewData}
												onBarClick={handleChartBarClick}
											/>
										) : (
											<div className="flex items-center justify-center h-[350px] text-center">
												<p className="text-muted-foreground">
													Seçili şube ve tarih aralığı için gösterilecek grafik
													verisi bulunmamaktadır. <br /> Lütfen farklı bir şube
													veya tarih aralığı seçmeyi deneyin.
												</p>
											</div>
										)}
									</CardContent>
								</Card>
							</div>
						</TabsContent>
					</Tabs>
				</div>
			</div>

			{selectedDayDetail && (
				<Dialog
					open={showDailyDetailModal}
					onOpenChange={setShowDailyDetailModal}
				>
					<DialogContent className="sm:max-w-md">
						<DialogHeader>
							<DialogTitle className="flex items-center">
								<ListChecks className="mr-2 h-5 w-5" />
								Günlük Finansal Detaylar
							</DialogTitle>
							<DialogDescription>
								{selectedDayDetail.date} | Şube: {selectedDayDetail.branchName}
							</DialogDescription>
						</DialogHeader>
						<div className="grid gap-3 py-4 text-sm">
							<div className="flex justify-between items-center">
								<span className="text-muted-foreground">Toplam Kazanç:</span>
								<span className="font-semibold text-green-600">
									₺{selectedDayDetail.earnings.toFixed(2)}
								</span>
							</div>
							<div className="flex justify-between items-center">
								<span className="text-muted-foreground">Toplam Harcama:</span>
								<span className="font-semibold text-red-600">
									₺{selectedDayDetail.expenses.toFixed(2)}
								</span>
							</div>
							<hr className="my-1" />
							<div className="flex justify-between items-center">
								<span className="text-muted-foreground font-medium">
									Net Kâr/Zarar:
								</span>
								<span
									className={`font-bold text-lg ${
										selectedDayDetail.netProfit >= 0
											? 'text-green-700 dark:text-green-500'
											: 'text-red-700 dark:text-red-500'
									}`}
								>
									₺{selectedDayDetail.netProfit.toFixed(2)}
								</span>
							</div>
							<hr className="my-1" />
							<div>
								<span className="text-muted-foreground block mb-1">
									Günün Özeti:
								</span>
								<p className="mt-1 p-3 bg-muted/50 rounded-md whitespace-pre-wrap break-words border">
									{selectedDayDetail.summary || 'Özet girilmemiş.'}
								</p>
							</div>
						</div>
						<DialogFooter className="sm:justify-end">
							<DialogClose asChild>
								<Button type="button" variant="outline">
									Kapat
								</Button>
							</DialogClose>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}
		</>
	);
}

export default function DashboardPageWrapper() {
	return (
		// Suspense fallback mesajı da Türkçeleştirildi
		<Suspense
			fallback={
				<div className="flex-1 space-y-4 p-8 pt-6 text-center">
					Gösterge paneli yükleniyor, lütfen bekleyin...
				</div>
			}
		>
			<DashboardContent />
		</Suspense>
	);
}
