"use client"

import { useState, useTransition, type ElementType } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { UserAvatar } from "@/components/ui/user-avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { Masonry, type MasonryItem } from "@/components/ui/masonry"
import {
  ArrowLeft, CalendarIcon, Loader2, Heart, MessageCircle, ExternalLink,
  Users, Images, Film, AtSign, TrendingUp, TrendingDown, PlayCircle,
} from "lucide-react"
import {
  getInfluencerInstagramDetail,
  type InfluencerInstagramDetail, type InstaMediaItem, type InstaMediaKind,
} from "../../actions"

const text = (v: string | null | undefined) => v ?? ""
const nf = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("pt-BR"))

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return format(new Date(iso), "dd/MM/yyyy", { locale: ptBR })
}

const KIND_LABEL: Record<InstaMediaKind, string> = {
  post: "Post",
  reels: "Reels",
  story_mention: "Story",
  post_mention: "Menção · Post",
  reel_mention: "Menção · Reel",
}

const KIND_BADGE: Record<InstaMediaKind, string> = {
  post: "bg-blue-600 hover:bg-blue-600",
  reels: "bg-fuchsia-600 hover:bg-fuchsia-600",
  story_mention: "bg-amber-500 hover:bg-amber-500",
  post_mention: "bg-emerald-600 hover:bg-emerald-600",
  reel_mention: "bg-rose-600 hover:bg-rose-600",
}

// Aspecto quadrado (feed) vs retrato (stories/reels)
const SQUARE_KINDS: InstaMediaKind[] = ["post", "post_mention"]

// Só reserva rodapé (likes/comentários) quando há dado de engajamento
const hasEngagement = (m: InstaMediaItem) => m.like_count != null || m.comments_count != null

// Extrai o shortcode de um permalink do Instagram (/p/, /reel/ ou /tv/)
const igShortcode = (permalink: string | null) => {
  const m = permalink?.match(/instagram\.com\/(?:p|reel|tv)\/([^/?#]+)/i)
  return m ? m[1] : null
}

// Link do Instagram (post/reel) vira URL de embed oficial — não baixa mídia
const igEmbedUrl = (permalink: string | null) => {
  const code = igShortcode(permalink)
  return code ? `https://www.instagram.com/p/${code}/embed` : null
}

// Capa (poster) da mídia servida pelo próprio Instagram — só referência, nada é salvo
const igThumbUrl = (permalink: string | null) => {
  const code = igShortcode(permalink)
  return code ? `https://www.instagram.com/p/${code}/media/?size=l` : null
}

type MetricCard = { title: string; value: string; icon: ElementType; hint?: string; trend?: number | null }

export default function DetailClient({
  influencerId,
  initial,
}: {
  influencerId: string
  initial: InfluencerInstagramDetail
}) {
  const { open } = useSidebar()
  const [isPending, startTransition] = useTransition()
  const [detail, setDetail] = useState<InfluencerInstagramDetail>(initial)
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
  const [openMedia, setOpenMedia] = useState<InstaMediaItem | null>(null)

  function applyFilter() {
    if (!dateFrom || !dateTo) return
    const from = format(dateFrom, "yyyy-MM-dd")
    const to = format(dateTo, "yyyy-MM-dd")
    startTransition(async () => {
      const d = await getInfluencerInstagramDetail(influencerId, from, to)
      setDetail(d)
    })
  }

  function clearFilter() {
    setDateFrom(undefined)
    setDateTo(undefined)
    startTransition(async () => {
      const d = await getInfluencerInstagramDetail(influencerId)
      setDetail(d)
    })
  }

  if (!detail) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <BackLink />
        <p className="text-sm text-muted-foreground py-16 text-center">
          Sem dados de Instagram para este influencer, ou acesso não permitido.
        </p>
      </div>
    )
  }

  const inf = detail.influencer
  const conn = detail.connection
  const counts = detail.counts ?? {
    posts: 0, reels: 0, story_mentions: 0, post_mentions: 0, reel_mentions: 0,
  }
  // Menção é menção — mas cada tipo conta separado, e há o total.
  // Feed post (kind=post) e post_mention são ambos "post"; idem reels.
  const nPosts = counts.posts + counts.post_mentions
  const nReels = counts.reels + counts.reel_mentions
  const nStories = counts.story_mentions
  const totalMentions = nPosts + nReels + nStories
  const delta =
    detail.followers_current != null && detail.followers_start != null
      ? detail.followers_current - detail.followers_start
      : null

  const cards: MetricCard[] = [
    { title: "Seguidores", value: nf(detail.followers_current ?? conn?.followers_count), icon: Users, trend: delta },
    { title: "Menções", value: nf(totalMentions), icon: AtSign },
    { title: "Posts", value: nf(nPosts), icon: Images },
    { title: "Reels", value: nf(nReels), icon: Film },
    { title: "Stories", value: nf(nStories), icon: AtSign },
  ]

  const masonryItems: (MasonryItem & { media: InstaMediaItem })[] = detail.media.map((m) => ({
    id: m.id,
    height: 300, // placeholder; recalculado no render pela largura da coluna
    media: m,
  }))

  return (
    <div className="flex flex-col gap-6 p-3 h-fit">
      <div className="flex items-center gap-2">
        {!open && <SidebarTrigger size="lg" />}
        <BackLink />
      </div>

      {/* Cabeçalho do influencer */}
      <div className="flex items-center gap-4">
        <UserAvatar avatarUrl={inf?.avatar_url} name={inf?.name} size={64} fallbackClassName="text-lg font-semibold" />
        <div>
          <h1 className="text-xl font-semibold">{text(inf?.name)}</h1>
          <p className="text-sm text-muted-foreground">
            {conn?.username ? `@${conn.username}` : text(inf?.instagram)}
            {conn?.account_type ? ` · ${conn.account_type}` : ""}
          </p>
          {conn?.last_synced_at && (
            <p className="text-[11px] text-muted-foreground/60">
              Sincronizado em {fmtDate(conn.last_synced_at)}
            </p>
          )}
        </div>
      </div>

      {/* Filtro por data */}
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
        <Button size="sm" onClick={applyFilter} disabled={!dateFrom || !dateTo || isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Filtrar"}
        </Button>
        {(dateFrom || dateTo) && (
          <Button size="sm" variant="ghost" onClick={clearFilter} disabled={isPending}>Limpar</Button>
        )}
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Card key={c.title}>
              <CardContent className="flex flex-col gap-1 p-4">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
                  <Icon className="h-3.5 w-3.5" /> {c.title}
                </span>
                <span className="text-2xl font-semibold">{c.value}</span>
                {c.hint && <span className="text-[11px] text-muted-foreground/70">{c.hint}</span>}
                {c.trend != null && c.trend !== 0 && (
                  <span className={`inline-flex items-center gap-1 text-xs ${c.trend > 0 ? "text-green-500" : "text-red-500"}`}>
                    {c.trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {c.trend > 0 ? "+" : ""}{nf(c.trend)} no período
                  </span>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Menções (mesma tabela da página de influencers) */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium tracking-widest text-muted-foreground uppercase">Menções</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Legenda</TableHead>
              <TableHead className="text-right">Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={isPending ? "opacity-50 pointer-events-none" : ""}>
            {detail.media.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">
                  Nenhuma menção no período
                </TableCell>
              </TableRow>
            ) : detail.media.slice(0, 3).map((m) => (
              <TableRow key={m.id}>
                <TableCell className="text-sm whitespace-nowrap">{fmtDate(m.posted_at)}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                  {m.caption || <span className="italic">{KIND_LABEL[m.kind]}</span>}
                </TableCell>
                <TableCell className="text-right">
                  {m.permalink ? (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={m.permalink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Galeria Masonry */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-widest text-muted-foreground uppercase">Mídias</h2>
        {masonryItems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma mídia no período</p>
        ) : (
          <Masonry
            items={masonryItems}
            gap={12}
            columnsBreakpoints={{ base: 2, sm: 2, md: 3, lg: 4 }}
            getHeight={(item, w) =>
              Math.round(w * (SQUARE_KINDS.includes(item.media.kind) ? 1 : 1.45)) +
              (hasEngagement(item.media) ? 40 : 0)}
            renderItem={(item, width) => {
              const m = item.media
              const mediaH = Math.round(width * (SQUARE_KINDS.includes(m.kind) ? 1 : 1.45))
              return (
                <div className="rounded-lg overflow-hidden border bg-card w-full">
                  <div
                    className="relative w-full bg-muted cursor-pointer"
                    style={{ height: mediaH }}
                    onClick={() => setOpenMedia(m)}
                  >
                    <MediaTile m={m} variant="thumb" />
                    <Badge className={`absolute top-2 left-2 text-[10px] text-white border-0 ${KIND_BADGE[m.kind]}`}>
                      {KIND_LABEL[m.kind]}
                    </Badge>
                  </div>
                  {hasEngagement(m) && (
                    <div className="flex items-center justify-end gap-2 px-2 py-2 text-[11px] text-muted-foreground">
                      {m.like_count != null && (
                        <span className="inline-flex items-center gap-0.5"><Heart className="h-3 w-3" />{m.like_count}</span>
                      )}
                      {m.comments_count != null && (
                        <span className="inline-flex items-center gap-0.5"><MessageCircle className="h-3 w-3" />{m.comments_count}</span>
                      )}
                    </div>
                  )}
                </div>
              )
            }}
          />
        )}
      </div>

      {/* Modal de mídia (clique na miniatura) */}
      <Dialog open={!!openMedia} onOpenChange={(o) => !o && setOpenMedia(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-0 bg-black">
          <DialogTitle className="sr-only">Mídia</DialogTitle>
          {openMedia && (
            <div className="flex flex-col">
              <div className="flex items-center justify-center bg-black">
                <MediaTile m={openMedia} variant="full" />
              </div>
              <div className="flex items-center justify-between px-4 py-3 text-xs text-muted-foreground bg-card">
                <span className="inline-flex items-center gap-2">
                  <Badge className={`text-[10px] text-white border-0 ${KIND_BADGE[openMedia.kind]}`}>
                    {KIND_LABEL[openMedia.kind]}
                  </Badge>
                  {fmtDate(openMedia.posted_at)}
                </span>
                {openMedia.permalink && (
                  <a href={openMedia.permalink} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-foreground">
                    <ExternalLink className="h-3.5 w-3.5" /> Ver no Instagram
                  </a>
                )}
              </div>
              {openMedia.caption && (
                <p className="px-4 pb-4 text-sm bg-card text-foreground/80 whitespace-pre-wrap">
                  {openMedia.caption}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Story mention / reels podem ser vídeo OU imagem, e a CDN não diz o tipo.
// variant "thumb": toca em loop, sem controles. "full": embed oficial do IG quando há permalink.
function MediaTile({ m, variant = "thumb" }: { m: InstaMediaItem; variant?: "thumb" | "full" }) {
  const rawSrc = m.media_url || m.thumbnail_url || m.cdn_url || null
  const embedUrl = igEmbedUrl(m.permalink)
  const thumbSrc = igThumbUrl(m.permalink)
  const startAsVideo =
    m.kind === "story_mention" || m.kind === "reels" || m.kind === "reel_mention" ||
    m.media_type === "VIDEO"
  const order = startAsVideo ? (["video", "img"] as const) : (["img", "video"] as const)
  const [i, setI] = useState(0)
  const [thumbErr, setThumbErr] = useState(false)
  const next = () => setI((x) => x + 1)
  const isThumb = variant === "thumb"

  // No modal, se há permalink do IG usamos o embed oficial (mostra reel e carrossel
  // completo direto do Instagram — nada é baixado nem armazenado). Cortamos o topo
  // branco (cabeçalho de perfil) do embed pra ficar mais limpo.
  if (!isThumb && embedUrl) {
    return (
      <div className="w-full overflow-hidden bg-white" style={{ height: 600 }}>
        <iframe
          key="embed"
          src={embedUrl}
          title="Instagram"
          className="w-full border-0 bg-white"
          style={{ height: 656, marginTop: -56 }}
          loading="lazy"
          scrolling="no"
          allow="encrypted-media"
        />
      </div>
    )
  }

  // Miniatura: sem mídia direta mas com link do IG (ex.: reel) → capa do IG + play.
  if (isThumb && !rawSrc && thumbSrc && !thumbErr) {
    return (
      <div className="relative w-full h-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbSrc}
          alt={m.caption ?? ""}
          className="w-full h-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setThumbErr(true)}
        />
        {startAsVideo && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <PlayCircle className="h-10 w-10 text-white/90 drop-shadow-lg" />
          </div>
        )}
      </div>
    )
  }

  if (!rawSrc || i >= order.length) {
    // Sem mídia direta mas com link do IG: placeholder clicável que abre o embed.
    if (embedUrl) {
      return (
        <div className={`flex flex-col items-center justify-center gap-1.5 text-muted-foreground px-2 text-center ${isThumb ? "w-full h-full text-[11px]" : "w-full py-16 text-sm"}`}>
          <PlayCircle className="h-8 w-8 opacity-60" />
          {m.kind === "reel_mention" || m.kind === "reels" ? "Ver Reel" : "Ver publicação"}
        </div>
      )
    }
    return (
      <div className={`flex flex-col items-center justify-center gap-1 text-muted-foreground px-2 text-center ${isThumb ? "w-full h-full text-[11px]" : "w-full py-16 text-sm"}`}>
        <AtSign className="h-5 w-5 opacity-40" />
        {m.kind === "story_mention" ? "Story expirada / indisponível" : "Sem prévia"}
      </div>
    )
  }

  if (order[i] === "video") {
    return (
      <video
        key="video"
        src={rawSrc}
        className={isThumb ? "w-full h-full object-cover" : "w-full max-h-[80vh] object-contain bg-black"}
        muted={isThumb}
        autoPlay
        loop={isThumb}
        playsInline
        controls={!isThumb}
        preload="metadata"
        onError={next}
      />
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key="img"
      src={rawSrc}
      alt={m.caption ?? ""}
      className={isThumb ? "w-full h-full object-cover" : "w-full max-h-[80vh] object-contain bg-black"}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={next}
    />
  )
}

function BackLink() {
  return (
    <Button variant="ghost" size="sm" asChild className="w-fit -ml-2">
      <Link href="/main/comunidade">
        <ArrowLeft className="h-4 w-4 mr-1" /> Comunidade
      </Link>
    </Button>
  )
}
