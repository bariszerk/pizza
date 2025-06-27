import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
	const cookieStore = cookies();
	const supabase = createClient(cookieStore);

	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (!session || !session.user) {
		return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
	}

	const { currentPassword, newPassword } = await req.json();

	if (!currentPassword || !newPassword) {
		return NextResponse.json(
			{ error: 'Mevcut şifre ve yeni şifre gereklidir.' },
			{ status: 400 }
		);
	}

	if (newPassword.length < 6) {
		return NextResponse.json(
			{ error: 'Yeni şifre en az 6 karakter olmalıdır.' },
			{ status: 400 }
		);
	}

	const userEmail = session.user.email;
	if (!userEmail) {
		// Should not happen if user is in a session, but as a safeguard
		return NextResponse.json(
			{ error: 'Kullanıcı e-postası bulunamadı.' },
			{ status: 500 }
		);
	}

	// 1. Verify current password by trying to sign in
	const { error: signInError } = await supabase.auth.signInWithPassword({
		email: userEmail,
		password: currentPassword,
	});

	if (signInError) {
		// Log the specific error for server-side diagnostics if needed
		console.error('Sign-in error during password change:', signInError.message);
		if (signInError.message.includes('Invalid login credentials')) {
			return NextResponse.json(
				{ error: 'Mevcut şifre yanlış.' },
				{ status: 400 }
			);
		}
		return NextResponse.json(
			{ error: 'Mevcut şifre doğrulanırken bir hata oluştu.' },
			{ status: 500 }
		);
	}

	// 2. If current password is correct, update to the new password
	const { error: updateError } = await supabase.auth.updateUser({
		password: newPassword,
	});

	if (updateError) {
		// Log the specific error for server-side diagnostics
		console.error('Password update error:', updateError.message);
		// Check if the error is due to "Secure password change" being enabled
		// and the user needs to confirm via email.
		if (updateError.message.includes('Auth session missing')) {
			// This can happen if the session from signInWithPassword isn't immediately usable
			// for updateUser in some edge cases, or if there's a brief delay.
			// It might also indicate a need for re-fetching the session after signIn.
			// For "Secure Password Change" enabled, this might be expected if Supabase
			// has already invalidated the session pending email confirmation.
			return NextResponse.json(
				{
					message:
						'Şifre güncelleme isteği alındı. Eğer güvenli şifre değişikliği etkinse, lütfen e-postanızı kontrol edin.',
					requiresEmailConfirmation: true,
				},
				{ status: 200 }
			);
		}
		return NextResponse.json(
			{ error: `Yeni şifre güncellenirken bir hata oluştu: ${updateError.message}` },
			{ status: 500 }
		);
	}

	// If "Secure password change" is enabled in Supabase, this success message
	// means the process to send a confirmation email has been initiated.
	// If it's disabled, the password has been changed directly.
	return NextResponse.json(
		{
			message:
				'Şifre başarıyla güncellendi. Eğer güvenli şifre değişikliği etkinse, onay için e-postanızı kontrol edin.',
		},
		{ status: 200 }
	);
}
