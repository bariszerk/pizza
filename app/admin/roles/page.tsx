'use client';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';

import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

type Profile = {
	id: string;
	first_name: string | null;
	last_name: string | null;
	role: string;
	// Email bilgisi auth.users tablosundan join ile gelecek, alias kullanıyoruz.
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

	// Profilleri Supabase'den çekiyoruz
	const fetchProfiles = async () => {
		setLoading(true);
		// Email bilgisini auth.users tablosundan join ile çekiyoruz.
		const { data, error } = await createClient()
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
	}, []);

	// Belirli bir kullanıcının rolünü güncelleme fonksiyonu
	const updateRole = async (id: string, newRole: string) => {
		setSaving((prev) => ({ ...prev, [id]: true }));
		const { error } = await createClient()
			.from('profiles')
			.update({ role: newRole })
			.eq('id', id);

		if (error) {
			alert('Güncelleme hatası: ' + error.message);
		} else {
			// Yerel state'i de güncelliyoruz
			setProfiles((prev) =>
				prev.map((profile) =>
					profile.id === id ? { ...profile, role: newRole } : profile
				)
			);
			// Kaydedilen değişikliği kaldırıyoruz
			setChanges((prev) => {
				const updated = { ...prev };
				delete updated[id];
				return updated;
			});
		}
		setSaving((prev) => ({ ...prev, [id]: false }));
	};

	if (loading) return <div>Yükleniyor...</div>;
	if (error) return <div>Hata: {error}</div>;

	return (
		<div className="p-6">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Email</TableHead>
						<TableHead>Ad Soyad</TableHead>
						<TableHead>Role</TableHead>
						<TableHead>Actions</TableHead>
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
											setChanges((prev) => ({ ...prev, [profile.id]: value }))
										}
									>
										<SelectTrigger className="w-[180px]">
											<SelectValue placeholder={profile.role} />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="admin">Admin</SelectItem>
											<SelectItem value="manager">Manager</SelectItem>
											<SelectItem value="branch_staff">Branch Staff</SelectItem>
											<SelectItem value="user">User</SelectItem>
										</SelectContent>
									</Select>
								</TableCell>
								<TableCell>
									<Button
										size="sm"
										onClick={() => {
											if (
												window.confirm(
													'Rolü güncellemek istediğinize emin misiniz?'
												)
											) {
												updateRole(profile.id, currentRole);
											}
										}}
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
	);
}
