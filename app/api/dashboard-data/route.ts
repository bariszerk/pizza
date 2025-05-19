// app/api/dashboard-data/route.ts
import { createClient } from '@/utils/supabase/server';
import {
	eachDayOfInterval,
	endOfDay,
	format,
	isValid,
	parseISO,
	startOfDay,
} from 'date-fns';
import { tr } from 'date-fns/locale'; // Türkçe locale eklendi
import { NextResponse } from 'next/server';
import { type DateRange } from 'react-day-picker';

// Tipler
type FinancialRecord = {
	id: string;
	branch_id: string;
	expenses: number;
	earnings: number;
	summary: string;
	date: string;
};

type FinancialData = FinancialRecord & {
	branch_name?: string;
};

type OverviewChartData = {
	name: string; // Gün formatı (örn: 19 May)
	kazanc: number;
	netKar: number; // Net kar eklendi
};

type BranchInfo = {
	id: string;
	name: string;
};

type DashboardApiResponse = {
	userRole: string | null;
	availableBranches: BranchInfo[];
	selectedBranchId?: string | null;
	overviewData: OverviewChartData[];
	totalRevenue: number;
	totalExpenses: number;
	totalNetProfit: number;
	totalTransactions: number;
	// activeNowCount kaldırıldı, yerine dataEntryStatusToday kullanılacak
	cardTitleTotalRevenue: string;
	cardTitleTotalExpenses: string;
	cardTitleTotalNetProfit: string;
	cardTitleTotalTransactions: string;
	cardTitleDataEntryStatus: string; // Yeni başlık
	dataEntryStatusToday: boolean; // Bugün veri girildi mi?
	dailyBreakdown?: any | null; // Bu alanın detaylı yapısı netleşince güncellenebilir
};

export async function GET(request: Request) {
	const supabase = await createClient();
	const { searchParams } = new URL(request.url);
	const fromParam = searchParams.get('from');
	const toParam = searchParams.get('to');
	let branchIdParam = searchParams.get('branch');

	let dateRange: DateRange | undefined = undefined;

	if (fromParam && isValid(parseISO(fromParam))) {
		const fromDate = startOfDay(parseISO(fromParam));
		let toDate;
		if (toParam && isValid(parseISO(toParam))) {
			toDate = endOfDay(parseISO(toParam));
		} else {
			toDate = endOfDay(fromDate);
		}
		dateRange = { from: fromDate, to: toDate };
	} else {
		return NextResponse.json(
			{ error: "Geçerli 'from' tarihi gereklidir." },
			{ status: 400 }
		);
	}

	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();

	if (userError || !user) {
		return NextResponse.json(
			{ error: 'Yetkilendirme hatası: Kullanıcı bulunamadı.' },
			{ status: 401 }
		);
	}

	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('role, staff_branch_id')
		.eq('id', user.id)
		.single();

	if (profileError || !profile) {
		console.error(
			'API/dashboard-data: Profil bulunamadı:',
			profileError?.message
		);
		return NextResponse.json(
			{ error: 'Profil bulunamadı veya yetki hatası.' },
			{ status: 403 }
		);
	}

	const userRole = profile.role;
	let accessibleBranchIds: string[] | null = null;
	let availableBranchesForSelect: BranchInfo[] = [];

	const { data: allBranchesData, error: allBranchesError } = await supabase
		.from('branches')
		.select('id, name')
		.order('name', { ascending: true });

	if (allBranchesError || !allBranchesData) {
		return NextResponse.json(
			{ error: 'Şube bilgileri alınırken bir hata oluştu.' },
			{ status: 500 }
		);
	}
	const branchMap = new Map(allBranchesData.map((b) => [b.id, b.name]));

	if (userRole === 'admin') {
		availableBranchesForSelect = allBranchesData;
	} else if (userRole === 'manager') {
		const { data: assignments, error: assignmentsError } = await supabase
			.from('manager_branch_assignments')
			.select('branch_id')
			.eq('manager_id', user.id);

		if (assignmentsError) {
			return NextResponse.json(
				{ error: 'Yönetici şube atamaları alınamadı.' },
				{ status: 500 }
			);
		}
		accessibleBranchIds = assignments.map((a) => a.branch_id);
		availableBranchesForSelect = allBranchesData.filter((b) =>
			accessibleBranchIds!.includes(b.id)
		);
		if (accessibleBranchIds.length === 0) {
			return NextResponse.json({
				userRole,
				availableBranches: [],
				selectedBranchId: branchIdParam,
				overviewData: [],
				totalRevenue: 0,
				totalExpenses: 0,
				totalNetProfit: 0,
				totalTransactions: 0,
				cardTitleTotalRevenue: 'Toplam Kazanç (Atanmış Şube Yok)',
				cardTitleTotalExpenses: 'Toplam Gider (Atanmış Şube Yok)',
				cardTitleTotalNetProfit: 'Net Kar (Atanmış Şube Yok)',
				cardTitleTotalTransactions: 'Toplam İşlem (Atanmış Şube Yok)',
				cardTitleDataEntryStatus: 'Bugünkü Veri Girişi (Atanmış Şube Yok)',
				dataEntryStatusToday: false,
				dailyBreakdown: null,
			} as DashboardApiResponse);
		}
	} else if (userRole === 'branch_staff') {
		if (profile.staff_branch_id) {
			accessibleBranchIds = [profile.staff_branch_id];
			availableBranchesForSelect = allBranchesData.filter(
				(b) => b.id === profile.staff_branch_id
			);
			if (
				!branchIdParam ||
				branchIdParam === 'all' ||
				branchIdParam === 'all_assigned'
			)
				branchIdParam = profile.staff_branch_id;
		} else {
			return NextResponse.json({
				userRole,
				availableBranches: [],
				selectedBranchId: branchIdParam,
				overviewData: [],
				totalRevenue: 0,
				totalExpenses: 0,
				totalNetProfit: 0,
				totalTransactions: 0,
				cardTitleTotalRevenue: 'Toplam Kazanç (Şube Atanmamış)',
				cardTitleTotalExpenses: 'Toplam Gider (Şube Atanmamış)',
				cardTitleTotalNetProfit: 'Net Kar (Şube Atanmamış)',
				cardTitleTotalTransactions: 'Toplam İşlem (Şube Atanmamış)',
				cardTitleDataEntryStatus: 'Bugünkü Veri Girişi (Şube Atanmamış)',
				dataEntryStatusToday: false,
				dailyBreakdown: null,
			} as DashboardApiResponse);
		}
	} else {
		return NextResponse.json(
			{ error: 'Bu verilere erişim yetkiniz yok.' },
			{ status: 403 }
		);
	}

	let financialQueryBuilder = supabase
		.from('branch_financials')
		.select<string, FinancialRecord>('*');

	if (dateRange?.from) {
		financialQueryBuilder = financialQueryBuilder.gte(
			'date',
			format(dateRange.from, 'yyyy-MM-dd')
		);
	}
	if (dateRange?.to) {
		financialQueryBuilder = financialQueryBuilder.lte(
			'date',
			format(dateRange.to, 'yyyy-MM-dd')
		);
	}

	let effectiveBranchIdsForQuery: string[] = [];

	if (
		branchIdParam &&
		branchIdParam !== 'all' &&
		branchIdParam !== 'all_assigned'
	) {
		if (
			userRole === 'admin' ||
			(accessibleBranchIds && accessibleBranchIds.includes(branchIdParam))
		) {
			effectiveBranchIdsForQuery = [branchIdParam];
			financialQueryBuilder = financialQueryBuilder.eq(
				'branch_id',
				branchIdParam
			);
		} else {
			return NextResponse.json(
				{ error: 'Bu şubeye erişim yetkiniz yok.' },
				{ status: 403 }
			);
		}
	} else {
		// 'all' or 'all_assigned'
		if (userRole === 'admin') {
			effectiveBranchIdsForQuery = allBranchesData.map((b) => b.id);
			// Admin tüm şubeleri görebilir, ek filtreye gerek yok (date filter yeterli)
		} else if (userRole === 'manager' || userRole === 'branch_staff') {
			if (accessibleBranchIds && accessibleBranchIds.length > 0) {
				effectiveBranchIdsForQuery = accessibleBranchIds;
				financialQueryBuilder = financialQueryBuilder.in(
					'branch_id',
					accessibleBranchIds
				);
			} else {
				// Yetkili şubesi yoksa boş veri döner (yukarıdaki guard'lar tarafından yakalanmalıydı)
				// Güvenlik için tekrar kontrol edip boş yanıt döndürebiliriz.
				return NextResponse.json({
					userRole,
					availableBranches: [],
					selectedBranchId: branchIdParam,
					overviewData: [],
					totalRevenue: 0,
					totalExpenses: 0,
					totalNetProfit: 0,
					totalTransactions: 0,
					cardTitleTotalRevenue: 'Toplam Kazanç (Yetkili Şube Yok)',
					cardTitleTotalExpenses: 'Toplam Gider (Yetkili Şube Yok)',
					cardTitleTotalNetProfit: 'Net Kar (Yetkili Şube Yok)',
					cardTitleTotalTransactions: 'Toplam İşlem (Yetkili Şube Yok)',
					cardTitleDataEntryStatus: 'Bugünkü Veri Girişi (Yetkili Şube Yok)',
					dataEntryStatusToday: false,
					dailyBreakdown: null,
				} as DashboardApiResponse);
			}
		}
	}

	const { data: financials, error: financialsError } =
		await financialQueryBuilder.order('date', { ascending: false });

	if (financialsError) {
		return NextResponse.json(
			{ error: 'Finansal veriler alınamadı.' },
			{ status: 500 }
		);
	}

	const typedFinancials: FinancialData[] = (financials || []).map((f) => ({
		...f,
		branch_name: branchMap.get(f.branch_id) || f.branch_id,
	}));

	let totalRevenue = 0;
	let totalExpenses = 0;
	typedFinancials.forEach((item) => {
		totalRevenue += item.earnings;
		totalExpenses += item.expenses;
	});
	const totalNetProfit = totalRevenue - totalExpenses;
	const totalTransactions = typedFinancials.length;

	const overviewData: OverviewChartData[] = [];
	if (dateRange.from && dateRange.to) {
		const intervalDays = eachDayOfInterval({
			start: dateRange.from,
			end: dateRange.to,
		});
		intervalDays.forEach((day) => {
			const dayStr = format(day, 'yyyy-MM-dd');
			const dailyEarnings = typedFinancials
				.filter((item) => item.date === dayStr)
				.reduce((sum, item) => sum + item.earnings, 0);
			const dailyExpenses = typedFinancials
				.filter((item) => item.date === dayStr)
				.reduce((sum, item) => sum + item.expenses, 0);
			overviewData.push({
				name: format(day, 'dd MMM', { locale: tr }), // Türkçe format
				kazanc: dailyEarnings,
				netKar: dailyEarnings - dailyExpenses,
			});
		});
	}

	const todayStr = format(new Date(), 'yyyy-MM-dd');
	let dataEntryToday = false;
	if (effectiveBranchIdsForQuery.length > 0) {
		dataEntryToday = typedFinancials.some(
			(f) =>
				f.date === todayStr && effectiveBranchIdsForQuery.includes(f.branch_id)
		);
	} else {
		// Eğer effectiveBranchIdsForQuery boşsa (örn. admin ve sistemde hiç şube yoksa)
		dataEntryToday = false;
	}

	const responsePayload: DashboardApiResponse = {
		userRole,
		availableBranches: availableBranchesForSelect,
		selectedBranchId:
			branchIdParam ||
			(userRole === 'admin'
				? 'all'
				: accessibleBranchIds && accessibleBranchIds.length > 0
				? 'all_assigned'
				: null),
		overviewData,
		totalRevenue,
		totalExpenses,
		totalNetProfit,
		totalTransactions,
		cardTitleTotalRevenue: `Toplam Kazanç`,
		cardTitleTotalExpenses: `Toplam Gider`,
		cardTitleTotalNetProfit: `Net Kâr`,
		cardTitleTotalTransactions: `Toplam İşlem`,
		cardTitleDataEntryStatus: 'Bugünkü Veri Girişi',
		dataEntryStatusToday: dataEntryToday,
		dailyBreakdown: null,
	};

	return NextResponse.json(responsePayload);
}
