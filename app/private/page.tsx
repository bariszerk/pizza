import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
export default async function PrivatePage() {
	const supabase = await createClient();
	const { data, error } = await supabase.auth.getUser();
	if (error || !data?.user) {
		redirect('/login');
	}
	return (
		<main className="flex items-center justify-center p-6">
			<div className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
				<h1 className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100">
					Bilgilerim
				</h1>
				<div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-sm">
					<p className="text-lg font-medium text-gray-700 dark:text-gray-300">
						Email:
					</p>
					<p className="text-xl font-semibold text-gray-700 dark:text-gray-100">
						{data.user.email}
					</p>
				</div>
			</div>
		</main>
	);
}
