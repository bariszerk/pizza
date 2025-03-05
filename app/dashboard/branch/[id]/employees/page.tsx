import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default async function BranchEmployeesPage({ params }: {
  params: { id: string };
}) {

  
  const param = await params
  const branchId = param.id;

  // Örnek çalışan verileri; gerçek uygulamada API veya veritabanından çekilebilir.
  const employees = [
    { id: "1", name: "Ahmet Yılmaz" },
    { id: "2", name: "Ayşe Demir" },
    { id: "3", name: "Mehmet Kaya" },
  ];

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="p-4 border-b">
          <h1 className="text-2xl font-bold">Şube {branchId} - Çalışanlar</h1>
        </header>
        <main className="p-4">
          {employees.length === 0 ? (
            <p>Bu şubede çalışan bulunamadı.</p>
          ) : (
            <ul>
              {employees.map((employee) => (
                <li key={employee.id} className="p-2 border-b">
                  {employee.name}
                </li>
              ))}
            </ul>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
