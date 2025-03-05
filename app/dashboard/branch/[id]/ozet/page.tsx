import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";

export default async function BranchSummaryPage({params}: {params: Promise<{ id: string }>}) {
  const branchId = (await params).id;

  return (
    <SidebarProvider>
      <div className="md:hidden p-2">
        <SidebarTrigger />
      </div>
      <AppSidebar />
      <SidebarInset>
        <header className="p-4 border-b">
          <h1 className="text-2xl font-bold">Şube {branchId} - Özet</h1>
        </header>
        <main className="p-4">
          <form className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Gün Özeti
              </label>
              <textarea
                className="border border-input rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Bugün önemli bir olay yaşandıysa buraya yazın..."
                rows={6}
              />
            </div>
            <Button type="submit">Kaydet</Button>
          </form>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
