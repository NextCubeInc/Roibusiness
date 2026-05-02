"use server"

import { unstable_cache } from 'next/cache'
import { createClient } from "@/lib/supabase/server"

export async function getDashboardData(
  p_days: 7 | 15 | 30 = 7,
  p_months: 3 | 6 | 12 = 6,
  p_limit: number = 10
) {
  // Precisamos do userId FORA do cache para compor a cache key por usuário
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const uid = user.id

  return unstable_cache(
    async () => {
      const client = await createClient()

      const [
        { data: kpis },
        { data: dailyChart },
        { data: monthlyChart },
        { data: lastOrders },
        { data: topInfluencers },
      ] = await Promise.all([
        client.rpc('get_business_kpis'),
        client.rpc('get_business_sales_by_day', { p_days }),
        client.rpc('get_business_sales_by_month', { p_months }),
        client.rpc('get_business_last_orders', { p_limit }),
        client.rpc('get_business_top_influencers'),
      ])

      return { kpis, dailyChart, monthlyChart, lastOrders, topInfluencers }
    },
    [`dashboard-${uid}-d${p_days}-m${p_months}`],
    {
      tags: [`${uid}-orders`, `${uid}-dashboard`],
      revalidate: 300, // fallback: revalida a cada 5 min mesmo sem trigger
    }
  )()
}