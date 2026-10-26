# ROInfluencer Business: recon for the offline replica

Source: `/Volumes/Projects/Roibusiness` (Next.js 16 App Router, Tailwind v4, shadcn/ui style `radix-vega`, base colour `zinc`, icon library `lucide-react`). Read-only recon. All strings below are quoted verbatim from the source (Portuguese, pt-BR). Where the UI shows English, that is how the real app looks too (for example the sidebar user menu).

Scope: everything under `/main/*` (the logged-in business area) plus the Plans component (`components/plans/plans.tsx`), which "Fazer upgrade" points to.

---

## 0. TL;DR for the rebuilder

- **Look:** flat, low-contrast zinc surfaces with a **fuchsia/magenta primary**. Cards have **no visible border**: they are `bg-muted/50` panels with radius about 10px. KPI tiles are plain `bg-muted/50 rounded-lg p-4` boxes. Money values for commission are always **`text-green-400`**.
- **Font:** IBM Plex Sans everywhere (body and headings), Geist Mono for codes and coupons.
- **Theme:** `defaultTheme="system"`. The app has full light and dark themes, and pressing **`d`** toggles between them. For the sales deck, **use dark**: it looks better and is how the product is usually shown.
- **Shell:** collapsible left sidebar (16rem, or 3rem when collapsed to icons). No top bar. Each page starts with a tiny uppercase muted label as its title.
- **Charts:** Recharts `LineChart`, monotone line in the primary colour, 2px stroke, dots r=3. No area gradient. Dark tooltip.
- Platforms actually wired: **NuvemShop** (OAuth), **Instagram** (Business Login). Shown as "Em breve": **Pagar.me** and **Cakto**. There is also a custom webhook integration, "TeamIcaro" (edge function), with no UI.

---

## 1. Design tokens

### 1.1 Theme mechanics
- `next-themes` with `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`. The dark theme is the `.dark` class on `<html>`.
- Hotkey: pressing `d` (outside inputs, with no modifiers) toggles light and dark (`ThemeHotkey` in `components/theme-provider.tsx`).
- `<html lang="pt-BR" class="antialiased font-sans …">`, `body { bg-background text-foreground }`, `* { border-border outline-ring/50 }`.

### 1.2 CSS variables (`app/globals.css`), exact values with approximate hex

| Token | Light `:root` | Dark `.dark` |
|---|---|---|
| `--background` | `oklch(1 0 0)` #ffffff | `oklch(0.25 0.006 285.885)` ≈ #212125 (custom, between zinc-900 and zinc-800) |
| `--foreground` | `oklch(0.141 0.005 285.823)` zinc-950 #09090b | `oklch(0.985 0 0)` #fafafa |
| `--card` | `oklch(1 0 0)` #fff | `oklch(0.25 0.006 285.885)` ≈ #212125 |
| `--card-foreground` | zinc-950 | #fafafa |
| `--popover` | #fff | `oklch(0.21 0.006 285.885)` zinc-900 #18181b |
| `--popover-foreground` | zinc-950 | #fafafa |
| `--primary` | `oklch(0.518 0.253 323.949)` **fuchsia-700 #a800b7** | `oklch(0.452 0.211 324.591)` **fuchsia-800 #8a0194** |
| `--primary-foreground` | `oklch(0.977 0.017 320.058)` fuchsia-50 #fdf4ff | same #fdf4ff |
| `--secondary` | `oklch(0.967 0.001 286.375)` zinc-100 #f4f4f5 | `oklch(0.274 0.006 286.033)` zinc-800 #27272a |
| `--secondary-foreground` | `oklch(0.21 0.006 285.885)` zinc-900 | #fafafa |
| `--muted` | zinc-100 #f4f4f5 | `oklch(0.27 0.006 286.033)` ≈ #262629 |
| `--muted-foreground` | `oklch(0.552 0.016 285.938)` zinc-500 #71717b | `oklch(0.705 0.015 286.067)` zinc-400 #9f9fa9 |
| `--accent` | zinc-100 | zinc-800 #27272a |
| `--accent-foreground` | zinc-900 | #fafafa |
| `--destructive` | `oklch(0.577 0.245 27.325)` red-600 #e7000b | `oklch(0.704 0.191 22.216)` red-400 #ff6467 |
| `--border` | `oklch(0.92 0.004 286.32)` zinc-200 #e4e4e7 | `oklch(1 0 0 / 10%)` white at 10% |
| `--input` | zinc-200 | `oklch(1 0 0 / 15%)` white at 15% |
| `--ring` | `oklch(0.705 0.015 286.067)` zinc-400 | `oklch(0.552 0.016 285.938)` zinc-500 |
| `--chart-1` | `oklch(0.833 0.145 321.434)` fuchsia-300 #f4a8ff | same |
| `--chart-2` | `oklch(0.667 0.295 322.15)` fuchsia-500 #e12afb | same |
| `--chart-3` | `oklch(0.591 0.293 322.896)` fuchsia-600 #c800de | same |
| `--chart-4` | `oklch(0.518 0.253 323.949)` fuchsia-700 #a800b7 | same |
| `--chart-5` | `oklch(0.452 0.211 324.591)` fuchsia-800 #8a0194 | same |
| `--radius` | `0.45rem` (7.2px) | same |
| `--sidebar` | `oklch(0.985 0 0)` #fafafa | `oklch(0.25 0.006 285.885)` (same as background, ≈ #212125) |
| `--sidebar-foreground` | zinc-950 | #fafafa |
| `--sidebar-primary` | `oklch(0.591 0.293 322.896)` **fuchsia-600 #c800de** | `oklch(0.667 0.295 322.15)` **fuchsia-500 #e12afb** |
| `--sidebar-primary-foreground` | fuchsia-50 | fuchsia-50 |
| `--sidebar-accent` | zinc-100 | zinc-800 #27272a |
| `--sidebar-accent-foreground` | zinc-900 | #fafafa |
| `--sidebar-border` | zinc-200 | white at 10% |
| `--sidebar-ring` | zinc-400 | zinc-500 |

Radius scale (`@theme inline`):
- `--radius-sm` = 0.6r (≈4.3px)
- `--radius-md` = 0.8r (≈5.8px)
- `--radius-lg` = r (7.2px)
- `--radius-xl` = 1.4r (≈10px)
- `--radius-2xl` = 1.8r
- `--radius-3xl` = 2.2r
- `--radius-4xl` = 2.6r (≈18.7px, used for pill badges)

Other colours used directly (Tailwind v4 palette):
- Commission money: `text-green-400` (#05df72), on both themes.
- Success badge: `bg-green-600` (#00a63e).
- Delete icons: hard-coded `#C62828`.
- Top-3 ranking: yellow-400, slate-400 and orange-400 left borders.
- Instagram icon: `text-pink-600`.
- Plans "Elite" colour: `#C88B00`.

### 1.3 Fonts (`app/layout.tsx`, `next/font/google`)
- `IBM_Plex_Sans`, variable `--font-sans`. **This is the body font, and it is also the heading font**, because `@theme inline { --font-heading: var(--font-sans) }` overrides the Roboto variable.
- `Roboto` is loaded as `--font-heading`, but it is effectively unused.
- `Roboto_Slab` is `--font-serif` (unused). `Geist_Mono` is `--font-mono` (used by the `font-mono` class: coupons, order IDs, JSON payload).
- Replica: load **IBM Plex Sans** 400/500/600/700 and **Geist Mono**, or JetBrains Mono as a fallback, from Google Fonts.

### 1.4 Core component classes (exact)

**Card** (`components/ui/card.tsx`). This one is customised: the background is muted, not the card token.
```
Card:        group/card flex flex-col gap-6 overflow-hidden rounded-xl bg-muted/50 py-6 text-sm text-card-foreground shadow-xs ring-1 ring-foreground/0
             (size="sm": gap-4 py-4)
CardHeader:  grid auto-rows-min items-start gap-1 rounded-t-xl px-6
CardTitle:   font-heading text-base leading-normal font-medium
CardDescription: text-sm text-muted-foreground
CardContent: px-6
CardFooter:  flex items-center rounded-b-xl px-6
```
So a card is a borderless panel: muted fill at 50%, radius about 10px, 24px vertical padding and 24px horizontal content padding. In dark mode it is barely lighter than the page.

**KPI tile (dashboard)**: not a Card.
```
<div class="bg-muted/50 rounded-lg p-4 flex flex-col gap-1">
  <p class="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Total Comissão</p>
  <p class="text-2xl font-medium leading-none">R$ 12.840,00</p>
  <p class="text-[11px] text-muted-foreground">em vendas pagas</p>
</div>
```

**KPI card (Instagram detail)**: a Card.
```
<Card><CardContent class="flex flex-col gap-1 p-4">
  <span class="inline-flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide"><Icon h-3.5 w-3.5/> Seguidores</span>
  <span class="text-2xl font-semibold">48.210</span>
  <span class="inline-flex items-center gap-1 text-xs text-green-500"><TrendingUp h-3 w-3/>+1.204 no período</span>
```

**Page title (every page)**
```
<div class="flex items-center gap-2">
  {sidebar collapsed && <SidebarTrigger size="lg"/>}
  <span class="text-sm font-medium tracking-widest text-muted-foreground uppercase">Dashboard</span>
</div>
```

**Section heading inside a page** (Instagram detail): `text-sm font-medium tracking-widest text-muted-foreground uppercase` ("Menções", "Mídias").

**Table** (shadcn):
- Wrapper: `relative w-full overflow-x-auto`
- `table`: `w-full caption-bottom text-sm`
- `thead tr`: `border-b`
- `tr`: `border-b transition-colors hover:bg-muted/50`, with the last row borderless
- `th`: `h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground`
- `td`: `p-2 align-middle whitespace-nowrap`

Headers are foreground colour (not muted) and font-medium. Many pages add `text-xs` to the `th` elements.

**Button** (cva):
- Base: `inline-flex items-center justify-center rounded-md border border-transparent text-sm font-medium whitespace-nowrap transition-all active:translate-y-px`. SVGs are size-4.
- Variants:
  - `default`: `bg-primary text-primary-foreground hover:bg-primary/80`
  - `outline`: `border-border bg-background shadow-xs hover:bg-muted dark:border-input dark:bg-input/30 dark:hover:bg-input/50`
  - `secondary`: `bg-secondary text-secondary-foreground`
  - `ghost`: `hover:bg-muted dark:hover:bg-muted/50`
  - `destructive`: `bg-destructive/10 text-destructive hover:bg-destructive/20`
  - `link`
- Sizes:
  - `default` h-9 px-2.5
  - `sm` h-8 px-2.5 rounded about 10px max
  - `xs` h-6 px-2 text-xs
  - `lg` h-10
  - `icon` size-9
  - `icon-sm` size-8

**Badge**:
- Base: `inline-flex h-5 w-fit items-center gap-1 rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap`. This makes a pill.
- Variants:
  - `default` `bg-primary text-primary-foreground`
  - `secondary` `bg-secondary text-secondary-foreground`
  - `outline` `border-border text-foreground`
  - `destructive` `bg-destructive/10 text-destructive`

**Tabs**:
- List: `inline-flex w-fit items-center rounded-lg p-[3px] h-9 bg-muted text-muted-foreground`
- Trigger: `rounded-md px-2 py-1 text-sm font-medium text-foreground/60`
- Active trigger: `bg-background text-foreground shadow-sm`, plus in dark `border-input bg-input/30`

**Input**: `h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-base md:text-sm shadow-xs placeholder:text-muted-foreground focus-visible:ring-3 ring-ring/50 dark:bg-input/30`.

**Switch**: 32×18.4px, `data-checked:bg-primary`, unchecked `bg-input`, thumb 16px.

**Progress**: `h-1.5` (the app uses `h-2`), `rounded-full bg-muted`, with a `bg-primary` indicator.

**Skeleton**: `animate-pulse rounded-md bg-muted`.

**Dialog**:
- Overlay: `bg-black/10 backdrop-blur-xs`.
- Content: `rounded-xl bg-popover p-6 ring-1 ring-foreground/10 sm:max-w-md gap-6`, fade and zoom-in-95. There is a ghost X close button at top-4 right-4.
- Title: `font-heading leading-none font-medium`. Description: `text-sm text-muted-foreground`.
- Footer: `flex flex-col-reverse gap-2 sm:flex-row sm:justify-end`.

**Sheet**:
- Slides from the right by default.
- Content: `fixed inset-y-0 right-0 h-full w-3/4 sm:max-w-sm border-l bg-popover shadow-lg flex flex-col gap-4`, slide-in-from-right-10.
- Header: `p-4 flex flex-col gap-1.5`. Footer: `mt-auto p-4 flex flex-col gap-2`.
- Title: `font-heading font-medium text-foreground`.

**Select popover**: frosted `bg-popover/70 backdrop-blur-2xl`, ring-foreground/10, items highlight `bg-foreground/10`.

**Coupon code chip (inline code)**: `<code class="text-xs bg-muted px-1.5 py-0.5 rounded">CAMILA10</code>` (dashboard) or `Badge variant=secondary font-mono text-[10px]` (vendas).

### 1.5 Chart styling (Recharts 3, `dash-page.tsx`)
```
<ResponsiveContainer width="100%" height={200}>
 <LineChart data={…}>
  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>   // NOTE: invalid colour (the var is oklch) → grid effectively invisible; replicate as very faint dashed lines or omit
  <XAxis dataKey="label" tick={{fontSize:11}}/>          // default recharts tick colour #666
  <YAxis tickFormatter={v=>`R$${v}`} tick={{fontSize:11}}/>   // raw number: "R$3500"
  <Tooltip formatter={v=>[brl(v),"Vendas"]}
     contentStyle={{background:"#18181b",border:"1px solid #ffffff1a",borderRadius:8,fontSize:12}}
     labelStyle={{color:"#fff"}} itemStyle={{color:"#fff"}}/>
  <Line type="monotone" dataKey="total" stroke="var(--color-primary)" strokeWidth={2} dot={{r:3}} activeDot={{r:5}}/>
```
- One series, primary colour (#a800b7 light, #8a0194 dark), no area fill and no gradient. The legend is hidden.
- The tooltip reads, for example, label "22/10" and then "Vendas : R$ 4.512,00".
- Daily labels are `dd/MM` (`toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})`). Monthly labels are the raw `"YYYY-MM"` (for example "2026-05").
- The `components/ui/chart.tsx` (shadcn ChartContainer) exists but is **not used**.
- Masonry (`components/ui/masonry.tsx`) uses `motion`: items fade in (`opacity 0→1`) and slide to position, `duration .3 easeOut`.

### 1.6 Formatting conventions
- Money: `v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})` → `R$ 1.234,56`.
- Counts: `toLocaleString("pt-BR")` → `48.210`. A null value shows "—".
- Dates by location:

| Where | Format | Example |
|---|---|---|
| Dashboard table | dd/MM | `26/10` |
| Vendas | `format(d,"dd MMM, HH:mm",{locale:ptBR})` | `26 out, 14:32` |
| Campaign card | "dd MMM yyyy" | `15 jan 2025 → 15 abr 2025`; the end shows `Sem fim` if null |
| Pending invite | — | `Convidado em 26 de out. de 2026` |
| Notification history | — | `26 de out. de 2026, 14:32` |
| Commission periods | dd/MM/yyyy | `01/10/2026 → em aberto` |
| Plan | — | `Desde 12 de março de 2026` |

- Initials avatar (`UserAvatar`):
  - Container: `rounded-full` (or `rounded-lg`), `bg-muted text-muted-foreground`, initials `text-xs font-medium`.
  - Initials are the first and last name initials ("Camila Ferreira" → "CF"), or the first two letters for a single name.
  - Sizes used: 24, 28, 32, 36, 40, 56, 64.

---

## 2. App shell

### 2.1 Layout (`app/main/layout.tsx`)
```
<SidebarProvider>
  <AppSidebar user={businessProfile}/>
  <main class="flex flex-col flex-1 min-w-0 min-h-svh overflow-hidden">
    <div class="flex-1 overflow-y-auto p-4">{page}</div>     // pages add their own p-3/p-4 → ~28–32px total gutter
  </main>
</SidebarProvider>
```
- There is **no top bar**. `AppHeader` is commented out.
- The page content is full-width, fluid, and has no max-width.

### 2.2 Sidebar (`components/app-sidebar/app-sidebar.tsx`)
- Setup: `<Sidebar side="left" variant="sidebar" collapsible="icon">`.
  - Widths: `--sidebar-width: 16rem`, `--sidebar-width-icon: 3rem`, mobile sheet `18rem`.
  - Background: `bg-sidebar` (light #fafafa, dark the same as the page). There is a right border (sidebar-border).
- **Header (expanded):** one row, `flex flex-row items-center gap-4`, containing:
  - Logo `<img src="/android-chrome-512x512.png" class="size-8">`. The logo is a **deep purple square, about #6a0d8f**, with a white stylised "R" made of two quarter-circle shapes and a white 4-point sparkle star at the top right.
  - `<label class="font-bold">ROINFLUENCER</label>`
  - A vertical `Separator`
  - `<SidebarTrigger/>` (ghost icon button, lucide `PanelLeft` icon)
- **Header (collapsed):** only the 32px logo.
- A horizontal `Separator` sits under the header.
- **Menu:** one `SidebarGroup` with no group label. Each item is a `SidebarMenuItem class="mb-3"` (12px gap between items) containing a `SidebarMenuButton` (h-8, rounded-md, p-2, text-sm, gap-2, icon size-4). The order is exact:

| # | Label | lucide icon | Route |
|---|---|---|---|
| 1 | Dashboard | `LayoutDashboard` | /main/dashboard |
| 2 | Influencers | `Users` | /main/influencers |
| 3 | Notificações | `Bell` | /main/notificacoes |
| 4 | Comunidade | `Contact` | /main/comunidade |
| 5 | Vendas | `ShoppingBag` | /main/vendas |
| 6 | Ranking | `TrendingUp` | /main/ranking |
| 7 | Integrações | `Zap` | /main/integracoes |

  - Active state (`pathname.startsWith(link)`): `bg-sidebar-accent font-medium`. The icon `color="var(--sidebar-primary)"` and the label get `text-sidebar-primary`, so the active item is **fuchsia** (light #c800de, dark #e12afb) on a zinc-100 or zinc-800 pill.
  - Hover: `bg-sidebar-accent`.
  - When collapsed, the buttons become 32×32 icons with tooltips.
- **Footer:** a `SidebarMenuButton size="lg"` (h-12) that opens a DropdownMenu. It contains:
  - `UserAvatar` 32px, `rounded="lg"`, **`grayscale`** (the business logo or initials)
  - A text block `grid flex-1 text-left text-sm leading-tight`: name `truncate font-medium` and email `truncate text-xs text-muted-foreground`
  - `ChevronsUpDown` at `ml-auto size-4`
- **Dropdown** (`min-w-56 rounded-lg`, align end):
  - A label row with avatar, name and email
  - Separator
  - `User` icon with "**Account**", which goes to /main/config
  - Separator
  - `LogOut` icon (red, `var(--destructive)`) with "**Log out**"

  These two labels are in English in the real app. **Configurações is only reachable through "Account"**; it is not in the sidebar list.
- Mock profile for the demo: name "Olway Store", email "contato@olway.com.br". Avatar: initials "OS", or a small logo.

---

## 3. Screen inventory

All pages share these traits:
- Root `div.flex.flex-col.gap-6.p-4` (or `p-3`).
- The page title label described in §2.
- A `SidebarTrigger size="lg"` before the title when the sidebar is collapsed.

---

### S01 Dashboard (`/main/dashboard`, `dash-page.tsx`)
**Purpose:** a one-glance view of sales and commissions generated through influencer coupons.

**Layout (top to bottom):**
1. **Title**: "DASHBOARD".
2. **KPI row**: `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3`. Five tiles (KPI tile pattern from §1.4), each with label, value and sub-text:
   - "Total Comissão": `brl(total_commission)`, sub "em vendas pagas"
   - "Total Vendas": `brl(total_sales)`, sub "`{total_orders} pedidos`"
   - "ROI": `` `${roi}x` `` (for example "10.3x"), sub "retorno sobre comissão"
   - "Ticket Médio": `brl(avg_ticket)`, sub "por pedido"
   - "Influencers": `active_influencers`, sub "conectados ativos"
3. **Charts row**: `grid grid-cols-1 lg:grid-cols-2 gap-4`, two Cards.
   - Card A header (`flex flex-row items-center justify-between pb-2`):
     - CardTitle `text-sm font-medium text-muted-foreground` "**Vendas por dia**"
     - On the right, segmented buttons **"7d" "15d" "30d"**. Each is a `Button size=sm h-6 px-2 text-xs`; the active one is `variant=default` (fuchsia fill) and the others are `outline`.
     - Body: a 200px line chart.
   - Card B: "**Vendas por mês**" with buttons **"3m" "6m" "12m"**.
   - Defaults are 7d and 6m. Changing a period updates the URL `?days=15&months=12` and refetches. For the replica, swap the dataset instantly and maybe animate the line.
4. **Bottom row**: `grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4`.
   - **Card "Últimas vendas"** (CardContent `p-0`). The table has 7 columns:

     | Column | Cell content and style |
     |---|---|
     | Data | `dd/MM`, `text-muted-foreground text-xs` |
     | ID Externo | `font-mono text-xs`, for example "#54230" |
     | Influencer | name |
     | Cupom | `<code class="text-xs bg-muted px-1.5 py-0.5 rounded">` |
     | Plataforma | pill `text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded font-medium`, for example "Nuvemshop" |
     | Valor | right-aligned, `font-medium` |
     | Comissão | right-aligned, `text-green-400` |

     - Cancelled orders (status not 'open' or 'paid'): the row is `opacity-50`, and ID, Valor and Comissão are `line-through text-muted-foreground`.
     - For cancelled orders the Plataforma cell shows a red pill `bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400` with the raw status text (for example "cancelled" or "refunded").
     - The table holds 10 rows.
   - **Card "Top influencers"**. The table has 3 columns:
     - "Influencer": avatar 32 plus name `text-sm font-medium leading-none` and "`{n} pedidos`" in `text-[11px] text-muted-foreground mt-0.5`
     - "Vendas": right-aligned, `font-medium text-sm`
     - "Comissão": right-aligned, `text-green-400 text-sm`
     - It shows the top 5.

**States:**
- Loading skeleton:
  - Header: an 8×8 block plus a 4×24 line
  - Five KPI tiles with three skeleton lines each
  - Two cards, each with a title bar, three 6×8 pill skeletons and a 200px block
  - A table skeleton with 7 columns × 8 rows, and a top list with 5 rows (avatar circle plus two lines)
- Empty: there is no dedicated empty state. KPIs show R$ 0,00 or 0, the charts are flat and the tables are empty.

---

### S02 Influencers (`/main/influencers`, `influencers/client-page.tsx`)
**Purpose:** manage the influencers connected to the store, plus their coupons and commission rules, and see each one's monthly sales and commission.

**Header row** (`flex justify-between`):
- Left: the title "INFLUENCERS" followed by a lucide `BadgeQuestionMark` icon at size 16 (inline).
- Right (`flex gap-2`):
  - `Button outline sm` with a `Clock` icon and "**Convites**". If there are pending invites, a badge sits at the absolute top-right corner (`-top-2 -right-2 h-5 min-w-5 px-1 text-[10px] bg-yellow-500 text-white border-0`) with the count.
  - `Button sm` (primary) with a `Plus` icon and "**Adicionar Influencer**", which opens dialog D1.

**Filters** (`flex flex-col gap-3`):
- A radio row (`flex items-center gap-5`) with native radios (`accent-primary`), labels `text-sm text-muted-foreground`: "**Mês / Ano**" (default) and "**Período personalizado**".
- An input row (`flex gap-3 items-center flex-wrap`):
  - `Input placeholder="Buscar influencer..." class="max-w-xs"`. It filters on the client by name, @instagram or coupon code.
  - Month mode: a Select `w-[140px]` with months "Janeiro"…"Dezembro" (default: the current month, for example "Outubro"), and a Select `w-[100px]` with the last 5 years (2026, 2025, …). Changing either refetches and shows a spinner (`Loader2`) inline.
  - Period mode: an outline button `w-[150px]` with `CalendarIcon` and "De", then the text "até", then a button with "Até" (Calendar popovers in ptBR that disable future dates), then a `Button sm` "**Filtrar**" (disabled until both dates are set; shows a spinner while loading).

**Table** (bare, not inside a Card). The columns are: **Influencer | Cupons | Seguidores | Posts | Vendas | Comissão | Ações** (Ações is right-aligned).
- Influencer: avatar 36 (initials `font-semibold`), name `font-medium text-sm`, then `@instagram` in `text-xs text-muted-foreground`.
- Cupons: wrap of pills `text-xs px-2 py-0.5 rounded-full border font-mono`.
  - Active: `border-green-500 text-green-600 dark:text-green-400`. Inactive: `border-muted text-muted-foreground`.
  - Each pill holds the code and then `<span class="ml-1 text-[10px] opacity-60">10%</span>`.
  - With no coupons, the cell shows "Nenhum".
- Seguidores: `nf(followers_count)`, `text-sm font-medium`, for example "48.210".
- Posts: `nf(posts_count)`, the count of posts that mention the business.
- Vendas: `brl(vendas_mes)`.
- Comissão: `brl(comissao_mes)`, `font-medium text-green-400`.
- Ações: three `Button ghost sm` icons:
  1. `LayoutDashboard` (title "Ver métricas de Instagram") links to the S06b detail.
  2. `Pen` opens sheet SH2 (coupons).
  3. `Trash2` in `#C62828` removes the influencer **immediately**, with no confirmation and a spinner while working.
- While refetching, the tbody is `opacity-50 pointer-events-none`.
- Empty: one row, colSpan 7, "**Nenhum influencer encontrado**", `py-12 text-center text-sm text-muted-foreground`.

**D1 Dialog "Adicionar Influencer"** (content centred, `flex flex-col items-center gap-4`):
- Title "**Adicionar Influencer**". Description "**Digite o código do influencer para conectá-lo à sua conta.**"
- **8-slot OTP input**: two groups of four slots (`h-10 w-10 text-lg`) with an `InputOTPSeparator` (a dot) between them. Codes look like `AB12-CD34`; pasting strips dashes and spaces.
- `Button outline w-full` "**Pesquisar**", disabled until all 8 characters are typed, with a spinner while searching.
- Error boxes (`w-full rounded-md px-4 py-3 text-sm`):
  - duplicate: `bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400` "⚠️ Este influencer já foi convidado para sua conta."
  - not_found: `bg-destructive/10 border-destructive/30 text-destructive` "Código inválido. Verifique e tente novamente."
  - unknown: "Ocorreu um erro inesperado. Tente novamente."
- When found:
  - A Card `w-full p-4` holding a 56px avatar, the name `text-lg font-semibold` and `@instagram` in `text-sm text-muted-foreground`.
  - Then a `Button w-full` "**Adicionar**".
  - On success the dialog closes and **sheet SH1 opens automatically** with the new pending invite.

**SH1 Sheet "Convites pendentes"** (right side, `p-4 gap-4`):
- Title: `Clock` icon (16, `text-yellow-500`) with "**Convites pendentes**". Description "**Estes influencers ainda não aceitaram o convite.**"
- List rows (`flex items-center gap-3 border rounded-lg px-3 py-3`): a 40px avatar, the name (`text-sm font-medium`), the @handle (`text-xs muted`), and "Convidado em 26 de out. de 2026" (`text-[11px] text-muted-foreground/60`). On the right is an X ghost icon button (cancel invite; hover destructive).
- Empty: a 32px `Clock` icon at muted/40 and "**Nenhum convite pendente.**"

**SH2 Sheet "Cupons de {Nome}"** (right, `sm:max-w-sm`, `p-4 gap-6`):
- Description: "**Gerencie os cupons e comissões deste influencer.**"
- Section Label "**Cupons cadastrados**". With no coupons it shows "Nenhum cupom cadastrado."
- Each coupon is a box (`border rounded-lg overflow-hidden`):
  - Header (`px-3 py-2 bg-muted/30`): the code (`font-mono text-sm font-semibold`, for example "CAMILA10"), then on the right a **Switch** (active or inactive toggle) and a trash icon (#C62828).
  - Commission periods (`divide-y`):
    - Read mode row: the percent in `text-sm font-medium`, for example "10%". Below it is `text-[11px] muted`, for example "01/10/2026 → **em aberto**". "em aberto" is `text-green-500 font-medium`, and a null start shows "Início". On the right are Pen and Trash icons.
    - Edit mode (`bg-muted/20 px-3 py-3`): a % number input (`w-24 font-mono h-8`, with "%" suffix), date buttons "De" and "Até" (`h-8 text-xs min-w-[110px]`), then `Button sm flex-1` "**Salvar**" and a ghost "**Cancelar**".
    - With no periods: "Sem períodos cadastrados."
  - A footer link-button (`text-xs muted`, hover foreground) with `Plus` and "**Adicionar período**". It opens an inline form like edit mode whose button says "**Salvar período**".
- Section Label "**Adicionar cupom**":
  - Input placeholder "**Ex: GABRIEL10**" (`font-mono`, uppercases automatically)
  - Number input placeholder "**Comissão %**" with a "%" suffix
  - Two date buttons: "**De (opcional)**" and "**Até (opcional)**"
  - Errors (`text-xs text-destructive`): "Este código já está cadastrado nesta conta." and "Este influencer ainda não aceitou o convite. Aguarde a confirmação antes de adicionar cupons."
  - `Button w-full` with `Plus` and "**Adicionar cupom**"

**Loading skeleton:** header; a "Convites pendentes" line with two pill skeletons; a Card table skeleton (5 columns × 7 rows, avatar circle, two pill skeletons in the coupons column, two square action skeletons).

---

### S03 Notificações (`/main/notificacoes`, `notificacoes/client-page.tsx`)
**Purpose:** send push notifications to influencers' phones (through the ROInfluencer mobile app, Expo push), segment the audience, and see the send history. On plans this is a Pro feature: "Notificações Push", "2 disparos personalizados/mês".

**Title:** a `Bell` icon (16) followed by "NOTIFICAÇÕES".

**Tabs:** "**Enviar**" | "**Histórico**". Histórico carries a count badge (`Badge secondary ml-2 h-5 px-1.5 text-[10px]`).

**Tab Enviar.** Grid `grid-cols-1 lg:grid-cols-[1fr_360px] gap-6`.
- Left column (`flex flex-col gap-6`):
  1. **Card "Destinatários"** (`p-4 flex flex-col gap-4`; heading Label `text-sm font-semibold`):
     - Target chips (rounded-full pill buttons):
       - Base: `flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm`
       - Active: `border-primary bg-primary/10 text-primary font-medium`
       - Inactive: `border-muted text-muted-foreground hover:bg-muted/40`
       - The chips are: `Users` "**Todos (N)**" (N is the number of influencers with the app installed), `Users` "**Grupo**", and `User` "**Específicos**".
     - With Grupo selected: a Select (flex-1, placeholder "Selecione um grupo") with items "`{name} · {count}`", plus `Button outline sm` with `Plus` and "**Novo grupo**", which opens D2.
     - With Específicos selected:
       - Input "Buscar influencer..." (`max-w-xs`), then a scroll list (`max-h-64 border rounded-lg p-2`).
       - Each row has a Checkbox, a 28px avatar, the name and @handle, and on the right a platform icon: `Apple` (muted) for iOS or `Smartphone` (green-600) for Android.
       - Influencers without the app are shown at `opacity-50`, disabled, with the text "sem app" (`text-[10px]`).
     - A footer line in `text-xs text-muted-foreground`: "Alcance estimado: **{n}** influencer(s) com o app instalado."
  2. **Card "Conteúdo"**:
     - "Título": Input, placeholder "Título da notificação", max 100.
     - "Subtítulo · iOS": the "· iOS" part is muted, followed by an `Info` tooltip "Aparece acima do título. Só é exibido no iOS — o Android ignora este campo." Input placeholder "Subtítulo (opcional)".
     - "Mensagem *": Textarea, 3 rows, placeholder "Escreva a mensagem...", max 800 characters and 20 lines. Below it a row: "Máximo 20 linhas." on the left and the counter "0/800" on the right (it turns destructive at the limit).
     - A dashed info box (`rounded-lg border border-dashed p-3 text-xs muted`) with an `Info` icon: "Ao tocar na notificação, o influencer é levado para a tela **Solicitações** com a aba **Notificações** ativa."
  3. **Send row**:
     - `Button size=lg` with a `Send` icon and "**Enviar para {n} influencer(s)**". It is disabled if the message is empty or n=0, and shows a spinner while sending.
     - Success inline: `CheckCircle2` with "**Notificação enviada!**" (green). It auto-hides after 3.5s, and the title, subtitle and body are cleared.
     - Errors (red `XCircle`): "Você atingiu o limite de notificações do seu plano este mês." or "Não foi possível enviar a notificação. Tente novamente."
- Right column (`lg:sticky lg:top-4`): **live preview**.
  - Label "PREVIEW" (`text-xs uppercase tracking-widest muted`).
  - A segmented toggle (`flex rounded-md border p-0.5`) with two buttons: `Apple` "iOS" and `Smartphone` "Android". The active one is `bg-muted font-medium`.
  - **iOS mock**: outer `rounded-[28px] bg-gradient-to-b from-muted/60 to-muted/20 p-4 border`; inner `rounded-2xl bg-background/95 backdrop-blur shadow-sm border p-3 flex gap-3`. It contains:
    - A 36×36 `rounded-lg bg-primary/20` square with a fuchsia `Bell`
    - "ROINFLUENCER" (`text-[11px] uppercase muted`) with "agora" on the right
    - The optional subtitle (11px muted)
    - The title (`text-sm font-semibold`)
    - The body (`text-xs muted line-clamp-2`)
  - **Android mock**: outer `rounded-2xl bg-gradient-to-b from-green-950/20 to-muted/20 p-4 border`; inner `rounded-xl` card. It has a header row with a 20px `bg-green-600/20` box holding a green Bell, "ROINFLUENCER · agora", then the title (semibold) and the body (`line-clamp-3`).
  - The placeholders are "Título da notificação" and "Prévia da mensagem aparece aqui."
  - Caption below, depending on the OS: "No iOS o subtítulo aparece entre o app e o título." or "No Android o subtítulo é ignorado; o app aparece como cabeçalho."

**D2 Dialog "Criar grupo"**:
- Description "Agrupe influencers para enviar notificações em lote."
- An Input "Nome do grupo", then a checkbox list of all influencers (`max-h-60 border rounded-lg p-2`; avatar 28, name and @handle).
- Footer: `Button` "**Criar grupo ({n})**", disabled until there is a name and at least one person is selected.
- After creation, the new group is auto-selected with target=Grupo.

**Tab Histórico.** Table columns: **Data | Mensagem | Público | Enviados (center) | Falhas (center) | Status**.
- Data: `text-xs muted`, for example "26 de out. de 2026, 14:32".
- Mensagem: the title in `text-sm font-medium truncate` (or "(sem título)"), then the body in `text-xs muted truncate`, max-w 320.
- Público: "Todos", "Grupo: VIPs" or "3 influencers".
- Enviados: "delivered/recipients", for example "42/45".
- Falhas: red if above 0, otherwise a muted "0".
- Status: a pill `inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border` with an icon:

  | Label | Icon | Colour |
  |---|---|---|
  | "Enviado" | `CheckCircle2` | green-600/400, border-green-500/40 |
  | "Parcial" | `AlertTriangle` | yellow |
  | "Falhou" | `XCircle` | destructive |
  | "Agendado" | `Clock` | blue |

- Rows are clickable and open **SH3 Sheet "Detalhe do envio"** (`sm:max-w-md`):
  - The description is the date and time.
  - Three stat boxes (`border rounded-lg py-2 text-center`): "Público", "Enviados", "Falhas".
  - Then the label "Payload Expo" and a `<pre>` JSON block (`text-[11px] font-mono bg-muted/40 rounded-lg p-3`).
- Empty: "Nenhuma notificação enviada ainda."

**Loading skeleton:** title, a tabs bar, then the two-column grid: four form-card skeletons on the left and, on the right, a 4×20 label plus a 40-tall `rounded-[28px]` block.

---

### S04 Comunidade (`/main/comunidade`, `comunidade-client.tsx`)
**Purpose:** Instagram reach of the community: followers and posts that mention the brand, per influencer.

- Title: "COMUNIDADE".
- Filters are identical to S02: the "Mês / Ano" / "Período personalizado" radios, "Buscar influencer...", month and year selects, or De/até/Até with "Filtrar".
- Table (bare). Columns:
  - "Influencer": avatar 36, name, @handle
  - `Users` icon with "Seguidores"
  - `Images` icon with "Posts"
  - "Detalhe" (right-aligned)
- Cells: followers `text-sm font-medium` (for example "48.210"); posts `text-sm`; Detalhe is `Button ghost sm` "**Ver**" with `ChevronRight`, which goes to S04b.
- Empty: "Nenhum influencer encontrado".
- Loading: a table skeleton with 4 columns.

### S04b Influencer Instagram detail (`/main/comunidade/influencer/[id]`, `detail-client.tsx`)
- Top: `Button ghost sm` with `ArrowLeft` and "**Comunidade**" (back link).
- Profile header (`flex items-center gap-4`):
  - A 64px avatar
  - `h1 text-xl font-semibold` with the name
  - "`@username · BUSINESS`" (`text-sm muted`; the account type comes from IG, for example "BUSINESS" or "CREATOR")
  - "Sincronizado em 25/10/2026" (`text-[11px] text-muted-foreground/60`)
- Date filter: "De" / "até" / "Até" buttons, then "**Filtrar**", plus a ghost "**Limpar**" when any date is set.
- **Metric cards**: `grid grid-cols-2 lg:grid-cols-4 gap-4`, Card pattern from §1.4. There are five cards, so they wrap to 4 + 1:
  - `Users` "Seguidores": value, plus a trend line "+1.204 no período" (green with `TrendingUp`, or red with `TrendingDown`)
  - `AtSign` "Menções" (the total)
  - `Images` "Posts"
  - `Film` "Reels"
  - `AtSign` "Stories"
- **"MENÇÕES"** section: a table with columns Data | Legenda | Link (right). It shows only the first 3 media items.
  - Data: `dd/MM/yyyy`
  - Legenda: caption, truncated to max-w-md (if empty, an italic kind label)
  - Link: a ghost `ExternalLink` icon pointing to the Instagram permalink
  - Empty: "Nenhuma menção no período"
- **"MÍDIAS"** section: a **Masonry gallery**.
  - Columns: base 2, sm 2, md 3, lg 4. Gap 12px.
  - Tile: `rounded-lg overflow-hidden border bg-card`.
  - Media height: width × 1 for `post` and `post_mention` (square); width × 1.45 for reels and stories (portrait).
  - A kind badge sits at the absolute top-2 left-2 (`text-[10px] text-white border-0`):

    | Kind | Label | Colour |
    |---|---|---|
    | post | "Post" | `bg-blue-600` |
    | reels | "Reels" | `bg-fuchsia-600` |
    | story_mention | "Story" | `bg-amber-500` |
    | post_mention | "Menção · Post" | `bg-emerald-600` |
    | reel_mention | "Menção · Reel" | `bg-rose-600` |

  - Optional footer (`px-2 py-2 text-[11px] muted`, right-aligned): `Heart` with likes and `MessageCircle` with comments.
  - Videos (reels and stories) autoplay muted on loop as thumbnails. When there is no media, a `PlayCircle` with "Ver Reel" / "Ver publicação" or an `AtSign` with "Story expirada / indisponível" / "Sem prévia" is shown.
  - Tiles fade in through `motion`.
  - Empty: "Nenhuma mídia no período".
- **Media modal** (Dialog `max-w-md p-0 border-0 bg-black`):
  - The media at full size (or the official IG embed iframe, 600px tall).
  - A footer bar (`bg-card px-4 py-3 text-xs`) with the kind badge, the date, and on the right `ExternalLink` "**Ver no Instagram**".
  - The caption below (`text-sm text-foreground/80 whitespace-pre-wrap`).
- No-data state: "Sem dados de Instagram para este influencer, ou acesso não permitido."
- For the replica, use Unsplash-style lifestyle/product photos in a mix of square and portrait. The masonry is very visual and sells well.

---

### S05 Vendas (`/main/vendas`, `vendas-client.tsx`)
**Purpose:** the full ledger of orders attributed to influencer coupons, with filters and a CSV export.

**Header:** "VENDAS" on the left; on the right `Button outline sm` with `Download` and "**Exportar CSV**".
- The CSV is `;`-separated with headers `Data;ID Pedido;Influencer;Cupom;Plataforma;Status;Valor;Comissão`.
- The file is named `vendas_YYYY-MM-DD.csv`. Only the current page is exported.

**Filters** (`flex flex-wrap gap-3`):
- Two native `Input type=date`, each `w-[155px]` (from and to)
- `Input placeholder="ID do pedido..." w-[180px]` (it searches as you type)
- `Select w-[160px]` with items "**Todos os cupons**" followed by each active coupon code

Each change resets to page 1 and refetches.

**Summary bar** (`flex flex-wrap gap-6 text-sm`, plain text with no cards):
- "Total Vendas: **R$ 390.037,27**"
- "Total Comissões: **R$ 37.942,49**" (the value is `font-semibold text-green-400`)
- "Pedidos: **1700**" (the raw number, not localised)
- A spinner while loading

**Table inside a Card.** Header cells are `text-xs`. Columns: **Data | ID Pedido | Influencer | Cupom | Plataforma | Valor (right) | Comissão (right)**.

| Column | Cell content and style |
|---|---|
| Data | "26 out, 14:32", `text-xs muted` |
| ID Pedido | `text-xs font-mono muted` |
| Influencer | 24px avatar plus `text-xs` name |
| Cupom | `Badge secondary font-mono text-[10px]` |
| Plataforma | `Badge secondary text-[10px]`; when the store is "nuvemshop" (case-insensitive) it is blue (`bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300`); cancelled orders get the red status badge |
| Valor | `text-xs` |
| Comissão | `text-xs font-medium text-green-400` |

- Cancelled rows: the same strikethrough and opacity treatment as the dashboard.
- Empty (inside the Card): a `PackageOpen` icon (h-12, muted/40) and "**Nenhuma venda encontrada**", py-16.

**Pagination** (centred, 15 per page; shown only if there is more than one page):
- `Button outline sm` with `ChevronLeft` and "**Anterior**"
- Page numbers as `w-8 h-8` buttons; the active one is primary. Ellipsis "…" collapses the rest: it shows 1, the current page ±1, and the last page.
- "**Próximo**" with `ChevronRight`

**Loading skeleton:** header; a 4-tile summary grid (`grid-cols-2 sm:grid-cols-4`, same tile style as the KPIs); five filter skeletons; a 7-column table skeleton. The skeleton suggests a 4-KPI header. The real page shows the plain-text summary, but **the replica can use 4 KPI tiles** (Total Vendas, Total Comissões, Pedidos, Ticket Médio) for a nicer look.

---

### S06 Ranking (`/main/ranking`, `ranking-client.tsx`)
**Purpose:** a gamified influencer leaderboard and **sales campaigns with prizes by position**.

**Header:** "RANKING" on the left; on the right `Button sm` with `Plus` and "**Criar Campanha**".

**Tabs:**
- "**Ranking Geral**"
- "**Campanhas**", followed by a count pill `ml-1.5 text-[10px] bg-primary text-primary-foreground rounded-full px-1.5`

**Tab Ranking Geral.** A table inside a Card, top 50. Header cells are `text-xs`: **# (w-60px) | Influencer | Pedidos (right) | Vendas (right) | Comissão (right)**.
- Position badge (`inline-flex w-6 h-6 rounded-full text-xs font-bold`):

  | Position | Classes |
  |---|---|
  | 1 | `bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300` |
  | 2 | `bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300` |
  | 3 | `bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300` |
  | 4+ | plain `text-xs muted` number |

- Row accent: 1st `border-l-2 border-l-yellow-400`, 2nd `border-l-slate-400`, 3rd `border-l-orange-400`.
- Influencer cell: 32px avatar; for #1 a `Crown` icon (`h-3.5 text-yellow-500`) before the name; name `text-sm font-medium`.
- Pedidos: `text-xs muted`. Vendas: `text-sm`. Comissão: `text-sm font-medium text-green-400`.
- Empty: a `Trophy` icon (h-10, muted/40) and "Nenhuma venda registrada ainda".

**Tab Campanhas.** `grid grid-cols-1 lg:grid-cols-2 gap-4` of **CampaignCard**s. Each card is a Card `p-5 space-y-4`, and **the order inside is unusual: prizes first, the name in the footer**.
1. "Prêmios" (`text-xs font-medium muted mb-2`) and a wrap of `Badge secondary text-xs font-normal py-1` badges, each holding a medal emoji (🥇🥈🥉, then 🏅 for the 4th onward) and the prize label:
   - "1º lugar — R$ 500"
   - "2º–3º lugar — 10%"
   - "4º–5º lugar — Frete grátis"
   - "1º lugar — Kit exclusivo" (produto)
2. A `Separator`.
3. A mini ranking table: **# | Influencer | Vendas | Comissão**. It has 24px avatars, all text in `text-xs`, the same position badges, and green commission. With no data: "Nenhuma venda registrada".
4. Footer (`flex justify-between`):
   - Left: the name in `font-semibold text-sm` (for example "Black Friday 2025"), then the dates in `text-xs muted`: "20 nov 2025 → 05 dez 2025".
   - Right: a status Badge and a ghost `MoreHorizontal` (h-7 w-7) dropdown with "Editar" (`Pencil`), a separator, and "Excluir" (`Trash2`, destructive).
   - Status badges:

     | Status | Label | Classes |
     |---|---|---|
     | active | "Ativa" | `bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300` |
     | paused | "Pausada" | yellow-50/700 |
     | finished | "Encerrada" | `bg-muted text-muted-foreground` |
     | draft | "Rascunho" | muted |
     | cancelled | "Cancelada" | red-50/700 |

- Delete opens an AlertDialog:
  - Title "Excluir campanha?"
  - Description "A campanha **{nome}** e todos os seus participantes serão removidos. Esta ação não pode ser desfeita."
  - Buttons "Cancelar" and a destructive "Excluir"
- Empty tab: a `Trophy` icon, "Nenhuma campanha criada ainda", and `Button outline sm` with `Plus` and "Criar primeira campanha".

**SH4 Sheet "Criar Campanha" / "Editar Campanha"** (right, `sm:max-w-[520px]`; the body scrolls with `px-4 space-y-5`):
1. "Nome": Input, placeholder "Ex: Black Friday 2025".
2. "Descrição": Textarea, 2 rows.
3. (Edit mode only) "Status": a Select with Ativa, Pausada, Encerrada, Rascunho and Cancelada.
4. "Período": two outline buttons (`flex-1`) with `CalendarIcon` and "Início" or "Fim", which open Calendar popovers. They then show "dd/MM/yyyy".
5. "Prêmios": a list of prize boxes (`flex flex-col gap-2 p-3 rounded-lg border bg-card`). Each box holds:
   - An Input "Título do prêmio (ex: Campeão de vendas)" (h-8 text-xs)
   - A row with:
     - A 130px block of two number inputs labelled "De" and "Até" (`text-[10px] muted`), for positions with a minimum of 1
     - A Select of reward type: "Valor em R$", "Porcentagem", "Produto", "Frete grátis"
     - An Input "Valor / Descrição"
     - A ghost trash icon
   - Below the list: `Button outline sm` with `Plus` and "Adicionar prêmio".
6. "Influencers participantes": a bordered box containing:
   - A search Input "Buscar..." with a `Search` icon inside on the left (h-8 pl-8 text-xs)
   - A scroll list (`max-h-[200px]`). Each row is clickable (`px-3 py-2 rounded-md`; selected `bg-primary/5`) and holds a Checkbox, the coupon code as `Badge secondary font-mono` (for example "CAMILA10"), a 24px avatar and the name (`text-xs muted`). **An influencer with N coupons appears N times**: the selection is per coupon.
   - Below: "3 influencers selecionados".
   - Empty search: "Nenhum influencer encontrado".
7. Error line (`text-destructive border-t`), with validation messages such as:
   - "Informe o nome da campanha."
   - "Selecione ao menos um influencer."
   - "Adicione ao menos um prêmio."
   - "A data de fim não pode ser anterior à data de início."
   - "Posição final do prêmio deve ser ≥ posição inicial."
8. Footer (`border-t flex-row justify-end`): `outline` "Cancelar" and a primary "**Criar campanha**" (or "**Salvar alterações**" when editing). The primary is disabled until there is a name, at least one prize and at least one influencer.

A new campaign is inserted at the top of the list with status "Ativa".

---

### S07 Integrações (`/main/integracoes`, `integrations.tsx`, `txdialog.tsx`)
**Purpose:** connect the store and data sources, and configure payment-fee rates (fees reduce the net value that commission is computed on).

- Title: "INTEGRAÇÕES".
- Row 1: `grid grid-cols-3 gap-4` (fixed 3 columns), holding a single card:
  - **Taxas**: CardContent with a `Settings` icon (32) and CardTitle "Taxas". CardDescription "Configure as Taxas dos seus pedidos!" CardFooter has `Button w-full` "**Configurar**", which opens D3.
- A horizontal `Separator`.
- Row 2: `grid grid-cols-3 gap-4`. Each card is `h-full` with content `flex flex-col gap-2 flex-1` and footer buttons at `w-full`.
  1. **NuvemShop**:
     - Logo image (h-10; the blue Nuvemshop "nuvem" cloud logo) plus title "NuvemShop", with a Badge below.
     - Badges: connected is `bg-green-600` "**Conectado**"; disconnected is outline "**Desconectado**".
     - Description: "Sincronize os pedidos da sua loja NuvemShop", where the link is `underline text-sidebar-primary`.
     - While disconnected:
       - FieldLabel "Link da loja"
       - Input placeholder "exempleloja.lojavirtualnuvem.com.br"
       - FieldDescription with the same text
       - Footer `Button` "**Conectar**", which leads to the Nuvemshop OAuth flow
     - While connected: the footer is an outline button in `text-destructive` with `Unplug` and "**Desconectar**". It opens an AlertDialog "Desconectar NuvemShop?" with "Isso vai remover o token de acesso. Novos pedidos não serão mais sincronizados. Você pode reconectar a qualquer momento." and the buttons "Cancelar" and a destructive "Desconectar".
  2. **Instagram**:
     - A `Camera` icon (40, `text-pink-600`), title "Instagram", and a badge: connected `bg-green-600` "**@olwaystore**", or "Desconectado".
     - Description "Conecte sua conta profissional para coletar seguidores, posts, reels e menções."
     - Footer: "Conectar" with a `Camera` icon. Disconnect uses an AlertDialog "Desconectar Instagram?" with "Isso remove o token de acesso. A coleta de métricas será interrompida. Você pode reconectar a qualquer momento."
  3. **Pagar.me** (card `opacity-60`): logo, title "Pagar.me", outline badge "**Em breve**". Description "Sincronize os pedidos processados pela Pagar.me". Footer has a disabled "Conectar".
  4. **Cakto** (`opacity-60`): the same layout with "Em breve" and "…processados pela Cakto".

  Because the grid has 3 columns, Cakto wraps to a second line.
- **D3 Dialog "Taxas por meio de pagamento"** (`sm:max-w-sm`):
  - Description "Configure as taxas cobradas pela sua plataforma de pagamento."
  - While loading, a spinner shows.
  - A highlighted box (`rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center gap-4`) with:
    - The label "**Taxa base (Outros)**" (`text-sm font-semibold`) and the sub-text "Incide sobre todas as taxas abaixo"
    - An Input (w-24, centred, semibold, `border-primary/40`, placeholder "0,00")
    - On the right, "−0,00%" (tabular)
  - A grid `grid-cols-3 gap-x-4 gap-y-3`:
    - Header (`text-xs uppercase tracking-wide muted`): "Método" | "Taxa %" (centre) | "/ R$ 100" (right)
    - Rows: "PIX", "Crédito 1x", "Crédito +1x", "Boleto", "Débito". Each has an Input (`h-8 text-center`, placeholder "0,00") and **a live net value per R$100**, computed as `100*(1-taxa/100)*(1-outros/100)` and shown as "R$ 98,01".
  - Footer: outline "Cancelar" and "**Salvar**".
- **OAuth return page** (`/main/integracoes/redirect?status=true|false`):
  - A centred Card `max-w-sm`.
  - A `Check` icon (size-8 green-400) or an `X` icon (destructive).
  - "Voce sera redirecionado em: 15s", counting down, then it navigates back to Integrações.
- Loading: a 3-column grid of card skeletons.
- The legacy mock in `lib/types.ts` (not rendered) lists "Nuvemshop", "Shopify", "WooCommerce" and "Hotmart". There is also a server-side webhook integration, `TeamIcaro-Integration` (PAID → order open, REFUNDED → order refunded). For the deck, the honest list is: **NuvemShop (live), Instagram (live), Pagar.me and Cakto (em breve)**.

---

### S08 Configurações (`/main/config`, `configuracoes-client.tsx`; reached through the sidebar footer "Account")
- Title: "CONFIGURAÇÕES".
- Layout: `flex flex-col md:flex-row gap-6`.
  - Left nav (`md:flex-col gap-1 md:w-[180px]`): buttons "**Perfil**", "**Plano**", "**Segurança**" (`text-sm font-medium px-3 py-2 rounded-lg text-left`). The active one is `bg-primary text-primary-foreground` (a fuchsia filled pill); inactive ones are `text-muted-foreground hover:bg-muted`.
  - Content: `flex-1`.
- **Perfil** (Card `p-6 space-y-6`):
  - A 64px avatar (fallback `bg-primary text-primary-foreground text-lg font-semibold`) and `Button outline sm` "Alterar foto" (disabled).
  - A grid `sm:grid-cols-2 gap-4` of Label and Input pairs:
    - "Nome"
    - "Email" (disabled, `bg-muted`)
    - "Telefone"
    - "Instagram"
    - "Site" (`col-span-2`)
  - `Button` "**Salvar alterações**", then feedback: a green `CheckCircle2` with "Alterações salvas com sucesso." or a red `XCircle` with an error.
- **Plano** (Card `p-6 space-y-6`):
  - An `h3 text-lg font-semibold` "Plano {plan_code}" (for example "Plano roi-pro") and a Badge (`bg-primary/10 text-primary text-xs`) "Ativo" or "Free".
  - "Desde 12 de março de 2026" (`text-xs muted`).
  - Three usage meters. Each has a row `flex justify-between text-sm mb-1` and a `Progress h-2` with a fuchsia bar:
    - "Influencers" "24/100"
    - "Pedidos" "1700/1500"
    - "Notificações (este mês)" "1/2"; "(este mês)" is `text-xs muted`
    - A limit of 0 shows "∞".
  - `Button` "**Fazer upgrade**", which goes to /main/plans.
- **Segurança** (Card `p-6 space-y-4`):
  - Inputs: "Senha atual", "Nova senha", "Confirmar nova senha" (password type).
  - `Button` "**Alterar senha**".
  - Messages: "As senhas não coincidem.", "A senha deve ter pelo menos 6 caracteres.", "Senha alterada com sucesso."
- Loading: a nav skeleton and two card skeletons.

### S09 Planos (`components/plans/plans.tsx`; the target of "Fazer upgrade"; not routed under app/main in the current repo, so it can be included as a bonus slide)
- Title: "PLANOS". Headline `text-2xl font-semibold` "**Escolha o plano ideal para o seu negócio**". Sub-text (`text-sm muted max-w-md`): "Cupons rastreáveis, relatórios em tempo real e gestão completa de influenciadores."
- Three cards (`w-72`), centred and wrapping with a gap of 6. Each card has:
  - The 40px logo
  - The muted "PLANO" label
  - The name in `text-3xl font-bold uppercase`
  - A price box (`bg-muted/40 rounded-lg py-3`)
  - A features list with `CheckCircle2` icons
  - A CTA
- **Basic**: "R$497" "/mês". Features: "300 vendas/mês", "30 influenciadores", "Painel de vendas individual". CTA: outline "Assinar" with `Zap`.
- **ROI Pro** (featured):
  - The name is `text-primary`.
  - The card is `-translate-y-2 border-primary shadow-lg shadow-primary/20 ring-1 ring-primary/30`, and a pill on top reads "✦ Recomendado" (`bg-primary text-[10px] uppercase tracking-widest rounded-full`).
  - "R$1.870" "/mês". Features: "1.500 vendas/mês", "100 influenciadores", "Notificações Push", "2 disparos personalizados/mês", "Painel completo". CTA: primary "Assinar".
- **ROI Elite**: name colour `#C88B00`, "Sob consulta". Features: "Tudo do Pro", "Benefícios exclusivos", "Suporte prioritário", "Personalização completa". CTA: outline "Fale com um atendente" with `MessageCircle`.
- Cards lift on hover (`hover:-translate-y-1`).

---

## 4. Data model (from actions.ts and RPC shapes)

### 4.1 Entities and relations (inferred)
```
business (auth user)  ──< business_influencers (invite: pending/accepted, invited_at) >── influencer
influencer ──< coupons (business-scoped: code UNIQUE per business, is_active) ──< coupon_commissions (percent, valid_from, valid_to|null=open)
orders (external_id, ordered_at, total, status 'open'|'paid'|'cancelled'|'refunded'|..., store_type, source, coupon → influencer)
   commission = net_total × commission% valid at order date; net_total = total minus store_payment_fees (per payment method + "other")
campaigns (name, description, starts_at, ends_at, status, prizes JSON) ──< campaign_participants (influencer_id, coupon_id, status, joined_at)
influencer_groups (name) ──< influencer_group_members (influencer_id)
business_notifications (sent_at, message JSON, audience_label, recipients, delivered, failed, status)
stores (store_type 'NS', store_id, is_synced) ; insta_connection (username, expires_in) ; store_payment_fees
business_kpi_cache (DB-side KPI cache, TTL 5 min, dirty flag)
```
- "Cancelled" in the UI means any status other than `open` or `paid`.
- ROI is shown as `${roi}x` with the sub-text "retorno sobre comissão", which implies **ROI = total_sales ÷ total_commission**.

### 4.2 TypeScript shapes (field names exactly as returned)
```ts
// Dashboard — get_business_kpis_v_r1_0_1
type KPIs = { total_orders:number; total_sales:number; avg_ticket:number; total_commission:number; roi:number; active_influencers:number }
// get_business_sales_by_day_v_r1_0_1 (p_days 7|15|30)
type DailySale = { sale_date:string /*ISO date*/; total_sales:number; total_orders:number }
// get_business_sales_by_month_v_r1_0_1 (p_months 3|6|12)
type MonthlySale = { sale_month:string /*"YYYY-MM"*/; total_sales:number; total_orders:number }
// get_business_last_orders_v_r1_0_1 (p_limit 10)
type LastOrder = { ordered_at:string; external_id:string|null; influencer:string|null; coupon:string|null; platform:string|null; total:number; commission:number; status?:string }
// get_business_top_influencers_v_r1_0_1 (p_limit 5 dashboard / 50 ranking)
type TopInfluencer = RankingRow = { influencer_id:string; avatar_url:string|null; name:string|null; total_sales:number; total_orders:number; total_commission:number }

// Vendas — get_business_orders_v_r1_0_1 (p_limit, p_offset, p_search_id, p_coupon, p_date_from, p_date_to)
type OrderRow = { id:string; ordered_at:string; external_id:string|null; total:number; store_type:string|null; coupon:string|null;
                  influencer_name:string|null; influencer_avatar:string|null; commission:number; status?:string }
type OrdersSummary = { total_orders:number; total_sales:number; total_commission:number }
// returns { summary: OrdersSummary, orders: OrderRow[] }; filter dropdown = active coupon codes string[]

// Influencers — get_business_influencers(p_month 'YYYY-MM' | p_date_from/p_date_to) + get_business_influencers_ig
type CommissionPeriod = { id:string; percent:number|null; valid_from:string|null; valid_to:string|null /*null = em aberto*/ }
type Coupon = { id:string; code:string|null; is_active:boolean; commission:number|null /*current %*/; commissions:CommissionPeriod[] }
type InfluencerRow = { influencer_id:string; name:string|null; instagram:string|null /*"@handle"*/; avatar_url:string|null;
                       coupons:Coupon[]|null; vendas_mes:number|null; comissao_mes:number|null; followers_count:number|null; posts_count:number|null }
type PendingInvite = { influencer_id:string; name:string|null; instagram:string|null; avatar_url:string|null; invited_at:string }
// get_influencer_by_invite_code(p_invite_code 'XXXX-XXXX') → { id, name, instagram, avatar_url }
// mutations: create_business_invite, cancel_business_invite, add_coupon(p_influencer_id,p_code,p_commission_percent,p_valid_from?,p_valid_to?),
//            add_coupon_commission, update_coupon_commission, delete_coupon_commission, toggle_coupon, delete_coupon, remove_business_influencer
// errors: "duplicate_invite", "not_found", "duplicate_coupon", "influencer_not_linked"

// Ranking — get_business_campaigns, get_business_connected_influencers
type Prize = { position_start:number; position_end:number; reward_type:"valor"|"porcentagem"|"produto"|"frete"; reward_value:string; title:string }
type CampaignParticipant = { influencer_id:string; name:string|null; avatar_url:string|null; total_sales:number; total_commission:number; total_orders:number }
type Campaign = { id:string; name:string|null; description:string|null; starts_at:string|null; ends_at:string|null;
                  status:"active"|"paused"|"finished"|"draft"|"cancelled"|null; prizes:string /*JSON of Prize[]*/;
                  ranking:CampaignParticipant[]; participants:{ influencer_id:string; coupon_id:string|null }[] }
type ConnectedInfluencer = { id:string; name:string|null; avatar_url:string|null; coupon:string|null; coupon_id:string|null } // one row PER COUPON

// Notificações
type NotifInfluencer = { influencer_id:string; name:string|null; instagram:string|null; avatar_url:string|null; push_token:string|null /*null = sem app*/; platform:"ios"|"android"|null }
type NotifGroup = { id:string; name:string; influencer_ids:string[] }
type ExpoPushRecord = { title:string|null; body:string; subtitle:string|null; data:{type:"notificacao",screen:"business-request",tab:"notificacoes"}|null;
                        priority:"default"|"normal"|"high"; ttl:number|null; sound:"default"|null; badge:number|null;
                        interruptionLevel:"active"|...; mutableContent:boolean; channelId:"default"|null }
type NotifHistoryRow = { id:string; sent_at:string; message:ExpoPushRecord; audience_label:string; recipients:number; delivered:number; failed:number; status:"sent"|"partial"|"failed"|"scheduled" }
type SendTarget = {type:"all"} | {type:"group";groupId:string} | {type:"custom";influencerIds:string[]}
// send result: { success, recipients, delivered, failed, status, notificationId, error: "quota_exceeded"|... }

// Comunidade — get_business_influencers + get_business_influencers_ig
type ComunidadeRow = { influencer_id:string; name:string|null; instagram:string|null; avatar_url:string|null; followers_count:number|null; posts_count:number|null }
// get_influencer_instagram_detail(p_influencer_id, p_date_from?, p_date_to?)
type InstaMediaKind = "post"|"reels"|"story_mention"|"post_mention"|"reel_mention"
type InstaMediaItem = { id:string; kind:InstaMediaKind; media_type:string|null /*"IMAGE"|"VIDEO"|"CAROUSEL_ALBUM"*/; caption:string|null; permalink:string|null;
                        media_url:string|null; thumbnail_url:string|null; cdn_url:string|null; like_count:number|null; comments_count:number|null; posted_at:string|null }
type InfluencerInstagramDetail = {
  influencer:{ id:string; name:string|null; instagram:string|null; avatar_url:string|null }|null
  connection:{ username:string|null; account_type:string|null; profile_picture_url:string|null; followers_count:number|null; media_count:number|null; last_synced_at:string|null }|null
  followers_current:number|null; followers_start:number|null
  counts:{ posts:number; reels:number; story_mentions:number; post_mentions:number; reel_mentions:number }|null
  media:InstaMediaItem[]; mentions:InstaMediaItem[] } | null
// UI: Posts = posts+post_mentions, Reels = reels+reel_mentions, Stories = story_mentions, Menções = sum; trend = current − start

// Integrações
type StoreInfo = { id:string; store_type:string /*"NS" = NuvemShop*/; store_id:string|null; is_synced:boolean; connected:boolean; created_at:string }
type InstagramConnection = { connected:boolean; username:string|null; expires_in:string|null }
type PaymentFees = { pix:number; credit_card_1x:number; credit_card_installments:number; boleto:number; debit_card:number; other:number } // percents

// Config — get_business_settings
type BusinessSettings = { name; email; phone; instagram; site; avatar_url; subscription_status:"active"|...; subscription_started_at:string|null;
                          plan_code:string|null; max_influencers:number; max_orders:number; max_push:number;
                          influencers_count:number; orders_count:number; notifications_count:number }
type BusinessProfile = { name; email; avatar_url; phone; instagram; site }   // sidebar footer
```

### 4.3 Realistic mock scale (real production reference from `CONTEXTO_R1_0_1.md`)
- The largest real business: **1.700 orders, R$ 390.037,27 in sales, R$ 37.942,49 in commission**. That gives ROI ≈ **10,3x** and an average ticket of about R$ 229.
- Mid-size: 184 orders, R$ 78.580,01 in sales, R$ 10.917,28 in commission (ROI about 7,2x).
- Ready-made mock influencers from `lib/types.ts` (name, @handle, coupon, % commission, monthly sales):

| Name | @handle | Coupon | % | Monthly sales |
|---|---|---|---|---|
| Camila Ferreira | @camilafer | CAMILA10 | 10% | 18.450 |
| Lucas Mendes | @lucasm | LUCAS15 | 15% | 15.200 |
| Beatriz Santos | @biasantos | BIA20 | 15% | 12.800 |
| Rafael Costa | @rafacosta | RAFA10 | 10% | 11.300 |
| Juliana Alves | @jualves | JU15 | 15% | 9.870 |
| Thiago Ribeiro | @thiagor | THIAGO10 | 10% | 8.450 |
| Mariana Oliveira | @marioli | MARI20 | 20% | 7.200 |
| Pedro Nascimento | @pedron | PEDRO10 | 10% | 5.930 |
| Ana Clara Lima | @anaclara | ANA15 | 15% | 4.200 |
| Gabriel Souza | @gabsouza | GABI10 | 10% | 3.800 |

- Pending invites: Fernanda Guimarães @fernandagui, Diego Martins @diegomartins, Isabela Rocha @isabelar.
- Campaigns: "Verão 2025" (Ativa; prizes "1º lugar — R$ 500,00 em créditos", "2º–3º lugar — Frete grátis por 30 dias"), "Black Friday 2024" (Encerrada), "Lançamento Coleção Outono" (Rascunho).
- Order IDs look like "#54230". Platform "Nuvemshop".
- Mock KPI set from the same file: comissaoTotal 12.840, vendasGeradas 94.200, roi 634 (%), ticketMedio 187, influencersAtivos 24.

For the deck, prefer the x-multiple style ("7,3x") that the real UI uses.

---

## 5. User flows (click counts are minimum clicks, typing excluded)

- **F01: Business invites an influencer by code.** 4 clicks.
  1. Sidebar "Influencers"
  2. "Adicionar Influencer" (dialog opens); paste or type the 8-character code `AB12-CD34`
  3. "Pesquisar" (spinner, then a card showing the found profile)
  4. "Adicionar". The dialog closes, the **"Convites pendentes" sheet slides in** with the new row "Convidado em …", and the yellow badge on "Convites" increments.

  Error branches: invalid code, already invited. Cancelling an invite takes 1 click (X in the sheet).
- **F02: Create a coupon with commission for an influencer.** 3 clicks.
  1. In the influencer row, the Pen icon (sheet "Cupons de {Nome}"); type "CAMILA15" and "15"
  2. Optionally set the dates "De (opcional)" and "Até (opcional)"
  3. "Adicionar cupom". The coupon box appears with a switch on and "15% · Início → em aberto"; the table pill shows "CAMILA15 15%".
- **F03: Schedule a commission change (time-bound rate).** 4 or 5 clicks: in the sheet, "Adicionar período" → % → De → Até → "Salvar período". Editing an existing period uses the Pen icon inline, then "Salvar". The Switch pauses a coupon in 1 click.
- **F04: Create a ranking campaign with prizes.** About 6 clicks.
  1. Sidebar "Ranking" → "Criar Campanha" (sheet); type the name "Black Friday 2025"
  2. "Início" and pick a date, then "Fim" and pick a date
  3. Prize 1: De 1, Até 1, type "Valor em R$", value "500"; "Adicionar prêmio", then prize 2: De 2, Até 3, "Frete grátis"
  4. Tick the participating influencers (by coupon), or search "Buscar..."
  5. "Criar campanha". The sheet closes, the "Campanhas" tab count goes +1, and the new card appears first with "Ativa".
- **F05: Edit or close a campaign.** 3 clicks: ⋯ → "Editar" → change Status to "Encerrada" → "Salvar alterações". Deleting is ⋯ → "Excluir" → confirm "Excluir".
- **F06: See the leaderboard.** 2 clicks: Sidebar "Ranking" (the "Ranking Geral" tab opens by default, with the crown on #1 and gold/silver/bronze accents).
- **F07: Analyse sales by influencer or coupon.** 3 clicks: Sidebar "Vendas" → open the "Todos os cupons" select → pick "CAMILA10". The table and summary update. Narrow the dates with the date inputs, then "Exportar CSV" (1 click).
- **F08: Dashboard period switch.** 1 click: "30d" on "Vendas por dia" or "12m" on "Vendas por mês". The chart redraws.
- **F09: Send a push notification to all influencers.** 2 clicks plus typing: Sidebar "Notificações" (Enviar tab, "Todos (N)" preselected); type the title and message while the **iOS/Android preview updates live**; "Enviar para N influencer(s)" → "Notificação enviada!". The Histórico tab count goes +1.
- **F10: Segment and send to a group.** About 5 clicks: chip "Grupo" → "Novo grupo" → name plus checkboxes → "Criar grupo (n)" (auto-selected) → type → send.
- **F11: Inspect a delivery.** 2 clicks: the "Histórico" tab → click a row (sheet "Detalhe do envio" with stats and JSON).
- **F12: Check an influencer's Instagram impact.** 2 clicks: Sidebar "Comunidade" → "Ver" on a row (or the LayoutDashboard icon in Influencers). You get the metric cards, mention list and masonry; click a media tile to open the modal and "Ver no Instagram". The date filter is De → Até → "Filtrar".
- **F13: Filter influencer performance by month.** 2 clicks: the "Outubro" select → "Setembro" (spinner, then the table refetches). Custom range: radio "Período personalizado" → De → Até → "Filtrar".
- **F14: Connect the store (NuvemShop).** 1 click plus typing: Sidebar "Integrações" → type "minhaloja.lojavirtualnuvem.com.br" → "Conectar" → OAuth → the redirect page (✓ and a 15s countdown) → back to Integrações with the "Conectado" badge.
- **F15: Configure payment fees.** 2 clicks plus typing: "Configurar" on the Taxas card → type the rates (the net per R$100 recalculates live) → "Salvar".
- **F16: Check plan usage and upgrade.** 3 clicks: the sidebar footer user → "Account" → the "Plano" tab (progress bars) → "Fazer upgrade" (pricing cards).

---

## 6. Interactions to demo to a business decision-maker (ranked)

1. **The ROI dashboard in one glance** (S01). Five KPI tiles led by **"ROI 10,3x — retorno sobre comissão"**, plus the 7d/15d/30d and 3m/6m/12m chart toggles redrawing the fuchsia line. Message: "every real spent on commission returns ten in sales".
2. **Real-time attributed sales ledger** (S05 and the dashboard's "Últimas vendas"). Every order is tied to an influencer and coupon. Filter by coupon to see one influencer's sales; cancelled orders are struck through automatically; "Exportar CSV". Optional touch: a new order row sliding in at the top.
3. **Gamified ranking and prize campaigns** (S06). The gold-crowned #1 with gold/silver/bronze accents, then "Criar Campanha" in a few clicks: prizes by position range ("1º lugar — R$ 500", "2º–3º lugar — Frete grátis") with the 🥇🥈🥉 badges on the card.
4. **Push notifications to influencers with the live phone preview** (S03). Type a message and watch the iOS and Android notification mock update in real time; audience chips Todos/Grupo/Específicos; "Alcance estimado"; send, see "Notificação enviada!", then the Histórico entry "42/45 Enviado".
5. **Instagram proof of reach** (S04b). Followers with a "+1.204 no período" trend, counts of Menções, Posts, Reels and Stories, and the **masonry gallery** of tagged posts and reels with coloured kind badges and an expandable modal.
6. **Onboarding an influencer in seconds** (S02 D1). The 8-slot code input, the profile card, "Adicionar", and the "Convites pendentes" sheet sliding in automatically.
7. **Flexible commission rules per coupon** (S02 SH2). Multiple coupons per influencer, an on/off switch, and **time-bounded commission periods** ("15% · 01/11 → 30/11", then "10% · em aberto"). Good for "Black Friday rates".
8. **Plug-and-play integrations and fee-aware net value** (S07). The NuvemShop "Conectado" badge, Instagram "@brand", and the Taxas dialog that recalculates "/ R$ 100" live as you type the PIX and card rates.
   Bonus: the dark/light toggle (press `d`) and the Plans page with "✦ Recomendado" ROI Pro.

---

## 7. Fidelity notes and quirks (keep or knowingly fix)
- Cards have no visible border, only `bg-muted/50`. Tables on Influencers, Comunidade and Notificações-Histórico are **not** inside cards; on Dashboard, Ranking and Vendas they are.
- The chart grid colour string is invalid, so the grid does not render. Y-axis ticks are like "R$3500" with no thousands separator. Monthly X labels are "2026-05".
- The "Pedidos" count in the Vendas summary is not localised ("1700").
- The Influencers trash button deletes without confirmation. The campaign name sits at the bottom of its card.
- The sidebar footer menu is in English ("Account", "Log out"). Everything else is Portuguese.
- Integrações uses a fixed `grid-cols-3` with no responsive breakpoints.
- Icons: lucide-react throughout. In Integrações, the NuvemShop, Pagar.me and Cakto logos are remote images; in the replica use simple coloured-initial tiles or inline SVG.
