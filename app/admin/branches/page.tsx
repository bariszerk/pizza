'use client';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { createClient } from '@/utils/supabase/client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

type Profile = {
	id: string;
	first_name: string | null;
	last_name: string | null;
	role: string;
	email: string;
};

export default function RoleManagementPage() {
	const [profiles, setProfiles] = useState<Profile[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	// Değişen rolleri geçici olarak sakladığımız alan
	const [changes, setChanges] = useState<{ [id: string]: string }>({});
	// Her bir satırın "saving" durumunu tutuyoruz
	const [saving, setSaving] = useState<{ [id: string]: boolean }>({});

	// Modal kontrolü
	const [confirmOpen, setConfirmOpen] = useState(false);
	// Modal’a tıklayınca hangi profileID ve hangi role onaylanacak?
	const [confirmTarget, setConfirmTarget] = useState<{
		id: string;
		role: string;
	} | null>(null);

	const supabase = createClient();

	// Profilleri Supabase'den çek
	const fetchProfiles = async () => {
		setLoading(true);
		const { data, error } = await supabase
			.from('profiles')
			.select('id, first_name, last_name, role, email');

		if (error) {
			setError(error.message);
		} else {
			setProfiles(data as Profile[]);
		}
		setLoading(false);
	};

	useEffect(() => {
		fetchProfiles();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Belirli bir kullanıcının rolünü güncelleme fonksiyonu
	const updateRole = async (id: string, newRole: string) => {
		setSaving((prev) => ({ ...prev, [id]: true }));

		const { error } = await supabase
			.from('profiles')
			.update({ role: newRole })
			.eq('id', id);

		if (error) {
			alert('Güncelleme hatası: ' + error.message);
		} else {
			// Yerel state'i de güncelle
			setProfiles((prev) =>
				prev.map((profile) =>
					profile.id === id ? { ...profile, role: newRole } : profile
				)
			);

			// Değişikliği sil
			setChanges((prev) => {
				const updated = { ...prev };
				delete updated[id];
				return updated;
			});
		}

		setSaving((prev) => ({ ...prev, [id]: false }));
	};

	// Güncelle butonuna tıklayınca modal açma
	const handleUpdateClick = (id: string, currentRole: string) => {
		// confirmTarget state’ini setle
		setConfirmTarget({ id, role: currentRole });
		// modal’ı aç
		setConfirmOpen(true);
	};

	// Modalda "Güncelle" butonuna basıldığında
	const handleConfirm = () => {
		if (confirmTarget) {
			updateRole(confirmTarget.id, confirmTarget.role);
		}
		setConfirmOpen(false);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<p>Yükleniyor...</p>
			</div>
		);
	}
	if (error) {
		return (
			<div className="flex items-center justify-center py-20">
				<p>Hata: {error}</p>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-6">
			<AnimatePresence>
				<motion.div
					key="role-table"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 20 }}
					transition={{ duration: 0.4 }}
				>
					{/* Tabloyu yatay scroll'a uyumlu yap */}
					<div className="overflow-x-auto w-full">
						<Table className="w-full min-w-[600px]">
							<TableHeader>
								<TableRow>
									<TableHead>Email</TableHead>
									<TableHead>Ad Soyad</TableHead>
									<TableHead>Rol</TableHead>
									<TableHead>İşlemler</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{profiles.map((profile) => {
									const currentRole = changes[profile.id] ?? profile.role;
									const hasChanged = currentRole !== profile.role;

									return (
										<TableRow key={profile.id}>
											<TableCell>{profile.email || '—'}</TableCell>
											<TableCell>
												{profile.first_name} {profile.last_name}
											</TableCell>
											<TableCell>
												<Select
													value={currentRole}
													onValueChange={(value) =>
														setChanges((prev) => ({
															...prev,
															[profile.id]: value,
														}))
													}
												>
													<SelectTrigger className="w-full md:w-[180px]">
														<SelectValue placeholder={profile.role} />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="admin">Admin</SelectItem>
														<SelectItem value="manager">Manager</SelectItem>
														<SelectItem value="branch_staff">
															Branch Staff
														</SelectItem>
														<SelectItem value="user">User</SelectItem>
													</SelectContent>
												</Select>
											</TableCell>
											<TableCell>
												<Button
													size="sm"
													onClick={() =>
														handleUpdateClick(profile.id, currentRole)
													}
													disabled={!hasChanged || saving[profile.id]}
												>
													{saving[profile.id] ? 'Güncelleniyor...' : 'Güncelle'}
												</Button>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>
				</motion.div>
			</AnimatePresence>

			{/* Onay Diyaloğu */}
			<ConfirmDialog
				open={confirmOpen}
				onClose={() => setConfirmOpen(false)}
				onConfirm={handleConfirm}
				title="Rol Güncelle"
				description="Bu kullanıcının rolünü güncellemek istediğinize emin misiniz?"
				confirmText="Evet, Güncelle"
				cancelText="Vazgeç"
			/>
		</div>
	);
}
