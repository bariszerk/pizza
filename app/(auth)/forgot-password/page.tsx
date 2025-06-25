// app/(auth)/forgot-password/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        const supabase = createClient();
        const { error: submissionError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback?next=/update-password`, // Updated redirectTo
        });

        setLoading(false);
        if (submissionError) {
            setError(submissionError.message);
            toast.error('Şifre sıfırlama e-postası gönderilemedi: ' + submissionError.message);
        } else {
            setMessage('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin.');
            toast.success('Şifre sıfırlama e-postası başarıyla gönderildi!');
        }
    };

    return (
        <div className="flex min-h-auto w-full items-center justify-center p-6 md:p-10">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Şifrenizi mi Unuttunuz?</CardTitle>
                    <CardDescription>
                        Hesabınızla ilişkili e-posta adresini girin. Size şifrenizi sıfırlamanız için bir bağlantı göndereceğiz.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email">E-posta</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="ornek@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </div>
                            {message && <p className="text-sm text-green-600">{message}</p>}
                            {error && <p className="text-sm text-red-600">{error}</p>}
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Gönderiliyor...' : 'Şifre Sıfırlama Bağlantısı Gönder'}
                            </Button>
                        </div>
                    </form>
                    <div className="mt-4 text-center text-sm">
                        Şifrenizi hatırlıyor musunuz?{' '}
                        <Link href="/login" className="underline">
                            Giriş yapın
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
