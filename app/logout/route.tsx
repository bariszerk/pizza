// app/logout/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
	const supabase = await createClient(); // Bu sunucu taraflı client
	const { error } = await supabase.auth.signOut();

	if (error) {
		console.error('/logout API: Error signing out:', error.message);
		return NextResponse.json({ success: false, error: error.message }, { status: 500 });
	}
	return NextResponse.json({ success: true });
}
