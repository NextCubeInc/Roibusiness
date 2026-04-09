import { createClient } from "@/lib/supabase/server"
import VendasClient from "./vendas-client"
import { getBusinessOrders } from "./actions"

export default async function VendasPage() {
  // Carrega dados iniciais no servidor
  const [{ orders, summary }, coupons] = await Promise.all([
    getBusinessOrders({ page: 1, pageSize: 15 }),
    fetchAvailableCoupons(),
  ])

  return (
    <VendasClient
      initialOrders={orders}
      initialSummary={summary}
      initialTotalOrders={summary.total_orders}
      availableCoupons={coupons}
    />
  )
}

// Busca cupons disponíveis para o filtro do select
async function fetchAvailableCoupons(): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("coupons")
    .select("code")
    .eq("business_id", (await supabase.auth.getUser()).data.user?.id ?? "")
    .eq("is_active", true)
    .order("code")

  return (data ?? []).map((c) => c.code).filter(Boolean) as string[]
}