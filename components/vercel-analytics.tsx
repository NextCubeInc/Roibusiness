"use client"

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next"

// O fragmento (#...) nunca vai para a analytics: a página /auth/app-link
// carrega o link de recuperação de senha (token) nele.
function stripHash(event: BeforeSendEvent): BeforeSendEvent {
  return { ...event, url: event.url.split("#")[0] }
}

export function VercelAnalytics() {
  return <Analytics beforeSend={stripHash} />
}
