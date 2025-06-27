// app/api/branch/[branchName]/route.ts // Dosya adını yansıtacak şekilde yorumu güncelle
import { createClient } from '@/utils/supabase/client';
import { NextResponse } from "next/server";

// Helper function to get branch ID from branch name
async function getBranchIdFromName(branchName: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('branches')
    .select('id')
    .eq('name', decodeURIComponent(branchName)) // URL'den gelen adı decode et
    .single();

  if (error || !data) {
    return null;
  }
  return data.id;
}

// GET: Belirli bir şubenin finansal özetlerini getirir.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) { // Parametre adı 'id' (dosya yolundaki gibi) olmalı
  const { id: branchNameFromUrl } = await params; // branchNameFromUrl şube adını içerir
  const branchId = await getBranchIdFromName(branchNameFromUrl);

  if (!branchId) {
    return NextResponse.json({ error: `'${decodeURIComponent(branchNameFromUrl)}' adlı şube bulunamadı.` }, { status: 404 });
  }
  
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
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { // Parametre adı 'id' (dosya yolundaki gibi) olmalı
  const { id: branchNameFromUrl } = await params; // branchNameFromUrl şube adını içerir
  const branchId = await getBranchIdFromName(branchNameFromUrl);

  if (!branchId) {
    return NextResponse.json({ error: `POST isteği için '${decodeURIComponent(branchNameFromUrl)}' adlı şube bulunamadı.` }, { status: 404 });
  }

  const body = await request.json();
  // Beklenen alanlar: expenses, earnings, summary, date
  const { expenses, earnings, summary, date } = body;
  
  const { data, error } = await createClient()
    .from("branch_financials")
    .insert([
      {
        branch_id: branchId, // Dinamik olarak alınan branchId'yi kullan
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
