// app/api/approvals/pending-count/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ count: 0 }); // Giriş yapmamış kullanıcı için 0 döndür
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    // Sadece admin ve manager rollerinin bekleyen talepleri görmesine izin ver
    if (profile?.role !== 'admin' && profile?.role !== 'manager') {
        return NextResponse.json({ count: 0 });
    }

    const { count, error } = await supabase
        .from('financial_change_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

    if (error) {
        console.error('Error fetching pending approvals count:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ count: count ?? 0 });
}