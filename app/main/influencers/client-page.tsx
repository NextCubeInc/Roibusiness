"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { LayoutDashboard, Pen, Plus, Trash2, Loader2, Clock, X, CalendarIcon } from "lucide-react"
import { useState, useTransition } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { getInfluencerByCode, setBusinessInfluencer, cancelInvite, addCoupon, addCouponCommission, updateCouponCommission, deleteCouponCommission, toggleCoupon, deleteCoupon, removeBusinessInfluencer, getPendingInvites } from "./actions"
import type { PendingInvite } from "./actions"
import getInfluencersData from "./actions"

// ── Types ─────────────────────────────────────────────────────────────────────

type CommissionPeriod = {
  id:         string
  percent:    number | null
  valid_from: string | null   // ISO timestamptz
  valid_to:   string | null   // null = ativo (sem fim)
}

type Coupon = {
  id:          string
  code:        string | null
  is_active:   boolean
  commission:  number | null          // comissão ativa (para exibição na tabela)
  commissions: CommissionPeriod[]     // todos os períodos
}

type InfluencerRow = {
  influencer_id: string
  name:          string | null
  instagram:     string | null
  avatar_url:    string | null
  coupons:       Coupon[] | null
  vendas_mes:    number | null
  comissao_mes:  number | null
}

type InviteError = "duplicate_invite" | "not_found" | "unknown" | null

// ── Helpers ───────────────────────────────────────────────────────────────────

const brl = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const text = (v: string | null | undefined) => v ?? ""

const avatarSrc = (v: string | null | undefined) =>
  v ? `${process.env.NEXT_PUBLIC_BUCKET_URL ?? ""}${v}` : undefined

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric"
  })
}

const MONTH_NAMES = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
]

function yearOptions() {
  const now = new Date()
  const opts: { value: string }[] = []
  for (let i = 0; i < 5; i++) {
    opts.push({ value: String(now.getFullYear() - i) })
  }
  return opts
}

const YEARS = yearOptions()
const NOW   = new Date()
const CURRENT_MONTH_NUM = String(NOW.getMonth() + 1).padStart(2, "0")
const CURRENT_YEAR      = String(NOW.getFullYear())
const CURRENT_MONTH     = `${CURRENT_YEAR}-${CURRENT_MONTH_NUM}`

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClientPage({
  influencers: initialInfluencers,
  pendingInvites: initialPending,
}: {
  influencers:   InfluencerRow[]
  pendingInvites: PendingInvite[]
}) {
  const { open } = useSidebar()
  const [isPending, startTransition] = useTransition()

  const [influencers, setInfluencers]   = useState<InfluencerRow[]>(initialInfluencers)
  const [pending, setPending]           = useState<PendingInvite[]>(initialPending)
  const [selectedMonthNum, setSelectedMonthNum] = useState(CURRENT_MONTH_NUM)
  const [selectedYear, setSelectedYear]         = useState(CURRENT_YEAR)

  // Filtro de período
  const [filterMode, setFilterMode] = useState<"month" | "period">("month")
  const [dateFrom, setDateFrom]     = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo]         = useState<Date | undefined>(undefined)

  // Sheet de convites pendentes
  const [invitesSheetOpen, setInvitesSheetOpen] = useState(false)
  const [cancellingId, setCancellingId]          = useState<string | null>(null)

  // Dialog adicionar influencer
  const [dialogOpen, setDialogOpen]         = useState(false)
  const [code, setCode]                     = useState("")
  const [foundInfluencer, setFoundInfluencer] = useState<{
    name: string | null; instagram: string | null; avatar_url: string | null
  } | null>(null)
  const [inviteError, setInviteError]       = useState<InviteError>(null)
  const [inviteLoading, setInviteLoading]   = useState(false)

  // Sheet editar coupons
  const [editId, setEditId]               = useState<string | null>(null)
  const [newCouponCode, setNewCouponCode] = useState("")
  const [newCommission, setNewCommission] = useState<number>(0)
  const [newCouponFrom, setNewCouponFrom] = useState<Date | undefined>(undefined)
  const [newCouponTo, setNewCouponTo]     = useState<Date | undefined>(undefined)
  const [loadingCoupon, setLoadingCoupon]       = useState(false)
  const [duplicateCouponError, setDuplicateCouponError] = useState(false)

  // Adicionar período de comissão a cupom existente
  const [addingPeriodFor, setAddingPeriodFor]     = useState<string | null>(null)
  const [newPeriodPercent, setNewPeriodPercent]   = useState<number>(0)
  const [newPeriodFrom, setNewPeriodFrom]         = useState<Date | undefined>(undefined)
  const [newPeriodTo, setNewPeriodTo]             = useState<Date | undefined>(undefined)
  const [loadingPeriod, setLoadingPeriod]         = useState(false)

  // Editar período de comissão existente
  type EditingPeriod = { id: string; couponId: string; percent: number; from: Date | undefined; to: Date | undefined }
  const [editingPeriod, setEditingPeriod]         = useState<EditingPeriod | null>(null)
  const [savingPeriod, setSavingPeriod]           = useState(false)

  // Remover influencer
  const [removingInfluencer, setRemovingInfluencer] = useState<string | null>(null)

  const [search, setSearch] = useState("")

  const editingInfluencer = influencers.find(i => i.influencer_id === editId) ?? null

  const searchLower = search.toLowerCase()
  const filtered = influencers.filter(inf =>
    text(inf.name).toLowerCase().includes(searchLower) ||
    text(inf.instagram).toLowerCase().includes(searchLower) ||
    (inf.coupons ?? []).some(c => text(c.code).toLowerCase().includes(searchLower))
  )

  // ── Helpers ────────────────────────────────────────────────────────────────

  function resetDialog() {
    setCode("")
    setFoundInfluencer(null)
    setInviteError(null)
    setInviteLoading(false)
  }

  function localUpdateCoupons(influencer_id: string, updater: (coupons: Coupon[]) => Coupon[]) {
    setInfluencers(prev =>
      prev.map(inf =>
        inf.influencer_id === influencer_id
          ? { ...inf, coupons: updater(inf.coupons ?? []) }
          : inf
      )
    )
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleMonthChange(monthNum: string, year: string) {
    const combined = `${year}-${monthNum}`
    setSelectedMonthNum(monthNum)
    setSelectedYear(year)
    startTransition(async () => {
      const data = await getInfluencersData(combined)
      setInfluencers(data)
    })
  }

  function handleFilterModeChange(mode: "month" | "period") {
    setFilterMode(mode)
    if (mode === "month") {
      // Volta pro mês/ano selecionado
      startTransition(async () => {
        const data = await getInfluencersData(`${selectedYear}-${selectedMonthNum}`)
        setInfluencers(data)
      })
    }
  }

  function handleDateRangeSearch() {
    if (!dateFrom || !dateTo) return
    const from = format(dateFrom, "yyyy-MM-dd")
    const to   = format(dateTo,   "yyyy-MM-dd")
    startTransition(async () => {
      const data = await getInfluencersData(undefined, from, to)
      setInfluencers(data)
    })
  }

  async function handleCodeChange(value: string) {
    setCode(value)
    setInviteError(null)
    if (value.length === 8) {
      const formatted = `${value.slice(0, 4)}-${value.slice(4)}`
      const result = await getInfluencerByCode(formatted)
      setFoundInfluencer(result)
    } else {
      setFoundInfluencer(null)
    }
  }

  async function handleAddInfluencer() {
    if (!foundInfluencer) return
    setInviteLoading(true)
    setInviteError(null)

    const result = await setBusinessInfluencer(code)

    if (result.success) {
      setDialogOpen(false)
      resetDialog()
      // Recarrega pendentes
      const fresh = await getPendingInvites()
      setPending(fresh)
      // Abre a sheet de pendentes pra mostrar o novo convite
      setInvitesSheetOpen(true)
    } else {
      setInviteError((result.error as InviteError) ?? "unknown")
    }

    setInviteLoading(false)
  }

  async function handleCancelInvite(influencer_id: string) {
    setCancellingId(influencer_id)
    await cancelInvite(influencer_id)
    setPending(prev => prev.filter(i => i.influencer_id !== influencer_id))
    setCancellingId(null)
  }

  async function handleAddCoupon() {
    if (!editId || !newCouponCode.trim()) return
    setLoadingCoupon(true)
    setDuplicateCouponError(false)
    const result = await addCoupon(
      editId,
      newCouponCode.trim().toUpperCase(),
      newCommission ?? 0,
      newCouponFrom ? newCouponFrom.toISOString() : undefined,
      newCouponTo   ? newCouponTo.toISOString()   : undefined,
    )
    if (result.success) {
      setNewCouponCode("")
      setNewCommission(0)
      setNewCouponFrom(undefined)
      setNewCouponTo(undefined)
      const data = await getInfluencersData(`${selectedYear}-${selectedMonthNum}`)
      setInfluencers(data)
    } else if (result.error?.includes("duplicate_coupon")) {
      setDuplicateCouponError(true)
    }
    setLoadingCoupon(false)
  }

  async function handleAddPeriod(couponId: string) {
    setLoadingPeriod(true)
    const result = await addCouponCommission(
      couponId,
      newPeriodPercent,
      newPeriodFrom ? newPeriodFrom.toISOString() : undefined,
      newPeriodTo   ? newPeriodTo.toISOString()   : undefined,
    )
    if (result.success) {
      setAddingPeriodFor(null)
      setNewPeriodPercent(0)
      setNewPeriodFrom(undefined)
      setNewPeriodTo(undefined)
      const data = await getInfluencersData(`${selectedYear}-${selectedMonthNum}`)
      setInfluencers(data)
    }
    setLoadingPeriod(false)
  }

  async function handleSavePeriod() {
    if (!editingPeriod) return
    setSavingPeriod(true)
    const result = await updateCouponCommission(
      editingPeriod.id,
      editingPeriod.percent,
      editingPeriod.from ? editingPeriod.from.toISOString() : undefined,
      editingPeriod.to   ? editingPeriod.to.toISOString()   : undefined,
    )
    if (result.success) {
      setInfluencers(prev =>
        prev.map(inf => ({
          ...inf,
          coupons: (inf.coupons ?? []).map(c =>
            c.id === editingPeriod.couponId
              ? {
                  ...c,
                  commissions: (c.commissions ?? []).map(p =>
                    p.id === editingPeriod.id
                      ? {
                          ...p,
                          percent:    editingPeriod.percent,
                          valid_from: editingPeriod.from?.toISOString() ?? null,
                          valid_to:   editingPeriod.to?.toISOString()   ?? null,
                        }
                      : p
                  ),
                }
              : c
          ),
        }))
      )
      setEditingPeriod(null)
    }
    setSavingPeriod(false)
  }

  async function handleDeletePeriod(couponId: string, commissionId: string) {
    await deleteCouponCommission(commissionId)
    setInfluencers(prev =>
      prev.map(inf => ({
        ...inf,
        coupons: (inf.coupons ?? []).map(c =>
          c.id === couponId
            ? { ...c, commissions: (c.commissions ?? []).filter(p => p.id !== commissionId) }
            : c
        ),
      }))
    )
  }

  async function handleToggleCoupon(coupon: Coupon) {
    if (!editId) return
    await toggleCoupon(coupon.id, !coupon.is_active)
    localUpdateCoupons(editId, prev =>
      prev.map(c => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c)
    )
  }

  async function handleDeleteCoupon(coupon_id: string) {
    if (!editId) return
    await deleteCoupon(coupon_id)
    localUpdateCoupons(editId, prev => prev.filter(c => c.id !== coupon_id))
  }

  async function handleRemoveInfluencer(influencer_id: string) {
    setRemovingInfluencer(influencer_id)
    await removeBusinessInfluencer(influencer_id)
    setInfluencers(prev => prev.filter(i => i.influencer_id !== influencer_id))
    setRemovingInfluencer(null)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-3 h-fit">

      {/* ── Sheet de convites pendentes ── */}
      <Sheet open={invitesSheetOpen} onOpenChange={setInvitesSheetOpen}>
        <SheetContent className="flex flex-col gap-4 p-4">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Clock size={16} className="text-yellow-500" />
              Convites pendentes
            </SheetTitle>
            <SheetDescription>
              Estes influencers ainda não aceitaram o convite.
            </SheetDescription>
          </SheetHeader>

          {pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-2 text-center py-16">
              <Clock size={32} className="text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nenhum convite pendente.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto flex-1">
              {pending.map(inv => (
                <div
                  key={inv.influencer_id}
                  className="flex items-center gap-3 border rounded-lg px-3 py-3"
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={avatarSrc(inv.avatar_url)} />
                    <AvatarFallback className="text-xs font-semibold">
                      {text(inv.name).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{text(inv.name)}</p>
                    <p className="text-xs text-muted-foreground truncate">{text(inv.instagram)}</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                      Convidado em {formatDate(inv.invited_at)}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    disabled={cancellingId === inv.influencer_id}
                    onClick={() => handleCancelInvite(inv.influencer_id)}
                  >
                    {cancellingId === inv.influencer_id
                      ? <Loader2 size={14} className="animate-spin" />
                      : <X size={14} />
                    }
                  </Button>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Sheet de editar coupons ── */}
      <Sheet open={!!editId} onOpenChange={() => setEditId(null)}>
        <SheetContent className="flex flex-col gap-6 p-4">
          <SheetHeader>
            <SheetTitle>
              {editingInfluencer ? `Cupons de ${text(editingInfluencer.name)}` : "Cupons"}
            </SheetTitle>
          </SheetHeader>

          {editingInfluencer && (
            <div className="flex flex-col gap-6 overflow-y-auto flex-1">

              {/* ── Lista de cupons ── */}
              <div className="flex flex-col gap-3">
                <Label>Cupons cadastrados</Label>
                {(editingInfluencer.coupons ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum cupom cadastrado.</p>
                )}
                {(editingInfluencer.coupons ?? []).map(c => (
                  <div key={c.id} className="flex flex-col border rounded-lg overflow-hidden">

                    {/* Cabeçalho do cupom */}
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                      <span className="font-mono text-sm font-semibold">{text(c.code)}</span>
                      <div className="flex items-center gap-2">
                        <Switch checked={c.is_active} onCheckedChange={() => handleToggleCoupon(c)} />
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => handleDeleteCoupon(c.id)}
                        >
                          <Trash2 size={13} color="#C62828" />
                        </Button>
                      </div>
                    </div>

                    {/* Períodos de comissão */}
                    <div className="flex flex-col divide-y">
                      {(c.commissions ?? []).length === 0 && (
                        <p className="text-xs text-muted-foreground px-3 py-2">Sem períodos cadastrados.</p>
                      )}
                      {(c.commissions ?? []).map(p => (
                        <div key={p.id} className="flex flex-col border-b last:border-b-0">
                          {editingPeriod?.id === p.id ? (
                            /* ── Modo edição ── */
                            <div className="flex flex-col gap-2 px-3 py-3 bg-muted/20">
                              <div className="flex gap-2 items-center">
                                <div className="relative w-24">
                                  <Input
                                    type="number" min={0} max={100}
                                    className="font-mono pr-6 h-8 text-sm"
                                    value={editingPeriod.percent}
                                    onChange={e => setEditingPeriod(prev => prev ? { ...prev, percent: Number(e.target.value) } : null)}
                                    autoFocus
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                                </div>

                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" className="h-8 px-2 text-xs font-normal justify-start min-w-[110px]">
                                      <CalendarIcon className="mr-1.5 h-3 w-3 text-muted-foreground shrink-0" />
                                      {editingPeriod.from
                                        ? format(editingPeriod.from, "dd/MM/yyyy")
                                        : <span className="text-muted-foreground">De</span>
                                      }
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={editingPeriod.from}
                                      onSelect={d => setEditingPeriod(prev => prev ? { ...prev, from: d } : null)}
                                      locale={ptBR}
                                    />
                                  </PopoverContent>
                                </Popover>

                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" className="h-8 px-2 text-xs font-normal justify-start min-w-[110px]">
                                      <CalendarIcon className="mr-1.5 h-3 w-3 text-muted-foreground shrink-0" />
                                      {editingPeriod.to
                                        ? format(editingPeriod.to, "dd/MM/yyyy")
                                        : <span className="text-muted-foreground">Até</span>
                                      }
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={editingPeriod.to}
                                      onSelect={d => setEditingPeriod(prev => prev ? { ...prev, to: d } : null)}
                                      locale={ptBR}
                                      disabled={(d) => editingPeriod.from ? d < editingPeriod.from : false}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>

                              <div className="flex gap-2">
                                <Button size="sm" className="flex-1 h-8" onClick={handleSavePeriod} disabled={savingPeriod}>
                                  {savingPeriod ? <Loader2 size={14} className="animate-spin" /> : "Salvar"}
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingPeriod(null)}>
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            /* ── Modo leitura ── */
                            <div className="flex items-center justify-between px-3 py-2 gap-2">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-medium">{p.percent ?? 0}%</span>
                                <span className="text-[11px] text-muted-foreground">
                                  {p.valid_from
                                    ? format(new Date(p.valid_from), "dd/MM/yyyy", { locale: ptBR })
                                    : "Início"
                                  }
                                  {" → "}
                                  {p.valid_to
                                    ? format(new Date(p.valid_to), "dd/MM/yyyy", { locale: ptBR })
                                    : <span className="text-green-500 font-medium">em aberto</span>
                                  }
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => setEditingPeriod({
                                    id:       p.id,
                                    couponId: c.id,
                                    percent:  p.percent ?? 0,
                                    from:     p.valid_from ? new Date(p.valid_from) : undefined,
                                    to:       p.valid_to   ? new Date(p.valid_to)   : undefined,
                                  })}
                                >
                                  <Pen size={12} className="text-muted-foreground" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => handleDeletePeriod(c.id, p.id)}
                                >
                                  <Trash2 size={13} color="#C62828" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Form de novo período */}
                      {addingPeriodFor === c.id ? (
                        <div className="flex flex-col gap-2 px-3 py-3 bg-muted/20">
                          <div className="flex gap-2 items-center">
                            <div className="relative w-24">
                              <Input
                                type="number" min={0} max={100}
                                className="font-mono pr-6 h-8 text-sm"
                                placeholder="0"
                                value={newPeriodPercent}
                                onChange={e => setNewPeriodPercent(Number(e.target.value))}
                                autoFocus
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                            </div>

                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="h-8 px-2 text-xs font-normal justify-start min-w-[110px]">
                                  <CalendarIcon className="mr-1.5 h-3 w-3 text-muted-foreground shrink-0" />
                                  {newPeriodFrom
                                    ? format(newPeriodFrom, "dd/MM/yyyy")
                                    : <span className="text-muted-foreground">De</span>
                                  }
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={newPeriodFrom} onSelect={setNewPeriodFrom} locale={ptBR} />
                              </PopoverContent>
                            </Popover>

                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="h-8 px-2 text-xs font-normal justify-start min-w-[110px]">
                                  <CalendarIcon className="mr-1.5 h-3 w-3 text-muted-foreground shrink-0" />
                                  {newPeriodTo
                                    ? format(newPeriodTo, "dd/MM/yyyy")
                                    : <span className="text-muted-foreground">Até</span>
                                  }
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single" selected={newPeriodTo} onSelect={setNewPeriodTo} locale={ptBR}
                                  disabled={(d) => newPeriodFrom ? d < newPeriodFrom : false}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm" className="flex-1 h-8"
                              onClick={() => handleAddPeriod(c.id)}
                              disabled={loadingPeriod}
                            >
                              {loadingPeriod ? <Loader2 size={14} className="animate-spin" /> : "Salvar período"}
                            </Button>
                            <Button
                              size="sm" variant="ghost" className="h-8"
                              onClick={() => { setAddingPeriodFor(null); setNewPeriodPercent(0); setNewPeriodFrom(undefined); setNewPeriodTo(undefined) }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors text-left"
                          onClick={() => { setAddingPeriodFor(c.id); setNewPeriodPercent(0); setNewPeriodFrom(undefined); setNewPeriodTo(undefined) }}
                        >
                          <Plus size={12} />
                          Adicionar período
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Adicionar cupom ── */}
              <div className="flex flex-col gap-2">
                <Label>Adicionar cupom</Label>
                <Input
                  placeholder="Ex: GABRIEL10"
                  value={newCouponCode}
                  onChange={e => { setNewCouponCode(e.target.value.toUpperCase()); setDuplicateCouponError(false) }}
                  className={`font-mono ${duplicateCouponError ? "border-destructive" : ""}`}
                />
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Comissão %"
                      value={newCommission}
                      onChange={e => setNewCommission(Number(e.target.value))}
                      className="font-mono pr-6"
                      type="number" min={0} max={100}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start font-normal text-sm h-9">
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {newCouponFrom ? format(newCouponFrom, "dd/MM/yyyy") : <span className="text-muted-foreground">De (opcional)</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={newCouponFrom} onSelect={setNewCouponFrom} locale={ptBR} />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start font-normal text-sm h-9">
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {newCouponTo ? format(newCouponTo, "dd/MM/yyyy") : <span className="text-muted-foreground">Até (opcional)</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single" selected={newCouponTo} onSelect={setNewCouponTo} locale={ptBR}
                        disabled={(d) => newCouponFrom ? d < newCouponFrom : false}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {duplicateCouponError && (
                  <p className="text-xs text-destructive">
                    Este código já está cadastrado nesta conta.
                  </p>
                )}

                <Button
                  onClick={handleAddCoupon}
                  disabled={loadingCoupon || !newCouponCode.trim()}
                  className="w-full"
                >
                  {loadingCoupon ? <Loader2 size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
                  Adicionar cupom
                </Button>
              </div>

            </div>
          )}
        </SheetContent>
      </Sheet>

      <div className="flex flex-col gap-6">

        {/* ── Header ── */}
        <div className="flex flex-row justify-between items-center">
          <div className="flex flex-row gap-2 items-center">
            {!open && <SidebarTrigger size="lg" />}
            <label className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
              Influencers
            </label>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão de convites pendentes */}
            <Button
              variant="outline"
              size="sm"
              className="relative"
              onClick={() => setInvitesSheetOpen(true)}
            >
              <Clock className="h-4 w-4 mr-1.5" />
              Convites
              {pending.length > 0 && (
                <Badge
                  className="absolute -top-2 -right-2 h-5 min-w-5 px-1 text-[10px] bg-yellow-500 hover:bg-yellow-500 text-white border-0"
                >
                  {pending.length}
                </Badge>
              )}
            </Button>

            {/* Dialog adicionar */}
            <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetDialog() }}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Adicionar Influencer
                </Button>
              </DialogTrigger>

              <DialogContent className="flex flex-col justify-center items-center gap-4">
                <DialogHeader>
                  <DialogTitle>Adicionar Influencer</DialogTitle>
                  <DialogDescription>
                    Digite o código do influencer para conectá-lo à sua conta.
                  </DialogDescription>
                </DialogHeader>

                <InputOTP maxLength={8} value={code} onChange={handleCodeChange}>
                  <InputOTPGroup>
                    {[0,1,2,3].map(i => <InputOTPSlot key={i} index={i} className="h-10 w-10 text-lg" />)}
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    {[4,5,6,7].map(i => <InputOTPSlot key={i} index={i} className="h-10 w-10 text-lg" />)}
                  </InputOTPGroup>
                </InputOTP>

                {inviteError === "duplicate_invite" && (
                  <div className="w-full rounded-md bg-yellow-500/10 border border-yellow-500/30 px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400">
                    ⚠️ Este influencer já foi convidado para sua conta.
                  </div>
                )}
                {inviteError === "not_found" && (
                  <div className="w-full rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                    Código inválido. Verifique e tente novamente.
                  </div>
                )}
                {inviteError === "unknown" && (
                  <div className="w-full rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                    Ocorreu um erro inesperado. Tente novamente.
                  </div>
                )}

                {foundInfluencer && (
                  <>
                    <Card className="w-full p-4 border-success/30">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={avatarSrc(foundInfluencer.avatar_url)} />
                          <AvatarFallback className="text-sm font-semibold">
                            {text(foundInfluencer.name).slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-lg font-semibold">{text(foundInfluencer.name)}</p>
                          <p className="text-sm text-muted-foreground">{text(foundInfluencer.instagram)}</p>
                        </div>
                      </div>
                    </Card>
                    <Button className="w-full" onClick={handleAddInfluencer}
                      disabled={inviteLoading || !!inviteError}>
                      {inviteLoading && <Loader2 size={16} className="animate-spin mr-2" />}
                      Adicionar
                    </Button>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* ── Filtros ── */}
        <div className="flex flex-col gap-3">

          {/* Toggle de modo */}
          <div className="flex items-center gap-5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="filter-mode"
                checked={filterMode === "month"}
                onChange={() => handleFilterModeChange("month")}
                className="accent-primary"
              />
              <span className="text-sm text-muted-foreground">Mês / Ano</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="filter-mode"
                checked={filterMode === "period"}
                onChange={() => handleFilterModeChange("period")}
                className="accent-primary"
              />
              <span className="text-sm text-muted-foreground">Período personalizado</span>
            </label>
          </div>

          {/* Inputs */}
          <div className="flex gap-3 items-center flex-wrap">
            <Input
              placeholder="Buscar influencer..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-xs"
            />

            {filterMode === "month" ? (
              <div className="flex gap-2">
                <Select
                  value={selectedMonthNum}
                  onValueChange={v => handleMonthChange(v, selectedYear)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={selectedYear}
                  onValueChange={v => handleMonthChange(selectedMonthNum, v)}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map(y => (
                      <SelectItem key={y.value} value={y.value}>{y.value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {/* De */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[150px] justify-start font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                      {dateFrom
                        ? format(dateFrom, "dd/MM/yyyy")
                        : <span className="text-muted-foreground">De</span>
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      locale={ptBR}
                      disabled={(d) => d > new Date()}
                    />
                  </PopoverContent>
                </Popover>

                <span className="text-sm text-muted-foreground">até</span>

                {/* Até */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[150px] justify-start font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                      {dateTo
                        ? format(dateTo, "dd/MM/yyyy")
                        : <span className="text-muted-foreground">Até</span>
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      locale={ptBR}
                      disabled={(d) => d > new Date() || (dateFrom ? d < dateFrom : false)}
                    />
                  </PopoverContent>
                </Popover>

                <Button
                  size="sm"
                  onClick={handleDateRangeSearch}
                  disabled={!dateFrom || !dateTo || isPending}
                >
                  {isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : "Filtrar"
                  }
                </Button>
              </div>
            )}

            {isPending && filterMode === "month" && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground self-center" />
            )}
          </div>
        </div>

        {/* ── Tabela ── */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Influencer</TableHead>
              <TableHead>Cupons</TableHead>
              <TableHead>Vendas</TableHead>
              <TableHead>Comissão</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={isPending ? "opacity-50 pointer-events-none" : ""}>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-12">
                  Nenhum influencer encontrado
                </TableCell>
              </TableRow>
            ) : filtered.map(inf => (
              <TableRow key={inf.influencer_id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={avatarSrc(inf.avatar_url)} />
                      <AvatarFallback className="text-xs font-semibold">
                        {text(inf.name).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{text(inf.name)}</p>
                      <p className="text-xs text-muted-foreground">{text(inf.instagram)}</p>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {[...new Map((inf.coupons ?? []).map(c => [c.id, c])).values()].map(c => (
                      <span key={c.id} className={`text-xs px-2 py-0.5 rounded-full border font-mono ${
                        c.is_active
                          ? "border-green-500 text-green-600 dark:text-green-400"
                          : "border-muted text-muted-foreground"
                      }`}>
                        {text(c.code)}
                        {c.commission != null && (
                          <span className="ml-1 text-[10px] opacity-60">{c.commission}%</span>
                        )}
                      </span>
                    ))}
                    {(inf.coupons ?? []).length === 0 && (
                      <span className="text-xs text-muted-foreground">Nenhum</span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-sm">{brl(inf.vendas_mes)}</TableCell>
                <TableCell className="text-sm font-medium text-green-400">{brl(inf.comissao_mes)}</TableCell>

                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" disabled><LayoutDashboard className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditId(inf.influencer_id)}>
                    <Pen className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    disabled={removingInfluencer === inf.influencer_id}
                    onClick={() => handleRemoveInfluencer(inf.influencer_id)}
                  >
                    {removingInfluencer === inf.influencer_id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Trash2 className="h-4 w-4" color="#C62828" />
                    }
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}