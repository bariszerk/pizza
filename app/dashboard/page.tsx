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
import { tr } from 'date-fns/locale'; // Türkçe locale eklendi
import { CheckCircle2, XCircle } from 'lucide-react'; // İkonlar eklendi
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { type DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
	EnhancedDateRangePicker,
	PRESETS_LOCAL,
	getDefaultPresetValueLocal,
} from './dashboard_pages/date-range-picker';
import { Overview } from './dashboard_pages/overview';

type BranchInfo = {
	id: string;
	name: string;
};

type OverviewChartData = {
	name: string;
	kazanc: number;
	netKar: number; // Net kar eklendi
};

type DashboardData = {
	userRole: string | null;
	availableBranches: BranchInfo[];
	selectedBranchId?: string | null;
	overviewData: OverviewChartData[];
	totalRevenue: number;
	totalExpenses: number;
	totalNetProfit: number;
	totalTransactions: number;
	cardTitleTotalRevenue: string;
	cardTitleTotalExpenses: string;
	cardTitleTotalNetProfit: string;
	cardTitleTotalTransactions: string;
	cardTitleDataEntryStatus: string; // Güncellendi
	dataEntryStatusToday: boolean; // Yeni alan
	dailyBreakdown?: any | null;
};

function DashboardContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const today = startOfDay(new Date());

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

	const getInitialBranchId = useCallback((): string => {
		return searchParams.get('branch') || 'all';
	}, [searchParams]);

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
	const [selectedBranchId, setSelectedBranchId] =
		useState<string>(getInitialBranchId);

	const [dashboardData, setDashboardData] = useState<DashboardData | null>(
		null
	);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const updateURLAndFetch = useCallback(
		(newRange?: DateRange, newPreset?: string, newBranch?: string) => {
			const currentRange = newRange || selectedDateRange;
			const currentPresset = newPreset || currentPresetValue;
			const currentBranch = newBranch || selectedBranchId;

			const params = new URLSearchParams(searchParams.toString());
			if (currentRange?.from)
				params.set('from', format(currentRange.from, 'yyyy-MM-dd'));
			else params.delete('from');

			if (currentRange?.to)
				params.set('to', format(currentRange.to, 'yyyy-MM-dd'));
			else params.delete('to');

			if (currentPresset) params.set('preset', currentPresset);
			else params.delete('preset');

			if (currentBranch) params.set('branch', currentBranch);
			else params.delete('branch');

			router.replace(`/dashboard?${params.toString()}`, { scroll: false });
		},
		[
			router,
			searchParams,
			selectedDateRange,
			currentPresetValue,
			selectedBranchId,
		]
	);

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
			updateURLAndFetch(range, preset, undefined);
		},
		[updateURLAndFetch]
	);

	const handleBranchChange = useCallback(
		(branchId: string) => {
			setSelectedBranchId(branchId);
			updateURLAndFetch(undefined, undefined, branchId);
		},
		[updateURLAndFetch]
	);

	useEffect(() => {
		const initialRange = getInitialDateRange();
		const initialPreset =
			searchParams.get('preset') || getDefaultPresetValueLocal(initialRange);
		const initialBranch = getInitialBranchId();

		if (
			!selectedDateRange ||
			(selectedDateRange.from &&
				initialRange.from &&
				!isSameDay(selectedDateRange.from, initialRange.from)) ||
			(selectedDateRange.to &&
				initialRange.to &&
				!isSameDay(selectedDateRange.to, initialRange.to)) ||
			(!selectedDateRange.from && initialRange.from) ||
			(!selectedDateRange.to && initialRange.to)
		) {
			setSelectedDateRange(initialRange);
		}
		if (currentPresetValue !== initialPreset) {
			setCurrentPresetValue(initialPreset);
		}
		if (selectedBranchId !== initialBranch) {
			setSelectedBranchId(initialBranch);
		}
	}, [
		searchParams,
		getInitialDateRange,
		getInitialBranchId,
		selectedDateRange,
		currentPresetValue,
		selectedBranchId,
	]);

	useEffect(() => {
		const fetchDashboardData = async () => {
			if (!selectedDateRange?.from) {
				setLoading(false);
				setError('Lütfen bir başlangıç tarihi seçin.');
				return;
			}
			setLoading(true);
			setError(null);

			const fromDate = format(selectedDateRange.from, 'yyyy-MM-dd');
			const toDate = selectedDateRange.to
				? format(selectedDateRange.to, 'yyyy-MM-dd')
				: fromDate;
			const branchQuery = selectedBranchId
				? `&branch=${selectedBranchId}`
				: '&branch=all';

			try {
				const response = await fetch(
					`/api/dashboard-data?from=${fromDate}&to=${toDate}${branchQuery}`
				);
				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || `API Hatası: ${response.status}`);
				}
				const data: DashboardData = await response.json();
				setDashboardData(data);

				if (data && !data.userRole) {
					router.push('/login');
				}
			} catch (err) {
				console.error('Dashboard veri çekme hatası:', err);
				if (err instanceof Error) {
					setError(err.message);
				} else {
					setError('Veriler yüklenirken bilinmeyen bir hata oluştu.');
				}
				setDashboardData(null);
			} finally {
				setLoading(false);
			}
		};

		if (selectedDateRange?.from) {
			fetchDashboardData();
		} else {
			setLoading(false);
		}
	}, [selectedDateRange, selectedBranchId, router]);

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

	if (error) {
		return (
			<div className="flex-1 space-y-4 p-8 pt-6 text-center">
				<p className="text-destructive">Hata: {error}</p>
				<Button
					onClick={() => {
						const defaultRange = PRESETS_LOCAL.find(
							(p) => p.value === 'last_7_days'
						)!.getDateRange();
						setSelectedDateRange(defaultRange);
						setCurrentPresetValue('last_7_days');
						setSelectedBranchId(
							dashboardData?.userRole === 'branch_staff' &&
								dashboardData?.availableBranches?.length === 1
								? dashboardData.availableBranches[0].id
								: 'all'
						);
						updateURLAndFetch(
							defaultRange,
							'last_7_days',
							dashboardData?.userRole === 'branch_staff' &&
								dashboardData?.availableBranches?.length === 1
								? dashboardData.availableBranches[0].id
								: 'all'
						);
					}}
				>
					Tekrar Dene (Varsayılan Ayarlar)
				</Button>
			</div>
		);
	}

	if (loading || !dashboardData) {
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
		cardTitleDataEntryStatus, // Yeni başlık
		dataEntryStatusToday, // Yeni veri
	} = dashboardData;

	const getDisplayTexts = () => {
		let dateDisplay = 'Tarih Aralığı Seçilmedi';
		if (selectedDateRange?.from && isValid(selectedDateRange.from)) {
			const fromFormatted = format(selectedDateRange.from, 'dd LLL yy', {
				locale: tr,
			});
			if (
				selectedDateRange.to &&
				isValid(selectedDateRange.to) &&
				!isSameDay(selectedDateRange.from, selectedDateRange.to)
			) {
				dateDisplay = `${fromFormatted} - ${format(
					selectedDateRange.to,
					'dd LLL yy',
					{ locale: tr }
				)}`;
			} else {
				dateDisplay = fromFormatted;
			}
		}

		let branchDisplay = 'Şube Bilgisi Yüklenemedi';
		const currentBranchSelection = selectedBranchId;

		if (availableBranches && availableBranches.length > 0) {
			if (currentBranchSelection === 'all') {
				branchDisplay = 'Tüm Şubeler';
			} else if (currentBranchSelection === 'all_assigned') {
				branchDisplay = 'Tüm Yetkili Şubelerim';
			} else {
				const foundBranch = availableBranches.find(
					(b) => b.id === currentBranchSelection
				);
				if (foundBranch) {
					branchDisplay = foundBranch.name;
				} else if (currentBranchSelection) {
					branchDisplay = `Bilinmeyen Şube (${currentBranchSelection.substring(
						0,
						6
					)}...)`;
				} else {
					branchDisplay = 'Şube Seçilmedi';
				}
			}
		} else if (
			availableBranches &&
			availableBranches.length === 0 &&
			(userRole === 'manager' || userRole === 'branch_staff')
		) {
			branchDisplay = 'Atanmış Şube Yok';
		} else if (
			userRole === 'admin' &&
			(!availableBranches || availableBranches.length === 0)
		) {
			branchDisplay = 'Sistemde Şube Tanımlı Değil';
		} else {
			branchDisplay = 'Şube Seçimi Bekleniyor';
		}

		return { dateDisplay, branchDisplay };
	};
	const { dateDisplay, branchDisplay } = getDisplayTexts();

	const allBranchesOptionValue =
		userRole === 'manager' ? 'all_assigned' : 'all';

	let dynamicAllBranchesLabel = 'Şube Seçin';
	if (userRole === 'admin') {
		dynamicAllBranchesLabel = 'Tüm Şubeler';
	} else if (userRole === 'manager') {
		dynamicAllBranchesLabel =
			availableBranches && availableBranches.length > 0
				? 'Tüm Yetkili Şubelerim'
				: 'Atanmış Şube Yok';
	} else if (userRole === 'branch_staff') {
		dynamicAllBranchesLabel =
			availableBranches && availableBranches.length === 1
				? availableBranches[0].name
				: 'Şubeniz';
	}

	return (
		<>
			<div className="hidden flex-col md:flex">
				<div className="flex-1 space-y-4 p-8 pt-6">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
						<div>
							<h2 className="text-3xl font-bold tracking-tight">
								Dashboard{' '}
								{userRole === 'admin'
									? '(Admin)'
									: userRole === 'manager'
									? '(Yönetici)'
									: userRole === 'branch_staff'
									? `(Personel - ${
											branchDisplay !== 'Atanmış Şube Yok' &&
											branchDisplay !== 'Şube Seçimi Bekleniyor'
												? branchDisplay
												: ''
									  })`
									: ''}
							</h2>
							<p className="text-sm text-muted-foreground mt-1">
								{userRole !== 'branch_staff' ? `${branchDisplay} / ` : ''}{' '}
								{dateDisplay}
							</p>
						</div>
						<div className="flex items-center space-x-2">
							{(userRole === 'admin' || userRole === 'manager') &&
								availableBranches && (
									<Select
										value={selectedBranchId}
										onValueChange={handleBranchChange}
										disabled={
											loading ||
											(availableBranches.length === 0 && userRole === 'manager')
										}
									>
										<SelectTrigger className="w-auto min-w-[180px] h-10">
											<SelectValue placeholder={dynamicAllBranchesLabel} />
										</SelectTrigger>
										<SelectContent>
											{availableBranches.length > 0 && (
												<SelectItem value={allBranchesOptionValue}>
													{dynamicAllBranchesLabel}
												</SelectItem>
											)}
											{availableBranches.map((branch) => (
												<SelectItem key={branch.id} value={branch.id}>
													{branch.name}
												</SelectItem>
											))}
											{availableBranches.length === 0 &&
												userRole === 'manager' && (
													<SelectItem value="no_branch_manager" disabled>
														Atanmış Şube Yok
													</SelectItem>
												)}
										</SelectContent>
									</Select>
								)}
							<EnhancedDateRangePicker
								onDateChange={handleDateChange}
								initialDateRange={selectedDateRange}
								initialPresetValue={currentPresetValue}
								className="min-w-max"
							/>
							<Button
								onClick={() => alert('Rapor indirme özelliği yakında!')}
								disabled={loading}
							>
								Rapor İndir
							</Button>
						</div>
					</div>

					<Tabs defaultValue="overview" className="space-y-4">
						<TabsContent value="overview" className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
								<Card>
									<CardHeader className="pb-2">
										<CardTitle className="text-sm font-medium">
											{cardTitleTotalRevenue}
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="text-2xl font-bold">
											₺{totalRevenue.toFixed(2)}
										</div>
									</CardContent>
								</Card>
								<Card>
									<CardHeader className="pb-2">
										<CardTitle className="text-sm font-medium">
											{cardTitleTotalExpenses}
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="text-2xl font-bold text-destructive">
											₺{totalExpenses.toFixed(2)}
										</div>
									</CardContent>
								</Card>
								<Card>
									<CardHeader className="pb-2">
										<CardTitle className="text-sm font-medium">
											{cardTitleTotalNetProfit}
										</CardTitle>
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
									<CardHeader className="pb-2">
										<CardTitle className="text-sm font-medium">
											{cardTitleTotalTransactions}
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="text-2xl font-bold">
											{totalTransactions}
										</div>
									</CardContent>
								</Card>
								<Card>
									<CardHeader className="pb-2">
										<CardTitle className="text-sm font-medium">
											{cardTitleDataEntryStatus}
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="flex items-center text-2xl font-bold">
											{dataEntryStatusToday ? (
												<>
													<CheckCircle2 className="h-7 w-7 text-green-500 mr-2" />
													<span className="text-sm">Girildi</span>
												</>
											) : (
												<>
													<XCircle className="h-7 w-7 text-red-500 mr-2" />
													<span className="text-sm">Bekleniyor</span>
												</>
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
											<Overview data={overviewData} />
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
