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
import { toast } from 'sonner';

type Profile = {
	id: string;
	first_name: string | null;
	last_name: string | null;
	role: string;
	email: string;
};

export default function RoleManagementPage() {
	const [profiles, setProfiles] = useState<Profile[]>([]);
	const [loading, setLoading] = useState<boolean>(true); // Başlangıçta true olmalı
	const [error, setError] = useState<string | null>(null);

	const [changes, setChanges] = useState<{ [id: string]: string }>({});
	const [saving, setSaving] = useState<{ [id: string]: boolean }>({});

	const [confirmOpen, setConfirmOpen] = useState(false);
	const [confirmTarget, setConfirmTarget] = useState<{
		id: string;
		role: string;
	} | null>(null);

	const supabase = createClient();

	const fetchProfiles = async () => {
		setLoading(true);
		setError(null);
		const { data, error: fetchError } = await supabase
			.from('profiles')
			.select('id, first_name, last_name, role, email');

		if (fetchError) {
			setError(`Kullanıcı verileri çekilirken bir hata oluştu: ${fetchError.message}`);
			toast.error(`Veri çekme hatası: ${fetchError.message}`);
		} else {
			setProfiles(data as Profile[]);
		}
		setLoading(false);
	};

	useEffect(() => {
		fetchProfiles();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const updateRole = async (id: string, newRole: string) => {
		setSaving((prev) => ({ ...prev, [id]: true }));

		const { error: updateError } = await supabase
			.from('profiles')
			.update({ role: newRole })
			.eq('id', id);

		if (updateError) {
			toast.error(`Rol güncellenirken hata: ${updateError.message}`);
			setError(`Rol güncellenirken hata: ${updateError.message}`);
		} else {
			toast.success('Kullanıcı rolü başarıyla güncellendi.');
			setProfiles((prev) =>
				prev.map((profile) =>
					profile.id === id ? { ...profile, role: newRole } : profile
				)
			);
			setChanges((prev) => {
				const updated = { ...prev };
				delete updated[id];
				return updated;
			});
		}
		setSaving((prev) => ({ ...prev, [id]: false }));
	};

	const handleUpdateClick = (id: string, currentRole: string) => {
		setConfirmTarget({ id, role: currentRole });
		setConfirmOpen(true);
	};

	const handleConfirm = () => {
		if (confirmTarget) {
			updateRole(confirmTarget.id, confirmTarget.role);
		}
		setConfirmOpen(false);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<p>Kullanıcı rolleri yükleniyor, lütfen bekleyin...</p>
			</div>
		);
	}
	if (error && profiles.length === 0) { // Sadece hiç profil yüklenemediyse bu hatayı göster
		return (
			<div className="container mx-auto px-4 py-6 text-destructive">
				<p>Hata: {error}</p>
				<Button onClick={fetchProfiles} className="mt-4">
					Tekrar Dene
				</Button>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-6">
			<h1 className="text-2xl font-semibold mb-6">Kullanıcı Rol Yönetimi</h1>
			{error && profiles.length > 0 && ( // Profiller varken de hata mesajını göster ama daha az rahatsız edici
				<div className="mb-4 p-3 bg-destructive/10 text-destructive border border-destructive rounded-md">
					<p>{error}</p>
				</div>
			)}
			<AnimatePresence>
				<motion.div
					key="role-table"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 20 }}
					transition={{ duration: 0.4 }}
				>
					<div className="overflow-x-auto w-full border rounded-lg">
						<Table className="w-full min-w-[700px]">
							<TableHeader>
								<TableRow>
									<TableHead className="w-[30%]">E-posta Adresi</TableHead>
									<TableHead className="w-[25%]">Ad Soyad</TableHead>
									<TableHead className="w-[25%]">Kullanıcı Rolü</TableHead>
									<TableHead className="text-right w-[20%]">İşlemler</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{profiles.length === 0 && !loading ? (
									<TableRow>
										<TableCell colSpan={4} className="text-center py-10">
											Sistemde kayıtlı kullanıcı bulunamadı.
										</TableCell>
									</TableRow>
								) : (
									profiles.map((profile) => {
										const currentRole = changes[profile.id] ?? profile.role;
										const hasChanged = currentRole !== profile.role;

										return (
											<TableRow key={profile.id}>
												<TableCell className="font-medium">
													{profile.email || 'Belirtilmemiş'}
												</TableCell>
												<TableCell>
													{profile.first_name || profile.last_name
														? `${profile.first_name || ''} ${
																profile.last_name || ''
														  }`.trim()
														: 'Belirtilmemiş'}
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
														<SelectTrigger className="w-full md:w-[200px]">
															<SelectValue
																placeholder={
																	currentRole === 'admin'
																		? 'Yönetici'
																		: currentRole === 'manager'
																		? 'Müdür'
																		: currentRole === 'branch_staff'
																		? 'Şube Personeli'
																		: currentRole === 'user'
																		? 'Kullanıcı'
																		: profile.role
																}
															/>
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="admin">Yönetici</SelectItem>
															<SelectItem value="manager">Müdür</SelectItem>
															<SelectItem value="branch_staff">
																Şube Personeli
															</SelectItem>
															<SelectItem value="user">Kullanıcı</SelectItem>
														</SelectContent>
													</Select>
												</TableCell>
												<TableCell className="text-right">
													<Button
														size="sm"
														onClick={() =>
															handleUpdateClick(profile.id, currentRole)
														}
														disabled={!hasChanged || saving[profile.id]}
														variant={hasChanged ? 'default' : 'outline'}
													>
														{saving[profile.id]
															? 'Kaydediliyor...'
															: 'Rolü Güncelle'}
													</Button>
												</TableCell>
											</TableRow>
										);
									})
								)}
							</TableBody>
						</Table>
					</div>
				</motion.div>
			</AnimatePresence>

			<ConfirmDialog
				open={confirmOpen}
				onClose={() => setConfirmOpen(false)}
				onConfirm={handleConfirm}
				title="Kullanıcı Rolünü Güncelle"
				description={`Seçili kullanıcının rolünü "${
					confirmTarget?.role === 'admin'
						? 'Yönetici'
						: confirmTarget?.role === 'manager'
						? 'Müdür'
						: confirmTarget?.role === 'branch_staff'
						? 'Şube Personeli'
						: confirmTarget?.role === 'user'
						? 'Kullanıcı'
						: confirmTarget?.role
				}" olarak değiştirmek istediğinizden emin misiniz?`}
				confirmText="Evet, Değiştir ve Kaydet"
				cancelText="Vazgeç"
			/>
		</div>
	);
}
