import { revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/revalidate
 *
 * Chamado pelo trigger do Supabase quando um novo pedido é inserido/atualizado.
 * Invalida o cache Next.js de todas as páginas que dependem de orders do business.
 *
 * Body: { business_id: string }
 * Header: x-revalidate-secret: <REVALIDATE_SECRET>
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-revalidate-secret')

  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let business_id: string | undefined

  try {
    const body = await req.json()
    business_id = body?.business_id
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!business_id) {
    return NextResponse.json({ error: 'business_id required' }, { status: 400 })
  }

  // Invalida todas as tags de cache do business
  revalidateTag(`${business_id}-orders`)
  revalidateTag(`${business_id}-dashboard`)
  revalidateTag(`${business_id}-ranking`)
  revalidateTag(`${business_id}-influencers`)

  return NextResponse.json({ revalidated: true, business_id })
}
