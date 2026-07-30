"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { UserAvatar } from "@/components/ui/user-avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { Users, Images, Loader2, CalendarIcon, ChevronRight } from "lucide-react"
import { getComunidadeData, type ComunidadeRow } from "./actions"

const text = (v: string | null | undefined) => v ?? ""

const nf = (v: number | null | undefined) =>
  v == null ? "—" : v.toLocaleString("pt-BR")

const MONTH_NAMES = [
  { value: "01", label: "Janeiro" },  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },    { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },     { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },    { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" }, { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" }, { value: "12", label: "Dezembro" },
]

function yearOptions() {
  const now = new Date()
  return Array.from({ length: 5 }, (_, i) => ({ value: String(now.getFullYear() - i) }))
}

const YEARS = yearOptions()
const NOW = new Date()
const CURRENT_MONTH_NUM = String(NOW.getMonth() + 1).padStart(2, "0")
const CURRENT_YEAR = String(NOW.getFullYear())

export default function ComunidadeClient({ rows: initial }: { rows: ComunidadeRow[] }) {
  const { open } = useSidebar()
  const [isPending, startTransition] = useTransition()
  const [rows, setRows] = useState<ComunidadeRow[]>(initial)
  const [search, setSearch] = useState("")

  const [filterMode, setFilterMode] = useState<"month" | "period">("month")
  const [selectedMonthNum, setSelectedMonthNum] = useState(CURRENT_MONTH_NUM)
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR)
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)

  const searchLower = search.toLowerCase()
  const filtered = rows.filter(
    (r) =>
      text(r.name).toLowerCase().includes(searchLower) ||
      text(r.instagram).toLowerCase().includes(searchLower),
  )

  function handleMonthChange(monthNum: string, year: string) {
    setSelectedMonthNum(monthNum)
    setSelectedYear(year)
    startTransition(async () => {
      const data = await getComunidadeData(`${year}-${monthNum}`)
      setRows(data ?? [])
    })
  }

  function handleModeChange(mode: "month" | "period") {
    setFilterMode(mode)
    if (mode === "month") {
      startTransition(async () => {
        const data = await getComunidadeData(`${selectedYear}-${selectedMonthNum}`)
        setRows(data ?? [])
      })
    }
  }

  function handleRangeSearch() {
    if (!dateFrom || !dateTo) return
    const from = format(dateFrom, "yyyy-MM-dd")
    const to = format(dateTo, "yyyy-MM-dd")
    startTransition(async () => {
      const data = await getComunidadeData(undefined, from, to)
      setRows(data ?? [])
    })
  }

  return (
    <div className="flex flex-col gap-6 p-3 h-fit">
      {/* Header */}
      <div className="flex flex-row justify-between items-center">
        <div className="flex flex-row gap-2 items-center">
          {!open && <SidebarTrigger size="lg" />}
          <label className="flex text-sm font-medium tracking-widest text-muted-foreground uppercase items-center gap-2">
            Comunidade
          </label>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="radio" name="filter-mode" checked={filterMode === "month"}
              onChange={() => handleModeChange("month")} className="accent-primary" />
            <span className="text-sm text-muted-foreground">Mês / Ano</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="radio" name="filter-mode" checked={filterMode === "period"}
              onChange={() => handleModeChange("period")} className="accent-primary" />
            <span className="text-sm text-muted-foreground">Período personalizado</span>
          </label>
        </div>

        <div className="flex gap-3 items-center flex-wrap">
          <Input placeholder="Buscar influencer..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />

          {filterMode === "month" ? (
            <div className="flex gap-2">
              <Select value={selectedMonthNum} onValueChange={(v) => handleMonthChange(v, selectedYear)}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedYear} onValueChange={(v) => handleMonthChange(selectedMonthNum, v)}>
                <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => <SelectItem key={y.value} value={y.value}>{y.value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[150px] justify-start font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                    {dateFrom ? format(dateFrom, "dd/MM/yyyy") : <span className="text-muted-foreground">De</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={ptBR}
                    disabled={(d) => d > new Date()} />
                </PopoverContent>
              </Popover>
              <span className="text-sm text-muted-foreground">até</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[150px] justify-start font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                    {dateTo ? format(dateTo, "dd/MM/yyyy") : <span className="text-muted-foreground">Até</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={ptBR}
                    disabled={(d) => d > new Date() || (dateFrom ? d < dateFrom : false)} />
                </PopoverContent>
              </Popover>
              <Button size="sm" onClick={handleRangeSearch} disabled={!dateFrom || !dateTo || isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Filtrar"}
              </Button>
            </div>
          )}

          {isPending && filterMode === "month" && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground self-center" />
          )}
        </div>
      </div>

      {/* Tabela */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Influencer</TableHead>
            <TableHead>
              <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Seguidores</span>
            </TableHead>
            <TableHead>
              <span className="inline-flex items-center gap-1.5"><Images className="h-3.5 w-3.5" /> Posts</span>
            </TableHead>
            <TableHead className="text-right">Detalhe</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={isPending ? "opacity-50 pointer-events-none" : ""}>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-12">
                Nenhum influencer encontrado
              </TableCell>
            </TableRow>
          ) : filtered.map((r) => (
            <TableRow key={r.influencer_id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <UserAvatar avatarUrl={r.avatar_url} name={r.name} size={36} fallbackClassName="font-semibold" />
                  <div>
                    <p className="font-medium text-sm">{text(r.name)}</p>
                    <p className="text-xs text-muted-foreground">{text(r.instagram)}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-sm font-medium">{nf(r.followers_count)}</TableCell>
              <TableCell className="text-sm">{nf(r.posts_count)}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/main/comunidade/influencer/${r.influencer_id}`}>
                    Ver <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
