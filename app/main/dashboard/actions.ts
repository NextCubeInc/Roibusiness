"use server"

import { unstable_cache } from 'next/cache'
import { createClient } from "@/lib/supabase/server"
import { createCachedClient } from "@/lib/supabase/cached-client"

export async function getDashboardData(
  p_days: 7 | 15 | 30 = 7,
  p_months: 3 | 6 | 12 = 6,
  p_limit: number = 10
) {
  // cookies() deve ser chamado FORA do unstable_cache
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const uid         = session.user.id
  const accessToken = session.access_token

  // Token capturado em closure — NÃO passa como argumento para não entrar na cache key
  // Se passado como argumento, cada rotação de JWT = cache miss = vai ao banco de novo
  return unstable_cache(
    async () => {
      const client = createCachedClient(accessToken)

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
      revalidate: 300,
    }
  )()
}