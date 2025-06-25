// app/(auth)/update-password/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation'; // useSearchParams for potential error messages
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Check for error query parameters from Supabase redirect
        const supabaseError = searchParams?.get('error_description');
        if (supabaseError) {
            setError(decodeURIComponent(supabaseError));
            toast.error('Şifre güncelleme hatası: ' + decodeURIComponent(supabaseError));
        }
    }, [searchParams]);


    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Şifreler eşleşmiyor.');
            toast.error('Şifreler eşleşmiyor.');
            return;
        }
        setLoading(true);
        setMessage('');
        setError('');

        const supabase = createClient();
        const { error: updateError } = await supabase.auth.updateUser({ password });

        setLoading(false);
        if (updateError) {
            setError(updateError.message);
            toast.error('Şifre güncellenemedi: ' + updateError.message);
        } else {
            setMessage('Şifreniz başarıyla güncellendi. Şimdi giriş yapabilirsiniz.');
            toast.success('Şifreniz başarıyla güncellendi!');
            router.push('/login');
        }
    };

    // This page should only be accessible if the user has a valid session for password recovery.
    // Supabase handles this by putting the user in a special state after they click the recovery link.
    // If a user tries to access this page directly without a valid token/session, supabase.auth.updateUser will fail.

    return (
        <div className="flex min-h-auto w-full items-center justify-center p-6 md:p-10">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Yeni Şifrenizi Oluşturun</CardTitle>
                    <CardDescription>
                        Lütfen yeni şifrenizi girin ve onaylayın.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="password">Yeni Şifre</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="confirm-password">Yeni Şifreyi Onayla</Label>
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </div>
                            {message && <p className="text-sm text-green-600">{message}</p>}
                            {error && <p className="text-sm text-red-600">{error}</p>}
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
