"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Plus } from "lucide-react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"



// ── Types ────────────────────────────────────────────────────────────────────

type KPIs = {
  total_orders: number
  total_sales: number
  avg_ticket: number
  total_commission: number
  roi: number
  connected_influencers: number
}

type DailySale = {
  sale_date: string
  total_sales: number
  total_orders: number
}

type MonthlySale = {
  sale_month: string   // "YYYY-MM"
  total_sales: number
  total_orders: number
}

type LastOrder = {
  ordered_at: string
  external_id: string | null
  influencer: string | null
  coupon: string | null
  platform: string | null
  total: number
  commission: number
}

type TopInfluencer = {
  influencer_id: string
  avatar_url: string | null
  name: string | null
  total_sales: number
  total_orders: number
  total_commission: number
}

interface Props {
  kpis: KPIs | null
  dailyChart: DailySale[]
  monthlyChart: MonthlySale[]
  lastOrders: LastOrder[]
  topInfluencers: TopInfluencer[]
  // callbacks para trocar o período no server (opcional — pode ser state local)
  onDaysChange?: (days: 7 | 15 | 30) => void
  onMonthsChange?: (months: 3 | 6 | 12) => void
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

function initials(name: string | null) {
  if (!name) return "?"
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardClient({
  kpis,
  dailyChart,
  monthlyChart,
  lastOrders,
  topInfluencers,
}: Props) {
  const { open } = useSidebar()
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  // 1. A URL é a "fonte da verdade", não o useState!
  const activeDays = Number(searchParams.get("days") || 7) as 7 | 15 | 30
  const activeMonths = Number(searchParams.get("months") || 6) as 3 | 6 | 12

  function handleDays(d: 7 | 15 | 30) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("days", String(d))
    
    router.push(`?${params.toString()}`, { scroll: false })
    router.refresh() // <--- ISSO força o Next a buscar os dados do servidor novamente
  }

  function handleMonths(m: 3 | 6 | 12) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("months", String(m))
    
    router.push(`?${params.toString()}`, { scroll: false })
    router.refresh() // <--- E aqui também
  }

  // Formata labels dos gráficos
  const dailyData = dailyChart.map((d) => ({
    label: formatDate(d.sale_date),
    total: d.total_sales,
  }))

  const monthlyData = monthlyChart.map((d) => ({
    label: d.sale_month.slice(0, 7), // "YYYY-MM"
    total: d.total_sales,
  }))

  return (
    <div className="flex flex-col gap-6 p-4 h-fit">

      {/* Header */}
      <div className="flex flex-row justify-between items-center">
        <div className="flex flex-row gap-2 items-center">
          {!open && <SidebarTrigger size="lg" />}
          <span className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
            Dashboard
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          {
            label: "Total Comissão",
            value: brl(kpis?.total_commission ?? 0),
            sub: "em vendas pagas",
          },
          {
            label: "Total Vendas",
            value: brl(kpis?.total_sales ?? 0),
            sub: `${kpis?.total_orders ?? 0} pedidos`,
          },
          {
            label: "ROI",
            value: `${kpis?.roi ?? 0}x`,
            sub: "retorno sobre comissão",
          },
          {
            label: "Ticket Médio",
            value: brl(kpis?.avg_ticket ?? 0),
            sub: "por pedido",
          },
          {
            label: "Influencers",
            value: String(kpis?.connected_influencers ?? 0),
            sub: "conectados ativos",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-muted/50 rounded-lg p-4 flex flex-col gap-1"
          >
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              {kpi.label}
            </p>
            <p className="text-2xl font-medium leading-none">{kpi.value}</p>
            <p className="text-[11px] text-muted-foreground">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Daily chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vendas por dia
            </CardTitle>
            <div className="flex gap-1">
              {([7, 15, 30] as const).map((d) => (
                <Button
                  key={d}
                  variant={activeDays === d ? "default" : "outline"}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => handleDays(d)}
                >
                  {d}d
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tickFormatter={(v) => `R$${v}`}
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <Tooltip
                  formatter={(v) => [brl(Number(v) || 0), "Vendas"]}
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #ffffff1a",
                    borderRadius: 8,
                    fontSize: 12,
                    
                  }}
                  labelStyle={{ color: "#fff" }}
                  itemStyle={{ color: "#fff" }} 
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#8200db"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vendas por mês
            </CardTitle>
            <div className="flex gap-1">
              {([3, 6, 12] as const).map((m) => (
                <Button
                  key={m}
                  variant={activeMonths === m ? "default" : "outline"}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => handleMonths(m)}
                >
                  {m}m
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tickFormatter={(v) => `R$${v}`}
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <Tooltip
                  formatter={(v) => [brl(Number(v) || 0), "Vendas"]} 
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #ffffff1a",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#fff" }}
                  itemStyle={{ color: "#fff" }} 
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#8200db"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">

        {/* Últimas vendas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Últimas vendas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>ID Externo</TableHead>
                  <TableHead>Influencer</TableHead>
                  <TableHead>Cupom</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lastOrders.map((order, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDate(order.ordered_at)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {order.external_id ?? "—"}
                    </TableCell>
                    <TableCell>{order.influencer ?? "—"}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {order.coupon ?? "—"}
                      </code>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded font-medium">
                        {order.platform ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {brl(order.total)}
                    </TableCell>
                    <TableCell className="text-right text-green-400">
                      {brl(order.commission)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top influencers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top influencers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Influencer</TableHead>
                  <TableHead className="text-right">Vendas</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topInfluencers.map((inf) => (
                  <TableRow key={inf.influencer_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar>
                          <AvatarImage src={`${process.env.NEXT_PUBLIC_BUCKET_URL}${inf.avatar_url}`}/>
                          <AvatarFallback>{inf.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium leading-none">
                            {inf.name ?? "—"}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {inf.total_orders} pedidos
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {brl(inf.total_sales)}
                    </TableCell>
                    <TableCell className="text-right text-green-400 text-sm">
                      {brl(inf.total_commission)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}