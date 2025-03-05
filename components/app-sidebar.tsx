"use client"

import * as React from "react"
import { NavUser } from "@/components/nav-user"
import { NavMain } from "@/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/ui/mode-toggle"

// Örnek admin kullanıcı verisi
const user = {
  name: "Admin",
  email: "admin@example.com",
  avatar: "/avatars/admin.jpg",
}

// Şube verilerini nav-main bileşeninin beklediği formatta hazırlıyoruz.
const navBranches = [
  {
    title: "Pizza Şubesi 1",
    url: "/dashboard/branch/1",
    items: [
      { title: "Çalışanlar", url: "/dashboard/branch/1/employees" },
      { title: "Finans", url: "/dashboard/branch/1/finans" },
      { title: "Özet", url: "/dashboard/branch/1/ozet" },
    ],
  },
  {
    title: "Pizza Şubesi 2",
    url: "/dashboard/branch/2",
    items: [
      { title: "Çalışanlar", url: "/dashboard/branch/2/employees" },
      { title: "Finans", url: "/dashboard/branch/2/finans" },
      { title: "Özet", url: "/dashboard/branch/2/ozet" },
    ],
  },
  // Yeni şubeler eklenebilir.
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <h2 className="px-4 py-2 text-lg font-bold">Şubeler</h2>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navBranches} label="Şubeler" />
      </SidebarContent>
      <ModeToggle />
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
