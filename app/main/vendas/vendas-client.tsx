"use client"

import { useState, useTransition, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { Download, PackageOpen, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { getBusinessOrders, type OrderRow, type OrdersSummary } from "./actions"

const PAGE_SIZE = 15

// ── Helpers ───────────────────────────────────────────────────────────────────

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

function initials(name: string | null) {
  if (!name) return "?"
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  initialOrders: OrderRow[]
  initialSummary: OrdersSummary
  initialTotalOrders: number
  availableCoupons: string[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function VendasClient({
  initialOrders,
  initialSummary,
  initialTotalOrders,
  availableCoupons,
}: Props) {
  const { open } = useSidebar()
  const [isPending, startTransition] = useTransition()

  const [orders, setOrders] = useState<OrderRow[]>(initialOrders)
  const [summary, setSummary] = useState<OrdersSummary>(initialSummary)
  const [totalOrders, setTotalOrders] = useState(initialTotalOrders)

  const [page, setPage] = useState(1)
  const [searchId, setSearchId] = useState("")
  const [coupon, setCoupon] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const totalPages = Math.ceil(totalOrders / PAGE_SIZE)

  const fetch = useCallback(
    (overrides: {
      page?: number
      searchId?: string
      coupon?: string
      dateFrom?: string
      dateTo?: string
    }) => {
      startTransition(async () => {
        const result = await getBusinessOrders({
          page:     overrides.page     ?? page,
          pageSize: PAGE_SIZE,
          searchId: (overrides.searchId ?? searchId) || undefined,
          coupon:   (overrides.coupon  ?? coupon) === "all" ? undefined : (overrides.coupon ?? coupon),
          dateFrom: (overrides.dateFrom ?? dateFrom) || undefined,
          dateTo:   (overrides.dateTo   ?? dateTo)   || undefined,
        })
        setOrders(result.orders)
        setSummary(result.summary)
        setTotalOrders(result.summary.total_orders)
      })
    },
    [page, searchId, coupon, dateFrom, dateTo]
  )

  function handleSearch(value: string) {
    setSearchId(value)
    setPage(1)
    fetch({ page: 1, searchId: value })
  }

  function handleCoupon(value: string) {
    setCoupon(value)
    setPage(1)
    fetch({ page: 1, coupon: value })
  }

  function handleDateFrom(value: string) {
    setDateFrom(value)
    setPage(1)
    fetch({ page: 1, dateFrom: value })
  }

  function handleDateTo(value: string) {
    setDateTo(value)
    setPage(1)
    fetch({ page: 1, dateTo: value })
  }

  function handlePage(p: number) {
    setPage(p)
    fetch({ page: p })
  }

  function handleExport() {
    if (!orders.length) return
    const headers = ["Data", "ID Pedido", "Influencer", "Cupom", "Plataforma", "Valor", "Comissão"]
    const rows = orders.map((o) => [
      o.ordered_at ? format(new Date(o.ordered_at), "dd/MM/yyyy HH:mm") : "",
      o.external_id ?? "",
      o.influencer_name ?? "",
      o.coupon ?? "",
      o.store_type ?? "",
      o.total.toFixed(2),
      o.commission.toFixed(2),
    ])
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `vendas_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6 p-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!open && <SidebarTrigger size="lg" />}
          <span className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
            Vendas
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1.5" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          type="date"
          className="w-[155px]"
          value={dateFrom}
          onChange={(e) => handleDateFrom(e.target.value)}
        />
        <Input
          type="date"
          className="w-[155px]"
          value={dateTo}
          onChange={(e) => handleDateTo(e.target.value)}
        />
        <Input
          placeholder="ID do pedido..."
          className="w-[180px]"
          value={searchId}
          onChange={(e) => handleSearch(e.target.value)}
        />
        <Select value={coupon} onValueChange={handleCoupon}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Cupom" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os cupons</SelectItem>
            {availableCoupons.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap gap-6 text-sm">
        <div>
          Total Vendas:{" "}
          <span className="font-semibold">{brl(summary.total_sales ?? 0)}</span>
        </div>
        <div>
          Total Comissões:{" "}
          <span className="font-semibold text-green-400">
            {brl(summary.total_commission??0)}
          </span>
        </div>
        <div>
          Pedidos:{" "}
          <span className="font-semibold">{summary.total_orders?? 0}</span>
        </div>
        {isPending && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground self-center" />
        )}
      </div>

      {/* Table */}
      <Card>
        {orders.length === 0 && !isPending ? (
          <div className="flex flex-col items-center justify-center py-16">
            <PackageOpen className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma venda encontrada</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Data</TableHead>
                <TableHead className="text-xs">ID Pedido</TableHead>
                <TableHead className="text-xs">Influencer</TableHead>
                <TableHead className="text-xs">Cupom</TableHead>
                <TableHead className="text-xs">Plataforma</TableHead>
                <TableHead className="text-xs text-right">Valor</TableHead>
                <TableHead className="text-xs text-right">Comissão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={isPending ? "opacity-50 pointer-events-none" : ""}>
              {orders.map((order) => (
                <TableRow key={order.id} className="hover:bg-muted/50">
                  <TableCell className="text-xs text-muted-foreground">
                    {order.ordered_at
                      ? format(new Date(order.ordered_at), "dd MMM, HH:mm", { locale: ptBR })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {order.external_id ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        {order.influencer_avatar && (
                          <AvatarImage src={order.influencer_avatar} />
                        )}
                        <AvatarFallback className="text-[8px] font-medium">
                          {initials(order.influencer_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{order.influencer_name ?? "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {order.coupon ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        order.store_type?.toLowerCase() === "nuvemshop"
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-[10px]"
                          : "text-[10px]"
                      }
                    >
                      {order.store_type ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {brl(order.total?? 0)}
                  </TableCell>
                  <TableCell className="text-xs text-right font-medium text-green-400">
                    {brl(order.commission?? 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1 || isPending}
            onClick={() => handlePage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(
              (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
            )
            .reduce<(number | "...")[]>((acc, p, i, arr) => {
              if (i > 0 && (p as number) - (arr[i - 1] as number) > 1)
                acc.push("...")
              acc.push(p)
              return acc
            }, [])
            .map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm">
                  …
                </span>
              ) : (
                <Button
                  key={p}
                  variant={page === p ? "default" : "outline"}
                  size="sm"
                  className="w-8 h-8 p-0"
                  disabled={isPending}
                  onClick={() => handlePage(p as number)}
                >
                  {p}
                </Button>
              )
            )}

          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages || isPending}
            onClick={() => handlePage(page + 1)}
          >
            Próximo
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}