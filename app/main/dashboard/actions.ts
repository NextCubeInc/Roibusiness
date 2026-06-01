"use server"

import { createClient } from "@/lib/supabase/server"

export async function getDashboardData(
  p_days: 7 | 15 | 30 = 7,
  p_months: 3 | 6 | 12 = 6,
  p_limit: number = 10
) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const [
    { data: kpis,           error: e1 },
    { data: dailyChart,     error: e2 },
    { data: monthlyChart,   error: e3 },
    { data: lastOrders,     error: e4 },
    { data: topInfluencers, error: e5 },
  ] = await Promise.all([
    supabase.rpc('get_business_kpis_v_r1_0_1'),
    supabase.rpc('get_business_sales_by_day_v_r1_0_1', { p_days }),
    supabase.rpc('get_business_sales_by_month_v_r1_0_1', { p_months }),
    supabase.rpc('get_business_last_orders_v_r1_0_1', { p_limit }),
    supabase.rpc('get_business_top_influencers_v_r1_0_1', { p_limit: 5 }),
  ])

  const errors = { kpis: e1, dailyChart: e2, monthlyChart: e3, lastOrders: e4, topInfluencers: e5 }
  const hasError = Object.values(errors).some(Boolean)
  if (hasError) console.error('[dashboard] RPC errors:', JSON.stringify(errors, null, 2))

  return {
    kpis,
    dailyChart:     dailyChart     ?? [],
    monthlyChart:   monthlyChart   ?? [],
    lastOrders:     lastOrders     ?? [],
    topInfluencers: topInfluencers ?? [],
  }
}