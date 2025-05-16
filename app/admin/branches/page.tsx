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
import { Input } from '@/components/ui/input'; // Input importu eksikti, eklendi
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
import { Trash2Icon, UserMinusIcon, UserPlusIcon } from 'lucide-react';
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

	const [pageLoading, setPageLoading] = useState<boolean>(true); // Sayfanın genel yüklenme durumu için
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // Form gönderme işlemleri için
	const [pageError, setPageError] = useState<string | null>(null);
	const [formError, setFormError] = useState<string | null>(null);

	const [newBranchName, setNewBranchName] = useState('');
	const [newBranchAddress, setNewBranchAddress] = useState('');

	const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);

	const [showAddManagerModal, setShowAddManagerModal] = useState(false);
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
			// setPageLoading(true); // Bu, initializePage tarafından yönetilecek
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
						: 'Bilinmeyen bir veri çekme hatası oluştu.';
				setPageError(message);
				console.error(err);
			} finally {
				setPageLoading(false); // Veri çekme işlemi bittiğinde sayfa yüklenmesi biter
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
				setPageError('Lütfen giriş yapın.');
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
				setPageError('Kullanıcı profili bulunamadı veya yetkiniz yok.');
				setCurrentUserRole(null);
				setPageLoading(false);
				return;
			}

			if (profile.role !== 'admin' && profile.role !== 'manager') {
				setPageError('Bu sayfaya erişim yetkiniz yok.');
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
			setFormError('Sadece adminler şube ekleyebilir.');
			return;
		}
		if (!newBranchName.trim()) {
			setFormError('Şube adı boş olamaz.');
			return;
		}
		setIsSubmitting(true);
		setFormError(null);
		try {
			const { error: insertError } = await supabase
				.from('branches')
				.insert([{ name: newBranchName, address: newBranchAddress || null }]);
			if (insertError) throw insertError;
			setNewBranchName('');
			setNewBranchAddress('');
			if (currentUserId && currentUserRole)
				await fetchData(currentUserId, currentUserRole);
		} catch (err: unknown) {
			setFormError(
				err instanceof Error ? err.message : 'Şube eklenirken hata oluştu.'
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
				'Bu şubeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz, şubeye atanmış tüm yönetici ve personel bağlantıları da kaldırılır.',
			confirmText: 'Evet, Sil',
			onConfirm: async () => {
				setConfirmDialogOpen(false);
				setIsSubmitting(true);
				setPageError(null); // Silme işlemi için de isSubmitting kullanılabilir
				try {
					const { error: assignDelErr } = await supabase
						.from('manager_branch_assignments')
						.delete()
						.eq('branch_id', branchId);
					if (assignDelErr)
						throw new Error(
							'Yönetici atamaları silinirken hata: ' + assignDelErr.message
						);
					const { error: staffUpdErr } = await supabase
						.from('profiles')
						.update({ staff_branch_id: null })
						.eq('staff_branch_id', branchId);
					if (staffUpdErr)
						throw new Error(
							'Personel şube bağlantıları güncellenirken hata: ' +
								staffUpdErr.message
						);
					const { error: branchDelErr } = await supabase
						.from('branches')
						.delete()
						.eq('id', branchId);
					if (branchDelErr)
						throw new Error('Şube silinirken hata: ' + branchDelErr.message);
					if (currentUserId && currentUserRole)
						await fetchData(currentUserId, currentUserRole);
				} catch (err: unknown) {
					setPageError(
						err instanceof Error
							? err.message
							: 'Şube silinirken bir hata oluştu.'
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
			setFormError('Şube ve yönetici seçilmelidir.');
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
				if (assignError.code === '23505')
					throw new Error('Bu yönetici zaten bu şubeye atanmış.');
				throw assignError;
			}
			if (currentUserId && currentUserRole)
				await fetchData(currentUserId, currentUserRole);
			setShowAddManagerModal(false);
		} catch (err: unknown) {
			setFormError(
				err instanceof Error ? err.message : 'Yönetici atanırken hata oluştu.'
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
			title: 'Yöneticiyi Şubeden Çıkar',
			description:
				'Bu yöneticiyi şubeden çıkarmak istediğinizden emin misiniz?',
			confirmText: 'Evet, Çıkar',
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
							: 'Yönetici şubeden çıkarılırken hata.'
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
		setIsSubmitting(true); // Modal içeriği yüklenirken
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
				err instanceof Error ? err.message : 'Şube personeli çekilemedi.'
			);
			setCurrentStaffOfSelectedBranch([]);
		} finally {
			setIsSubmitting(false);
		}
		setShowAssignStaffModal(true);
	};

	const handleAssignStaffToBranch = async () => {
		if (!selectedBranchForStaffAssignment || !selectedUserToAssignAsStaff) {
			setFormError('Şube ve personel seçilmelidir.');
			return;
		}
		const userToAssign = allUsersForStaffAssignment.find(
			(u) => u.id === selectedUserToAssignAsStaff
		);
		if (!userToAssign) {
			setFormError('Seçilen kullanıcı bulunamadı.');
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
				} zaten başka bir şubeye atanmış.`
			);
			return;
		}
		if (
			userToAssign.role !== 'user' &&
			!(userToAssign.role === 'branch_staff' && !userToAssign.staff_branch_id)
		) {
			setFormError(
				`Sadece 'user' veya şubesiz 'branch_staff' rolündeki kullanıcılar personel olarak atanabilir.`
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
			if (currentUserId && currentUserRole)
				await fetchData(currentUserId, currentUserRole);
			const updatedStaffMember = {
				...userToAssign,
				role: 'branch_staff',
				staff_branch_id: selectedBranchForStaffAssignment.id,
			} as UserProfile;
			setCurrentStaffOfSelectedBranch((prev) => [
				...prev.filter((s) => s.id !== updatedStaffMember.id),
				updatedStaffMember,
			]);
			setShowAssignStaffModal(false);
		} catch (err: unknown) {
			setFormError(
				err instanceof Error ? err.message : 'Personel atama hatası.'
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleRemoveStaffFromBranch = async (staffIdToRemove: string) => {
		if (!selectedBranchForStaffAssignment) return;
		setConfirmDialogProps({
			title: 'Personeli Şubeden Çıkar',
			description: `Bu personeli "${selectedBranchForStaffAssignment.name}" şubesinden çıkarmak istediğinizden emin misiniz? Rolü "user" olarak güncellenecektir.`,
			confirmText: 'Evet, Çıkar',
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
					if (currentUserId && currentUserRole)
						await fetchData(currentUserId, currentUserRole);
					setCurrentStaffOfSelectedBranch((prev) =>
						prev.filter((s) => s.id !== staffIdToRemove)
					);
				} catch (err: unknown) {
					setFormError(
						err instanceof Error ? err.message : 'Personel çıkarma hatası.'
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
				<p>Kullanıcı bilgileri yükleniyor...</p>
			</div>
		);
	}
	if (pageError) {
		return (
			<div className="container mx-auto px-4 py-6 text-destructive">
				{pageError}
			</div>
		);
	}
	if (!currentUserRole && !pageLoading) {
		return (
			<div className="container mx-auto px-4 py-6">
				Yetkili rol yüklenemedi veya giriş yapılmamış.
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
								<CardTitle>Yeni Şube Ekle</CardTitle>
								<CardDescription>
									Yeni bir şube oluşturmak için bilgileri girin.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<form onSubmit={handleAddBranch} className="space-y-4">
									<div className="grid gap-2">
										<Label htmlFor="branch-name">Şube Adı</Label>
										<Input
											id="branch-name"
											value={newBranchName}
											onChange={(e) => setNewBranchName(e.target.value)}
											placeholder="Örn: Adana Çarşı Şubesi"
											required
										/>
									</div>
									<div className="grid gap-2">
										<Label htmlFor="branch-address">
											Şube Adresi (Opsiyonel)
										</Label>
										<Input
											id="branch-address"
											value={newBranchAddress}
											onChange={(e) => setNewBranchAddress(e.target.value)}
											placeholder="Örn: Atatürk Cad. No:123"
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
										{isSubmitting ? 'Ekleniyor...' : 'Şube Ekle'}
									</Button>
								</form>
							</CardContent>
						</Card>
					)}

					<Card>
						<CardHeader>
							<CardTitle>
								{currentUserRole === 'manager'
									? 'Sorumlu Olduğum Şubeler'
									: 'Tüm Şubeler'}
							</CardTitle>
							<CardDescription>
								{currentUserRole === 'manager'
									? 'Sorumlu olduğunuz şubelere personel atayın.'
									: 'Şubeleri yönetin, yönetici ve personel atayın.'}
							</CardDescription>
						</CardHeader>
						<CardContent>
							{pageLoading && branchesToDisplay.length === 0 ? (
								<p>Şubeler yükleniyor...</p>
							) : branchesToDisplay.length === 0 && !pageLoading ? (
								<p>
									{currentUserRole === 'manager'
										? 'Henüz sorumlu olduğunuz bir şube bulunmuyor.'
										: 'Henüz şube eklenmemiş.'}
								</p>
							) : (
								<div className="overflow-x-auto">
									<Table className="min-w-[800px]">
										<TableHeader>
											<TableRow>
												<TableHead className="w-[20%]">Ad</TableHead>
												<TableHead className="w-[25%]">Adres</TableHead>
												{currentUserRole === 'admin' && (
													<TableHead className="w-[25%]">
														Atanmış Yöneticiler
													</TableHead>
												)}
												<TableHead className="w-[15%]">Personel</TableHead>
												<TableHead className="text-right w-[15%]">
													İşlemler
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{branchesToDisplay.map((branch) => (
												<TableRow key={branch.id}>
													<TableCell className="font-medium">
														{branch.name}
													</TableCell>
													<TableCell>
														{branch.address || 'Belirtilmemiş'}
													</TableCell>
													{currentUserRole === 'admin' && (
														<TableCell>
															{branch.assigned_managers &&
															branch.assigned_managers.length > 0 ? (
																<ul className="space-y-1">
																	{branch.assigned_managers.map((manager) => (
																		<li
																			key={manager.id}
																			className="text-xs flex items-center justify-between"
																		>
																			{manager.first_name} {manager.last_name} (
																			{manager.email})
																			<Button
																				variant="ghost"
																				size="icon"
																				className="h-6 w-6 ml-2"
																				onClick={() =>
																					handleRemoveManagerFromBranch(
																						branch.id,
																						manager.id
																					)
																				}
																				title="Yöneticiyi Çıkar"
																			>
																				<UserMinusIcon className="h-4 w-4 text-destructive" />
																			</Button>
																		</li>
																	))}
																</ul>
															) : (
																<span className="text-xs text-muted-foreground">
																	Yönetici Atanmamış
																</span>
															)}
															<Button
																variant="outline"
																size="sm"
																className="mt-2 text-xs"
																onClick={() => openAssignManagerModal(branch)}
															>
																<UserPlusIcon className="h-3 w-3 mr-1" />{' '}
																Yönetici Ata
															</Button>
														</TableCell>
													)}
													<TableCell>
														<span className="text-xs block mb-1">
															{branch.assigned_staff
																? branch.assigned_staff.length
																: 0}{' '}
															personel
														</span>
														<Button
															variant="outline"
															size="sm"
															className="text-xs w-full"
															onClick={() => openAssignStaffModal(branch)}
														>
															Personel Yönet
														</Button>
													</TableCell>
													<TableCell className="text-right">
														{currentUserRole === 'admin' && (
															<Button
																variant="destructive"
																size="sm"
																onClick={() => handleDeleteBranch(branch.id)}
																disabled={isSubmitting}
															>
																<Trash2Icon className="h-4 w-4" />
															</Button>
														)}
													</TableCell>
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
							<DialogTitle>{`"${selectedBranchForStaffAssignment.name}" Personel Yönetimi`}</DialogTitle>
							<DialogDescription>
								Bu şubeye personel atayın veya mevcut personeli yönetin.
							</DialogDescription>
						</DialogHeader>
						<div className="py-4 space-y-4">
							<div>
								<h4 className="font-medium mb-2 text-sm">Mevcut Personel:</h4>
								{currentStaffOfSelectedBranch.length > 0 ? (
									<ul className="space-y-1 text-sm max-h-40 overflow-y-auto">
										{currentStaffOfSelectedBranch.map((staff) => (
											<li
												key={staff.id}
												className="flex justify-between items-center p-1.5 border-b hover:bg-muted/50 rounded"
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
												>
													<Trash2Icon className="h-4 w-4" />
												</Button>
											</li>
										))}
									</ul>
								) : (
									<p className="text-sm text-muted-foreground">
										Bu şubede kayıtlı personel yok.
									</p>
								)}
							</div>
							<hr />
							<div>
								<Label
									htmlFor="user-select-staff-modal"
									className="font-medium text-sm"
								>
									Yeni Personel Ata:
								</Label>
								<Select
									onValueChange={setSelectedUserToAssignAsStaff}
									value={selectedUserToAssignAsStaff || undefined}
								>
									<SelectTrigger id="user-select-staff-modal" className="mt-1">
										<SelectValue placeholder="Bir kullanıcı seçin..." />
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
													{' '}
													{user.first_name} {user.last_name} ({user.email}) -
													Rol: {user.role}{' '}
												</SelectItem>
											))}
										{allUsersForStaffAssignment.filter(
											(u) =>
												(u.role === 'user' ||
													(u.role === 'branch_staff' && !u.staff_branch_id)) &&
												!currentStaffOfSelectedBranch.find((s) => s.id === u.id)
										).length === 0 && (
											<div className="p-2 text-sm text-muted-foreground">
												Atanacak uygun kullanıcı bulunamadı.
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
									Kapat
								</Button>
							</DialogClose>
							<Button
								onClick={handleAssignStaffToBranch}
								disabled={!selectedUserToAssignAsStaff || isSubmitting}
							>
								{isSubmitting ? 'Atanıyor...' : 'Personeli Ata'}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}

			{currentUserRole === 'admin' &&
				showAddManagerModal &&
				selectedBranchForManagerAssignment && (
					<ConfirmDialog // children prop'unu kaldırıp, içeriği etiketler arasına alın
						open={showAddManagerModal}
						onClose={() => {
							setShowAddManagerModal(false);
							setFormError(null); // Modal kapanınca formu/hatayı temizle
						}}
						onConfirm={handleAssignManagerToBranch}
						title={`"${selectedBranchForManagerAssignment.name}" Şubesine Yönetici Ata`}
						description="Aşağıdaki yöneticilerden birini seçerek bu şubeye atayın."
						confirmText="Yöneticiyi Ata"
						cancelText="Vazgeç"
					>
						{/* Children içeriği buraya taşındı */}
						<div className="py-4 space-y-2">
							<Label htmlFor="manager-select-modal">Yönetici Seçin</Label>
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
										<div className="p-2 text-sm text-muted-foreground">
											Atanacak uygun yönetici bulunamadı veya tümü zaten
											atanmış.
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
				confirmText={confirmDialogProps.confirmText}
			/>
		</div>
	);
}