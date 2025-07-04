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

    if (!profile) {
        return NextResponse.json({ count: 0 });
    }

    let query = supabase
        .from('financial_change_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

    if (profile.role === 'manager') {
        const { data: assignments, error: assignmentsError } = await supabase
            .from('manager_branch_assignments')
            .select('branch_id')
            .eq('manager_id', user.id);

        if (assignmentsError) {
            console.error('Error fetching manager assignments:', assignmentsError);
            return NextResponse.json({ count: 0 });
        }

        const branchIds = assignments?.map((a) => a.branch_id) ?? [];
        if (branchIds.length === 0) {
            return NextResponse.json({ count: 0 });
        }

        query = query.in('branch_id', branchIds);
    } else if (profile.role !== 'admin') {
        return NextResponse.json({ count: 0 });
    }

    const { count, error } = await query;

    if (error) {
        console.error('Error fetching pending approvals count:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ count: count ?? 0 });
}