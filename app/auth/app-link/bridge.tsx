"use client"

import { useLayoutEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const STORAGE_KEY = "roi-app-link-target"
const APP_SCHEME = "roinfluencer://"

type State =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "ready"; target: string; mobile: boolean }

// Só aceita o link de verificação de recuperação do NOSSO projeto Supabase
// que volta para o app. Qualquer outra coisa é recusada (evita open redirect).
function parseTarget(raw: string | null): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!)
    if (url.protocol !== "https:" || url.origin !== supabase.origin) return null
    if (url.pathname !== "/auth/v1/verify") return null
    if (url.searchParams.get("type") !== "recovery") return null
    if (!url.searchParams.get("token")) return null
    if (!url.searchParams.get("redirect_to")?.startsWith(APP_SCHEME)) return null
    return url.toString()
  } catch {
    return null
  }
}

function readHashTarget(): string | null {
  const hash = window.location.hash.slice(1)
  if (!hash.startsWith("u=")) return null
  try {
    return decodeURIComponent(hash.slice(2))
  } catch {
    return null
  }
}

function isMobileDevice() {
  const ua = navigator.userAgent
  // iPadOS se apresenta como Mac: detecta pelo toque.
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1
  return /Android|iPhone|iPad|iPod/i.test(ua) || iPadOS
}

function bridgeUrl(target: string) {
  return `${window.location.origin}${window.location.pathname}#u=${encodeURIComponent(target)}`
}

export function AppLinkBridge() {
  const [state, setState] = useState<State>({ kind: "loading" })
  const [opened, setOpened] = useState(false)
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle")

  // useLayoutEffect: roda antes de qualquer useEffect (inclusive o do
  // <Analytics/> no layout), então o token sai da barra de endereço antes de
  // qualquer script de terceiros ler a URL.
  useLayoutEffect(() => {
    let target: string | null = null
    if (window.location.hash) {
      target = parseTarget(readHashTarget())
      try {
        // Link inválido também apaga o anterior: recarregar não ressuscita um token velho.
        if (target) sessionStorage.setItem(STORAGE_KEY, target)
        else sessionStorage.removeItem(STORAGE_KEY)
      } catch {}
      window.history.replaceState(null, "", window.location.pathname)
    } else {
      // Recarregou a página depois de limpar o fragmento.
      try {
        target = parseTarget(sessionStorage.getItem(STORAGE_KEY))
      } catch {}
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê o fragmento só no cliente
    setState(target ? { kind: "ready", target, mobile: isMobileDevice() } : { kind: "invalid" })
  }, [])

  async function copyLink(target: string) {
    try {
      await navigator.clipboard.writeText(bridgeUrl(target))
      setCopy("copied")
    } catch {
      // Navegador bloqueou a área de transferência: mostra o link para copiar à mão.
      setCopy("failed")
    }
  }

  if (state.kind === "loading") {
    return <Shell title="Redefinir senha" description="Carregando…" />
  }

  if (state.kind === "invalid") {
    return (
      <Shell
        title="Link inválido"
        description="Este link de recuperação está incompleto ou não é válido. Peça um novo pelo app Roinfluencer, na tela de login, em “Esqueci minha senha”."
      />
    )
  }

  if (!state.mobile) {
    return (
      <Shell
        title="Abra no celular"
        description="Para redefinir a senha, este link precisa ser aberto no celular onde está o app Roinfluencer — o mesmo em que você pediu a recuperação."
      >
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>Abrir esta página no computador não gasta o link. Você pode encaminhá-lo para o celular (por WhatsApp, por exemplo) e abrir por lá.</p>
          <p>Faça isso logo: o link funciona por até 5 minutos depois do pedido.</p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button className="w-full" onClick={() => copyLink(state.target)}>
            {copy === "copied" ? "Link copiado" : "Copiar link"}
          </Button>
          {copy === "failed" && (
            <div className="flex w-full flex-col gap-1">
              <p className="text-xs text-muted-foreground">Não foi possível copiar automaticamente. Copie o link abaixo:</p>
              <Input
                readOnly
                aria-label="Link para abrir no celular"
                value={bridgeUrl(state.target)}
                onFocus={(e) => e.currentTarget.select()}
              />
            </div>
          )}
        </CardFooter>
      </Shell>
    )
  }

  return (
    <Shell
      title="Redefinir senha"
      description="Toque no botão abaixo neste celular — o mesmo em que você pediu a recuperação. O app Roinfluencer vai abrir na tela de nova senha."
    >
      <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
        <p>O link funciona por até 5 minutos depois do pedido e só pode ser usado uma vez.</p>
        {opened && (
          <p className="text-foreground">
            Se o app não abriu, confira se ele está instalado e atualizado. Se aparecer “link expirado”, peça um novo pelo app.
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full" size="lg">
          <a href={state.target} rel="noreferrer" onClick={() => setOpened(true)}>
            Abrir no app
          </a>
        </Button>
      </CardFooter>
    </Shell>
  )
}

function Shell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {children}
      </Card>
    </div>
  )
}
