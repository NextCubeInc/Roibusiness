"use server"

import { createClient } from "@/lib/supabase/server"

export type OrderRow = {
  id: string
  ordered_at: string
  external_id: string | null
  total: number
  store_type: string | null
  coupon: string | null
  influencer_name: string | null
  influencer_avatar: string | null
  commission: number
}

export type OrdersSummary = {
  total_orders: number
  total_sales: number
  total_commission: number
}

export type GetOrdersResult = {
  summary: OrdersSummary
  orders: OrderRow[]
}

export type OrderFilters = {
  page?: number
  pageSize?: number
  searchId?: string
  coupon?: string
  dateFrom?: string
  dateTo?: string
}

export async function getBusinessOrders(
  filters: OrderFilters = {}
): Promise<GetOrdersResult> {
  const supabase = await createClient()

  const {
    page = 1,
    pageSize = 15,
    searchId,
    coupon,
    dateFrom,
    dateTo,
  } = filters

  const { data, error } = await supabase.rpc("get_business_orders", {
    p_limit:     pageSize,
    p_offset:    (page - 1) * pageSize,
    p_search_id: searchId  || null,
    p_coupon:    coupon     || null,
    p_date_from: dateFrom   || null,
    p_date_to:   dateTo     || null,
  })

  if (error) throw new Error(error.message)

  return {
    summary: data.summary ?? { total_orders: 0, total_sales: 0, total_commission: 0 },
    orders:  data.orders  ?? [],
  }
}