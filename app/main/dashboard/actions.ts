"use server"

import { createClient } from "@/lib/supabase/server"

export async function getDashboardData(
  p_days: 7 | 15 | 30 = 7,
  p_months: 3 | 6 | 12 = 6,
  p_limit: number = 10
) {
  const supabase = await createClient()

  const [
    { data: kpis },
    { data: dailyChart },
    { data: monthlyChart },
    { data: lastOrders },
    { data: topInfluencers },
  ] = await Promise.all([
    supabase.rpc('get_business_kpis'),
    supabase.rpc('get_business_sales_by_day', { p_days }),
    supabase.rpc('get_business_sales_by_month', { p_months }),
    supabase.rpc('get_business_last_orders', { p_limit }),
    supabase.rpc('get_business_top_influencers'),
  ])

  return { kpis, dailyChart, monthlyChart, lastOrders, topInfluencers }
}