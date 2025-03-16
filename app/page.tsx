import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/ui/theme-toggle-button"

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <Link href="/dashboard">
          <Button variant="outline">Dashboard</Button>
        </Link>
        <Link href="/branch">
          <Button variant="outline">Branch</Button>
        </Link>
      </div>
      <div className="absolute bottom-4 left-4">
        <ModeToggle />
      </div>
    </div>
  )
}
