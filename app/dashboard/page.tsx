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
	DollarSign,
	FileText,
	ListChecks,
	TrendingDown,
	TrendingUp,
	XCircle,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { type DateRange } from 'react-day-picker';

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

const LOCAL_STORAGE_BRANCH_KEY = 'lastSelectedBranchId';

function DashboardContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const today = startOfDay(new Date());

	// Refs to prevent stale closures in callbacks
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
		const defaultPreset = PRESETS_LOCAL.find((p) => p.value === 'last_7_days');
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
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [showBranchSelectModal, setShowBranchSelectModal] = useState(false);
	const [modalSelectedBranch, setModalSelectedBranch] = useState<string | null>(
		null
	);

	const [showDailyDetailModal, setShowDailyDetailModal] = useState(false);
	const [selectedDayDetail, setSelectedDayDetail] =
		useState<DailyDetailData | null>(null);

	// Update refs whenever state changes
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
			if (newBranchId) params.set('branch', newBranchId);
			else params.delete('branch');

			router.replace(`/dashboard?${params.toString()}`, { scroll: false });
		},
		[router, searchParams] // Refs are stable, no need to include them here
	);

	const fetchDashboardData = useCallback(
		async (branchIdToFetch: string, dateRangeToFetch: DateRange) => {
			if (!dateRangeToFetch?.from) {
				setError('Lütfen bir başlangıç tarihi seçin.');
				setLoading(false);
				return;
			}
			setLoading(true);
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
					const errorData = await response.json();
					throw new Error(errorData.error || `API Hatası: ${response.status}`);
				}
				const data: DashboardData = await response.json();
				setDashboardData(data);
			} catch (err) {
				if (err instanceof Error) setError(err.message);
				else setError('Veriler yüklenirken bilinmeyen bir hata oluştu.');
				setDashboardData(null);
			} finally {
				setLoading(false);
			}
		},
		[] // No dependencies, relies on arguments
	);

	useEffect(() => {
		const initializeDashboard = async () => {
			setLoading(true);
			setError(null);

			try {
				// 1) Başlangıç tarih aralığını al
				const initialRange = getInitialDateRange();

				const fromDate = format(initialRange.from!, 'yyyy-MM-dd');
				const toDate = initialRange.to
					? format(initialRange.to, 'yyyy-MM-dd')
					: fromDate;

				// 2) Kullanıcı rolü ve şubeleri çek
				const initialRes = await fetch(
					`/api/dashboard-data?from=${fromDate}&to=${toDate}`
				);
				if (!initialRes.ok) {
					const err = await initialRes.json();
					throw new Error(
						err.error || 'Kullanıcı ve şube bilgileri alınamadı.'
					);
				}
				const { userRole, availableBranches } = await initialRes.json();

				// 3) Yetki kontrolü
				if (userRole !== 'admin' && userRole !== 'manager') {
					router.push('/');
					return;
				}

				// 4) DashboardData’ya userRole ve branches ekle
				setDashboardData((prev) =>
					prev
						? {
								...prev,
								userRole,
								availableBranches,
						  }
						: {
								userRole,
								availableBranches,
								selectedBranchId: null,
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
						  }
				);

				// 5) Otomatik şube seçimi: URL, localStorage veya tek branch
				const urlBranch = searchParams.get('branch');
				const lastBranch =
					typeof window !== 'undefined'
						? localStorage.getItem(LOCAL_STORAGE_BRANCH_KEY)
						: null;

				let branchToSet: string | null = null;
				if (
					urlBranch &&
					availableBranches.some((b: BranchInfo) => b.id === urlBranch)
				) {
					branchToSet = urlBranch;
				} else if (
					lastBranch &&
					availableBranches.some((b: BranchInfo) => b.id === lastBranch)
				) {
					branchToSet = lastBranch;
				} else if (availableBranches.length === 1) {
					branchToSet = availableBranches[0].id;
				}

				if (branchToSet) {
					// 6) State, storage ve URL’ı güncelle
					setSelectedBranchId(branchToSet);
					if (typeof window !== 'undefined') {
						localStorage.setItem(LOCAL_STORAGE_BRANCH_KEY, branchToSet);
					}
					updateURL(initialRange, currentPresetValueRef.current, branchToSet);

					// 7) **BURADA** hemen veri çekimini yapıyoruz
					await fetchDashboardData(branchToSet, initialRange);
				} else if (availableBranches.length > 0) {
					// Kullanıcının seçmesi için modal aç
					setShowBranchSelectModal(true);
				} else {
					setError('Erişebileceğiniz bir şube bulunmamaktadır.');
				}
			} catch (e) {
				setError(
					e instanceof Error
						? e.message
						: 'Dashboard başlatılırken bir hata oluştu.'
				);
			} finally {
				setLoading(false);
			}
		};

		initializeDashboard();
		// Bu effect’i yalnızca component mount’unda çalıştırıyoruz
	}, []);

	// Fetch data when selectedBranchId or selectedDateRange changes
	// 1) Veri çekme useEffect'i
	useEffect(() => {
		if (selectedBranchId && selectedDateRange?.from && !showBranchSelectModal) {
			fetchDashboardData(selectedBranchId, selectedDateRange);
		}
		// Sadece branch veya tarih aralığı değişince, modal kapalıysa çalışır.
	}, [selectedBranchId, selectedDateRange, showBranchSelectModal]);

	// 2) Modal açma useEffect'i
	useEffect(() => {
		if (
			!selectedBranchId &&
			!showBranchSelectModal &&
			(dashboardData?.availableBranches?.length ?? 0) > 0
		) {
			setShowBranchSelectModal(true);
		}
		// Sadece availableBranches veya selectedBranchId değiştiğinde kontrol eder.
	}, [
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
			// updateURL will be called by the useEffect watching selectedDateRange
			// fetchDashboardData will also be called by the useEffect
		},
		[]
	);

	const handleBranchChange = useCallback((branchId: string | null) => {
		if (branchId) {
			setSelectedBranchId(branchId);
			if (typeof window !== 'undefined') {
				localStorage.setItem(LOCAL_STORAGE_BRANCH_KEY, branchId);
			}
			// updateURL will be called by the useEffect watching selectedBranchId
			// fetchDashboardData will also be called by the useEffect
		}
	}, []);

	// Update URL when relevant states change (and modal is not open)
	useEffect(() => {
		if (!showBranchSelectModal && selectedBranchId && selectedDateRange) {
			updateURL(selectedDateRange, currentPresetValue, selectedBranchId);
		}
	}, [
		selectedBranchId,
		selectedDateRange,
		currentPresetValue,
		showBranchSelectModal,
		updateURL,
	]);

	const handleModalBranchSelectAndApply = () => {
		if (
			modalSelectedBranch &&
			dashboardData?.availableBranches.some((b) => b.id === modalSelectedBranch)
		) {
			setShowBranchSelectModal(false);
			handleBranchChange(modalSelectedBranch);
			setError(null);
		} else {
			setError('Lütfen geçerli bir şube seçin.');
		}
	};

	const handleChartBarClick = (
		data: OverviewChartDataPoint,
		_index: number
	) => {
		const clickedDateStr = data.originalDate;
		if (!clickedDateStr || !dashboardData?.dailyBreakdown) {
			return;
		}
		const dailyRecord = dashboardData.dailyBreakdown.find(
			(record) => record.date === clickedDateStr
		);

		if (dailyRecord && selectedBranchId) {
			const branchName =
				dashboardData.availableBranches.find((b) => b.id === selectedBranchId)
					?.name || 'Bilinmeyen Şube';
			setSelectedDayDetail({
				date: format(parseISO(dailyRecord.date), 'dd MMMM yyyy', {
					locale: tr,
				}),
				branchName: branchName,
				earnings: dailyRecord.earnings,
				expenses: dailyRecord.expenses,
				netProfit: dailyRecord.earnings - dailyRecord.expenses,
				summary: dailyRecord.summary || 'Özet bulunmamaktadır.',
			});
			setShowDailyDetailModal(true);
		} else {
			setSelectedDayDetail({
				date: format(parseISO(clickedDateStr), 'dd MMMM yyyy', { locale: tr }),
				branchName:
					dashboardData.availableBranches.find((b) => b.id === selectedBranchId)
						?.name || 'Bilinmeyen Şube',
				earnings: data.kazanc,
				expenses: data.kazanc - data.netKar,
				netProfit: data.netKar,
				summary: 'Bu gün için özet detayı bulunamadı.',
			});
			setShowDailyDetailModal(true);
		}
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
					<Skeleton className="h-10 w-24" />
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

	if (error && !showBranchSelectModal) {
		return (
			<div className="flex-1 space-y-4 p-8 pt-6 text-center">
				<Card className="max-w-md mx-auto">
					<CardHeader>
						<CardTitle className="text-destructive flex items-center justify-center">
							<AlertTriangle className="mr-2 h-6 w-6" /> Bir Hata Oluştu
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground mb-4">{error}</p>
						<Button onClick={() => window.location.reload()}>
							Sayfayı Yenile
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (showBranchSelectModal) {
		return (
			<>
				{/* Modal açıkken arka planda skeletonlar veya boş bir ekran gösterilebilir */}
				{(!dashboardData || loading) && renderSkeletons()}
				<Dialog
					open={showBranchSelectModal}
					onOpenChange={(open) => {
						if (
							!open &&
							!selectedBranchId &&
							dashboardData?.availableBranches &&
							dashboardData.availableBranches.length > 0
						) {
							setShowBranchSelectModal(true);
							setError('Lütfen devam etmek için bir şube seçin.');
						} else {
							setShowBranchSelectModal(open);
						}
					}}
				>
					<DialogContent
						className="sm:max-w-[425px]"
						onInteractOutside={(e) => e.preventDefault()}
						onEscapeKeyDown={(e) => e.preventDefault()}
					>
						<DialogHeader>
							<DialogTitle>Şube Seçimi</DialogTitle>
							<DialogDescription>
								Lütfen görüntülemek istediğiniz şubeyi seçin. Bu tercihiniz
								kaydedilecektir.
							</DialogDescription>
						</DialogHeader>
						<div className="grid gap-4 py-4">
							<Select
								onValueChange={setModalSelectedBranch}
								value={modalSelectedBranch || undefined}
								disabled={
									!dashboardData?.availableBranches ||
									dashboardData.availableBranches.length === 0 ||
									loading
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Bir şube seçin..." />
								</SelectTrigger>
								<SelectContent>
									{dashboardData?.availableBranches?.map((branch) => (
										<SelectItem key={branch.id} value={branch.id}>
											{branch.name}
										</SelectItem>
									))}
									{(!dashboardData?.availableBranches ||
										dashboardData.availableBranches.length === 0) && (
										<div className="p-2 text-sm text-muted-foreground">
											Uygun şube bulunamadı.
										</div>
									)}
								</SelectContent>
							</Select>
							{error && <p className="text-sm text-destructive">{error}</p>}
						</div>
						<DialogFooter>
							<Button
								onClick={handleModalBranchSelectAndApply}
								disabled={!modalSelectedBranch || loading}
							>
								{loading ? 'Yükleniyor...' : 'Şubeyi Uygula'}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</>
		);
	}

	if (loading || !dashboardData || !selectedBranchId) {
		return <div className="flex-1 space-y-4 p-8 pt-6">{renderSkeletons()}</div>;
	}

	const {
		userRole,
		availableBranches,
		overviewData,
		totalRevenue,
		totalExpenses,
		totalNetProfit,
		totalTransactions,
		cardTitleTotalRevenue,
		cardTitleTotalExpenses,
		cardTitleTotalNetProfit,
		cardTitleTotalTransactions,
		cardTitleDataEntryStatus,
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
				dDisplay = fromFormatted;
			}
		}

		let bDisplay = 'Şube Seçilmedi';
		if (selectedBranchId) {
			const foundBranch = availableBranches.find(
				(b) => b.id === selectedBranchId
			);
			if (foundBranch) bDisplay = foundBranch.name;
			else bDisplay = 'Bilinmeyen Şube';
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
								Dashboard ({userRole === 'admin' ? 'Admin' : 'Yönetici'})
							</h2>
							<p className="text-sm text-muted-foreground mt-1">
								{branchDisplay} / {dateDisplay}
							</p>
						</div>
						<div className="flex items-center space-x-2">
							{availableBranches && availableBranches.length > 0 && (
								<Select
									value={selectedBranchId || undefined}
									onValueChange={(value) => handleBranchChange(value)}
									disabled={loading || availableBranches.length === 0}
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
								<div className="h-10 px-3 py-2 text-sm text-muted-foreground border rounded-md">
									Atanmış Şube Yok
								</div>
							)}
							<DateRangePicker
								onDateChange={handleDateChange}
								initialDateRange={selectedDateRange}
								initialPresetValue={currentPresetValue}
								className="min-w-max"
							/>
							{/* <Button
								onClick={() => alert('Rapor indirme özelliği yakında!')}
								disabled={loading}
							>
								Rapor İndir
							</Button> */}
						</div>
					</div>

					<Tabs defaultValue="overview" className="space-y-4">
						<TabsContent value="overview" className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
								<Card>
									<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
										<CardTitle className="text-sm font-medium">
											{cardTitleTotalRevenue}
										</CardTitle>
										<span className="h-4 w-4 text-muted-foreground flex items-center justify-center text-lg">
											₺
										</span>{' '}
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
											{cardTitleTotalExpenses}
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
											{cardTitleTotalNetProfit}
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
											{cardTitleTotalTransactions}
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
											{cardTitleDataEntryStatus}
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
												<span className="text-green-500">Girildi</span>
											) : (
												<span className="text-red-500">Bekleniyor</span>
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
											<div className="flex items-center justify-center h-[350px]">
												<p className="text-muted-foreground">
													Bu seçim için genel bakış verisi bulunmamaktadır.
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
								Günlük Finansal Detay
							</DialogTitle>
							<DialogDescription>
								{selectedDayDetail.date} - {selectedDayDetail.branchName}
							</DialogDescription>
						</DialogHeader>
						<div className="grid gap-3 py-4 text-sm">
							<div className="flex justify-between">
								<span className="text-muted-foreground">Toplam Kazanç:</span>
								<span className="font-semibold text-green-600">
									₺{selectedDayDetail.earnings.toFixed(2)}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Toplam Harcama:</span>
								<span className="font-semibold text-red-600">
									₺{selectedDayDetail.expenses.toFixed(2)}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Net Kâr:</span>
								<span
									className={`font-semibold ${
										selectedDayDetail.netProfit >= 0
											? 'text-green-600'
											: 'text-red-600'
									}`}
								>
									₺{selectedDayDetail.netProfit.toFixed(2)}
								</span>
							</div>
							<div>
								<span className="text-muted-foreground">Günün Özeti:</span>
								<p className="mt-1 p-2 bg-muted/50 rounded-md whitespace-pre-wrap break-words">
									{selectedDayDetail.summary}
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
		<Suspense
			fallback={
				<div className="flex-1 space-y-4 p-8 pt-6">Sayfa Yükleniyor...</div>
			}
		>
			<DashboardContent />
		</Suspense>
	);
}
