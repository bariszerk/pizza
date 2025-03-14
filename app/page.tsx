import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
      <Link href="/dashboard">
        <Button variant={"outline"}>Dashboard</Button>
      </Link>
      <Link href="/branch">
        <Button variant={"outline"}>Branch</Button>
      </Link>
    </div>
  )
}
