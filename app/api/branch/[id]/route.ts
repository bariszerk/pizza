// app/api/branch/[id]/route.ts
import { createClient } from '@/utils/supabase/client';
import { NextResponse } from "next/server";

// GET: Belirli bir şubenin finansal özetlerini getirir.
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id: branchId } = await params;
  
  const { data, error } = await createClient()
    .from("branch_financials")
    .select("*")
    .eq("branch_id", branchId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(data);
}

// POST: Yeni bir finansal özet ekler.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { id: branchId } = params;
  const body = await request.json();
  // Beklenen alanlar: expenses, earnings, summary, date
  const { expenses, earnings, summary, date } = body;
  
  const { data, error } = await createClient()
    .from("branch_financials")
    .insert([
      {
        branch_id: branchId,
        expenses: parseFloat(expenses),
        earnings: parseFloat(earnings),
        summary,
        date, // Tarih formatınızın (YYYY-MM-DD) uygun olduğundan emin olun.
      },
    ]);
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(data, { status: 201 });
}
