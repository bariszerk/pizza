import { createClient } from '@/utils/supabase/server';
import {
	eachDayOfInterval,
	endOfDay,
	format,
	isValid,
	parseISO,
	startOfDay,
} from 'date-fns';
import { NextResponse } from 'next/server';
import { type DateRange } from 'react-day-picker'; // type importu

// Tipler
type FinancialRecord = {
	id: string;
	branch_id: string;
	expenses: number;
	earnings: number;
	summary: string;
	date: string; // 'YYYY-MM-DD'
	// created_at?: string; // Eğer varsa
};

type FinancialData = FinancialRecord & {
	branch_name?: string; // Şube adı opsiyonel olabilir
};

type OverviewChartData = {
	name: string;
	total: number;
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
	activeNowCount: number;
	cardTitleTotalRevenue: string;
	cardTitleTotalExpenses: string;
	cardTitleTotalNetProfit: string;
	cardTitleTotalTransactions: string;
	cardTitleActiveNow: string;
	dailyBreakdown?: {
		date: string;
		earnings: number;
		expenses: number;
		netProfit: number;
		details?: Array<{
			branch_name?: string;
			branch_id: string;
			earnings: number;
			expenses: number;
			summary: string;
		}>;
	} | null;
};

export async function GET(request: Request) {
	const supabase = await createClient(); // createClient async olduğu için await burada
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
		console.error(
			'API/dashboard-data: Şube bilgileri çekilemedi:',
			allBranchesError?.message
		);
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
				availableBranches: [], // Zorunlu alan eklendi
				selectedBranchId: branchIdParam,
				overviewData: [],
				totalRevenue: 0,
				totalExpenses: 0,
				totalNetProfit: 0,
				totalTransactions: 0,
				activeNowCount: 0,
				cardTitleTotalRevenue: 'Toplam Kazanç (Atanmış Şube Yok)',
				cardTitleTotalExpenses: 'Toplam Gider (Atanmış Şube Yok)',
				cardTitleTotalNetProfit: 'Net Kar (Atanmış Şube Yok)',
				cardTitleTotalTransactions: 'Toplam İşlem (Atanmış Şube Yok)',
				cardTitleActiveNow: 'Bugün Aktif (Atanmış Şube Yok)',
				dailyBreakdown: null,
			} as DashboardApiResponse);
		}
	} else if (userRole === 'branch_staff') {
		if (profile.staff_branch_id) {
			accessibleBranchIds = [profile.staff_branch_id];
			availableBranchesForSelect = allBranchesData.filter(
				(b) => b.id === profile.staff_branch_id
			);
			if (!branchIdParam || branchIdParam === 'all')
				branchIdParam = profile.staff_branch_id;
		} else {
			return NextResponse.json({
				userRole,
				availableBranches: [], // Zorunlu alan eklendi
				selectedBranchId: branchIdParam,
				overviewData: [],
				totalRevenue: 0,
				totalExpenses: 0,
				totalNetProfit: 0,
				totalTransactions: 0,
				activeNowCount: 0,
				cardTitleTotalRevenue: 'Toplam Kazanç (Şube Atanmamış)',
				cardTitleTotalExpenses: 'Toplam Gider (Şube Atanmamış)',
				cardTitleTotalNetProfit: 'Net Kar (Şube Atanmamış)',
				cardTitleTotalTransactions: 'Toplam İşlem (Şube Atanmamış)',
				cardTitleActiveNow: 'Bugün Aktif (Şube Atanmamış)',
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
		.select<string, FinancialRecord>('*'); // Supabase sorgu zinciri tipini belirtiyoruz

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

	// Şube ID'sine göre filtreleme
	if (
		branchIdParam &&
		branchIdParam !== 'all' &&
		branchIdParam !== 'all_assigned'
	) {
		// Spesifik bir şube ID'si istendi
		if (userRole === 'admin') {
			// Admin her şubeyi görebilir, ek kontrol gerekmez (ama branchIdParam'ın geçerli bir UUID olup olmadığı kontrol edilebilir)
			financialQueryBuilder = financialQueryBuilder.eq(
				'branch_id',
				branchIdParam
			);
		} else if (userRole === 'manager') {
			if (accessibleBranchIds && accessibleBranchIds.includes(branchIdParam)) {
				financialQueryBuilder = financialQueryBuilder.eq(
					'branch_id',
					branchIdParam
				);
			} else {
				// Manager bu spesifik şubeye yetkili değil
				return NextResponse.json(
					{ error: 'Bu şubeye erişim yetkiniz yok.' },
					{ status: 403 }
				);
			}
		}
		// branch_staff durumu zaten middleware veya sayfa başında ele alınmalı, buraya gelmemeli.
		// Ama gelirse ve branchIdParam kendi şubesi değilse hata verilmeli.
	} else {
		// "all" veya "all_assigned" durumu ya da branchIdParam hiç yok (varsayılan tümü)
		if (userRole === 'manager') {
			if (accessibleBranchIds && accessibleBranchIds.length > 0) {
				financialQueryBuilder = financialQueryBuilder.in(
					'branch_id',
					accessibleBranchIds
				);
			} else {
				// Yöneticinin atanmış şubesi yoksa zaten başta boş veri dönülmüştü. Bu duruma gelinmemeli.
				// Ama bir güvenlik önlemi olarak yine boş veri döndürülebilir.
				return NextResponse.json({
					userRole,
					availableBranches: [], // Zorunlu alan eklendi
					selectedBranchId: branchIdParam,
					overviewData: [],
					totalRevenue: 0,
					totalExpenses: 0,
					totalNetProfit: 0,
					totalTransactions: 0,
					activeNowCount: 0,
					cardTitleTotalRevenue: 'Toplam Kazanç (Şube Atanmamış)',
					cardTitleTotalExpenses: 'Toplam Gider (Şube Atanmamış)',
					cardTitleTotalNetProfit: 'Net Kar (Şube Atanmamış)',
					cardTitleTotalTransactions: 'Toplam İşlem (Şube Atanmamış)',
					cardTitleActiveNow: 'Bugün Aktif (Şube Atanmamış)',
					dailyBreakdown: null,
				} as DashboardApiResponse);
			}
		}
	}

	const { data: financials, error: financialsError } =
		await financialQueryBuilder.order('date', { ascending: false });

	if (financialsError) {
		console.error(
			'API/dashboard-data: Finansal veriler çekilemedi:',
			financialsError.message
		);
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
			overviewData.push({ name: format(day, 'dd MMM'), total: dailyEarnings });
		});
	}

	const todayStr = format(new Date(), 'yyyy-MM-dd');
	let activeNowCount = 0;
	if (branchIdParam && branchIdParam !== 'all') {
		activeNowCount = typedFinancials.some(
			(f) => f.date === todayStr && f.branch_id === branchIdParam
		)
			? 1
			: 0;
	} else {
		const activeBranchIdsToday = new Set(
			typedFinancials.filter((f) => f.date === todayStr).map((f) => f.branch_id)
		);
		activeNowCount = activeBranchIdsToday.size;
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
		activeNowCount,
		cardTitleTotalRevenue: `Toplam Kazanç`,
		cardTitleTotalExpenses: `Toplam Gider`,
		cardTitleTotalNetProfit: `Net Kar`,
		cardTitleTotalTransactions: `Toplam İşlem`,
		cardTitleActiveNow: `Bugün Aktif`,
		dailyBreakdown: null,
	};

	return NextResponse.json(responsePayload);
}
