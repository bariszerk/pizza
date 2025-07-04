'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';

interface ChangeRequest {
  id: number;
  requested_at: string;
  status: string;
  new_data: {
    earnings: number;
    expenses: number;
    summary: string;
  };
}

export default function MyChangeRequestsPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('financial_change_requests')
      .select('id, requested_at, status, new_data')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Talepler yüklenemedi');
    } else {
      setRequests(data as ChangeRequest[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

    const handleCancel = async (req: ChangeRequest) => {
    const { data, error } = await supabase
      .from('financial_change_requests')
      .update({ status: 'cancelled' })
      .eq('id', req.id)
      .select('status')
      .single();
    if (error || !data) {
      toast.error('Talep iptal edilemedi');
      return;
    }
    toast.success('Talep iptal edildi');
    await fetchRequests();
    window.dispatchEvent(new Event('approvals-updated'));
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">Bekliyor</Badge>;
      case 'approved':
        return <Badge variant="success">Onaylandı</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Reddedildi</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">İptal Edildi</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Gönderdiğim Değişiklik Talepleri
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <LoadingSpinner />
              <p className="ml-2">Kayıtlar yükleniyor...</p>
            </div>
          ) : requests.length === 0 ? (
            <p className="text-center">Gönderilmiş talep bulunmuyor.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Tarih</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Veri</TableHead>
                  <TableHead>İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      {format(new Date(r.requested_at), 'dd MMM yyyy', {
                        locale: tr,
                      })}
                    </TableCell>
                    <TableCell>{renderStatus(r.status)}</TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Toplam Kazanç:</span>
                          <span className="font-medium text-green-600">
                            ₺{Number(r.new_data.earnings).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Toplam Harcama:</span>
                          <span className="font-medium text-red-600">
                            ₺{Number(r.new_data.expenses).toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Günün Özeti:</span>
                          <p className="mt-1 p-1 bg-muted/50 rounded border whitespace-pre-wrap break-words">
                            {r.new_data.summary || 'Özet girilmemiş.'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleCancel(r)}
                        >
                          İptal Et
                        </Button>
                      )}
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