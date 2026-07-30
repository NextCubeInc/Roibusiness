// NÃO USADO — pode apagar a pasta app/auth/app-link.
// A ponte foi descartada: o deep link mobile funciona com o template padrão
// {{ .ConfirmationURL }} do Supabase (link https que redireciona pro app).
import { NextResponse } from "next/server"

export async function GET() {
  return new NextResponse("Not found", { status: 404 })
}
