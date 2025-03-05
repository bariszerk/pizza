import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="p-4">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </header>
        <main className="p-4">
          <p>Lütfen sol menüden bir şube seçin.</p>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
