'use client'; // This page now requires client-side interactivity

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/utils/supabase/client'; // Use client for client-side operations
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useEffect, useState, FormEvent } from 'react';
import { Toaster, toast } from 'sonner'; // For notifications

export default function PrivatePage() {
	const supabase = createClient();
	const router = useRouter();
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	// Profile state
        const [fullName, setFullName] = useState('');
        const [phone, setPhone] = useState('');
        const [profileMessage, setProfileMessage] = useState('');
        const [profileError, setProfileError] = useState('');
        const [userProfile, setUserProfile] = useState<{ first_name: string | null; last_name: string | null } | null>(null);

	// Password state
	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmNewPassword, setConfirmNewPassword] = useState('');
	const [passwordMessage, setPasswordMessage] = useState('');
	const [passwordError, setPasswordError] = useState('');

	useEffect(() => {
                const getUser = async () => {
                        const { data, error } = await supabase.auth.getUser();
                        if (error || !data?.user) {
                                router.push('/login');
                        } else {
                                setUser(data.user);
                                // Initialize fullName and phone state for user input, leave them empty initially
                                // The fetched metadata will be used for placeholders.
                                // setFullName(data.user.user_metadata?.full_name || ''); // Keep for input value
                                // setPhone(data.user.user_metadata?.phone || ''); // Keep for input value
                                const { data: profileData } = await supabase
                                        .from('profiles')
                                        .select('first_name, last_name')
                                        .eq('id', data.user.id)
                                        .single();
                                if (profileData) {
                                        setUserProfile(profileData as { first_name: string | null; last_name: string | null });
                                }
                        }
                        setLoading(false);
                };
		getUser();
	}, [router, supabase.auth]);

        const handleProfileUpdate = async (e: FormEvent) => {
                e.preventDefault();
                setProfileMessage('');
                setProfileError('');

                if (!user) return;

                const profileUpdates: { first_name?: string; last_name?: string } = {};
                if (fullName.trim() !== '') {
                        const parts = fullName.trim().split(' ');
                        profileUpdates.first_name = parts.shift() || '';
                        profileUpdates.last_name = parts.join(' ') || null;
                }

                const userUpdateData: { phone?: string } = {};
                if (phone.trim() === '' && user.user_metadata?.phone) {
                        userUpdateData.phone = '';
                } else if (phone.trim() !== '') {
                        userUpdateData.phone = phone.trim();
                }

                if (
                        Object.keys(profileUpdates).length === 0 &&
                        Object.keys(userUpdateData).length === 0
                ) {
                        return;
                }

                let hasError = false;

                if (Object.keys(profileUpdates).length > 0) {
                        const { error: profileErr } = await supabase
                                .from('profiles')
                                .update(profileUpdates)
                                .eq('id', user.id);
                        if (profileErr) {
                                setProfileError(`Profil güncellenirken hata: ${profileErr.message}`);
                                toast.error(`Profil güncellenirken hata: ${profileErr.message}`);
                                hasError = true;
                        } else {
                                setUserProfile((prev) => ({
                                        first_name: profileUpdates.first_name ?? prev?.first_name ?? null,
                                        last_name: profileUpdates.last_name ?? prev?.last_name ?? null,
                                }));
                                setFullName('');
                        }
                }

                if (Object.keys(userUpdateData).length > 0) {
                        const { error: authErr } = await supabase.auth.updateUser({
                                data: userUpdateData,
                        });
                        if (authErr) {
                                setProfileError(`Profil güncellenirken hata: ${authErr.message}`);
                                toast.error(`Profil güncellenirken hata: ${authErr.message}`);
                                hasError = true;
                        }
                }

                if (!hasError) {
                        setProfileMessage('Profil başarıyla güncellendi!');
                        toast.success('Profil başarıyla güncellendi!');
                        const { data: updatedUserData } = await supabase.auth.refreshSession();
                        if (updatedUserData.user) {
                                setUser(updatedUserData.user);
                        }
                }
        };

	const handlePasswordChange = async (e: FormEvent) => {
		e.preventDefault();
		setPasswordMessage('');
		setPasswordError('');

		if (newPassword !== confirmNewPassword) {
			setPasswordError('Yeni şifreler eşleşmiyor.');
			toast.error('Yeni şifreler eşleşmiyor.');
			return;
		}
		if (newPassword.length < 6) {
			setPasswordError('Yeni şifre en az 6 karakter olmalıdır.');
			toast.error('Yeni şifre en az 6 karakter olmalıdır.');
			return;
		}
		if (!user) return;

		// Supabase requires the user to be recently re-authenticated to change password
		// For simplicity, we'll try directly. If it fails due to auth,
		// we'd need to implement a re-authentication flow.
		// A more robust solution might involve an API route that uses the admin client
		// or handles re-authentication.

		// Now using the API route
		try {
			const response = await fetch('/api/auth/change-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ currentPassword, newPassword }),
			});

			const result = await response.json();

			if (!response.ok) {
				setPasswordError(result.error || 'Bir hata oluştu.');
				toast.error(result.error || 'Bir hata oluştu.');
			} else {
				setPasswordMessage(
					result.message || 'Şifre başarıyla güncellendi!'
				);
				let successMessage = result.message || 'Şifre başarıyla güncellendi!';
				if (result.requiresEmailConfirmation) {
					successMessage += ' Onay için lütfen e-postanızı kontrol edin.';
				}
				toast.success(successMessage);
				setCurrentPassword('');
				setNewPassword('');
				setConfirmNewPassword('');
			}
		} catch (error) {
			console.error('Password change fetch error:', error);
			setPasswordError('Ağ hatası veya beklenmeyen bir sorun oluştu.');
			toast.error('Ağ hatası veya beklenmeyen bir sorun oluştu.');
		}
	};

	if (loading) {
		return (
			<main className="flex items-center justify-center p-6 min-h-screen">
				<p>Yükleniyor...</p>
			</main>
		);
	}

	if (!user) {
		return null; // Should be redirected by useEffect
	}

	return (
		<>
			<Toaster richColors position="top-center" />
			<main className="flex flex-col items-center p-6 space-y-8">
				<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
					Ayarlarım
				</h1>

				{/* Profile Information Section */}
				<section className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
					<h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
						Profil Bilgileri
					</h2>
					<form onSubmit={handleProfileUpdate} className="space-y-4">
						<div>
							<Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
								Email
							</Label>
							<Input
								id="email"
								type="email"
								value={user.email || ''}
								disabled
								className="mt-1 bg-gray-100 dark:bg-gray-700"
							/>
						</div>
						<div>
							<Label
								htmlFor="fullName"
								className="text-gray-700 dark:text-gray-300"
							>
								Ad Soyad
							</Label>
							<Input
								id="fullName"
								type="text"
								value={fullName} // Controlled input based on user typing
                                                                placeholder={
                                                                        userProfile
                                                                                ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Ad Soyad'
                                                                                : 'Ad Soyad'
                                                                }
								onChange={(e) => setFullName(e.target.value)}
								className="mt-1"
							/>
						</div>
						<div>
							<Label htmlFor="phone" className="text-gray-700 dark:text-gray-300">
								Telefon Numarası
							</Label>
							<Input
								id="phone"
								type="tel"
								value={phone} // Controlled input based on user typing
								placeholder={user?.user_metadata?.phone || 'Telefon Numarası'}
								onChange={(e) => setPhone(e.target.value)}
								className="mt-1"
							/>
						</div>
						<Button type="submit" className="w-full">
							Profili Güncelle
						</Button>
						{profileMessage && (
							<p className="text-sm text-green-600 dark:text-green-400">
								{profileMessage}
							</p>
						)}
						{profileError && (
							<p className="text-sm text-red-600 dark:text-red-400">
								{profileError}
							</p>
						)}
					</form>
				</section>

				{/* Change Password Section */}
				<section className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
					<h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
						Şifre Değiştir
					</h2>
					<form onSubmit={handlePasswordChange} className="space-y-4">
						{/* 
              It's good practice to ask for current password, but supabase.auth.updateUser
              might not require it on the client if "Secure password change" is OFF in Supabase settings.
              If it IS enabled, this client-side call might fail without re-authentication or an admin client call.
              For this example, we'll include it, assuming it might be needed or preferred.
            */}
						<div>
							<Label
								htmlFor="currentPassword"
								className="text-gray-700 dark:text-gray-300"
							>
								Mevcut Şifre
							</Label>
							<Input
								id="currentPassword"
								type="password"
								value={currentPassword}
								onChange={(e) => setCurrentPassword(e.target.value)}
								className="mt-1"
								placeholder="Mevcut şifreniz"
							/>
						</div>
						<div>
							<Label
								htmlFor="newPassword"
								className="text-gray-700 dark:text-gray-300"
							>
								Yeni Şifre
							</Label>
							<Input
								id="newPassword"
								type="password"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								className="mt-1"
								placeholder="En az 6 karakter"
							/>
						</div>
						<div>
							<Label
								htmlFor="confirmNewPassword"
								className="text-gray-700 dark:text-gray-300"
							>
								Yeni Şifreyi Onayla
							</Label>
							<Input
								id="confirmNewPassword"
								type="password"
								value={confirmNewPassword}
								onChange={(e) => setConfirmNewPassword(e.target.value)}
								className="mt-1"
							/>
						</div>
						<Button type="submit" className="w-full">
							Şifreyi Değiştir
						</Button>
						{passwordMessage && (
							<p className="text-sm text-green-600 dark:text-green-400">
								{passwordMessage}
							</p>
						)}
						{passwordError && (
							<p className="text-sm text-red-600 dark:text-red-400">
								{passwordError}
							</p>
						)}
					</form>
				</section>
			</main>
		</>
	);
}
