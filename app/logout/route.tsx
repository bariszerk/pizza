// app/logout/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
	const supabase = await createClient();
	const { error } = await supabase.auth.signOut();

	if (error) {
		console.error('Error signing out:', error.message);
		// Optionally, you can return an error response here.
	}

	// Redirect to login page after signing out.
	return NextResponse.redirect(new URL('/login', request.url));
}
