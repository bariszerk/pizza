// app/admin/branches/page.tsx
'use client';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
	DollarSignIcon,
	Trash2Icon,
	UserMinusIcon,
	UserPlusIcon,
} from 'lucide-react'; // DollarSignIcon eklendi
import { useRouter } from 'next/navigation'; // useRouter eklendi
import { useCallback, useEffect, useState } from 'react';

// Tipler
type Branch = {
	id: string;
	name: string;
	address: string | null;
	created_at: string;
	assigned_managers?: Profile[];
	assigned_staff?: UserProfile[];
};

type Profile = {
	id: string;
	first_name: string | null;
	last_name: string | null;
	email: string;
	role: string;
};

type UserProfile = Profile & {
	staff_branch_id?: string | null;
};

export default function AdminBranchesPage() {
	const [branches, setBranches] = useState<Branch[]>([]);
	const [managedBranches, setManagedBranches] = useState<Branch[]>([]);
	const [allManagers, setAllManagers] = useState<Profile[]>([]);
	const [allUsersForStaffAssignment, setAllUsersForStaffAssignment] = useState<
		UserProfile[]
	>([]);

	const [pageLoading, setPageLoading] = useState<boolean>(true);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [pageError, setPageError] = useState<string | null>(null);
	const [formError, setFormError] = useState<string | null>(null);

	const [newBranchName, setNewBranchName] = useState('');
	const [newBranchAddress, setNewBranchAddress] = useState('');

	const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);

	const [showAddManagerModal, setShowAddManagerModal] = useState(false);
	const router = useRouter();
	const [
		selectedBranchForManagerAssignment,
		setSelectedBranchForManagerAssignment,
	] = useState<Branch | null>(null);
	const [selectedManagerToAssign, setSelectedManagerToAssign] = useState<
		string | null
	>(null);

	const [showAssignStaffModal, setShowAssignStaffModal] = useState(false);
	const [
		selectedBranchForStaffAssignment,
		setSelectedBranchForStaffAssignment,
	] = useState<Branch | null>(null);
	const [selectedUserToAssignAsStaff, setSelectedUserToAssignAsStaff] =
		useState<string | null>(null);
	const [currentStaffOfSelectedBranch, setCurrentStaffOfSelectedBranch] =
		useState<UserProfile[]>([]);

	const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
	const [confirmDialogProps, setConfirmDialogProps] = useState<{
		title: string;
		description: string;
		onConfirm: () => void;
		confirmText?: string;
		children?: React.ReactNode;
	}>({ title: '', description: '', onConfirm: () => {} });

	const supabase = createClient();

	const fetchData = useCallback(
		async (userId: string, userRole: string) => {
			setPageError(null);
			try {
				const { data: managersData, error: managersError } = await supabase
					.from('profiles')
					.select('id, first_name, last_name, email, role')
					.eq('role', 'manager');
				if (managersError) throw managersError;
				setAllManagers(managersData || []);

				const { data: usersData, error: usersError } = await supabase
					.from('profiles')
					.select('id, first_name, last_name, email, role, staff_branch_id')
					.or('role.eq.user,and(role.eq.branch_staff,staff_branch_id.is.null)');
				if (usersError) throw usersError;
				setAllUsersForStaffAssignment(usersData || []);

				let finalBranches: Branch[] = [];
				if (userRole === 'admin') {
					const { data: adminBranchesData, error: branchesError } =
						await supabase
							.from('branches')
							.select('*')
							.order('name', { ascending: true });
					if (branchesError) throw branchesError;
					finalBranches = adminBranchesData || [];
				} else if (userRole === 'manager') {
					const { data: assignments, error: assignmentsError } = await supabase
						.from('manager_branch_assignments')
						.select('branch_id')
						.eq('manager_id', userId);
					if (assignmentsError) throw assignmentsError;
					if (assignments && assignments.length > 0) {
						const branchIds = assignments.map((a) => a.branch_id);
						const { data: managerBranchesData, error: managerBranchesError } =
							await supabase
								.from('branches')
								.select('*')
								.in('id', branchIds)
								.order('name', { ascending: true });
						if (managerBranchesError) throw managerBranchesError;
						finalBranches = managerBranchesData || [];
					}
				}

				const branchesWithDetails = await Promise.all(
					finalBranches.map(async (branch) => {
						const { data: managerAssignments, error: mgmtAssignError } =
							await supabase
								.from('manager_branch_assignments')
								.select('manager_id')
								.eq('branch_id', branch.id);
						const assignedManagerIds = mgmtAssignError
							? []
							: managerAssignments?.map((a) => a.manager_id) || [];
						const assigned_managers = (managersData || []).filter((m) =>
							assignedManagerIds.includes(m.id)
						);

						const { data: staffAssignments, error: staffAssignError } =
							await supabase
								.from('profiles')
								.select(
									'id, first_name, last_name, email, role, staff_branch_id'
								)
								.eq('staff_branch_id', branch.id)
								.eq('role', 'branch_staff');
						const assigned_staff = staffAssignError
							? []
							: staffAssignments || [];
						return { ...branch, assigned_managers, assigned_staff };
					})
				);

				if (userRole === 'admin') setBranches(branchesWithDetails);
				else if (userRole === 'manager')
					setManagedBranches(branchesWithDetails);
			} catch (err: unknown) {
				const message =
					err instanceof Error
						? err.message
						: 'Veri çekme sırasında bilinmeyen bir hata oluştu.';
				setPageError(message);
				console.error('Veri çekme hatası:', err);
			} finally {
				setPageLoading(false);
			}
		},
		[supabase]
	);

	useEffect(() => {
		const initializePage = async () => {
			setPageLoading(true);
			setPageError(null);
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				setPageError('Lütfen önce giriş yapın.');
				setCurrentUserRole(null);
				setPageLoading(false);
				return;
			}
			setCurrentUserId(user.id);

			const { data: profile, error: profileError } = await supabase
				.from('profiles')
				.select('role')
				.eq('id', user.id)
				.single();

			if (profileError || !profile) {
				setPageError(
					'Kullanıcı profili bulunamadı veya bu sayfayı görüntüleme yetkiniz yok.'
				);
				setCurrentUserRole(null);
				setPageLoading(false);
				return;
			}

			if (profile.role !== 'admin' && profile.role !== 'manager') {
				setPageError('Bu sayfaya erişim yetkiniz bulunmamaktadır.');
				setCurrentUserRole(profile.role);
				setPageLoading(false);
				return;
			}
			setCurrentUserRole(profile.role);
			await fetchData(user.id, profile.role);
		};
		initializePage();
	}, [supabase, fetchData]);

	const handleAddBranch = async (e: React.FormEvent) => {
		e.preventDefault();
		if (currentUserRole !== 'admin') {
			setFormError('Yalnızca yöneticiler şube ekleyebilir.');
			return;
		}
		if (!newBranchName.trim()) {
			setFormError('Şube adı boş bırakılamaz.');
			return;
		}
		setIsSubmitting(true);
		setFormError(null);
		try {
			// İstemci tarafı ön kontrol (isteğe bağlı ama kullanıcı deneyimi için iyi)
			const { data: existingBranches, error: fetchError } = await supabase
				.from('branches')
				.select('name')
				.eq('name', newBranchName.trim());

			if (fetchError) {
				console.warn("Şube adı kontrolü sırasında hata:", fetchError.message);
				// Hata durumunda doğrudan sunucuya gitmeyi tercih edebiliriz veya kullanıcıya bildirebiliriz
				// Şimdilik devam edip sunucu tarafı doğrulamasına güvenelim
			}

			if (existingBranches && existingBranches.length > 0) {
				setFormError(
					`"${newBranchName.trim()}" adında bir şube zaten mevcut. Lütfen farklı bir ad seçin.`
				);
				setIsSubmitting(false);
				return;
			}

			// Sunucu tarafı API çağrısı
			const response = await fetch('/api/branch', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: newBranchName.trim(),
					address: newBranchAddress.trim() || null,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(
					errorData.message ||
						`Şube oluşturulurken bir hata oluştu: ${response.statusText}`
				);
			}

			// Başarılı yanıt sonrası
			setNewBranchName('');
			setNewBranchAddress('');
			if (currentUserId && currentUserRole) {
				await fetchData(currentUserId, currentUserRole); // Listeyi yenile
			}
		} catch (err: unknown) {
			setFormError(
				err instanceof Error
					? err.message
					: 'Şube eklenirken beklenmedik bir hata oluştu.'
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDeleteBranch = async (branchId: string) => {
		if (currentUserRole !== 'admin') return;
		setConfirmDialogProps({
			title: 'Şubeyi Sil',
			description:
				'Bu şubeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz. Şubeye atanmış tüm yönetici ve personel bağlantıları da kaldırılacaktır.',
			confirmText: 'Evet, Sil',
			onConfirm: async () => {
				setConfirmDialogOpen(false);
				setIsSubmitting(true);
				setPageError(null);
				try {
					const { error: assignDelErr } = await supabase
						.from('manager_branch_assignments')
						.delete()
						.eq('branch_id', branchId);
					if (assignDelErr)
						throw new Error(
							'Yönetici atamaları silinirken bir hata oluştu: ' +
								assignDelErr.message
						);
					const { error: staffUpdErr } = await supabase
						.from('profiles')
						.update({ staff_branch_id: null })
						.eq('staff_branch_id', branchId);
					if (staffUpdErr)
						throw new Error(
							'Personel şube bağlantıları güncellenirken bir hata oluştu: ' +
								staffUpdErr.message
						);
					const { error: branchDelErr } = await supabase
						.from('branches')
						.delete()
						.eq('id', branchId);
					if (branchDelErr)
						throw new Error(
							'Şube silinirken bir hata oluştu: ' + branchDelErr.message
						);
					if (currentUserId && currentUserRole)
						await fetchData(currentUserId, currentUserRole);
				} catch (err: unknown) {
					setPageError(
						err instanceof Error
							? err.message
							: 'Şube silinirken bilinmeyen bir hata oluştu.'
					);
				} finally {
					setIsSubmitting(false);
				}
			},
		});
		setConfirmDialogOpen(true);
	};

	const openAssignManagerModal = (branch: Branch) => {
		if (currentUserRole !== 'admin') return;
		setSelectedBranchForManagerAssignment(branch);
		setSelectedManagerToAssign(null);
		setShowAddManagerModal(true);
		setFormError(null);
	};

	const handleAssignManagerToBranch = async () => {
		if (
			currentUserRole !== 'admin' ||
			!selectedBranchForManagerAssignment ||
			!selectedManagerToAssign
		) {
			setFormError('Lütfen bir şube ve yönetici seçin.');
			return;
		}
		setIsSubmitting(true);
		setFormError(null);
		try {
			const { error: assignError } = await supabase
				.from('manager_branch_assignments')
				.insert({
					branch_id: selectedBranchForManagerAssignment.id,
					manager_id: selectedManagerToAssign,
				});
			if (assignError) {
				if (assignError.code === '23505') {
					throw new Error('Bu yönetici zaten bu şubeye atanmış durumda.');
				}
				throw assignError;
			}
			if (currentUserId && currentUserRole) {
				await fetchData(currentUserId, currentUserRole);
			}
			setShowAddManagerModal(false);
		} catch (err: unknown) {
			setFormError(
				err instanceof Error
					? err.message
					: 'Yönetici atanırken bir hata oluştu.'
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleRemoveManagerFromBranch = async (
		branchId: string,
		managerId: string
	) => {
		if (currentUserRole !== 'admin') return;
		setConfirmDialogProps({
			title: 'Yöneticiyi Şubeden Ayır',
			description: 'Bu yöneticiyi şubeden ayırmak istediğinizden emin misiniz?',
			confirmText: 'Evet, Ayır',
			onConfirm: async () => {
				setConfirmDialogOpen(false);
				setIsSubmitting(true);
				setPageError(null);
				try {
					const { error: removeError } = await supabase
						.from('manager_branch_assignments')
						.delete()
						.match({ branch_id: branchId, manager_id: managerId });
					if (removeError) throw removeError;
					if (currentUserId && currentUserRole)
						await fetchData(currentUserId, currentUserRole);
				} catch (err: unknown) {
					setPageError(
						err instanceof Error
							? err.message
							: 'Yönetici şubeden ayrılırken bir hata oluştu.'
					);
				} finally {
					setIsSubmitting(false);
				}
			},
		});
		setConfirmDialogOpen(true);
	};

	const openAssignStaffModal = async (branch: Branch) => {
		setSelectedBranchForStaffAssignment(branch);
		setSelectedUserToAssignAsStaff(null);
		setFormError(null);
		setIsSubmitting(true);
		try {
			const { data: staffData, error: staffError } = await supabase
				.from('profiles')
				.select('id, first_name, last_name, email, role, staff_branch_id')
				.eq('staff_branch_id', branch.id)
				.eq('role', 'branch_staff');
			if (staffError) throw staffError;
			setCurrentStaffOfSelectedBranch(staffData || []);
		} catch (err: unknown) {
			setFormError(
				err instanceof Error
					? err.message
					: 'Şube personeli bilgileri çekilirken bir hata oluştu.'
			);
			setCurrentStaffOfSelectedBranch([]);
		} finally {
			setIsSubmitting(false);
		}
		setShowAssignStaffModal(true);
	};

	const handleAssignStaffToBranch = async () => {
		if (!selectedBranchForStaffAssignment || !selectedUserToAssignAsStaff) {
			setFormError('Lütfen bir şube ve personel seçin.');
			return;
		}
		const userToAssign = allUsersForStaffAssignment.find(
			(u) => u.id === selectedUserToAssignAsStaff
		);
		if (!userToAssign) {
			setFormError('Seçilen kullanıcı sistemde bulunamadı.');
			return;
		}
		if (
			userToAssign.role === 'branch_staff' &&
			userToAssign.staff_branch_id &&
			userToAssign.staff_branch_id !== selectedBranchForStaffAssignment.id
		) {
			setFormError(
				`${
					userToAssign.first_name || userToAssign.email
				} adlı kullanıcı zaten başka bir şubeye atanmış.`
			);
			return;
		}
		if (
			userToAssign.role !== 'user' &&
			!(userToAssign.role === 'branch_staff' && !userToAssign.staff_branch_id)
		) {
			setFormError(
				`Yalnızca 'user' rolündeki veya herhangi bir şubeye atanmamış 'branch_staff' rolündeki kullanıcılar personel olarak atanabilir.`
			);
			return;
		}
		setIsSubmitting(true);
		setFormError(null);
		try {
			const { error: assignError } = await supabase
				.from('profiles')
				.update({
					role: 'branch_staff',
					staff_branch_id: selectedBranchForStaffAssignment.id,
				})
				.eq('id', selectedUserToAssignAsStaff);
			if (assignError) throw assignError;

			// Veriyi yeniden çekmek yerine state'i doğrudan güncelle
			setAllUsersForStaffAssignment((prev) =>
				prev.filter((u) => u.id !== selectedUserToAssignAsStaff)
			);
			const updatedStaffMember = {
				...userToAssign,
				role: 'branch_staff',
				staff_branch_id: selectedBranchForStaffAssignment.id,
			} as UserProfile;
			setCurrentStaffOfSelectedBranch((prev) => [...prev, updatedStaffMember]);

			// Genel şube listesini de güncelle (eğer gerekiyorsa ve performans sorunu yaratmıyorsa)
			if (currentUserId && currentUserRole) {
				await fetchData(currentUserId, currentUserRole);
			}
			setShowAssignStaffModal(false);
		} catch (err: unknown) {
			setFormError(
				err instanceof Error
					? err.message
					: 'Personele şube atanırken bir hata oluştu.'
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleRemoveStaffFromBranch = async (staffIdToRemove: string) => {
		if (!selectedBranchForStaffAssignment) return;
		setConfirmDialogProps({
			title: 'Personeli Şubeden Ayır',
			description: `Bu personeli "${selectedBranchForStaffAssignment.name}" şubesinden ayırmak istediğinizden emin misiniz? Bu kişi artık bu şube için sisteme günlük veri girişi yapamayacaktır.`,
			confirmText: 'Evet, Ayır',
			onConfirm: async () => {
				setConfirmDialogOpen(false);
				setIsSubmitting(true);
				setFormError(null);
				try {
					const { error: updateError } = await supabase
						.from('profiles')
						.update({ role: 'user', staff_branch_id: null })
						.eq('id', staffIdToRemove);
					if (updateError) throw updateError;

					// Veriyi yeniden çekmek yerine state'i doğrudan güncelle
					const removedStaff = currentStaffOfSelectedBranch.find(
						(s) => s.id === staffIdToRemove
					);
					if (removedStaff) {
						setAllUsersForStaffAssignment((prev) => [
							...prev,
							{ ...removedStaff, role: 'user', staff_branch_id: null },
						]);
					}
					setCurrentStaffOfSelectedBranch((prev) =>
						prev.filter((s) => s.id !== staffIdToRemove)
					);

					if (currentUserId && currentUserRole) {
						await fetchData(currentUserId, currentUserRole);
					}
				} catch (err: unknown) {
					setFormError(
						err instanceof Error
							? err.message
							: 'Personel şubeden ayrılırken bir hata oluştu.'
					);
				} finally {
					setIsSubmitting(false);
				}
			},
		});
		setConfirmDialogOpen(true);
	};

	const branchesToDisplay =
		currentUserRole === 'admin' ? branches : managedBranches;

	if (pageLoading && !currentUserRole) {
		return (
			<div className="flex items-center justify-center py-20">
				<p>Kullanıcı bilgileri ve yetkiler yükleniyor, lütfen bekleyin...</p>
			</div>
		);
	}
	if (pageError) {
		return (
			<div className="container mx-auto px-4 py-6 text-destructive">
				Hata: {pageError}
			</div>
		);
	}
	if (!currentUserRole && !pageLoading) {
		return (
			<div className="container mx-auto px-4 py-6">
				Yetkili kullanıcı rolü yüklenemedi veya geçerli bir oturum bulunamadı.
				Lütfen tekrar giriş yapmayı deneyin.
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-6 space-y-8">
			<AnimatePresence>
				<motion.div
					key="admin-branches-content"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -20 }}
					transition={{ duration: 0.3 }}
				>
					{currentUserRole === 'admin' && (
						<Card className="mb-8">
							<CardHeader>
								<CardTitle>Yeni Şube Tanımla</CardTitle>
								<CardDescription>
									Yeni bir şube oluşturmak için lütfen aşağıdaki bilgileri
									eksiksiz girin.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<form onSubmit={handleAddBranch} className="space-y-4">
									<div className="grid gap-2">
										<Label htmlFor="branch-name">Şube Adı (*)</Label>
										<Input
											id="branch-name"
											value={newBranchName}
											onChange={(e) => setNewBranchName(e.target.value)}
											placeholder="Örnek: Merkez Şube, Ankara Şubesi"
											required
										/>
									</div>
									<div className="grid gap-2">
										<Label htmlFor="branch-address">
											Şube Adresi (İsteğe Bağlı)
										</Label>
										<Input
											id="branch-address"
											value={newBranchAddress}
											onChange={(e) => setNewBranchAddress(e.target.value)}
											placeholder="Örnek: Atatürk Cad. No:123, Çankaya/Ankara"
										/>
									</div>
									{formError && (
										<p className="text-sm text-destructive">{formError}</p>
									)}
									<Button
										type="submit"
										disabled={
											pageLoading || isSubmitting || !newBranchName.trim()
										}
									>
										{isSubmitting ? 'Ekleniyor...' : 'Yeni Şube Ekle'}
									</Button>
								</form>
							</CardContent>
						</Card>
					)}

					<Card>
						<CardHeader>
							<CardTitle>
								{currentUserRole === 'manager'
									? 'Yönettiğim Şubeler'
									: 'Tüm Şubeler'}
							</CardTitle>
							<CardDescription>
								{currentUserRole === 'manager'
									? 'Sorumlu olduğunuz şubeleri görüntüleyebilir ve bu şubelere personel atayabilirsiniz.'
									: 'Mevcut şubeleri yönetebilir, şubelere yönetici ve personel atayabilirsiniz.'}
							</CardDescription>
						</CardHeader>
						<CardContent>
							{pageLoading && branchesToDisplay.length === 0 ? (
								<p>Şube listesi yükleniyor, lütfen bekleyin...</p>
							) : branchesToDisplay.length === 0 && !pageLoading ? (
								<p>
									{currentUserRole === 'manager'
										? 'Henüz sorumlu olduğunuz herhangi bir şube bulunmamaktadır.'
										: 'Sistemde kayıtlı herhangi bir şube bulunamadı. Yukarıdaki formdan yeni şube ekleyebilirsiniz.'}
								</p>
							) : (
								<div className="overflow-x-auto text-xs sm:text-sm">
									{/* Tablo yapısı mobil ve küçük ekranlar için düzenlendi */}
									<div className="block md:hidden">
										{/* Mobil görünüm: Her satır bir kart gibi */}
										{branchesToDisplay.map((branch) => (
											<Card key={`${branch.id}-mobile`} className="mb-4">
												<CardHeader className="p-3">
													<CardTitle className="text-base">
														{branch.name}
													</CardTitle>
													{branch.address && (
														<CardDescription className="text-xs">
															{branch.address}
														</CardDescription>
													)}
												</CardHeader>
												<CardContent className="p-3 space-y-2 text-xs">
													{currentUserRole === 'admin' && (
														<div>
															<strong className="block mb-1">
																Yöneticiler:
															</strong>
															{branch.assigned_managers &&
															branch.assigned_managers.length > 0 ? (
																<ul className="space-y-0.5">
																	{branch.assigned_managers.map((manager) => (
																		<li
																			key={manager.id}
																			className="flex items-center justify-between group"
																		>
																			<span>
																				{manager.first_name} {manager.last_name}
																			</span>
																			<Button
																				variant="ghost"
																				size="icon"
																				className="h-5 w-5"
																				onClick={() =>
																					handleRemoveManagerFromBranch(
																						branch.id,
																						manager.id
																					)
																				}
																				title="Bu yöneticiyi şubeden ayır"
																			>
																				<UserMinusIcon className="h-3 w-3 text-destructive" />
																			</Button>
																		</li>
																	))}
																</ul>
															) : (
																<span className="text-muted-foreground">
																	Yönetici atanmamış
																</span>
															)}
															<Button
																variant="outline"
																className="mt-1.5 w-full"
																onClick={() => openAssignManagerModal(branch)}
															>
																<UserPlusIcon className="h-3 w-3 mr-1" />
																Yönetici Ata
															</Button>
														</div>
													)}
													<div>
														<Button
															variant="outline"
															className="w-full"
															onClick={() => openAssignStaffModal(branch)}
														>
															Personel Yönetimi (
															{branch.assigned_staff
																? branch.assigned_staff.length
																: 0}
															)
														</Button>
													</div>
													<div>
														<Button
															variant="outline"
															className="w-full"
															onClick={() =>
																router.push(
																	`/admin/branch-financials/${encodeURIComponent(branch.name)}`
																)
															}
														>
															<DollarSignIcon className="h-3 w-3 mr-1" />
															Finansal Veri Girişi
														</Button>
													</div>
													{currentUserRole === 'admin' && (
														<div>
															<Button
																variant="destructive"
																className="w-full"
																onClick={() => handleDeleteBranch(branch.id)}
																disabled={isSubmitting}
																title="Şubeyi Kalıcı Olarak Sil"
															>
																<Trash2Icon className="h-3 w-3 mr-1" />
																Şubeyi Sil
															</Button>
														</div>
													)}
												</CardContent>
											</Card>
										))}
									</div>

									{/* Tablet ve üzeri için tablo görünümü */}
									<Table className="hidden md:table min-w-full">
										<TableHeader>
											<TableRow>
												<TableHead className="px-2 py-3 sm:px-4 whitespace-nowrap">
													Şube Adı
												</TableHead>
												<TableHead className="px-2 py-3 sm:px-4 hidden lg:table-cell whitespace-nowrap">
													Adres
												</TableHead>
												{currentUserRole === 'admin' && (
													<TableHead className="px-2 py-3 sm:px-4 hidden xl:table-cell whitespace-nowrap">
														Atanmış Yöneticiler
													</TableHead>
												)}
												<TableHead className="px-2 py-3 sm:px-4 whitespace-nowrap">
													Personel
												</TableHead>
												<TableHead className="px-2 py-3 sm:px-4 whitespace-nowrap">
													Finansal İşlemler
												</TableHead>
												{currentUserRole === 'admin' && (
													<TableHead className="text-right px-2 py-3 sm:px-4 whitespace-nowrap">
														İşlemler
													</TableHead>
												)}
											</TableRow>
										</TableHeader>
										<TableBody>
											{branchesToDisplay.map((branch) => (
												<TableRow key={branch.id}>
													<TableCell className="font-medium px-2 py-2 sm:px-4">
														{branch.name}
														<div className="text-xs text-muted-foreground lg:hidden">
															{branch.address || 'Adres yok'}
														</div>
													</TableCell>
													<TableCell className="px-2 py-2 sm:px-4 hidden lg:table-cell">
														{branch.address || 'Adres belirtilmemiş'}
													</TableCell>
													{currentUserRole === 'admin' && (
														<TableCell className="px-2 py-2 sm:px-4 hidden xl:table-cell">
															{branch.assigned_managers &&
															branch.assigned_managers.length > 0 ? (
																<ul className="space-y-1">
																	{branch.assigned_managers.map((manager) => (
																		<li
																			key={manager.id}
																			className="text-xs flex items-center justify-between group"
																		>
																			<span>
																				{manager.first_name} {manager.last_name}
																			</span>
																			<Button
																				variant="ghost"
																				size="icon"
																				className="h-6 w-6 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
																				onClick={() =>
																					handleRemoveManagerFromBranch(
																						branch.id,
																						manager.id
																					)
																				}
																				title="Bu yöneticiyi şubeden ayır"
																			>
																				<UserMinusIcon className="h-4 w-4 text-destructive" />
																			</Button>
																		</li>
																	))}
																</ul>
															) : (
																<span className="text-xs text-muted-foreground">
																	Yok
																</span>
															)}
															<Button
																variant="outline"
																className="mt-1.5 text-xs"
																onClick={() => openAssignManagerModal(branch)}
															>
																<UserPlusIcon className="h-3 w-3 mr-0.5" />
																Ata
															</Button>
														</TableCell>
													)}
													<TableCell className="px-2 py-2 sm:px-4">
														<Button
															variant="outline"
															size="sm" // Buton boyutu sm veya xs olabilir, tasarıma göre ayarlanabilir
															className="text-xs w-full xl:w-auto" // xl ekranlarda otomatik genişlik
															onClick={() => openAssignStaffModal(branch)}
														>
															Yönet (
															{branch.assigned_staff
																? branch.assigned_staff.length
																: 0}
															)
														</Button>
													</TableCell>
													<TableCell className="px-2 py-2 sm:px-4">
														<Button
															variant="outline"
															size="sm"
															className="text-xs w-full xl:w-auto"
															onClick={() =>
																router.push(
																	`/admin/branch-financials/${encodeURIComponent(branch.name)}`
																)
															}
														>
															<DollarSignIcon className="h-3 w-3 mr-1" />
															Giriş
														</Button>
													</TableCell>
													{currentUserRole === 'admin' && (
														<TableCell className="text-right px-2 py-2 sm:px-4 space-x-1">
															{/* Admin işlemleri mobil için ayrı kartta, tablet/desktop için burada */}
															<Button
																variant="destructive"
																size="sm"
																onClick={() => handleDeleteBranch(branch.id)}
																disabled={isSubmitting}
																title="Şubeyi Kalıcı Olarak Sil"
															>
																<Trash2Icon className="h-4 w-4" />
															</Button>
														</TableCell>
													)}
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							)}
						</CardContent>
					</Card>
				</motion.div>
			</AnimatePresence>

			{selectedBranchForStaffAssignment && (
				<Dialog
					open={showAssignStaffModal}
					onOpenChange={(isOpen) => {
						setShowAssignStaffModal(isOpen);
						if (!isOpen) setFormError(null);
					}}
				>
					<DialogContent className="sm:max-w-[525px]">
						<DialogHeader>
							<DialogTitle>{`"${selectedBranchForStaffAssignment.name}" Şubesi Personel Yönetimi`}</DialogTitle>
							<DialogDescription>
								Bu şubeye yeni personel atayabilir veya mevcut personeli şubeden
								ayırabilirsiniz.
							</DialogDescription>
						</DialogHeader>
						<div className="py-4 space-y-4">
							<div>
								<h4 className="font-medium mb-2 text-sm">
									Şubeye Kayıtlı Mevcut Personel:
								</h4>
								{currentStaffOfSelectedBranch.length > 0 ? (
									<ul className="space-y-1 text-sm max-h-40 overflow-y-auto border rounded-md p-2">
										{currentStaffOfSelectedBranch.map((staff) => (
											<li
												key={staff.id}
												className="flex justify-between items-center p-1.5 border-b last:border-b-0 hover:bg-muted/50 rounded"
											>
												<span>
													{staff.first_name} {staff.last_name} ({staff.email})
												</span>
												<Button
													variant="ghost"
													size="icon"
													className="h-7 w-7 text-destructive hover:text-destructive"
													onClick={() => handleRemoveStaffFromBranch(staff.id)}
													disabled={isSubmitting}
													title="Bu personeli şubeden ayır"
												>
													<Trash2Icon className="h-4 w-4" />
												</Button>
											</li>
										))}
									</ul>
								) : (
									<p className="text-sm text-muted-foreground">
										Bu şubede henüz kayıtlı personel bulunmamaktadır.
									</p>
								)}
							</div>
							<hr />
							<div>
								<Label
									htmlFor="user-select-staff-modal"
									className="font-medium text-sm block mb-1"
								>
									Şubeye Yeni Personel Ata:
								</Label>
								<Select
									onValueChange={setSelectedUserToAssignAsStaff}
									value={selectedUserToAssignAsStaff || undefined}
								>
									<SelectTrigger id="user-select-staff-modal">
										<SelectValue placeholder="Atanacak bir kullanıcı seçin..." />
									</SelectTrigger>
									<SelectContent>
										{allUsersForStaffAssignment
											.filter(
												(user) =>
													!currentStaffOfSelectedBranch.find(
														(s) => s.id === user.id
													) &&
													(user.role === 'user' ||
														(user.role === 'branch_staff' &&
															!user.staff_branch_id))
											)
											.map((user) => (
												<SelectItem key={user.id} value={user.id}>
													{user.first_name} {user.last_name} ({user.email}) -
													Mevcut Rol: {user.role}
												</SelectItem>
											))}
										{allUsersForStaffAssignment.filter(
											(u) =>
												(u.role === 'user' ||
													(u.role === 'branch_staff' && !u.staff_branch_id)) &&
												!currentStaffOfSelectedBranch.find((s) => s.id === u.id)
										).length === 0 && (
											<div className="p-2 text-sm text-muted-foreground text-center">
												Şu anda atanabilecek uygun kullanıcı bulunamadı.
											</div>
										)}
									</SelectContent>
								</Select>
							</div>
							{formError && (
								<p className="text-sm text-destructive pt-2">{formError}</p>
							)}
						</div>
						<DialogFooter>
							<DialogClose asChild>
								<Button variant="outline" disabled={isSubmitting}>
									İptal
								</Button>
							</DialogClose>
							<Button
								onClick={handleAssignStaffToBranch}
								disabled={!selectedUserToAssignAsStaff || isSubmitting}
							>
								{isSubmitting ? 'Atanıyor...' : 'Seçili Personeli Ata'}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}

			{currentUserRole === 'admin' &&
				showAddManagerModal &&
				selectedBranchForManagerAssignment && (
					<ConfirmDialog
						open={showAddManagerModal}
						onClose={() => {
							setShowAddManagerModal(false);
							setFormError(null);
						}}
						onConfirm={handleAssignManagerToBranch}
						title={`"${selectedBranchForManagerAssignment.name}" Şubesine Yönetici Ata`}
						description="Lütfen aşağıdaki listeden bir yönetici seçerek bu şubeye atayın. Bir şubeye birden fazla yönetici atanabilir."
						confirmText="Seçili Yöneticiyi Ata"
						cancelText="İptal"
					>
						<div className="py-4 space-y-2">
							<Label htmlFor="manager-select-modal">
								Atanacak Yöneticiyi Seçin:
							</Label>
							<Select
								onValueChange={setSelectedManagerToAssign}
								value={selectedManagerToAssign || undefined}
							>
								<SelectTrigger id="manager-select-modal">
									<SelectValue placeholder="Bir yönetici seçin..." />
								</SelectTrigger>
								<SelectContent>
									{allManagers
										.filter(
											(manager) =>
												!selectedBranchForManagerAssignment.assigned_managers?.find(
													(assigned) => assigned.id === manager.id
												)
										)
										.map((manager) => (
											<SelectItem key={manager.id} value={manager.id}>
												{manager.first_name} {manager.last_name} (
												{manager.email})
											</SelectItem>
										))}
									{allManagers.filter(
										(manager) =>
											!selectedBranchForManagerAssignment.assigned_managers?.find(
												(assigned) => assigned.id === manager.id
											)
									).length === 0 && (
										<div className="p-2 text-sm text-muted-foreground text-center">
											Atanacak uygun yönetici bulunamadı veya tüm yöneticiler
											zaten bu şubeye atanmış.
										</div>
									)}
								</SelectContent>
							</Select>
							{formError && (
								<p className="text-sm text-destructive pt-2">{formError}</p>
							)}
						</div>
					</ConfirmDialog>
				)}
			<ConfirmDialog
				open={confirmDialogOpen}
				onClose={() => setConfirmDialogOpen(false)}
				title={confirmDialogProps.title}
				description={confirmDialogProps.description}
				onConfirm={confirmDialogProps.onConfirm}
				confirmText={confirmDialogProps.confirmText || 'Onayla'}
				cancelText="Vazgeç"
			/>
		</div>
	);
}
