"use server"

import { createClient } from "@/lib/supabase/server";


const PLANS = {
  basic: { name: "Assinatura Roi Basic", plan_id: "plan_Z3korgbFGbtZx01v" },
  pro: { name: "Assinatura Roi Pro", plan_id: "plan_wyMDyR2tlMh715Eg" }
}

const PAGARME_HEADERS = {
  accept: 'application/json',
  'content-type': 'application/json',
  authorization: `Basic ${process.env.NEXT_PAGARME_API_KEY}`
}

export async function CreateLink(plan: keyof typeof PLANS) {
  const supabase = await createClient()

  const userId = (await supabase.auth.getUser()).data.user?.id
  if (!userId) throw new Error("Usuário não autenticado")

  const { data, error } = await supabase
    .from("businesses")
    .select("email, name, pagarme_customer_id")
    .eq("id", userId)
    .single()

  if (error || !data) throw new Error("Usuário não encontrado")

  let customerId = data.pagarme_customer_id

  if (!customerId) {
    const customerRes = await fetch('https://api.pagar.me/core/v5/customers', {
      method: 'POST',
      headers: PAGARME_HEADERS,
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        code: userId,
        type: "individual"
      })
    })

    if (!customerRes.ok) throw new Error(`Erro ao criar cliente: ${customerRes.status}`)

    const customer = await customerRes.json()
    customerId = customer.id

    await supabase
      .from("businesses")
      .update({ pagarme_customer_id: customerId })
      .eq("id", userId)
  }

  const { name, plan_id } = PLANS[plan]

  const res = await fetch('https://api.pagar.me/core/v5/paymentlinks', {
    method: 'POST',
    headers: PAGARME_HEADERS,
    body: JSON.stringify({
      name,
      type: "subscription",
      max_paid_sessions: 1,
      payment_settings: {
        accepted_payment_methods: ["credit_card"],
        credit_card_settings: { operation_type: "auth_and_capture" }
      },
      customer_settings: {
        customer_id: customerId
      },
      cart_settings: {
        recurrences: [{ plan_id }]
      },
      is_building: false,
      layout_settings: {
        image_url: "https://kfkiskakbhnbwabhaghv.supabase.co/storage/v1/object/public/avatars/UsRoi/splash-icon.png",
        primary_color: "#8a0193",
        secondary_color: "#212124"
      },
      expires_in: 30
    })
  })

  if (!res.ok) {
  const body = await res.json()
  console.error("PAGARME ERROR:", JSON.stringify(body, null, 2))
  throw new Error(`Erro na API: ${res.status}`)
  }

  return res.json()
}

export type isPlan = { IsBasic: boolean; IsPro: boolean; IsElite: boolean }

export async function PlanSelect(): Promise<isPlan | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("businesses")
    .select("plan_id")
    .single()

  const { data:p } = await supabase
    .from("plans")
    .select("PagarmeId")
    .eq("id", data?.plan_id)
    .single() 

  const code: string = p?.PagarmeId
  if(!code){
    return null
  }

  return {
    IsBasic: code == PLANS.basic.plan_id,
    IsPro:   code == PLANS.pro.plan_id,
    IsElite: code !== PLANS.basic.plan_id && code !== PLANS.pro.plan_id && code !== null
  }
}

export async function CancelPlan() {
  const supabase = await createClient()

  const { data } = await supabase
    .from("businesses")
    .select("subiscription_id")
    .single()

  const res = await fetch(`https://api.pagar.me/core/v5/subscriptions/${data?.subiscription_id}`, {
    method: 'DELETE',
    headers: PAGARME_HEADERS,
    body: JSON.stringify(
      {
      cancel_pending_invoices: true
      }
    )
  })

  if (!res.ok) throw new Error(`Erro na API: ${res.status} ${res.statusText}`)

  return res.json()
}