"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { updateBusinessProfile, updatePassword, type BusinessSettings } from "./actions"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { redirect } from "next/navigation"

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = ["Perfil", "Plano", "Segurança"] as const
type Tab = typeof TABS[number]

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string | null) {
  if (!name) return "?"
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()
}

function Feedback({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-sm", ok ? "text-green-600" : "text-destructive")}>
      {ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      {msg}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ConfiguracoesClient({ settings }: { settings: BusinessSettings }) {
  const { open } = useSidebar()
  const [activeTab, setActiveTab] = useState<Tab>("Perfil")

  return (
    <div className="flex flex-col gap-6 p-4">

      {/* Header */}
      <div className="flex items-center gap-2">
        {!open && <SidebarTrigger size="lg" />}
        <span className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
          Configurações
        </span>
      </div>

      <div className="flex flex-col md:flex-row gap-6">

        {/* Nav lateral */}
        <nav className="flex md:flex-col gap-1 md:w-[180px] shrink-0">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "text-sm font-medium px-3 py-2 rounded-lg text-left transition-colors",
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          {activeTab === "Perfil"    && <PerfilTab    settings={settings} />}
          {activeTab === "Plano"     && <PlanoTab     settings={settings} />}
          {activeTab === "Segurança" && <SegurancaTab />}
        </div>
      </div>
    </div>
  )
}

// ── Aba Perfil ────────────────────────────────────────────────────────────────

function PerfilTab({ settings }: { settings: BusinessSettings }) {
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  const [name, setName]           = useState(settings.name      ?? "")
  const [phone, setPhone]         = useState(settings.phone     ?? "")
  const [instagram, setInstagram] = useState(settings.instagram ?? "")
  const [site, setSite]           = useState(settings.site      ?? "")

  function handleSave() {
    setFeedback(null)
    startTransition(async () => {
      const result = await updateBusinessProfile({ name, phone, instagram, site })
      setFeedback(result.success
        ? { ok: true,  msg: "Alterações salvas com sucesso." }
        : { ok: false, msg: result.error ?? "Erro ao salvar." }
      )
    })
  }

  return (
    <Card className="p-6 space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 text-lg">
          {settings.avatar_url && (
            <AvatarImage src={`${process.env.NEXT_PUBLIC_BUCKET_URL}${settings.avatar_url}`} />
          )}
          <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
            {initials(settings.name)}
          </AvatarFallback>
        </Avatar>
        <Button variant="outline" size="sm" disabled>Alterar foto</Button>
      </div>

      {/* Campos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Nome</Label>
          <Input value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Email</Label>
          <Input value={settings.email ?? ""} disabled className="bg-muted" />
        </div>
        <div className="space-y-1">
          <Label>Telefone</Label>
          <Input value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Instagram</Label>
          <Input value={instagram} onChange={e => setInstagram(e.target.value)} />
        </div>
        <div className="sm:col-span-2 space-y-1">
          <Label>Site</Label>
          <Input value={site} onChange={e => setSite(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar alterações
        </Button>
        {feedback && <Feedback ok={feedback.ok} msg={feedback.msg} />}
      </div>
    </Card>
  )
}

// ── Aba Plano ─────────────────────────────────────────────────────────────────

function PlanoTab({ settings }: { settings: BusinessSettings }) {
  const infPercent = settings.max_influencers > 0
    ? Math.round((settings.influencers_count / settings.max_influencers) * 100)
    : 0

  const ordersPercent = settings.max_orders > 0
    ? Math.round((settings.orders_count / settings.max_orders) * 100)
    : 0

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold">Plano {settings.plan_code ?? "—"}</h3>
        <Badge className="bg-primary/10 text-primary text-xs">
          {settings.subscription_status === "active" ? "Ativo" : "Free"}
        </Badge>
      </div>

      {settings.subscription_started_at && (
        <p className="text-xs text-muted-foreground">
          Desde{" "}
          {format(new Date(settings.subscription_started_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      )}

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Influencers</span>
            <span className="text-muted-foreground">
              {settings.influencers_count}/{settings.max_influencers || "∞"}
            </span>
          </div>
          <Progress value={infPercent} className="h-2" />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Pedidos</span>
            <span className="text-muted-foreground">
              {settings.orders_count}/{settings.max_orders || "∞"}
            </span>
          </div>
          <Progress value={ordersPercent} className="h-2" />
        </div>
      </div>

      <Button onClick={()=> redirect("/main/plans")}>Fazer upgrade</Button>
    </Card>
  )
}

// ── Aba Segurança ─────────────────────────────────────────────────────────────

function SegurancaTab() {
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  const [current, setCurrent]   = useState("")
  const [newPass, setNewPass]   = useState("")
  const [confirm, setConfirm]   = useState("")

  function handleChange() {
    setFeedback(null)
    if (newPass !== confirm) {
      setFeedback({ ok: false, msg: "As senhas não coincidem." })
      return
    }
    if (newPass.length < 6) {
      setFeedback({ ok: false, msg: "A senha deve ter pelo menos 6 caracteres." })
      return
    }
    startTransition(async () => {
      const result = await updatePassword(newPass)
      setFeedback(result.success
        ? { ok: true,  msg: "Senha alterada com sucesso." }
        : { ok: false, msg: result.error ?? "Erro ao alterar senha." }
      )
      if (result.success) {
        setCurrent(""); setNewPass(""); setConfirm("")
      }
    })
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="space-y-1">
        <Label>Senha atual</Label>
        <Input type="password" value={current} onChange={e => setCurrent(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Nova senha</Label>
        <Input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Confirmar nova senha</Label>
        <Input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleChange()}
        />
      </div>
      <div className="flex items-center gap-4">
        <Button onClick={handleChange} disabled={isPending || !newPass || !confirm}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Alterar senha
        </Button>
        {feedback && <Feedback ok={feedback.ok} msg={feedback.msg} />}
      </div>
    </Card>
  )
}