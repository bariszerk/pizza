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
import { LoadingSpinner } from '@/components/ui/loading-spinner'; // LoadingSpinner import edildi
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
import { useEffect, useState, useTransition } from 'react'; // useTransition import edildi
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
	const [isLoadingProfiles, startProfileLoadingTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);

	const [changes, setChanges] = useState<{ [id: string]: string }>({});
	const [isSavingRole, startSavingRoleTransition] = useTransition();
	const [savingStates, setSavingStates] = useState<{ [id: string]: boolean }>({});


	const [confirmOpen, setConfirmOpen] = useState(false);
	const [confirmTarget, setConfirmTarget] = useState<{
		id: string;
		role: string;
	} | null>(null);

	const supabase = createClient();

	const fetchProfiles = () => {
		startProfileLoadingTransition(async () => {
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
		});
	};

	useEffect(() => {
		fetchProfiles();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const updateRole = (id: string, newRole: string) => {
		setSavingStates((prev) => ({ ...prev, [id]: true }));
		startSavingRoleTransition(async () => {
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
			setSavingStates((prev) => ({ ...prev, [id]: false }));
		});
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

	if (isLoadingProfiles && profiles.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-20 space-y-3">
				<LoadingSpinner size={32} />
				<p>Kullanıcı rolleri yükleniyor, lütfen bekleyin...</p>
			</div>
		);
	}

	if (error && profiles.length === 0) {
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
					{/* Mobil görünüm için Kart Listesi */}
					<div className="space-y-4 md:hidden">
						{profiles.length === 0 && !isLoadingProfiles ? (
							<p className="text-center py-10">
								Sistemde kayıtlı kullanıcı bulunamadı.
							</p>
						) : (
							profiles.map((profile) => {
								const currentRole = changes[profile.id] ?? profile.role;
								const hasChanged = currentRole !== profile.role;
								const isCurrentlySaving = savingStates[profile.id] || (isSavingRole && confirmTarget?.id === profile.id);
								return (
									<div
										key={`${profile.id}-mobile`}
										className="border rounded-lg p-4 space-y-3 text-sm bg-card"
									>
										<div>
											<h3 className="font-semibold text-base">
												{profile.first_name || profile.last_name
													? `${profile.first_name || ''} ${
															profile.last_name || ''
													  }`.trim()
													: 'İsim Belirtilmemiş'}
											</h3>
											<p className="text-xs text-muted-foreground">
												{profile.email || 'E-posta Belirtilmemiş'}
											</p>
										</div>

										<div>
											<label
												htmlFor={`role-select-${profile.id}-mobile`}
												className="block text-xs font-medium text-muted-foreground mb-1"
											>
												Kullanıcı Rolü
											</label>
											<Select
												value={currentRole}
												onValueChange={(value) =>
													setChanges((prev) => ({
														...prev,
														[profile.id]: value,
													}))
												}
												disabled={isCurrentlySaving}
											>
												<SelectTrigger
													id={`role-select-${profile.id}-mobile`}
													className="w-full"
												>
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
										</div>

										<Button
											size="sm"
											className="w-full"
											onClick={() =>
												handleUpdateClick(profile.id, currentRole)
											}
											disabled={!hasChanged || isCurrentlySaving}
											variant={hasChanged ? 'default' : 'outline'}
										>
											{isCurrentlySaving ? (
												<div className="flex items-center justify-center">
													<LoadingSpinner size={16} />
													<span className="ml-2">Kaydediliyor...</span>
												</div>
											) : (
												'Rolü Güncelle'
											)}
										</Button>
									</div>
								);
							})
						)}
					</div>

					{/* Tablet ve üzeri için Tablo görünümü */}
					<div className="hidden md:block overflow-x-auto w-full border rounded-lg text-xs sm:text-sm">
						<Table className="w-full min-w-[600px]">
							<TableHeader>
								<TableRow>
									<TableHead className="w-[35%] px-2 py-3 sm:px-4">
										E-posta Adresi
									</TableHead>
									<TableHead className="w-[25%] px-2 py-3 sm:px-4">
										Ad Soyad
									</TableHead>
									<TableHead className="w-[25%] px-2 py-3 sm:px-4">
										Kullanıcı Rolü
									</TableHead>
									<TableHead className="text-right w-[15%] px-2 py-3 sm:px-4">
										İşlemler
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{profiles.length === 0 && !isLoadingProfiles ? (
									<TableRow>
										<TableCell
											colSpan={4}
											className="text-center py-10 px-2 sm:px-4"
										>
											Sistemde kayıtlı kullanıcı bulunamadı.
										</TableCell>
									</TableRow>
								) : (
									profiles.map((profile) => {
										const currentRole = changes[profile.id] ?? profile.role;
										const hasChanged = currentRole !== profile.role;
										const isCurrentlySaving = savingStates[profile.id] || (isSavingRole && confirmTarget?.id === profile.id);

										return (
											<TableRow key={profile.id}>
												<TableCell className="font-medium px-2 py-2 sm:px-4">
													{profile.email || 'Belirtilmemiş'}
												</TableCell>
												<TableCell className="px-2 py-2 sm:px-4">
													{profile.first_name || profile.last_name
														? `${profile.first_name || ''} ${
																profile.last_name || ''
														  }`.trim()
														: 'Belirtilmemiş'}
												</TableCell>
												<TableCell className="px-2 py-2 sm:px-4">
													<Select
														value={currentRole}
														onValueChange={(value) =>
															setChanges((prev) => ({
																...prev,
																[profile.id]: value,
															}))
														}
														disabled={isCurrentlySaving}
													>
														<SelectTrigger className="w-full min-w-[150px] lg:w-auto lg:min-w-[180px]">
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
												<TableCell className="text-right px-2 py-2 sm:px-4">
													<Button
														size="sm"
														onClick={() =>
															handleUpdateClick(profile.id, currentRole)
														}
														disabled={!hasChanged || isCurrentlySaving}
														variant={hasChanged ? 'default' : 'outline'}
													>
														{isCurrentlySaving ? (
															<div className="flex items-center justify-center">
																<LoadingSpinner size={16} />
																<span className="ml-2">Kaydediliyor...</span>
															</div>
														) : (
															'Rolü Güncelle'
														)}
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
