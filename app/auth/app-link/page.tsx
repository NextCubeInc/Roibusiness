import type { Metadata } from "next"
import { AppLinkBridge } from "./bridge"

// Página ponte dos e-mails de recuperação de senha do APP (influencers).
//
// O e-mail aponta para cá com o link real do Supabase no fragmento:
//   /auth/app-link#u=<ConfirmationURL url-encoded>
// Abrir esta página NÃO gasta o link (o fragmento nem chega ao servidor):
// clique no PC, prévia do WhatsApp e antivírus de e-mail deixam o link intacto.
// O link só é usado quando a pessoa toca em "Abrir no app" no celular.
// Template do e-mail: supabase/templates/recovery.html
export const metadata: Metadata = {
  title: "Redefinir senha · Roinfluencer",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

export default function AppLinkPage() {
  return <AppLinkBridge />
}
