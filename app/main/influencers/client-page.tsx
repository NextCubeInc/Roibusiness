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
import { LayoutDashboard, Pen, Plus, Trash2, Loader2, Clock, X } from "lucide-react"
import { useState, useTransition } from "react"
import { getInfluencerByCode, setBusinessInfluencer, cancelInvite, addCoupon, toggleCoupon, deleteCoupon, getPendingInvites } from "./actions"
import type { PendingInvite } from "./actions"
import getInfluencersData from "./actions"

// ── Types ─────────────────────────────────────────────────────────────────────

type Coupon = {
  id:         string
  code:       string | null
  is_active:  boolean
  commission: number | null
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

function monthOptions() {
  const opts: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    opts.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
  }
  return opts
}

const MONTHS = monthOptions()
const CURRENT_MONTH = MONTHS[0].value

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
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH)

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
  const [loadingCoupon, setLoadingCoupon] = useState(false)

  // Edição de comissão inline
  const [editingCommission, setEditingCommission] = useState<{ coupon_id: string; value: string } | null>(null)

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

  function handleMonthChange(month: string) {
    setSelectedMonth(month)
    startTransition(async () => {
      const data = await getInfluencersData(month)
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
    const result = await addCoupon(editId, newCouponCode.trim().toUpperCase(), newCommission ?? 0)
    if (result.success && result.id) {
      localUpdateCoupons(editId, prev => [
        ...prev,
        { id: result.id!, code: newCouponCode.trim().toUpperCase(), is_active: true, commission: newCommission }
      ])
      setNewCouponCode("")
      setNewCommission(0)
    }
    setLoadingCoupon(false)
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
              <div className="flex flex-col gap-2">
                <Label>Cupons cadastrados</Label>
                {(editingInfluencer.coupons ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum cupom cadastrado.</p>
                )}
                {(editingInfluencer.coupons ?? []).map(c => (
                  <div key={c.id} className="flex items-center justify-between border rounded-md px-3 py-2 gap-3">
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <span className="font-mono text-sm font-medium">{text(c.code)}</span>
                      <div className="flex items-center gap-1.5">
                        {editingCommission?.coupon_id === c.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number" min={0} max={100}
                              className="h-6 w-16 text-xs px-2"
                              value={editingCommission.value}
                              onChange={e => setEditingCommission({ coupon_id: c.id, value: e.target.value })}
                              autoFocus
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                            <Button size="sm" className="h-6 px-2 text-xs" onClick={async () => {
                              const newVal = Number(editingCommission.value)
                              localUpdateCoupons(editId!, prev =>
                                prev.map(x => x.id === c.id ? { ...x, commission: newVal } : x)
                              )
                              setEditingCommission(null)
                            }}>OK</Button>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs"
                              onClick={() => setEditingCommission(null)}>✕</Button>
                          </div>
                        ) : (
                          <button className="flex items-center gap-1 group"
                            onClick={() => setEditingCommission({ coupon_id: c.id, value: String(c.commission ?? 0) })}>
                            <span className="text-xs text-muted-foreground">
                              {c.commission != null ? `${c.commission}% comissão` : "Sem comissão"}
                            </span>
                            <Pen size={10} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={c.is_active} onCheckedChange={() => handleToggleCoupon(c)} />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteCoupon(c.id)}>
                        <Trash2 size={14} color="#C62828" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <Label>Adicionar cupom</Label>
                <Input
                  placeholder="Ex: GABRIEL10"
                  value={newCouponCode}
                  onChange={e => setNewCouponCode(e.target.value.toUpperCase())}
                  className="font-mono"
                  onKeyDown={e => e.key === "Enter" && handleAddCoupon()}
                />
                <div className="flex gap-2">
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
                  <Button onClick={handleAddCoupon} disabled={loadingCoupon || !newCouponCode.trim()}>
                    {loadingCoupon ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  </Button>
                </div>
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
        <div className="flex gap-3">
          <Input
            placeholder="Buscar influencer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={selectedMonth} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground self-center" />}
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
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4" color="#C62828" />
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