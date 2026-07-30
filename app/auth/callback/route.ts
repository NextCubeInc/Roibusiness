import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Callback dos links de email (confirmação de cadastro e recuperação de senha).
 *
 * Com os templates PADRÃO do Supabase ({{ .ConfirmationURL }}), o link é https
 * (endpoint verify do Supabase) e redireciona para cá com `?code=` (fluxo PKCE).
 * Trocamos o code por sessão e encaminhamos para `next`.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
