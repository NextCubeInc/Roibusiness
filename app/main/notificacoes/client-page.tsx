"use client"

import { useMemo, useState, useTransition } from "react"
import { UserAvatar } from "@/components/ui/user-avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import {
  Bell, Send, Loader2, Plus, Users, User, Apple, Info, Smartphone,
  CheckCircle2, AlertTriangle, XCircle, Clock,
} from "lucide-react"
import {
  sendNotification, createGroup,
  type NotifInfluencer, type NotifGroup, type NotifHistoryRow, type ExpoPushRecord, type SendStatus,
} from "./actions"

// ── Helpers ───────────────────────────────────────────────────────────────────

const text = (v: string | null | undefined) => v ?? ""

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

// Payload `data` fixo do push. O app mobile (usePushNotifications) lê `type`/`tab`
// e navega para /main/business-request com a aba de notificações ativa.
const NOTIFICATION_DEEP_LINK = {
  type: "notificacao",
  screen: "business-request",
  tab: "notificacoes",
} as const

// Limite da mensagem: o app mobile exibe no máximo ~20 linhas no preview (que não rola).
const MAX_BODY_LINES = 20
const MAX_BODY_CHARS = 800

// Corta a mensagem ao teto de caracteres e de quebras de linha.
function clampBody(value: string): string {
  const lines = value.split("\n").slice(0, MAX_BODY_LINES)
  return lines.join("\n").slice(0, MAX_BODY_CHARS)
}

const STATUS_META: Record<SendStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  sent:      { label: "Enviado",   className: "text-green-600 dark:text-green-400 border-green-500/40", icon: CheckCircle2 },
  partial:   { label: "Parcial",   className: "text-yellow-600 dark:text-yellow-400 border-yellow-500/40", icon: AlertTriangle },
  failed:    { label: "Falhou",    className: "text-destructive border-destructive/40", icon: XCircle },
  scheduled: { label: "Agendado",  className: "text-blue-600 dark:text-blue-400 border-blue-500/40", icon: Clock },
}

// Rótulo com tooltip explicativo — usado nos campos específicos de plataforma
function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label className="text-xs">{children}</Label>
      {hint && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-[240px] text-xs">{hint}</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClientPage({
  influencers,
  groups: initialGroups,
  history: initialHistory,
}: {
  influencers: NotifInfluencer[]
  groups:      NotifGroup[]
  history:     NotifHistoryRow[]
}) {
  const { open } = useSidebar()
  const [isPending, startTransition] = useTransition()

  const [groups, setGroups]   = useState<NotifGroup[]>(initialGroups)
  const [history, setHistory] = useState<NotifHistoryRow[]>(initialHistory)

  // ── Destinatários ──
  const [target, setTarget]           = useState<"all" | "group" | "custom">("all")
  const [selectedGroup, setSelectedGroup] = useState<string>(initialGroups[0]?.id ?? "")
  const [customIds, setCustomIds]     = useState<string[]>([])
  const [customSearch, setCustomSearch] = useState("")

  // ── Conteúdo ──
  const [title, setTitle]       = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [body, setBody]         = useState("")

  // ── Preview / envio ──
  const [previewOS, setPreviewOS] = useState<"ios" | "android">("ios")
  const [sending, setSending]     = useState(false)
  const [sentOk, setSentOk]       = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  // ── Criar grupo ──
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [newGroupName, setNewGroupName]       = useState("")
  const [newGroupIds, setNewGroupIds]         = useState<string[]>([])
  const [creatingGroup, setCreatingGroup]     = useState(false)

  // ── Histórico ──
  const [detailRow, setDetailRow] = useState<NotifHistoryRow | null>(null)

  const reachableInfluencers = useMemo(
    () => influencers.filter(i => i.push_token),
    [influencers],
  )

  const audienceCount = useMemo(() => {
    if (target === "all") return reachableInfluencers.length
    if (target === "group") {
      const g = groups.find(g => g.id === selectedGroup)
      if (!g) return 0
      return influencers.filter(i => g.influencer_ids.includes(i.influencer_id) && i.push_token).length
    }
    return influencers.filter(i => customIds.includes(i.influencer_id) && i.push_token).length
  }, [target, selectedGroup, customIds, groups, influencers, reachableInfluencers])

  const audienceLabel = useMemo(() => {
    if (target === "all") return "Todos"
    if (target === "group") return `Grupo: ${groups.find(g => g.id === selectedGroup)?.name ?? "—"}`
    return `${customIds.length} influencer${customIds.length === 1 ? "" : "s"}`
  }, [target, selectedGroup, customIds, groups])

  const filteredCustom = useMemo(() => {
    const q = customSearch.toLowerCase()
    return influencers.filter(i =>
      text(i.name).toLowerCase().includes(q) || text(i.instagram).toLowerCase().includes(q),
    )
  }, [influencers, customSearch])

  const canSend = body.trim().length > 0 && audienceCount > 0 && !sending

  // ── Handlers ──

  function buildMessage(): ExpoPushRecord {
    // Campos de entrega / plataforma usam defaults do Expo.
    return {
      title:    title.trim() || null,
      body:     body.trim(),
      subtitle: subtitle.trim() || null,
      // Deep-link fixo: toque na notificação abre business-request na aba "notificacoes".
      data:     NOTIFICATION_DEEP_LINK,
      priority: "default",
      ttl:      null,
      sound:    "default",
      badge:    null,
      interruptionLevel: "active",
      mutableContent: false,
      channelId: "default",
    }
  }

  function toggleCustom(id: string) {
    setCustomIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleNewGroup(id: string) {
    setNewGroupIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleCreateGroup() {
    if (!newGroupName.trim() || newGroupIds.length === 0) return
    setCreatingGroup(true)
    try {
      const res = await createGroup(newGroupName.trim(), newGroupIds)
      if (res.success && res.id) {
        const g: NotifGroup = {
          id: res.id,
          name: newGroupName.trim(),
          influencer_ids: newGroupIds,
        }
        setGroups(prev => [...prev, g])
        setSelectedGroup(g.id)
        setTarget("group")
        setGroupDialogOpen(false)
        setNewGroupName("")
        setNewGroupIds([])
      }
    } catch (e) {
      console.error("createGroup error:", e)
    }
    setCreatingGroup(false)
  }

  async function handleSend() {
    if (!canSend) return
    setSending(true)
    setSentOk(false)
    setSendError(null)
    const message = buildMessage()

    const targetPayload =
      target === "all"   ? { type: "all" as const } :
      target === "group" ? { type: "group" as const, groupId: selectedGroup } :
                           { type: "custom" as const, influencerIds: customIds }

    startTransition(async () => {
      try {
        const res = await sendNotification({ target: targetPayload, message })
        if (!res.success) {
          setSendError(
            res.error === "quota_exceeded"
              ? "Você atingiu o limite de notificações do seu plano este mês."
              : "Não foi possível enviar a notificação. Tente novamente.",
          )
          setSending(false)
          return
        }
        // Registra no histórico com os contadores reais retornados pela função
        const row: NotifHistoryRow = {
          id: res.notificationId ?? `h-${Date.now()}`,
          sent_at: new Date().toISOString(),
          message,
          audience_label: audienceLabel,
          recipients: res.recipients,
          delivered: res.delivered,
          failed: res.failed,
          status: res.status,
        }
        setHistory(prev => [row, ...prev])
        setSentOk(true)
        // limpa o conteúdo, mantém destinatários
        setTitle(""); setSubtitle(""); setBody("")
        setTimeout(() => setSentOk(false), 3500)
      } catch (e) {
        console.error("sendNotification error:", e)
        setSendError("Não foi possível enviar a notificação. Tente novamente.")
      }
      setSending(false)
    })
  }

  // ── Render ──

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col gap-6 p-3 h-fit">

        {/* ── Header ── */}
        <div className="flex flex-row items-center gap-2">
          {!open && <SidebarTrigger size="lg" />}
          <label className="flex text-sm font-medium tracking-widest text-muted-foreground uppercase items-center gap-2">
            <Bell size={16} />
            Notificações
          </label>
        </div>

        <Tabs defaultValue="enviar" className="w-full">
          <TabsList>
            <TabsTrigger value="enviar">Enviar</TabsTrigger>
            <TabsTrigger value="historico">
              Histórico
              {history.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">{history.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════ ENVIAR ═══════════════ */}
          <TabsContent value="enviar" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">

              {/* ── Coluna do formulário ── */}
              <div className="flex flex-col gap-6">

                {/* Destinatários */}
                <Card className="p-4 flex flex-col gap-4">
                  <Label className="text-sm font-semibold">Destinatários</Label>

                  <div className="flex flex-wrap gap-2">
                    <TargetChip active={target === "all"}    onClick={() => setTarget("all")}    icon={Users}      label={`Todos (${reachableInfluencers.length})`} />
                    <TargetChip active={target === "group"}  onClick={() => setTarget("group")}  icon={Users}      label="Grupo" />
                    <TargetChip active={target === "custom"} onClick={() => setTarget("custom")} icon={User}       label="Específicos" />
                  </div>

                  {target === "group" && (
                    <div className="flex gap-2 items-center">
                      <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecione um grupo" />
                        </SelectTrigger>
                        <SelectContent>
                          {groups.map(g => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.name} · {g.influencer_ids.length}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Criar novo grupo */}
                      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> Novo grupo</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Criar grupo</DialogTitle>
                            <DialogDescription>Agrupe influencers para enviar notificações em lote.</DialogDescription>
                          </DialogHeader>
                          <div className="flex flex-col gap-3">
                            <Input placeholder="Nome do grupo" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
                            <div className="max-h-60 overflow-y-auto flex flex-col gap-1 border rounded-lg p-2">
                              {influencers.map(i => (
                                <label key={i.influencer_id} className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-muted/40 cursor-pointer">
                                  <Checkbox checked={newGroupIds.includes(i.influencer_id)} onCheckedChange={() => toggleNewGroup(i.influencer_id)} />
                                  <UserAvatar avatarUrl={i.avatar_url} name={i.name} size={28} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm truncate">{text(i.name)}</p>
                                    <p className="text-xs text-muted-foreground truncate">{text(i.instagram)}</p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={handleCreateGroup} disabled={!newGroupName.trim() || newGroupIds.length === 0 || creatingGroup}>
                              {creatingGroup ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                              Criar grupo ({newGroupIds.length})
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}

                  {target === "custom" && (
                    <div className="flex flex-col gap-2">
                      <Input placeholder="Buscar influencer..." value={customSearch} onChange={e => setCustomSearch(e.target.value)} className="max-w-xs" />
                      <div className="max-h-64 overflow-y-auto flex flex-col gap-1 border rounded-lg p-2">
                        {filteredCustom.map(i => (
                          <label
                            key={i.influencer_id}
                            className={`flex items-center gap-3 px-2 py-1.5 rounded-md cursor-pointer ${i.push_token ? "hover:bg-muted/40" : "opacity-50"}`}
                          >
                            <Checkbox
                              checked={customIds.includes(i.influencer_id)}
                              onCheckedChange={() => i.push_token && toggleCustom(i.influencer_id)}
                              disabled={!i.push_token}
                            />
                            <UserAvatar avatarUrl={i.avatar_url} name={i.name} size={28} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{text(i.name)}</p>
                              <p className="text-xs text-muted-foreground truncate">{text(i.instagram)}</p>
                            </div>
                            {i.push_token
                              ? <PlatformBadge platform={i.platform} />
                              : <span className="text-[10px] text-muted-foreground">sem app</span>}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Alcance estimado: <span className="font-medium text-foreground">{audienceCount}</span> influencer(s) com o app instalado.
                  </p>
                </Card>

                {/* Conteúdo */}
                <Card className="p-4 flex flex-col gap-4">
                  <Label className="text-sm font-semibold">Conteúdo</Label>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Título</Label>
                    <Input placeholder="Título da notificação" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <FieldLabel hint="Aparece acima do título. Só é exibido no iOS — o Android ignora este campo.">
                      Subtítulo <span className="text-muted-foreground">· iOS</span>
                    </FieldLabel>
                    <Input placeholder="Subtítulo (opcional)" value={subtitle} onChange={e => setSubtitle(e.target.value)} maxLength={100} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Mensagem *</Label>
                    <Textarea
                      placeholder="Escreva a mensagem..."
                      value={body}
                      onChange={e => setBody(clampBody(e.target.value))}
                      rows={3}
                      maxLength={MAX_BODY_CHARS}
                    />
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>Máximo {MAX_BODY_LINES} linhas.</span>
                      <span className={body.length >= MAX_BODY_CHARS ? "text-destructive" : ""}>
                        {body.length}/{MAX_BODY_CHARS}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>
                      Ao tocar na notificação, o influencer é levado para a tela{" "}
                      <span className="font-medium text-foreground">Solicitações</span> com a aba{" "}
                      <span className="font-medium text-foreground">Notificações</span> ativa.
                    </span>
                  </div>
                </Card>

                {/* Enviar */}
                <div className="flex items-center gap-3">
                  <Button onClick={handleSend} disabled={!canSend} size="lg">
                    {(sending || isPending)
                      ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      : <Send className="h-4 w-4 mr-2" />}
                    Enviar para {audienceCount} influencer(s)
                  </Button>
                  {sentOk && (
                    <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" /> Notificação enviada!
                    </span>
                  )}
                  {sendError && (
                    <span className="flex items-center gap-1.5 text-sm text-destructive">
                      <XCircle className="h-4 w-4" /> {sendError}
                    </span>
                  )}
                </div>
              </div>

              {/* ── Coluna do preview ── */}
              <div className="lg:sticky lg:top-4 self-start flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Preview</Label>
                  <div className="flex rounded-md border p-0.5">
                    <button
                      onClick={() => setPreviewOS("ios")}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs ${previewOS === "ios" ? "bg-muted font-medium" : "text-muted-foreground"}`}
                    >
                      <Apple className="h-3 w-3" /> iOS
                    </button>
                    <button
                      onClick={() => setPreviewOS("android")}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs ${previewOS === "android" ? "bg-muted font-medium" : "text-muted-foreground"}`}
                    >
                      <Smartphone className="h-3 w-3" /> Android
                    </button>
                  </div>
                </div>

                <PushPreview
                  os={previewOS}
                  title={title}
                  subtitle={subtitle}
                  body={body}
                />

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {previewOS === "ios"
                    ? "No iOS o subtítulo aparece entre o app e o título."
                    : "No Android o subtítulo é ignorado; o app aparece como cabeçalho."}
                </p>
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════ HISTÓRICO ═══════════════ */}
          <TabsContent value="historico" className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead>Público</TableHead>
                  <TableHead className="text-center">Enviados</TableHead>
                  <TableHead className="text-center">Falhas</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-12">
                      Nenhuma notificação enviada ainda.
                    </TableCell>
                  </TableRow>
                ) : history.map(row => {
                  const meta = STATUS_META[row.status]
                  const Icon = meta.icon
                  return (
                    <TableRow key={row.id} className="cursor-pointer" onClick={() => setDetailRow(row)}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(row.sent_at)}</TableCell>
                      <TableCell className="max-w-[320px]">
                        <p className="text-sm font-medium truncate">{row.message.title || "(sem título)"}</p>
                        <p className="text-xs text-muted-foreground truncate">{row.message.body}</p>
                      </TableCell>
                      <TableCell><span className="text-xs">{row.audience_label}</span></TableCell>
                      <TableCell className="text-center text-sm">{row.delivered}/{row.recipients}</TableCell>
                      <TableCell className="text-center text-sm">
                        {row.failed > 0 ? <span className="text-destructive">{row.failed}</span> : <span className="text-muted-foreground">0</span>}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${meta.className}`}>
                          <Icon className="h-3 w-3" /> {meta.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>

        {/* ── Sheet de detalhe do histórico ── */}
        <Sheet open={!!detailRow} onOpenChange={() => setDetailRow(null)}>
          <SheetContent className="flex flex-col gap-4 p-4 overflow-y-auto sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Detalhe do envio</SheetTitle>
              <SheetDescription>{detailRow && formatDateTime(detailRow.sent_at)}</SheetDescription>
            </SheetHeader>
            {detailRow && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat label="Público" value={detailRow.audience_label} />
                  <Stat label="Enviados" value={`${detailRow.delivered}/${detailRow.recipients}`} />
                  <Stat label="Falhas" value={String(detailRow.failed)} />
                </div>

                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Payload Expo</Label>
                  <pre className="text-[11px] font-mono bg-muted/40 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words">
{JSON.stringify(detailRow.message, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  )
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function TargetChip({ active, onClick, icon: Icon, label }: {
  active: boolean; onClick: () => void; icon: typeof Users; label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
        active ? "border-primary bg-primary/10 text-primary font-medium" : "border-muted text-muted-foreground hover:bg-muted/40"
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  )
}

function PlatformBadge({ platform }: { platform: "ios" | "android" | null }) {
  if (platform === "ios") return <Apple className="h-3.5 w-3.5 text-muted-foreground" />
  if (platform === "android") return <Smartphone className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
  return null
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-lg py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium truncate px-1">{value}</p>
    </div>
  )
}

// Mockup de notificação — muda o layout conforme o SO
function PushPreview({ os, title, subtitle, body }: {
  os: "ios" | "android"; title: string; subtitle: string; body: string
}) {
  const appName = "ROINFLUENCER"
  const displayTitle = title || "Título da notificação"
  const displayBody = body || "Prévia da mensagem aparece aqui."

  if (os === "ios") {
    return (
      <div className="rounded-[28px] bg-gradient-to-b from-muted/60 to-muted/20 p-4 border">
        <div className="rounded-2xl bg-background/95 backdrop-blur shadow-sm border p-3 flex gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <Bell className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-muted-foreground uppercase truncate">{appName}</p>
              <span className="text-[10px] text-muted-foreground">agora</span>
            </div>
            {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
            <p className="text-sm font-semibold truncate">{displayTitle}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{displayBody}</p>
          </div>
        </div>
      </div>
    )
  }

  // Android
  return (
    <div className="rounded-2xl bg-gradient-to-b from-green-950/20 to-muted/20 p-4 border">
      <div className="rounded-xl bg-background/95 shadow-sm border p-3 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-green-600/20 flex items-center justify-center shrink-0">
            <Bell className="h-3 w-3 text-green-600 dark:text-green-500" />
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{appName}</p>
          <span className="text-[10px] text-muted-foreground">· agora</span>
        </div>
        <p className="text-sm font-semibold leading-tight">{displayTitle}</p>
        <p className="text-xs text-muted-foreground line-clamp-3">{displayBody}</p>
      </div>
    </div>
  )
}
