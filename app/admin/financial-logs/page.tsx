'use client';

import { useEffect, useState, useCallback } from 'react'; // useCallback eklendi
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

type FinancialLog = {
  id: number;
  created_at: string;
  branch_id: string;
  user_id: string;
  action: string;
  data: any;
  branchName: string | null;  // Zenginleştirilmiş veri için yeni alanlar
  userEmail: string | null;   // Zenginleştirilmiş veri için yeni alanlar
};

export default function FinancialLogsPage() {
  const [logs, setLogs] = useState<FinancialLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchAndEnrichLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Ana log verilerini çek
      const { data: logData, error: logError } = await supabase
        .from('financial_logs')
        .select(`
          id,
          created_at,
          branch_id,
          user_id,
          action,
          data
        `)
        .order('created_at', { ascending: false });

      if (logError) {
        throw logError;
      }

      if (!logData) {
        setLogs([]);
        return;
      }

      // 2. Verileri zenginleştir
      const enrichedLogs = await Promise.all(
        logData.map(async (log) => {
          const [branchResponse, userResponse] = await Promise.all([
            supabase
              .from('branches')
              .select('name')
              .eq('id', log.branch_id)
              .single(),
            supabase
              .from('profiles')
              .select('email')
              .eq('id', log.user_id)
              .single(),
          ]);

          return {
            ...log,
            branchName: branchResponse.data?.name || 'Bilinmiyor',
            userEmail: userResponse.data?.email || 'Bilinmiyor',
          };
        })
      );

      setLogs(enrichedLogs);

    } catch (err: any) {
      console.error('Error fetching financial logs:', err);
      setError(`Finansal kayıtları çekerken hata: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]); // useCallback bağımlılığı sadece supabase

  // Sadece sayfa ilk yüklendiğinde çalışacak tek bir useEffect
  useEffect(() => {
    fetchAndEnrichLogs();
  }, [fetchAndEnrichLogs]);


  const renderAction = (action: string) => {
    switch (action) {
      case 'FINANCIAL_DATA_ADDED':
        return <Badge variant="success">Veri Eklendi</Badge>;
      case 'FINANCIAL_DATA_UPDATED':
        return <Badge variant="warning">Veri Güncellendi</Badge>;
      case 'FINANCIAL_CHANGE_APPROVED':
        return <Badge variant="success">Değişiklik Onaylandı</Badge>;
      default:
        return <Badge>{action}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Finansal İşlem Kayıtları</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <LoadingSpinner />
              <p className="ml-2">Kayıtlar yükleniyor...</p>
            </div>
          ) : error ? (
            <div className="text-red-500 bg-red-100 p-4 rounded-md">
              <p className="font-semibold">Finansal kayıtlar yüklenemedi.</p>
              <pre className="mt-2 whitespace-pre-wrap">{error}</pre>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Tarih</TableHead>
                  <TableHead>Şube</TableHead>
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>Eylem</TableHead>
                  <TableHead>Veri</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {format(new Date(log.created_at), 'PPpp', { locale: tr })}
                    </TableCell>
                    <TableCell>{log.branchName}</TableCell>
                    <TableCell>{log.userEmail}</TableCell>
                    <TableCell>{renderAction(log.action)}</TableCell>
                    <TableCell>
                      <Card className="bg-muted p-2 text-xs border border-border">
                        <pre className="whitespace-pre-wrap break-all text-foreground">{JSON.stringify(log.data, null, 2)}</pre>
                      </Card>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}