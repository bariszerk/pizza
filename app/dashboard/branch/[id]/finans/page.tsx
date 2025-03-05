import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function BranchFinancePage({
  params,
}: {
  params: {id: string}
}) {
  const param = await params;
  const branchId = param.id

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="p-4 border-b">
          <h1 className="text-2xl font-bold">Şube {branchId} - Finans</h1>
        </header>
        <main className="p-4">
          <form className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Tarih
              </label>
              <Input type="date" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Harcanan
              </label>
              <Input type="number" placeholder="Harcanan miktar" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Kazanılan
              </label>
              <Input type="number" placeholder="Kazanılan miktar" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Net Kar
              </label>
              <Input type="number" placeholder="Net kar" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Açıklama
              </label>
              <textarea
                className="border border-input rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Gün içindeki önemli olaylar veya notlar..."
                rows={4}
              />
            </div>
            <Button type="submit">Kaydet</Button>
          </form>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
