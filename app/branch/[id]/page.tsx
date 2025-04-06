'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AnimatePresence, motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import { useState } from 'react';

// interface BranchFinancial {
// 	// Eğer herhangi bir nedenle ihtiyacın varsa
// 	// id: number;
// 	// branch_id: string;
// 	expenses: number;
// 	earnings: number;
// 	summary: string;
// 	date: string;
// 	created_at: string;
// }

export default function BranchPage() {
	const { id } = useParams();
	const [expenses, setExpenses] = useState('');
	const [earnings, setEarnings] = useState('');
	const [summary, setSummary] = useState('');
	const [date, setDate] = useState(new Date());
	const [message, setMessage] = useState('');

	// Örnek GET isteği (eğer sayfada tablo vs. göstermek istemiyorsan bunu silebilirsin)
	// useEffect(() => {
	//   if (!id) return;
	//   async function fetchData() {
	//     const res = await fetch(`/api/branch/${id}`);
	//     const data = await res.json();
	//     // Bir veri işleme yapılacaksa burada
	//   }
	//   fetchData();
	// }, [id]);

	// Form submit ile POST isteği
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setMessage('');

		const payload = {
			expenses,
			earnings,
			summary,
			date: date.toISOString().split('T')[0], // YYYY-MM-DD formatı
		};

		const res = await fetch(`/api/branch/${id}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});

		if (res.ok) {
			setMessage('Data saved successfully!');
			// İstersen burada formu temizleyebilirsin
			// setExpenses('');
			// setEarnings('');
			// setSummary('');
		} else {
			const error = await res.json();
			setMessage(`Error: ${error.error}`);
		}
	};

	return (
		<div
			// Sayfa yüksekliği boyunca ortalamak için min-h-auto + flex center
			className="container mx-auto min-h-auto flex items-center justify-center px-4"
		>
			<AnimatePresence>
				<motion.div
					// Framer Motion animasyonu
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 20 }}
					transition={{ duration: 0.4 }}
					// Kartın maksi. genişliğini sınırlıyoruz, masaüstünde ortalı duracak
					className="w-full max-w-md"
				>
					<Card>
						<CardContent className="p-4 space-y-4">
							<h2 className="text-xl font-semibold">
								Branch Financial Summary
							</h2>
							<Calendar
								mode="single"
								selected={date}
								onSelect={(newDate) => setDate(newDate || new Date())}
							/>
							<form onSubmit={handleSubmit} className="space-y-4">
								<Input
									type="number"
									placeholder="Expenses"
									value={expenses}
									onChange={(e) => setExpenses(e.target.value)}
								/>
								<Input
									type="number"
									placeholder="Earnings"
									value={earnings}
									onChange={(e) => setEarnings(e.target.value)}
								/>
								<Input
									type="text"
									placeholder="Summary"
									value={summary}
									onChange={(e) => setSummary(e.target.value)}
								/>
								<Button type="submit" className="w-full">
									Save
								</Button>
							</form>
							{message && <p>{message}</p>}
						</CardContent>
					</Card>
				</motion.div>
			</AnimatePresence>
		</div>
	);
}
