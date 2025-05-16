// app/dashboard/page.tsx
import { createClient } from '@/utils/supabase/server'; // Sunucu istemcisini kullanıyoruz
import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { CalendarDateRangePicker } from './dashboard_pages/date-range-picker';
// import { MainNav } from './dashboard_pages/main-nav'; // Bu bileşenin içeriği de role göre değişebilir veya kaldırılabilir
import { Overview } from './dashboard_pages/overview'; // Bu bileşene filtrelenmiş veri gönderilecek
import { RecentSales } from './dashboard_pages/recent-sales'; // Bu bileşene filtrelenmiş veri gönderilecek
// import { Search } from './dashboard_pages/search';
// import { UserNav } from './dashboard_pages/user-nav'; // Bu bileşen session bilgisi alabilir

export const metadata: Metadata = {
	title: 'Dashboard',
	description: 'Pizza Yönetim Sistemi Dashboard',
};

// Veri tipleri (branch_financials tablonuza göre uyarlayın)
type FinancialData = {
	id: string; // veya number, tablonuza göre
	branch_id: string;
	expenses: number;
	earnings: number;
	summary: string;
	date: string; // 'YYYY-MM-DD' formatında olmalı
	// Diğer gerekli alanlar
};

type OverviewChartData = {
	name: string; // örn: Ay veya Şube Adı
	total: number; // örn: Toplam kazanç veya gider
};

async function getDashboardData() {
	const supabase = await createClient(); // Fonksiyon içinde çağrı
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();

	if (userError || !user) {
		redirect('/login');
	}

	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('role, staff_branch_id')
		.eq('id', user.id)
		.single();

	if (profileError || !profile) {
		console.error(
			'Dashboard: Profil bulunamadı veya hata:',
			profileError?.message
		);
		// redirect('/login'); // Veya bir hata mesajı göster
		// Şimdilik boş veri döndürelim, sayfa içinde kullanıcıya mesaj gösterilebilir
		return {
			userRole: null,
			financialData: [],
			overviewData: [],
			recentSalesData: [],
			totalRevenue: 0,
			totalSubscriptions: 0,
			totalSales: 0,
			activeNow: 0,
		};
	}

	const userRole = profile.role;
	let financialQuery = supabase.from('branch_financials').select('*');

	if (userRole === 'manager') {
		const { data: assignments, error: assignmentsError } = await supabase
			.from('manager_branch_assignments')
			.select('branch_id')
			.eq('manager_id', user.id);

		if (assignmentsError) {
			console.error(
				'Dashboard: Manager şube atamaları çekilemedi:',
				assignmentsError.message
			);
			return {
				userRole,
				financialData: [],
				overviewData: [],
				recentSalesData: [],
				totalRevenue: 0,
				totalSubscriptions: 0,
				totalSales: 0,
				activeNow: 0,
			};
		}
		const branchIds = assignments.map((a) => a.branch_id);
		if (branchIds.length > 0) {
			financialQuery = financialQuery.in('branch_id', branchIds);
		} else {
			// Manager'ın atanmış şubesi yoksa boş veri
			return {
				userRole,
				financialData: [],
				overviewData: [],
				recentSalesData: [],
				totalRevenue: 0,
				totalSubscriptions: 0,
				totalSales: 0,
				activeNow: 0,
			};
		}
	} else if (userRole === 'branch_staff') {
		if (profile.staff_branch_id) {
			financialQuery = financialQuery.eq('branch_id', profile.staff_branch_id);
		} else {
			// branch_staff'ın atanmış şubesi yoksa boş veri
			return {
				userRole,
				financialData: [],
				overviewData: [],
				recentSalesData: [],
				totalRevenue: 0,
				totalSubscriptions: 0,
				totalSales: 0,
				activeNow: 0,
			};
		}
	}
	// Admin için filtre yok, tüm veriler gelir.

	const { data: financials, error: financialsError } =
		await financialQuery.order('date', { ascending: false });

	if (financialsError) {
		console.error(
			'Dashboard: Finansal veriler çekilemedi:',
			financialsError.message
		);
		return {
			userRole,
			financialData: [],
			overviewData: [],
			recentSalesData: [],
			totalRevenue: 0,
			totalSubscriptions: 0,
			totalSales: 0,
			activeNow: 0,
		};
	}

	const typedFinancials: FinancialData[] = financials || [];

	// Bu verilerden dashboard kartları ve grafikleri için özetler oluşturun
	// Örnek: Toplam Kazanç
	const totalRevenue = typedFinancials.reduce(
		(acc, item) => acc + item.earnings,
		0
	);
	// Örnek: Overview grafiği için aylık kazançlar (veya şube bazlı kazançlar)
	// Bu kısım gelen verilere ve istenen grafiğe göre detaylı işlenmeli
	const overviewData: OverviewChartData[] = typedFinancials
		.slice(0, 12) // Son 12 kayıt (örnek)
		.map((item) => ({
			name: item.branch_id.substring(0, 5),
			total: item.earnings,
		})) // Şube ID'sinin ilk 5 harfi (veya şube adı çekilmeli)
		.reverse(); // Tarihe göre sıralıysa

	// Örnek: Recent Sales (son birkaç finansal hareket)
	const recentSalesData = typedFinancials.slice(0, 5).map((item) => ({
		id: item.id,
		name: `Şube: ${item.branch_id.substring(0, 5)}`, // Şube adı çekilmeli
		email: item.summary.substring(0, 30) + '...',
		amount: item.earnings - item.expenses, // Net kazanç/kayıp
	}));

	// Diğer kart verileri de benzer şekilde hesaplanabilir (totalSubscriptions, totalSales, activeNow)
	// Şimdilik sabit bırakıyorum, bu kısımlar projenizin mantığına göre doldurulmalı.

	return {
		userRole,
		financialData: typedFinancials,
		overviewData,
		recentSalesData,
		totalRevenue,
		totalSubscriptions: typedFinancials.length, // Örnek: Toplam kayıt sayısı
		totalSales: typedFinancials.reduce((acc, item) => acc + item.earnings, 0), // Toplam kazanç
		activeNow: typedFinancials.filter(
			(f) => new Date(f.date).toDateString() === new Date().toDateString()
		).length, // Bugün aktif olan (örnek)
	};
}

export default async function DashboardPage() {
	const {
		userRole,
		// financialData, // Tüm finansal veriler, gerekirse kullanılabilir
		overviewData,
		recentSalesData,
		totalRevenue,
		totalSubscriptions,
		totalSales,
		activeNow,
	} = await getDashboardData();

	if (!userRole) {
		// getDashboardData içinde redirect olabilir veya burada bir mesaj gösterilebilir
		return (
			<div className="flex-1 space-y-4 p-8 pt-6">
				<p>
					Verilere erişim için lütfen giriş yapın veya yetkilendirme bekleyin.
				</p>
			</div>
		);
	}

	return (
		<>
			{/* Mobil için uyarı veya farklı bir layout gösterilebilir, şu anki kodunuzda md:hidden var */}
			{/* <div className="md:hidden">...</div> */}

			<div className="hidden flex-col md:flex">
				{/* <div className="border-b">
                    <div className="flex h-16 items-center px-4">
                        <MainNav className="mx-6" />
                        <div className="ml-auto flex items-center space-x-4">
                            <Search />
                            <UserNav />
                        </div>
                    </div>
                </div> */}
				{/* Navbar zaten RootLayout'ta olduğu için buradaki kaldırılabilir veya farklı bir iç navigasyon olabilir */}

				<div className="flex-1 space-y-4 p-8 pt-6">
					<div className="flex items-center justify-between space-y-2">
						<h2 className="text-3xl font-bold tracking-tight">
							Dashboard{' '}
							{userRole === 'manager'
								? '(Yönetici)'
								: userRole === 'branch_staff'
								? '(Şube Personeli)'
								: userRole === 'admin'
								? '(Admin)'
								: ''}
						</h2>
						<div className="flex items-center space-x-2">
							<CalendarDateRangePicker />{' '}
							{/* Bu da filtrelenen veriye göre çalışmalı */}
							<Button>Rapor İndir</Button>{' '}
							{/* Bu da filtrelenen veriye göre çalışmalı */}
						</div>
					</div>
					<Tabs defaultValue="overview" className="space-y-4">
						<TabsList>
							<TabsTrigger value="overview">Genel Bakış</TabsTrigger>
							{/* Diğer tablar şimdilik disabled */}
							<TabsTrigger value="analytics" disabled>
								Analitik
							</TabsTrigger>
							<TabsTrigger value="reports" disabled>
								Raporlar
							</TabsTrigger>
							<TabsTrigger value="notifications" disabled>
								Bildirimler
							</TabsTrigger>
						</TabsList>
						<TabsContent value="overview" className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
								<Card>
									<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
										<CardTitle className="text-sm font-medium">
											Toplam Kazanç
										</CardTitle>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											className="h-4 w-4 text-muted-foreground"
										>
											<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
										</svg>
									</CardHeader>
									<CardContent>
										<div className="text-2xl font-bold">
											${totalRevenue.toFixed(2)}
										</div>
										{/* <p className="text-xs text-muted-foreground">+20.1% from last month</p> */}
									</CardContent>
								</Card>
								<Card>
									<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
										<CardTitle className="text-sm font-medium">
											Toplam İşlem (Ay)
										</CardTitle>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											className="h-4 w-4 text-muted-foreground"
										>
											<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
											<circle cx="9" cy="7" r="4" />
											<path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
										</svg>
									</CardHeader>
									<CardContent>
										<div className="text-2xl font-bold">
											+{totalSubscriptions}
										</div>
										{/* <p className="text-xs text-muted-foreground">+180.1% from last month</p> */}
									</CardContent>
								</Card>
								<Card>
									<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
										<CardTitle className="text-sm font-medium">
											Toplam Satış (Ay)
										</CardTitle>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											className="h-4 w-4 text-muted-foreground"
										>
											<rect width="20" height="14" x="2" y="5" rx="2" />
											<path d="M2 10h20" />
										</svg>
									</CardHeader>
									<CardContent>
										<div className="text-2xl font-bold">
											${totalSales.toFixed(2)}
										</div>
										{/* <p className="text-xs text-muted-foreground">+19% from last month</p> */}
									</CardContent>
								</Card>
								<Card>
									<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
										<CardTitle className="text-sm font-medium">
											Bugün Aktif Şube Sayısı
										</CardTitle>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											className="h-4 w-4 text-muted-foreground"
										>
											<path d="M22 12h-4l-3 9L9 3l-3 9H2" />
										</svg>
									</CardHeader>
									<CardContent>
										<div className="text-2xl font-bold">+{activeNow}</div>
										{/* <p className="text-xs text-muted-foreground">+201 since last hour</p> */}
									</CardContent>
								</Card>
							</div>
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
								<Card className="col-span-4">
									<CardHeader>
										<CardTitle>Genel Bakış (Kazançlar)</CardTitle>
									</CardHeader>
									<CardContent className="pl-2">
										{overviewData.length > 0 ? (
											<Overview data={overviewData} />
										) : (
											<p>Gösterilecek veri yok.</p>
										)}
									</CardContent>
								</Card>
								<Card className="col-span-3">
									<CardHeader>
										<CardTitle>Son Finansal Hareketler</CardTitle>
										<CardDescription>
											Bu ay {recentSalesData.length} adet finansal hareket
											yapıldı.
										</CardDescription>
									</CardHeader>
									<CardContent>
										{recentSalesData.length > 0 ? (
											<RecentSales data={recentSalesData} />
										) : (
											<p>Gösterilecek satış yok.</p>
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
