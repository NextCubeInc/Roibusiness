// app/dashboard/page.tsx
import { getDashboardData } from "./actions"
import DashboardClient from "./dash-page"

export const dynamic = "force-dynamic"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; months?: string }> // É uma Promise agora!
}) {
  const params = await searchParams // <--- Await aqui
  
  const days = Number(params.days ?? 7) as 7 | 15 | 30
  const months = Number(params.months ?? 6) as 3 | 6 | 12

  const data = await getDashboardData(days, months, 10)

  return <DashboardClient {...data} />
}