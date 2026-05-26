"use client"

import { useState, useTransition } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import {
  Crown,
  Plus,
  Trash2,
  CalendarIcon,
  Search,
  Loader2,
  Trophy,
  MoreHorizontal,
  Pencil,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import {
  createCampaign,
  updateCampaign,
  deleteCampaign,
  type RankingRow,
  type Campaign,
  type ConnectedInfluencer,
  type Prize,
} from "./actions"

// ── Helpers ───────────────────────────────────────────────────────────────────

const brl = (v: number) =>
  (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

function initials(name: string | null) {
  if (!name) return "?"
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
}

function parsePrizes(raw: string | null): Prize[] {
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

function prizeLabel(prize: Prize): string {
  const range =
    prize.position_start === prize.position_end
      ? `${prize.position_start}º lugar`
      : `${prize.position_start}º–${prize.position_end}º lugar`

  const reward =
    prize.reward_type === "valor"         ? `R$ ${prize.reward_value}`
    : prize.reward_type === "porcentagem" ? `${prize.reward_value}%`
    : prize.reward_type === "frete"       ? "Frete grátis"
    : prize.reward_value

  return `${range} — ${reward}`
}

const medalEmoji = (pos: number) =>
  pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : "🏅"

function PositionBadge({ pos }: { pos: number }) {
  const base = "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
  if (pos === 1) return <span className={cn(base, "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300")}>1</span>
  if (pos === 2) return <span className={cn(base, "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")}>2</span>
  if (pos === 3) return <span className={cn(base, "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300")}>3</span>
  return <span className="text-xs text-muted-foreground font-medium w-6 text-center">{pos}</span>
}

const statusStyle: Record<string, string> = {
  active:    "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  finished:  "bg-muted text-muted-foreground",
  paused:    "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  draft:     "bg-muted text-muted-foreground",
  cancelled: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
}

const statusLabel: Record<string, string> = {
  active: "Ativa", finished: "Encerrada", paused: "Pausada",
  draft: "Rascunho", cancelled: "Cancelada",
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface PrizeRow extends Prize { _id: string }

interface Props {
  initialRanking:       RankingRow[]
  initialCampaigns:     Campaign[]
  connectedInfluencers: ConnectedInfluencer[]
}

const EMPTY_PRIZE: PrizeRow = {
  _id: "1", position_start: 1, position_end: 1, reward_type: "valor", reward_value: "", title: "",
}

// Chave única por cupom: coupon_id quando existe, senão o id do influencer
// (influencer sem cupom nenhum aparece uma vez; com N cupons aparece N vezes)
function infKey(inf: ConnectedInfluencer) {
  return inf.coupon_id ?? inf.id
}


// ── Component ─────────────────────────────────────────────────────────────────

export default function RankingClient({
  initialRanking,
  initialCampaigns,
  connectedInfluencers,
}: Props) {
  const { open } = useSidebar()
  const [isPending, startTransition] = useTransition()
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)

  // Sheet form state
  const [name, setName]           = useState("")
  const [desc, setDesc]           = useState("")
  const [status, setStatus]       = useState("active")
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate]     = useState<Date | undefined>()
  const [prizes, setPrizes]       = useState<PrizeRow[]>([{ ...EMPTY_PRIZE }])
  const [selectedInfs, setSelectedInfs] = useState<string[]>([])
  const [search, setSearch]       = useState("")

  const isEditing = editingCampaign !== null
  const canSave   = name.trim().length > 0 && prizes.length > 0 && selectedInfs.length > 0

  // Cada cupom é uma entrada independente — chave única = coupon_id ?? inf.id
  const filteredInfs = connectedInfluencers.filter(
    (inf) =>
      inf.name?.toLowerCase().includes(search.toLowerCase()) ||
      inf.coupon?.toLowerCase().includes(search.toLowerCase())
  )

  function addPrize() {
    setPrizes((p) => [
      ...p,
      { _id: String(Date.now()), position_start: 1, position_end: 1, reward_type: "valor", reward_value: "", title: "" },
    ])
  }

  function removePrize(id: string) {
    setPrizes((p) => p.filter((r) => r._id !== id))
  }

  function updatePrize(id: string, field: keyof Prize, value: string | number) {
    setPrizes((p) => p.map((r) => r._id === id ? { ...r, [field]: value } : r))
  }

  function toggleInf(key: string) {
    setSelectedInfs((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    )
  }

  function resetSheet() {
    setSheetOpen(false)
    setEditingCampaign(null)
    setName("")
    setDesc("")
    setStatus("active")
    setStartDate(undefined)
    setEndDate(undefined)
    setPrizes([{ ...EMPTY_PRIZE }])
    setSelectedInfs([])
    setSearch("")
  }

  function openEdit(campaign: Campaign) {
    const parsed = parsePrizes(campaign.prizes)
    setEditingCampaign(campaign)
    setName(campaign.name ?? "")
    setDesc(campaign.description ?? "")
    setStatus(campaign.status ?? "active")
    setStartDate(campaign.starts_at ? new Date(campaign.starts_at) : undefined)
    setEndDate(campaign.ends_at   ? new Date(campaign.ends_at)   : undefined)
    setPrizes(
      parsed.length > 0
        ? parsed.map((p, i) => ({ ...p, _id: String(i + 1) }))
        : [{ ...EMPTY_PRIZE }]
    )
    // Pré-seleciona por coupon_id (UUID direto, mais confiável que coupon_code)
    const keys: string[] = []
    for (const r of campaign.ranking ?? []) {
      const match = r.coupon_id
        ? connectedInfluencers.find((i) => i.coupon_id === r.coupon_id)
        : connectedInfluencers.find((i) => i.id === r.influencer_id && !i.coupon_id)
      if (match) keys.push(infKey(match))
    }
    setSelectedInfs(keys)
    setSearch("")
    setSheetOpen(true)
  }

  async function handleDelete(id: string) {
    await deleteCampaign(id)
    setCampaigns((prev) => prev.filter((c) => c.id !== id))
  }

  function handleSave() {
    if (!canSave) return
    startTransition(async () => {
      const prizesPayload = prizes.map(({ _id, ...rest }) => rest)

      if (isEditing && editingCampaign) {
        const influencersPayload = selectedInfs.map((key) => {
          const inf = connectedInfluencers.find((i) => infKey(i) === key)
          return { influencer_id: inf?.id ?? "", coupon_id: inf?.coupon_id ?? "" }
        }).filter((p) => p.influencer_id)
        const result = await updateCampaign({
          id:          editingCampaign.id,
          name,
          description: desc,
          starts_at:   startDate ? startDate.toISOString() : null,
          ends_at:     endDate   ? endDate.toISOString()   : null,
          prizes:      prizesPayload,
          status,
          influencers: influencersPayload,
        })
        if (result?.success) {
          setCampaigns((prev) => prev.map((c) =>
            c.id === editingCampaign.id
              ? {
                  ...c,
                  name,
                  description: desc || null,
                  starts_at:   startDate ? startDate.toISOString() : null,
                  ends_at:     endDate   ? endDate.toISOString()   : null,
                  prizes:      JSON.stringify(prizesPayload),
                  status,
                }
              : c
          ))
        }
      } else {
        const influencersPayload = selectedInfs.map((key) => {
          const inf = connectedInfluencers.find((i) => infKey(i) === key)
          return { influencer_id: inf?.id ?? "", coupon_id: inf?.coupon_id ?? "" }
        }).filter((p) => p.influencer_id)
        const result = await createCampaign({
          name,
          description: desc,
          starts_at:   startDate ? startDate.toISOString() : null,
          ends_at:     endDate   ? endDate.toISOString()   : null,
          prizes:      prizesPayload,
          influencers: influencersPayload,
        })
        if (result?.success) {
          setCampaigns((prev) => [
            {
              id:          result.id,
              name,
              description: desc || null,
              starts_at:   startDate ? startDate.toISOString() : null,
              ends_at:     endDate   ? endDate.toISOString()   : null,
              status:      "active",
              prizes:      JSON.stringify(prizesPayload),
              ranking:     [],
            },
            ...prev,
          ])
        }
      }

      resetSheet()
    })
  }

  return (
    <div className="flex flex-col gap-6 p-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!open && <SidebarTrigger size="lg" />}
          <span className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
            Ranking
          </span>
        </div>
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Criar Campanha
        </Button>
      </div>

      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral">Ranking Geral</TabsTrigger>
          <TabsTrigger value="campanhas">
            Campanhas
            {campaigns.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-primary text-primary-foreground rounded-full px-1.5">
                {campaigns.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Ranking Geral ── */}
        <TabsContent value="geral" className="mt-4">
          <Card>
            {initialRanking.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Trophy className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma venda registrada ainda</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px] text-xs">#</TableHead>
                    <TableHead className="text-xs">Influencer</TableHead>
                    <TableHead className="text-xs text-right">Pedidos</TableHead>
                    <TableHead className="text-xs text-right">Vendas</TableHead>
                    <TableHead className="text-xs text-right">Comissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialRanking.map((inf, i) => (
                    <TableRow
                      key={inf.influencer_id}
                      className={cn(
                        "hover:bg-muted/50",
                        i === 0 && "border-l-2 border-l-yellow-400",
                        i === 1 && "border-l-2 border-l-slate-400",
                        i === 2 && "border-l-2 border-l-orange-400"
                      )}
                    >
                      <TableCell><PositionBadge pos={i + 1} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {inf.avatar_url && <AvatarImage src={`${process.env.NEXT_PUBLIC_BUCKET_URL}${inf.avatar_url}`} />}
                            <AvatarFallback className="text-[10px] font-medium">
                              {initials(inf.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex items-center gap-1.5">
                            {i === 0 && <Crown className="h-3.5 w-3.5 text-yellow-500" />}
                            <span className="text-sm font-medium">{inf.name ?? "—"}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {inf.total_orders}
                      </TableCell>
                      <TableCell className="text-right text-sm">{brl(inf.total_sales)}</TableCell>
                      <TableCell className="text-right text-sm font-medium text-green-400">
                        {brl(inf.total_commission)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* ── Campanhas ── */}
        <TabsContent value="campanhas" className="mt-4">
          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Trophy className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma campanha criada ainda</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setSheetOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Criar primeira campanha
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {campaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Sheet: Criar / Editar Campanha ── */}
      <Sheet open={sheetOpen} onOpenChange={(o) => { if (!o) resetSheet(); else setSheetOpen(true) }}>
        <SheetContent className="sm:max-w-[520px] overflow-hidden">
          <SheetHeader>
            <SheetTitle>{isEditing ? "Editar Campanha" : "Criar Campanha"}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 space-y-5 pb-2">

            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                placeholder="Ex: Black Friday 2025"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>

            {/* Status — apenas no modo edição */}
            {isEditing && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativa</SelectItem>
                    <SelectItem value="paused">Pausada</SelectItem>
                    <SelectItem value="finished">Encerrada</SelectItem>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Período */}
            <div className="space-y-1.5">
              <Label>Período</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("flex-1 justify-start font-normal text-sm", !startDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {startDate ? format(startDate, "dd/MM/yyyy") : "Início"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("flex-1 justify-start font-normal text-sm", !endDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {endDate ? format(endDate, "dd/MM/yyyy") : "Fim"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Prêmios */}
            <div className="space-y-2">
              <Label>Prêmios</Label>
              <div className="space-y-2">
                {prizes.map((prize) => (
                  <div key={prize._id} className="flex flex-col gap-2 p-3 rounded-lg border bg-card">
                    <Input
                      placeholder="Título do prêmio (ex: Campeão de vendas)"
                      value={prize.title}
                      onChange={(e) => updatePrize(prize._id, "title", e.target.value)}
                      className="h-8 text-xs"
                    />
                    <div className="flex items-start gap-2">
                      <div className="grid grid-cols-2 gap-1.5 w-[130px] shrink-0">
                        <div>
                          <span className="text-[10px] text-muted-foreground">De</span>
                          <Input
                            type="number"
                            min={1}
                            value={prize.position_start}
                            onChange={(e) => updatePrize(prize._id, "position_start", Number(e.target.value))}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground">Até</span>
                          <Input
                            type="number"
                            min={1}
                            value={prize.position_end}
                            onChange={(e) => updatePrize(prize._id, "position_end", Number(e.target.value))}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <Select
                          value={prize.reward_type}
                          onValueChange={(v) => updatePrize(prize._id, "reward_type", v)}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="valor">Valor em R$</SelectItem>
                            <SelectItem value="porcentagem">Porcentagem</SelectItem>
                            <SelectItem value="produto">Produto</SelectItem>
                            <SelectItem value="frete">Frete grátis</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Valor / Descrição"
                          value={prize.reward_value}
                          onChange={(e) => updatePrize(prize._id, "reward_value", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 mt-4"
                        onClick={() => removePrize(prize._id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addPrize}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Adicionar prêmio
              </Button>
            </div>

            {/* Influencers */}
            <div className="space-y-2">
              <Label>Influencers participantes</Label>
              <div className="border rounded-lg">
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  <div className="p-1">
                    {filteredInfs.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">Nenhum influencer encontrado</p>
                    ) : filteredInfs.map((inf) => {
                      const key      = infKey(inf)
                      const selected = selectedInfs.includes(key)
                      return (
                        <div
                          key={key}
                          onClick={() => toggleInf(key)}
                          className={cn(
                            "flex items-center gap-3 w-full rounded-md px-3 py-2 text-left transition-colors cursor-pointer",
                            selected ? "bg-primary/5" : "hover:bg-muted/50"
                          )}
                        >
                          <Checkbox checked={selected} />
                          {inf.coupon && (
                            <Badge variant="secondary" className="font-mono text-xs shrink-0">
                              {inf.coupon}
                            </Badge>
                          )}
                          <Avatar className="h-6 w-6 shrink-0">
                            {inf.avatar_url && <AvatarImage src={`${process.env.NEXT_PUBLIC_BUCKET_URL}${inf.avatar_url}`} />}
                            <AvatarFallback className="text-[9px] font-medium">
                              {initials(inf.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground truncate">
                            {inf.name ?? "—"}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              {selectedInfs.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedInfs.length} influencer{selectedInfs.length > 1 ? "s" : ""} selecionado{selectedInfs.length > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>

          <SheetFooter className="border-t flex-row justify-end">
            <Button variant="outline" onClick={resetSheet} disabled={isPending}>
              Cancelar
            </Button>
            <Button disabled={!canSave || isPending} onClick={handleSave}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Salvar alterações" : "Criar campanha"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ── Campaign Card ─────────────────────────────────────────────────────────────

function CampaignCard({
  campaign,
  onEdit,
  onDelete,
}: {
  campaign: Campaign
  onEdit:   (c: Campaign) => void
  onDelete: (id: string) => Promise<void>
}) {
  const prizes        = parsePrizes(campaign.prizes)
  const status        = campaign.status ?? "draft"
  const [deleteOpen, setDeleteOpen]   = useState(false)
  const [isDeleting, setIsDeleting]   = useState(false)

  async function confirmDelete() {
    setIsDeleting(true)
    await onDelete(campaign.id)
    setIsDeleting(false)
    setDeleteOpen(false)
  }

  return (
    <Card className="p-5 space-y-4">
      {/* Prêmios */}
      {prizes.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Prêmios</p>
          <div className="flex flex-wrap gap-1.5">
            {prizes.map((prize, i) => (
              <Badge key={i} variant="secondary" className="text-xs font-normal py-1">
                {medalEmoji(i + 1)} {prizeLabel(prize)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Ranking da campanha */}
      {campaign.ranking && campaign.ranking.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-8">#</TableHead>
              <TableHead className="text-xs">Influencer</TableHead>
              <TableHead className="text-xs text-right">Vendas</TableHead>
              <TableHead className="text-xs text-right">Comissão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaign.ranking.map((r, i) => (
              <TableRow key={r.coupon_id ?? `${r.influencer_id}-${i}`}>
                <TableCell><PositionBadge pos={i + 1} /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      {r.avatar_url && <AvatarImage src={`${process.env.NEXT_PUBLIC_BUCKET_URL}${r.avatar_url}`} />}
                      <AvatarFallback className="text-[8px] font-medium">
                        {initials(r.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{r.name ?? "—"}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-right">{brl(r.total_sales)}</TableCell>
                <TableCell className="text-xs text-right font-medium text-green-400">
                  {brl(r.total_commission)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-4">Nenhuma venda registrada</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h3 className="font-semibold text-sm">{campaign.name}</h3>
          {(campaign.starts_at || campaign.ends_at) && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {campaign.starts_at
                ? format(new Date(campaign.starts_at), "dd MMM yyyy", { locale: ptBR })
                : "—"}
              {" → "}
              {campaign.ends_at
                ? format(new Date(campaign.ends_at), "dd MMM yyyy", { locale: ptBR })
                : "Sem fim"}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={cn("text-xs", statusStyle[status])}>
            {statusLabel[status] ?? status}
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(campaign)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Confirmação de exclusão */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              A campanha <strong>{campaign.name}</strong> e todos os seus participantes serão removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeleting
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : "Excluir"
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
