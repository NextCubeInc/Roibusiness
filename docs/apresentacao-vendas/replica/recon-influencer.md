# Recon — ROInfluencer influencer mobile app (for the offline HTML/JS phone mockup)

Read-only recon. Nothing in either repo was modified.

## 0. Sources, versions, and which one to replicate

There are two versions of the app on disk, and they look different:

| | **A. Cloned repo (the one in the brief)** | **B. Local working copy (newer, uncommitted)** |
|---|---|---|
| Path | `/private/tmp/claude-501/-Volumes-Projects-Roibusiness/a7e51a46-1f23-4561-bdd8-4b40af79841b/scratchpad/influencer-app` | `/Volumes/Projects/GitHub/roinfluencer-app` (same HEAD `577eeb7` plus about 3.5k lines of uncommitted changes) |
| App version | 2.0.2, Expo SDK 54, RN 0.81 | **2.1.0**, Expo SDK 57, RN 0.86, `userInterfaceStyle: "light"` |
| Tabs | `Tabs` from expo-router with lucide icons, no labels, purple active icon. Routes are mid-rename: `_layout` declares `business`/`vendas`/`campanha`, but the folders are `business_tmp`/`vendas_tmp`/`campanha_tmp`, so the tab bar is broken at this commit | **`NativeTabs` (iOS 26 Liquid Glass)** with labels **Dashboard / Business / Vendas / Campanhas** and SF Symbols. **This matches the sales-PDF screenshot** |
| Dashboard | "SEUS GANHOS / Lançamentos", Total Mensal, Total Comissões, Vendas, Ticket, two line charts | **"MÊS ATUAL", "MÊS ANTERIOR", "PROSPECÇÃO PRÓX. MÊS", "Vendas Recentes / Ver todas"**. Matches the PDF |
| Card style | Bordered cards (`1px rgba(255,255,255,.06)`) with a **2px purple accent line on top** of every card, and hero cards `#1c1028` | **Flatter**: borderless cards, flat list rows with no card, hero numbers sit straight on the background. Matches the PDF |
| Header | Custom in-screen top bar (eyebrow, title, and a 42px avatar on the right) | **Native header toolbar**: a capsule at top right with **bell** (badge = pending invites) and **person** icons. Matches the PDF |

**Recommendation: replicate version B, the one in the PDF.** Section 2 describes B as the primary spec and lists A's differences as "v2.0.2 variant" notes. Strings are the same in both unless noted.

Sales PDF page 6 (`scratchpad/pdf/hp06.png`, headline "Quem vê a própria venda, vende mais.") shows two phones. Left is the **Vendas** tab and right is the **Dashboard** tab, both from version B. I sampled pixel colours from that image (section 1).


---

## 1. Design tokens

All screens define the same local palette object `C`. Exact values:

| Token | Hex / value | Used for |
|---|---|---|
| `bg` | `#0c0c10` | Screen background, native header background, sheet backdrop base |
| `card` | `#13131a` | Cards, segmented-control track, month-picker button, bottom sheets, prizes sheet bg, venda sheet bg |
| `card2` | `#1a1a24` | Inner chips (coupon badge bg), avatar fallback bg, inputs (edit profile), unreached tier dots, notification cards, ranking position circle |
| hero (v2.0.2 only) | `#1c1028` with border `rgba(124,58,237,0.22)`, radius 22 | Old hero cards (Vendas volume, Business total, business-dash hero, ranking podium, prizes modal) |
| `border` | `rgba(255,255,255,0.06)` | Dividers (1px), card borders (v2.0.2), month-picker row separators |
| `border2` | `rgba(255,255,255,0.10)` | Avatar rings, input borders (v2.0.2) |
| `purple` (primary) | `#7c3aed` | Active segmented pill, primary buttons, unread dot, avatar fallback bg (profile), old active tab icon |
| purple pressed | `#6d28d9` | Primary button pressed state (auth screens) |
| `purpleMd` | `#8b5cf6` | Tier progress-bar fill, chart line, Elite tier colour, check icon in month list, spinner |
| `purpleLt` | `#a78bfa` | "Ver todas" link, "Próximo: **Prata**", progress % text, selected month label, invite code text, PenBox icon, Trophy icon, "Limpar filtro" text |
| purple tints | `rgba(124,58,237,0.15)` bg / `0.25` border; `0.12` (Limpar filtro, notif toggle); `0.35` (avatar ring); `0.45` (unread notif border) | Badges, selected filter button |
| `green` (money/success) | `#10b981` | Commission values `+R$ 18,86`, "ESTE MÊS" value, Ticket médio, "Ativa" status, accept ✓, variation badge up, ranking "pts" |
| green tints | `rgba(16,185,129,0.12)` / `0.15` bg, `0.25` border | Status "Ativa" pill, variation-up badge, "Ativa" notif toggle |
| `red` | `#ef4444` (soft text `#f87171`) | Cancelled status text, reject ✗, variation-down, Excluir conta text, invite badge bg (v2.0.2) |
| red tints | `rgba(239,68,68,0.15)` cancelled badge bg; `0.12` Excluir conta button bg; `0.2`/`0.3` borders | |
| destructive solid | `#C62828` | "Sair" button and "Sim, excluir minha conta" |
| yellow | `#facc15` (bg `rgba(250,204,21,0.10)`) | Campaign status "Pausada" |
| `text` | `#f4f4f6` | Primary text |
| `sub` (muted) | `#9898a8` | Eyebrows, meta text, inactive segmented label, dates |
| `faint` | `#3a3a4a` | Placeholder text on auth inputs, disabled button bg, chevrons, tier connector line, unreached tier labels, sheet drag handle |
| overlays | sheet backdrop `rgba(0,0,0,0.55)`; modals `rgba(0,0,0,0.75)`; notif focus `rgba(0,0,0,0.70)` | |
| splash bg | `#141414` | Native splash and Lottie splash |
| brand mark | `#6b0078` (purple) on white | Logo "R with sparkle" (`roinfluencer.png`, `icon.png`) |

**Tier colours** (`LEVELS` const in Vendas). Exact hex:

| level | name | short label shown | colour |
|---|---|---|---|
| 1 | Bronze | `Bronze` | `#CD7F32` |
| 2 | Prata | `Prata` | `#C0C0C0` |
| 3 | Ouro | `Ouro` | `#FFD700` |
| 4 | Platina | `Plat.` | `#E5E4E2` |
| 5 | Diamante | `Diam.` | `#B9F2FF` |
| 6 | Elite | `Elite` | `#8b5cf6` |

The current tier pill uses `current_level_color` from the RPC (Bronze = `#CD7F32`). Background is that colour plus hex alpha `22` (about 13%) and text is the solid colour. The screenshot sample shows the bronze pill at about `#4c3119` on the dark bg.

**Medal colours** (ranking): 1st `#FFD700` on `#2a2200` (border `rgba(255,215,0,.25)`), 2nd `#C0C0C0` on `#1e1e22`, 3rd `#CD7F32` on `#1e1200`.

**Typography.** The app uses the **system font**: SF Pro on iOS, Roboto on Android. `Poppins_700Bold` is referenced in a header style but never loaded. `SpaceMono-Regular.ttf` exists but is unused. For the web mockup use `-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif`. The type scale in use:
- Eyebrow / section label: 11px, 600, `UPPERCASE`, letter-spacing 1.2 (1.0 on cards, 1.4 on profile), colour `sub`.
- Screen title (v2.0.2 and campanhas/ranking): 22px, 800, letter-spacing −0.3.
- Hero number: Dashboard **34px/800/ls −0.8**, Business 34px/800/ls −1, **Vendas "Volume acumulado" 38px/800/ls −1**.
- Stat card value: 20px/800/ls −0.5. Compare-card label is 10px/600 uppercase ls 1.
- Section header "Vendas Recentes": 18px/700. "Lançamentos" list header: 13px/700.
- List row title: 15px/700. Badge/chip: 10px/700 uppercase ls 1. Date/meta: 10–12px/500 `sub`.
- Money in rows: 15px/800 ls −0.3, green.
- Segmented label: 13px/700. Primary button text: 16px/800 (auth) or 16px/700.

**Radii:** cards 14–16; hero 22; segmented track 14 with inner pill 10; month-picker button 12; coupon/status badges 6; tier pill 100 (full); progress bar 100; bottom sheet top corners 24; native formSheet corner 22; modals 20; auth inputs 14; edit-profile inputs 12; business-dash avatar 16 (squircle). Other avatars are circles (v2.0.2 business avatars use radius 12 squircles).

**Spacing:** screen horizontal padding **16 on Dashboard** and **20 elsewhere**. Cards pad 16–18. Grid gaps 12. List rows have paddingVertical 12 with a 14 gap between avatar, text and value. Dividers are 1px `border` with 16 vertical margin. Bottom padding is 32–48.

**Avatars** (`AvatarImage`): the fallback is **initials** (first letter of the first two words, or the first two letters of a single word, uppercase, font size = 0.34 × size, 700). The image loads on top of it. Defaults: size 42, border 3px `rgba(124,58,237,0.35)`, bg `#7C3AED`, white initials. Business/list avatars in v2.1.0 use border 0, bg `card2`, text `text`, sizes 44/48 (64 on business-dash, 96 on profile, 112 on edit profile, 120 on onboarding).

### Tab bar (v2.1.0, the screenshot)
- iOS 26 **native Liquid Glass floating capsule** at the bottom, inset from the edges, fully rounded.
- Because the app forces `userInterfaceStyle: "light"`, the glass renders **light grey over the dark UI**. Sampled: capsule about **`#c8c7cc`**, unselected icons and labels dark (about `#1c1c1e`), and the **selected tab sits in a darker grey pill (about `#b0afb4`) with a white icon and label** (`tintColor="#FFF"`). Props in code: `backgroundColor="#000"`, `blurEffect="none"`, `shadowColor="#000"`. The screenshot shows the light glass anyway.
- 4 items. Each has an icon over a small label (about 10px):
  1. **Dashboard**: SF `house.fill` (Material `home`)
  2. **Business**: SF `building.2.fill` (Material `domain`)
  3. **Vendas**: SF `shippingbox.fill` (Material `orders`)
  4. **Campanhas**: SF `trophy.fill` (Material `trophy`)
- Web equivalents (lucide, filled or bold): `House`, `Building2`, `Package`, `Trophy`.

### Header toolbar (v2.1.0, on all 4 tab roots)
- The native header has bg `#0c0c10`, no title and no shadow.
- At the right edge is **one dark glass capsule** (about `#1d1c20` with a faint lighter 1px edge, height about 36, radius full) holding two outline SF icons in white: **`bell`** and **`person`**.
- `bell` shows an iOS badge with the count of pending invites (`"9+"` if over 9) and opens **Solicitações**. `person` opens **Profile**.
- Web: lucide `Bell` and `User`, 18px, stroke 1.75, in a pill with padding about 6×12.

### Tab bar (v2.0.2 variant, the cloned repo)
- `Tabs` with bar bg `#0c0c10`, top border `#0c0c10`, height 78 (iOS), paddingTop 8, **no labels**.
- lucide icons at 28px: `LayoutDashboardIcon`, `Building2Icon`, `ShoppingCartIcon`, `Trophy`. Active `#7c3aed`, inactive `#faf5ff`.
- No toolbar. Each screen has an in-screen top bar: eyebrow, title, and a 42px avatar on the right linking to Profile. Business also has a purple **"Convites"** button with a `Bell` icon and a red count badge.

### Native stack headers (pushed screens)
- bg `#0c0c10`, white title, back button chevron only.
- Titles in code: Profile = **"Profile"** (English, sic). Edit = **"Editar Perfil"**. Business dash = business name (set dynamically; fallback "Dashboard Business"). Invites = **"Solicitacoes"** (sic, missing ç/õ). Ranking = campaign name (fallback "Ranking"; static fallback "Rannking" sic).
- For the mockup, use "Solicitações" and "Perfil" unless pixel fidelity to the bugs is wanted.

---

## 2. Screen inventory

Navigation tree (v2.1.0):
```
Splash → (force-update | login/signup/recover | onboarding | main)
main/(tabs): Dashboard | Business | Vendas | Campanhas   (+ header bell → Solicitações, person → Perfil)
  Dashboard → venda (formSheet)
  Business  → business-dash (push)
  Campanhas → business-ranking (push) → premios (formSheet)
  bell      → business-request (Solicitações | Notificações)
  person    → profile → profile/edit
```

### S01 — Splash, offline and force update
- Native splash: `icon.png` (purple R mark) centred on `#141414`, width 200.
- v2.1.0 then plays a Lottie (`/Volumes/Projects/GitHub/roinfluencer-app/assets/splash.json`, 512×512, no loop, `contain`) on `#141414` and fades out.
- **Offline overlay** (after 8s with no auth and no network): bg `#0c0c10`, 📡 emoji (48), **"Sem conexão"** (22/800), **"Verifique sua internet e tente novamente."** (14/500 sub), full-width purple button **"Tentar novamente"** (radius 16).
- **Force update** (`force-update.tsx`): card `#13131a` radius 20 holding 🚀, **"Atualização necessária"**, **"Esta versão do app não é mais suportada. Atualize para continuar usando o Roinfluencer."** and a purple button **"Atualizar agora"** (opens the store).
- Mockup: optional. A 1s splash with the logo is enough.

### S02 — Login (`src/app/index.tsx`)
Centred column, padding 24, bg `#0c0c10`. Top to bottom:
1. Logo `roinfluencer.png`, 96×96, mb 20.
2. Eyebrow **"EXCLUSIVO PARA INFLUENCIADORES"**.
3. Title **"Bem-vindo, Influenciador"** (24/800, mb 40).
4. Two inputs, gap 12. Each is a card `#13131a`, radius 14, font 16/500, padding 18×16. Placeholders **"seu@email.com"** and **"senha"** (colour `#3a3a4a`). v2.0.2 adds a 1px `border2` border and a 2px purple top accent.
5. Right-aligned link **"Esqueceu sua senha?"** (13/500 sub).
6. Full-width purple button **"Entrar"** (16/800, radius 14, padding 16). Loading shows "Entrando..." with bg `#3a3a4a`. Pressed bg is `#6d28d9`.
7. **"Não tem conta? Crie uma!"**, where "Crie uma!" is purpleLt and bold.
8. Footer (mt 64): NextCubeInc logo 36×36 plus "NextCubeInc" (13/600 sub).

Error alerts:
- "Atenção / Informe seu e-mail."
- "Atenção / Informe sua senha."
- "Erro ao entrar / E-mail ou senha incorretos."
- Also: "Confirme seu e-mail antes de entrar.", "Muitas tentativas. Aguarde alguns minutos.", "Usuário não encontrado.", "Sem conexão. Verifique sua internet."

Business-role accounts are signed out automatically, because the app is for influencers only.

### S03 — Signup (`signup.tsx`)
- Same layout as Login. Title **"Crie sua conta"**.
- Placeholders "seu@email.com" and **"senha (mín. 6 caracteres)"**.
- Button **"Criar conta"** ("Criando...").
- Link **"Já tem conta? Entre aqui!"**.
- Alerts:
  - "A senha deve ter no mínimo 6 caracteres."
  - "E-mail já cadastrado. Faça login ou recupere sua senha."
  - Success: **"Conta criada!"** with "Enviamos um link de confirmação para seu e-mail. Toque nele para ativar sua conta." (v2.0.2 text: "Verifique seu e-mail para confirmar o cadastro antes de entrar.")

### S04 — Recover / Reset password
- **Recover**:
  - Eyebrow **"ACESSO PERDIDO?"** and title **"Recuperar senha"**.
  - Helper text "Informe seu email e enviaremos as instruções de recuperação.".
  - Input "seu@email.com".
  - Button **"Enviar email"** ("Enviando...").
  - Alert "Email enviado / Se o email existir, você receberá as instruções de recuperação.".
- **Reset** (v2.1.0, opened by deep link):
  - Eyebrow "QUASE LÁ" and title "Nova senha".
  - Helper text "Defina uma nova senha para sua conta.".
  - Inputs "nova senha (mín. 6 caracteres)" and "confirme a nova senha".
  - Button "Salvar nova senha" ("Salvando...").
  - Alert "Senha alterada / Sua nova senha já está ativa.".

### S05 — Onboarding (`onboarding/index.tsx`), first login only
- Top-aligned, paddingTop 72.
- Eyebrow **"SEU PERFIL"** and title **"Complete seu cadastro"** (mb 36).
- Avatar picker: circle 120, bg `card2`, border 2 `rgba(124,58,237,0.40)`, holding a lucide `Upload` (28, purpleLt) over **"FOTO"** (10/600). Once picked, it shows the photo.
- Three inputs with the same style as Login: **"Nome completo"**, **"@instagram"**, **"(12) 93456-7810"**. The phone input uses a live mask: `(XX) XXXXX-XXXX`.
- Button **"Continuar"** ("Salvando...").
- Validation alerts: "Informe seu nome completo.", "Informe seu @ do Instagram.", "Informe seu telefone.".
- On success it goes straight to the Dashboard.

### S06 — Dashboard tab (v2.1.0). Matches screenshot (b)
ScrollView, padding 8 top, 16 horizontal, 32 bottom. Header toolbar capsule (bell + person) at top right.
1. **Hero "MÊS ATUAL"**, with no card background.
   - Eyebrow **"MÊS ATUAL"**.
   - Value `formatBRL(comissao_mes_atual)`, e.g. **"R$ 0,00"** (34/800, mt 8).
   - Row (mt 8, gap 6):
     - Optional **variation badge**, shown only when `variacao_pct !== null`. Radius 6, padding 7×2. Up: bg `rgba(16,185,129,.15)`, lucide `TrendingUp` 12 green, text green 12/700 `+12.46%`. Down: red tint, `TrendingDown`, `-8.3%`. The number is printed raw (dot decimal).
     - Then **"0 vendas"** (12 sub). Uses "1 venda" / "N vendas".
2. **Two compare cards** (row, gap 12, mt 12). Each: bg `card`, radius 14, padding 16, gap 6, no border.
   - Label (10/600 uppercase ls 1 sub), value (20/800), sales count (12 sub).
   - Left: **"MÊS ANTERIOR"** · `R$ 0,00` · `0 vendas`.
   - Right: **"PROSPECÇÃO PRÓX. MÊS"** · `R$ 418,14` · `21 vendas`.
3. **Section header** (mt 28): **"Vendas Recentes"** (18/700) on the left. On the right, link **"Ver todas"** (13/600 purpleLt) with lucide `ChevronRight` 15 purpleLt, which switches to the **Vendas** tab.
4. **Recent sales list** (up to **5** rows, all statuses). Each row (paddingVertical 12, gap 14, flat with no card):
   - Business avatar, 44 circle (bg `card2`, initials `sub`). The screenshot shows the business logo image.
   - Column: business name (15/700, 1 line, mb 5), then a row with a **coupon chip** (bg `card2`, radius 6, padding 8×2, text 10/700 uppercase ls 1 `sub`, e.g. **`GUBAZZ55`**) and a **date `dd/MM`** (10/500 sub, e.g. `30/06`).
   - Right side: **`+R$ 18,86`** (15/800 green).
   - **Cancelled** (status not `open`/`paid`): row opacity 0.5, name and value struck through, value grey with no "+", and the chip shows the status text in red on `rgba(239,68,68,.15)`.
   - Tap opens **S07**.
- Empty: "Nenhuma venda recente." (13 sub, paddingVertical 16).
- Loading: cached values show instantly. On first launch it renders zeros (R$ 0,00 / 0 vendas) until data arrives. There are no skeletons.
- Live refresh: any change to `orders` (realtime) re-fetches all screens, so a new sale "pops in" with no pull-to-refresh. Dashboard has no pull-to-refresh.

**v2.0.2 Dashboard variant** (cloned repo):
- Top bar: eyebrow "SEUS GANHOS", title "Lançamentos", 42px avatar.
- Cards with a 2px purple top line and a lucide icon at top right: **"TOTAL MENSAL"** `R$ 1.284,60` (DollarSign); **"TOTAL COMISSÕES"** compact `R$ 12K` (DollarSign); a 2-column row **"VENDAS"** count (ShoppingCart) and **"TICKET"** green BRL (Ticket).
- Divider, then two chart cards: **"Comissão Últimos 30 Dias"** and **"Comissão Últimos 6 Meses"**, each with a badge **"COMISSÃO"**. Chart spec is in S10.

### S07 — Venda detail sheet (`dashboard/venda.tsx`)
- iOS formSheet with grabber, detents 45% and 90%, corner radius 22, bg `#13131a`, padding 24 (top 28).
- Centred column, gap 12:
  - Circle 64 (bg `card2`, border `border`) with the business initial (24/700 sub).
  - Business name (20/700).
  - **`+ R$ 18.86`** (28/800 green). Code prints the raw number with a dot. The mockup should use "+ R$ 18,86".
  - Date `dd/MM` (13 sub).
- Dismiss by swiping down or tapping the backdrop.

### S08 — Vendas tab (v2.1.0). Matches screenshot (a)
FlatList, header padding 20. Header toolbar capsule at top right.
1. **Hero "VOLUME ACUMULADO"** (no card):
   - Eyebrow, then value `formatSales(total_sales)`, e.g. **"R$ 32K"** (38/800, mb 20).
   - Row, space-between (mb 10): on the left the **tier pill** (`BRONZE`, 11/700 uppercase ls 1, colour = tier colour, bg = colour + `22`, padding 12×4, radius 100). On the right, **"Próximo: Prata"** (11/500 sub, with "Prata" in purpleLt 700). The right side is hidden at max level.
   - **Progress bar**: 5px high, track `rgba(255,255,255,.07)`, fill `#8b5cf6` at width `progress_percent%`, radius 100, mb 6.
   - Right-aligned caption (11/600 sub, mb 16): **"32.2%"** in purpleLt, followed by **" — faltam R$ 68K para o Prata"**. At max level it reads `" — Nível máximo 🏆"`.
   - **Tier stepper**: 6 equal columns. A 1px `#3a3a4a` line runs behind the dots (top 8, inset 8).
     - Dots: current tier 18px, others 14px. Reached tiers are filled with the tier colour; unreached are filled `#1a1a24`.
     - Labels under each dot (9/600 uppercase ls 0.5): reached in `sub`, unreached in `faint`. Labels: `BRONZE PRATA OURO PLAT. DIAM. ELITE`.
2. **Two stat cards** (gap 12, mb 4). Each: bg `card`, radius 16, padding 16, no border.
   - Left: **"ESTE MÊS"**, value `formatSales(monthTotal)` **green** (20/800), sub **"acumulado"** (11 sub). This always shows the current month and excludes cancelled.
   - Right: label = dynamic `rightCardLabel`, i.e. **"HOJE"** / **"SEMANA"** / **"OUTUBRO 2026"** (current month name) / the selected past-month label. Value `formatSales(filteredTotal)` in white. Sub **"0 lançamentos"** ("1 lançamento").
3. Divider (1px, margin 16).
4. **Segmented control "Hoje | Semanal | Mensal"**:
   - Track bg `card`, radius 14, padding 4, mb 10.
   - Each option is flex 1, paddingVertical 10, radius 10.
   - Active: bg `#7c3aed`, white text. Inactive: transparent, `sub` text. Labels are 13/700.
   - Default **Hoje**. When a month is selected, no pill is active.
5. **Month filter button**:
   - Row, space-between, padding 16×12, radius 12, mb 16.
   - Left: lucide `Calendar` 15 plus **"Filtrar por mês"** (13/600 sub). Right: `ChevronDown` 15.
   - Selected state: bg `rgba(124,58,237,.15)`, icon and text purpleLt, label = month (e.g. "Setembro 2026").
6. List header: **"Lançamentos"** (13/700) on the left, **"0 resultados"** ("1 resultado") (12/500 sub) on the right.
7. **Rows** (same as the Dashboard rows but with the date as **`dd/MM/yyyy`**; marginHorizontal 20, paddingVertical 12, flat). Business avatar 44, name, coupon chip, date, and `+R$ 27,48` green. Cancelled rows use the treatment from S06.
- **Empty**: 📭 (28) and **"Nenhum lançamento neste período."** (13/500 sub), paddingVertical 40. Hidden while loading.
- **Month picker bottom sheet** (Modal, slide up):
  - Backdrop `rgba(0,0,0,.55)`; tap it to close.
  - Sheet bg `card`, top radius 24, padding 24 horizontal, top 16, bottom 48.
  - Drag handle 36×4 `faint`.
  - Title **"Filtrar por mês"** (17/800) and subtitle **"Selecione um mês para ver os lançamentos"** (12/500 sub, mb 20).
  - Rows: the **previous 6 months, excluding the current one**. With today = 26/10/2026 that is "Setembro 2026, Agosto 2026, Julho 2026, Junho 2026, Maio 2026, Abril 2026". Rows are 15px, paddingVertical 15. The selected row is purpleLt 700 with a `Check` 16 `#8b5cf6`.
  - When a month is selected, a **"Limpar filtro"** button appears: radius 14, bg `rgba(124,58,237,.12)`, purpleLt 14/700.
  - Choosing a month closes the sheet and reloads the list. Tapping a period pill clears the month.

**v2.0.2 variant:**
- Top bar with "SEUS GANHOS" / "Lançamentos" and an avatar.
- Hero inside a `#1c1028` card (radius 22, padding 24, purple border). Tier pill has a border (`color+55`). Dots 16px all with a border.
- Stat cards and rows are bordered cards with a 2px top line; cancelled rows get a red top line. Coupon chip is purple-tinted (purpleLt text). Row avatar squircle radius 12. Value 17px.

### S09 — Business tab (v2.1.0)
1. **Hero** (only when the list is non-empty, no card):
   - Eyebrow **"COMISSÕES ESTE MÊS"**. The label is "COMISSÕES HOJE" for Hoje and "COMISSÕES — SETEMBRO 2026" when a month is selected.
   - Total `formatBRL(sum comissao_total)` (34/800).
   - **"3 negócios ativos"** (12/500 sub; "1 negócio ativo").
2. Segmented control **"Hoje | Mensal"**, 2 options, default **Mensal**.
3. Month filter button "Filtrar por mês". Its sheet lists **the current month plus the previous 5** (Outubro 2026 … Maio 2026), with subtitle **"Selecione um mês para ver as comissões"** and "Limpar filtro".
4. Eyebrow **"TODOS OS NEGÓCIOS"**.
5. Rows (paddingVertical 14):
   - Avatar 48 circle (border 1 `border2`, bg `card2`).
   - Name (15/700).
   - Wrap row of **coupon chips** (bg `card2`, border `border`, 10/700 uppercase `sub`), e.g. `MARINA10` `MARIVIP`.
   - Right side: **`R$ 642,30`** (15/800 green) and `ChevronRight` 18 `faint`.
   - Tap opens **S10**.
- **Empty**: 🏢 (36), **"Nenhum negócio ainda"** (18/800), **"Aguarde um convite ou use seu código de convite"** (13/500 sub).
- v2.0.2: top bar "SEUS PARCEIROS" / **"Negócios"** with a purple **"Convites"** button (bell + red count badge), hero in a `#1c1028` card, and carded rows.

### S10 — Business dashboard (`business-dash.tsx`, identical in A and B)
Native header titled with the business name and a back chevron. ScrollView padding 20.
1. **Hero card** (`#1c1028`, radius 22, border `rgba(124,58,237,.22)`, padding 24):
   - Identity row: avatar 64 (radius 16), name (20/800), site (12/500 sub, e.g. `vittanutri.com.br`).
   - Two inner boxes (bg `rgba(0,0,0,.25)`, radius 12, padding 14, border `border`): **"ESTE MÊS"** with `formatCompact(comissao_mensal)` (18/800 white), and **"TOTAL"** with `formatCompact(total_comissao)` (18/800 **purpleLt**).
2. Two stat cards (2px purple top line, border): **"VENDAS"** with a count (22/800, lucide `ShoppingCart`), and **"TICKET MÉDIO"** with `R$ 189,90` (22/800 green, lucide `Ticket`).
3. Divider.
4. Chart card **"Últimos 30 dias"** with the purple badge **"COMISSÃO"** (bg `rgba(124,58,237,.15)`, border `.25`, radius 6, purpleLt 10/700 uppercase).
5. Chart card **"Últimos 6 meses"** with the same badge.
- **Chart spec** (react-native-gifted-charts `LineChart`):
  - Smooth curved **area** chart, height 220. Line `#8b5cf6`, thickness 3.
  - Gradient fill from `#a78bfa` at 0.35 opacity (top) to `#7c3aed` at 0.05 (bottom).
  - 5 horizontal grid lines `rgba(255,255,255,.08)`. No axis lines and no data points.
  - Y labels `R$ 120` (10px sub). X labels: `DD/MM` for 30 days, short month for 6 months (10px sub).
  - Tap or drag shows a vertical strip and the value.
  - In the web mockup this can be an inline SVG path.

### S11 — Campanhas tab (v2.1.0)
1. Header (paddingTop 8, mb 20): eyebrow **"SUAS CAMPANHAS"**, title **"3 Campanhas"**. The code hardcodes the literal "3". The mockup should render `${n} Campanhas`. v2.0.2 shows "Campanhas".
2. Rows (paddingVertical 12, gap 14, flat):
   - Avatar 48 (the business).
   - Column (gap 5):
     - Row 1: **campaign name** (15/700, flex) and **total commission in the campaign** `R$ 312,40` (15/800 green).
     - Row 2: **status pill** (radius 6, padding 8×2, 10/700 uppercase ls .8) and dates **`01/10/2026 → 31/10/2026`** (11/500 sub; "?" if missing).
     - Row 3: business name (11/500 sub).
   - `ChevronRight` 18 `faint`.
   - Tap opens **S12**.
- Status pills:

  | Pill | Text colour | Background |
  |---|---|---|
  | **Ativa** | green | `rgba(16,185,129,.12)` |
  | **Rascunho** | sub | `rgba(152,152,168,.10)` |
  | **Pausada** | `#facc15` | `rgba(250,204,21,.10)` |
  | **Encerrada** | `#f87171` | `rgba(248,113,113,.10)` |
  | **Cancelada** | `#f87171` | `rgba(248,113,113,.10)` |

  In v2.1.0, an `active` or `paused` campaign whose `end_date` has passed (end of day) shows as **Encerrada**.
- **Empty**: 📋 (36), **"Nenhuma campanha ainda"** (18/800), **"Você ainda não participa de nenhuma campanha"**.

### S12 — Campaign ranking (`business-ranking.tsx`)
- Native header titled with the campaign name. **Right toolbar button: SF `trophy`** opens **S13 Prêmios**. In v2.0.2 this was an in-screen purple button **"Prêmios"** with a Trophy icon, and the prizes opened in a centred modal.
- Content, padding 20:
  1. Eyebrow **"12 PARTICIPANTES"** ("1 participante") and title **"Ranking"** (22/800).
  2. **Podium** (padding 24, no background in v2.1.0; v2.0.2 used a `#1c1028` card). Three columns, aligned to the bottom, order 2nd · 1st · 3rd:
     - **1st (centre, raised mb 8)**: avatar 72 inside a 2px `#FFD700` ring (padding 2), instagram handle (11/700, 1 line), medal circle 48 with bg `#2a2200` and "1" in `#FFD700` 24/800.
     - **2nd / 3rd**: avatar 56, handle, medal circle 40 with "2"/"3" at 18/800 (silver and bronze colours). A missing 3rd shows "Vazio".
  3. Eyebrow **"CLASSIFICAÇÃO COMPLETA"**.
  4. Rows (paddingVertical 12, gap 14):
     - Position circle 36 (medal bg and colour for the top 3, otherwise `card2`/`sub`, 13/800).
     - Avatar 44 (bg `#3a3a4a`, initials `#a78bfa`).
     - `@instagram` handle (15/700).
     - Right side: **`X,X pts`** (15/800 green).
- **Points formula**: `pts = commission × 9 / 5.67 × 0.25` (about commission × 0.39683), pt-BR with 1 decimal, e.g. R$ 312,40 becomes **"124,0 pts"**. Raw R$ values of other influencers are never shown, which keeps their earnings private.
- States:
  - **Loading**: centred `ActivityIndicator` (`#8b5cf6`) and **"Carregando ranking..."**.
  - **Error**: "Não foi possível carregar o ranking." (red `#f87171`).
  - **Empty**: 🏆 and **"Nenhum participante ainda"**.
- Highlighting the current influencer's own row is **not** implemented. It would make a good optional demo enhancement (see section 6).

### S13 — Prêmios sheet (`premios.tsx`, v2.1.0)
- formSheet sized to its content, grabber, radius 22, bg `#13131a`, padding 24 (top 28, bottom 48), gap 12.
- Title row: lucide `Trophy` 20 purpleLt and **"Prêmios da Campanha"** (18/800).
- Rows sorted by `position_start`:
  - Position chip (bg `card2`, radius 8, padding 10×6, minWidth 48) showing **"#1"** or a range **"#4–10"** (purpleLt 13/700).
  - Title (14/700), e.g. "1º lugar".
  - Reward (15/800 green). Shown as BRL `R$ 2.000,00` when `reward_type === "valor"`, otherwise as the raw text (e.g. "Kit de produtos").
- Empty: **"Nenhum prêmio cadastrado"**.
- v2.0.2: centred modal card `#1c1028` with a purple **"Fechar"** button.

### S14 — Solicitações / Notificações (`business-request.tsx`). Opened by the header bell or a push notification
1. **Segmented control** (margin 16, mb 8): **"Solicitações [n]"** | **"Notificações [n]"**.
   - Each label has a count bubble when n > 0 (18px circle, 10/800; `rgba(255,255,255,.25)` on the active purple pill, `card2` when inactive; "9+").
   - Solicitações counts pending invites. Notificações counts unread.
   - The default tab is Solicitações, unless the push deep link says `?tab=notificacoes`.
2. **Solicitações list** (pull to refresh). Rows (paddingVertical 12):
   - Avatar 48, business **name** (15/600), **site** (13 sub).
   - Right side: two icon buttons, **`Check` 20 green (stroke 3)** to accept and **`X` 20 red** to reject.
   - Tapping either removes the row immediately (optimistic). Accept sets `business_influencers.status='active'`; reject sets `'rejected'`. On error the row comes back.
   - Accepting means the business then appears in the Business tab and its coupons start counting.
   - **Empty**: 📭 (34), **"Nenhuma solicitação"** (16/700), **"Convites de negócios aparecem aqui"**.
3. **Notificações list** (pull to refresh). Cards (bg `card2`, radius 14, padding 14×12, mb 10, fixed height about 112, border `rgba(124,58,237,.45)` if unread otherwise `border`):
   - Avatar 44.
   - Header row: business name (12/600 sub) and **time ago** (11 sub): "agora", "há 3 min", "há 2 h", "há 4 d", otherwise "12 de out.".
   - Title (15/700, 2 lines) and body (14, 2 lines, opacity .9).
   - Purple 8px **unread dot** on the right.
   - Opening this tab marks everything as read and clears the badge.
   - **Long-press**: on iOS, a native context menu with an enlarged preview and the action **"Marcar como lida"** (checkmark). On Android, a focus modal (bg `card2`, purple border) with the full body and "Toque fora para fechar".
   - **Empty**: 🔔, **"Nenhuma notificação"**, **"Suas notificações aparecerão aqui"**.
- Notifications are free-form messages that businesses send from the ROI web panel (title ≤100 chars, body; optional iOS subtitle).

> **"Solicitar parceria" does not exist in the code.** Partnerships are **started by the business**: the business invites the influencer, or the influencer shares their **Código de Convite** from Profile. The influencer only **accepts or rejects** invites in S14. The demo flow below uses "Aceitar convite" instead. If a "solicitar parceria" button is wanted for the pitch, it would be invented UI and should be labelled that way.

### S15 — Perfil (`profile/index.tsx`)
Centred column, paddingTop 52, horizontal 20. Native header "Profile".
1. Avatar 96 (border 3 `rgba(124,58,237,.35)`, purple bg with initials).
2. Name (22/800, mt 16).
3. **"@marinacosta"** (15/600 sub, mb 28).
4. Button **"Editar perfil"** (bg `card`, radius 14, padding 14, full width) with lucide `PenBox` 17 purpleLt.
5. **"CÓDIGO DE CONVITE"** card (v2.1.0; commented out in v2.0.2): eyebrow, then the code (purpleLt 24/800 letter-spacing 3, e.g. `ROI7K2Q`) and a white `Copy` 18 icon that copies it to the clipboard.
6. *(Feature-flagged; can be hidden in the mockup)* button **"Conectar Instagram"**. When connected it shows **"Instagram conectado: @user"** in green on a green tint.
7. **"NOTIFICAÇÕES"** card (bg `card`, radius 16, padding 16):
   - Text **"Ative para receber alertas de novas vendas"** or, when on, **"Você receberá alertas de novas vendas"** (14/500).
   - Toggle pill on the right: **"Ativar"** (`BellOff`, purple tint) or **"Ativa"** (`Bell`, green tint). Shows a spinner while toggling.
   - If permission is denied: alert "Permissão negada / Para ativar notificações, vá em Ajustes > Notificações e permita para este app." with buttons "Cancelar" / "Abrir Ajustes".
8. **"Sair"** button (bg `#C62828`, white, lucide `LogOut`, radius 14, mt 8).
9. **"Excluir conta"** button (bg `rgba(239,68,68,.12)`, red text, `Trash2`).
   - Confirmation modal (card radius 20): **"Excluir conta?"** with "Seus dados pessoais serão permanentemente removidos. Seu histórico de vendas será mantido de forma anonimizada. Essa ação não pode ser desfeita."
   - Buttons: **"Sim, excluir minha conta"** (red) and **"Cancelar"**.

### S16 — Editar Perfil (`profile/edit.tsx`)
- Avatar 112 circle at the top. Tap it to pick a square-cropped photo; with no photo it shows purple with an `Upload` icon.
- **Card "PERFIL"** (bg `card`, radius 16, padding 16). Each field has a label (13 sub) and an input (bg `card2`, radius 12, 17px, padding 16×12):
  - **Nome**
  - **Instagram** (placeholder "@instagram")
  - **Telefone** (placeholder "(12) 93456-7810", masked)
  - Button **"Salvar perfil"** (purple; "Salvando..."). Alert "Sucesso / Perfil atualizado!".
- **Card "CREDENCIAIS"**:
  - **E-mail** ("email@exemplo.com")
  - **Nova senha** ("••••••••")
  - **Confirmar senha**
  - Button **"Salvar credenciais"** (bg `card2`).
  - Alerts: "As senhas não coincidem.", "Nenhuma alteração detectada.", "Confirmação enviada / Verifique seu novo e-mail para confirmar a troca.", "Sucesso / Senha atualizada!".

### Global states summary
- **Loading**: every screen shows the cached copy instantly (MMKV cache with a 5-minute TTL) and refreshes in the background. With no cache, zeros or empty lists render. The only real spinners are on Ranking and on buttons ("Entrando...", "Salvando...").
- **Live updates**: realtime on `orders` and `business_influencers` invalidates the cache and bumps a version, so every mounted screen re-fetches. A new sale shows up on Dashboard, Vendas, Business and Campanhas without user action.
- **Pull to refresh**: only on the Solicitações and Notificações lists.
- **Push**: tapping an invite push opens Solicitações. A business notification push opens the Notificações tab.

---

## 3. Tier / level logic

- **Source of truth**: the RPC `get_influencer_level_progress()` returns a single JSON object:
  `{ total_sales, current_level (1–6), current_level_name, current_level_color, next_level, next_level_name, next_level_min, progress_percent }`.
  The function body is **not in either repo** and the Supabase MCP was not authorised, so the thresholds below are **inferred**.
- **Client computations** (exact code):
  - `progress = progress_percent`. Printed raw with a dot decimal: `32.2%`.
  - `remaining = next_level_min − total_sales`, rendered with `formatSales`, which gives `R$ 68K`. Caption: `` `${progress}% — faltam ${formatSales(remaining)} para o ${next_level_name}` ``. With no next level: `` `${progress}% — Nível máximo 🏆` ``.
  - The stepper marks tier `l` as reached when `current_level >= l.level` and as current when `current_level === l.level`.
- **Bronze → Prata threshold = R$ 100.000 (confirmed by arithmetic).** The screenshot shows `R$ 32K`, `32.2%`, `faltam R$ 68K`. That fits `total_sales = 32.200`, `next_level_min = 100.000`, and `progress = (total − bronze_min 0) / (100.000 − 0) × 100 = 32.2`. The old v2.0.2 dashboard placeholder ("19.5%" / "R$ 81.000") is also consistent with 100k.
- **Formula to implement**: `progress_percent = round1( (total_sales − current_min) / (next_min − current_min) × 100 )`. This is an assumption. It gives the same result as `total/next_min` while in Bronze, because Bronze starts at 0.
- `total_sales` is very likely **gross sales volume** generated by the influencer's coupons, not commission. R$ 32K accumulated against about R$ 418/month of commission implies a commission rate around 10%.
- **Suggested mock thresholds (ASSUMPTION, labelled as such):** Bronze 0 · **Prata 100.000** · Ouro 250.000 · Platina 500.000 · Diamante 1.000.000 · Elite 2.000.000.
- `formatSales(v)`: ≥1.000.000 gives `R$ 1.2M` (`toFixed(1)`, dot). ≥1.000 gives `R$ 32K` (`toFixed(0)`). Otherwise it uses BRL currency `R$ 850,00`.

---

## 4. Data model (RPCs and tables used by the app)

Everything is scoped by `auth.uid()` on the server. Valid order statuses are `open` and `paid`. **Any other status** (e.g. `cancelled`, `refunded`, `chargeback`) is treated as **cancelled** in the UI: struck through, status text shown in red, excluded from totals but still counted in "N lançamentos".

**Commission per order** (server): `commission_value = hattotal × (1 − payment_fee%/100) × (1 − other_fee%/100) × commission_percent/100`. `commission_percent` comes from the coupon's `coupon_commissions` row valid at the order date. All date cuts use the `America/Sao_Paulo` timezone.

### 4.1 `get_influencer_dashboard_home_v1()`
Dashboard (v2.1.0). Returns one row:
```ts
{ comissao_mes_atual: number; vendas_mes_atual: number;
  comissao_mes_anterior: number; vendas_mes_anterior: number;
  variacao_pct: number|null;              // (atual−anterior)/anterior×100, 2 decimals; null if anterior=0
  prospeccao_comissao_prox_mes: number;   // average of the 3 previous COMPLETE months (zeros count)
  prospeccao_vendas_prox_mes: number;     // same average for counts (may be fractional → rounded in UI)
  vendas_recentes: RecentSale[] }         // last 5 orders, ALL statuses, ordered_at desc
RecentSale = { business_name; business_avatar|null; coupon_name|null; order_date (ISO); value_commission; status }
```

### 4.2 `get_influencer_orders_overview_v_r1_0_1(p_period?: 'today'|'week'|'month', p_year?, p_month?)`
Vendas list. Returns `TPOrders[]`: `{ business_avatar, business_name, coupon_name, order_date, value_commission, status }`. "Este mês" is a second call with `p_period:'month'`.

### 4.3 `get_influencer_level_progress()`
See section 3.

### 4.4 `get_influencer_businesses_overview_v_r1_0_1(p_period?: 'today'|'month', p_year?, p_month?)`
Business tab. Returns `{ business_id, name, avatar_url, comissao_total, coupon_codes: string[] }[]`.

### 4.5 `get_influencer_business_dashboard_v_r1_0_1(p_business_id)`
Business dashboard. Returns one row: `{ name, site, avatar_url, comissao_mensal, total_comissao, vendas, ticket_medio, dias_30_values[], dias_30_labels[] ('DD/MM'), meses_6_values[], meses_6_labels[] ('Mon') }`.

### 4.6 `get_influencer_campaigns_overview_v_r1_0_1()`
Campanhas tab. Returns `{ campaign_id, campaign_name, status ('active'|'draft'|'paused'|'finished'|'cancelled'), start_date, end_date, all_commission_campaign, business_name, business_avatar, business_site }[]`.

### 4.7 `get_campaign_ranking_for_influencer_v_r1_0_1(p_campaign_id)`
Ranking. Returns `{ influencer_id, influencer_name, influencer_instagram, avatar_url, total_commission, total_orders }[]`, already sorted by position (index 0 = 1st).

### 4.8 `get_campaign_prizes(p_campaign_id)`
Returns a JSON string or array of `{ title, position_start, position_end?, reward_type? ('valor' → BRL, else free text), reward_value? (string) }`.

### 4.9 `get_influencer_pending_invites()`
Returns `{ id (business_influencers.id), name, avatar_url, site }[]`. The count drives the bell badge.
- **Accept/reject**: `UPDATE business_influencers SET is_invite_accepted, status = 'active'|'rejected', updated_at WHERE id AND influencer_id = me`.

### 4.10 Notifications
- `get_influencer_notifications()` returns `{ id, title|null, body, data (jsonb, may contain tab:'notificacoes'), created_at, read_at|null, business_id, business_name, business_avatar }[]`.
- `mark_influencer_notifications_read(p_ids?: uuid[])`: with no ids it marks all as read.
- Table `influencer_notifications` (influencer_id, business_id, notification_id, title, body, data, created_at, read_at).

### 4.11 Profile
- `influencers` row: `{ id, name, email, phone, instagram, avatar_url ('{exposeUUID}/avatar.ext' in bucket 'avatars'), invite_code, is_invite_active, created_at }`.
- `users`: `{ id, role ('influencer'|'business'), exposeUUID }`.
- `insta_connection`: `{ username }`.
- `push_tokens`: `{ user_id, expo_push_token, plataform (sic), app_version }`, written through RPC `upsert_push_token`.

### 4.12 Legacy `get_influencer_dashboard_v_r1_0_1()`
v2.0.2 Dashboard. Returns `{ comissao_mes, comissao_total, sells, ticket, vendas_30_dias_values/labels, vendas_6_meses_values/labels }`.

### 4.13 Underlying tables
`orders` (influencer_id, business_id, coupon_id, status, hattotal, ordered_at, external_id, source), `coupons` (code = "coupon_name"), `coupon_commissions` (commission_percent, validity), `store_payment_fees`, `business_influencers`, `businesses` (name, site, avatar), `influencer_kpi_cache`.

### 4.14 Formatting helpers to port to JS
- `formatBRL(v)` = `new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)`, which gives `R$ 1.284,60`. Note the non-breaking space after "R$".
- `formatCompact` / `formatSales`: see section 3.
- Dashboard date: `Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit'})` gives `30/06`. Vendas and Campanhas dates add `year:'numeric'`, giving `30/06/2026`.
- `formatVendas(n)` gives `"1 venda"` / `"N vendas"` (rounded).
- Plurals:
  - `"N lançamento(s)"`, `"N resultado(s)"`, `"N participante(s)"`
  - `"N negócio(s) ativo(s)"` (singular: "1 negócio ativo")
- Month label: `d.toLocaleString('pt-BR',{month:'long'})` with the first letter capitalised, plus the year, e.g. `"Setembro 2026"`.
- Ranking points: `((x*9)/5.67*0.25).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}) + ' pts'`.
- `timeAgo`: see S14.

### 4.15 Suggested mock dataset
"Today" is **26/10/2026**. Use fictional brands and people, not the real "Next"/"GUBAZZ55" from the screenshot, unless an exact replica is wanted.
- Influencer:
  - Name: **Marina Costa**, `@marinacosta`, avatar = initials "MC" on purple.
  - Invite code: `ROI7K2Q`.
  - Level: `total_sales 32200` → Bronze, 32.2%, next Prata, next_min 100000 (matches the screenshot). For a stronger demo, an alternative is `total_sales 91500` → 91.5%, "faltam R$ 9K para o Prata". Animate it to Prata after a "new sale".
- Businesses and coupons:

  | Business | Coupons | Month commission |
  |---|---|---|
  | Vitta Nutri | `MARINA10` | R$ 642,30 |
  | Bella Pele | `MARINA15`, `MARIVIP` | R$ 418,90 |
  | Kairos Fit | `MARI20` | R$ 223,40 |

  Total "COMISSÕES ESTE MÊS" = R$ 1.284,60. "3 negócios ativos".
- Dashboard:
  - Mês atual R$ 1.284,60 · 58 vendas · `+12.46%`.
  - Mês anterior R$ 1.142,30 · 52 vendas.
  - Prospecção R$ 1.198,75 · 54 vendas.
- Recent sales (dd/MM):
  - Vitta Nutri MARINA10 26/10 +R$ 27,48
  - Bella Pele MARIVIP 26/10 +R$ 18,86
  - Kairos Fit MARI20 25/10 +R$ 20,68
  - Bella Pele MARINA15 25/10, status `cancelled`, R$ 3,83 struck through
  - Vitta Nutri MARINA10 24/10 +R$ 6,46
- Vendas:
  - Hoje: 4 lançamentos (one cancelled), "HOJE" total R$ 64,17.
  - Semanal: about 14 items. Mensal: 58 items (show about 20).
  - Each past month in the picker should hold some data.
- Campaigns:

  | Campaign | Status | Dates | Commission |
  |---|---|---|---|
  | "Outubro Rosa" (Bella Pele) | Ativa | 01/10/2026 → 31/10/2026 | R$ 312,40 |
  | "Black Friday Vitta" (Vitta Nutri) | Ativa | 01/11/2026 → 30/11/2026 | R$ 0,00 |
  | "Desafio de Verão" (Kairos Fit) | Encerrada | 01/01/2026 → 31/03/2026 | R$ 845,10 |

  Ranking for Outubro Rosa: 12 participants, Marina at **#4** with 124,0 pts. Leaders: @anafit 401,3 pts, @lucasmove 352,9, @bia.skin 198,4, …
  Prizes: #1 "1º lugar" valor 2000 · #2 "2º lugar" valor 1000 · #3 "3º lugar" valor 500 · #4–10 "Top 10" "Kit de produtos".
- Pending invites (bell badge 2): "Lumi Cosméticos" (lumicosmeticos.com.br), "Nórdica Café" (nordicacafe.com.br).
- Notifications (business-authored; the copy is invented):
  - Bella Pele, "há 2 h": **"Ranking atualizado"** / "Você subiu para o 4º lugar na campanha Outubro Rosa. Faltam 75 pts para o pódio!"
  - Vitta Nutri, "há 1 d": **"Nova campanha no ar"** / "Black Friday Vitta começa dia 01/11. Use o cupom MARINA10."
- New-sale push (copy **invented**; the real alerts are only described as "alertas de novas vendas"): title "Nova venda! 🎉", body "+R$ 27,48 de comissão com o cupom MARINA10 · Vitta Nutri".

---

## 5. User flows (click counts start from the Dashboard after login)

| # | Flow | Steps | Clicks |
|---|---|---|---|
| F01 | **See this month's earnings and recent sales** | Opening the app lands on Dashboard: Mês Atual, variation badge, Mês Anterior, Prospecção, 5 Vendas Recentes | **0** |
| F02 | **See today's sales** | Tap **Vendas** tab, or **"Ver todas"**. "Hoje" is the default: the HOJE card, its count and the list | **1** |
| F03 | Switch period | Vendas, then **Semanal**, then **Mensal**. The right card label changes HOJE → SEMANA → OUTUBRO 2026, totals recompute and the list reloads | 2–3 |
| F04 | **Filter a past month** | Vendas, then **Filtrar por mês**, then **"Setembro 2026"**. The sheet closes, the button turns purple and the card reads "SETEMBRO 2026". To clear: reopen and tap **"Limpar filtro"**, or tap any period pill | 3 (+2 to clear) |
| F05 | **Check tier progress** | Vendas tab: hero with "BRONZE · Próximo: Prata · 32.2% — faltam R$ 68K para o Prata" | **1** |
| F06 | Open a sale | Dashboard, tap a recent sale row, the venda sheet opens; swipe down to close | 1 (+1) |
| F07 | **Earnings per brand** | **Business** tab (Mensal default), optionally **Hoje**, tap a business. Business dashboard: Este mês / Total / Vendas / Ticket médio / 30-day and 6-month charts. Back | 2 (+1 back) |
| F08 | **Campaign ranking position** | **Campanhas** tab, tap a campaign, then podium and "Classificação completa" with pts | **2** |
| F09 | See campaign prizes | F08, then the **trophy** toolbar button, the Prêmios sheet, swipe down | 3 (+1) |
| F10 | **Accept a business invite** (the real equivalent of "solicitar parceria") | **Bell** (badge "2"), the Solicitações tab, **✓** on "Lumi Cosméticos". The row disappears, badge goes to 1, and the business appears in the Business tab | **2** (+1 to verify) |
| F11 | Read business notifications | Bell, then **Notificações** (badge clears, all marked read), long-press a card for the preview and "Marcar como lida" | 2–3 |
| F12 | Share invite code | **Person** icon, Profile, **Copy** icon next to "CÓDIGO DE CONVITE" | 2 |
| F13 | Turn on new-sale alerts | Person, **"Ativar"**, system permission "Permitir", the pill shows "Ativa" in green | 3 |
| F14 | Edit profile | Person, **"Editar perfil"**, edit Nome / Instagram / Telefone, **"Salvar perfil"**, alert "Perfil atualizado!" | 3 + typing |
| F15 | Login | Email, senha, **"Entrar"**, Dashboard | 1 + typing |
| F16 | First access | Signup ("Criar conta"), confirm email, Login, Onboarding ("Complete seu cadastro" + "Continuar"), Dashboard | about 4 + typing |
| F17 | Logout / delete | Person, **"Sair"** · or person, **"Excluir conta"**, **"Sim, excluir minha conta"** | 2 / 3 |

---

## 6. The most sales-relevant interactions to demo

The audience is a business decision-maker. The pitch line is "Quem vê a própria venda, vende mais."

1. **Live "new sale" moment (simulated realtime).** A push banner slides in at the top ("Nova venda! 🎉 +R$ 27,48 … cupom MARINA10", invented copy). A new row then appears at the top of **Vendas Recentes**, **Mês Atual** counts up (R$ 1.257,12 → R$ 1.284,60, 57 → 58 vendas) and the variation badge updates.
   - Backed by real features: realtime cache invalidation on `orders`, and opt-in "alertas de novas vendas".
   - Message: the influencer sees each sale within seconds and keeps posting.
2. **Tier progress Bronze → Prata (gamification).** On Vendas, animate the purple bar filling up and the caption "**32.2% — faltam R$ 68K para o Prata**".
   - Demo button: "simular vendas" pushes the bar to 100%, the stepper dot moves to PRATA and the pill changes colour to `#C0C0C0`.
   - Message: a visible goal drives effort. Thresholds above Prata are placeholders.
3. **Transparency per lançamento: Hoje | Semanal | Mensal + "Filtrar por mês".** Every sale is listed with brand, **coupon** and date, and cancellations are visibly struck through.
   - Message: no spreadsheets and no disputes. The influencer trusts the numbers, which supports the pitch claims ("Transparência, velocidade e resultado").
4. **Campaign ranking + Prêmios.** The podium (gold ring on 1st), the influencer's own position (#4, "124,0 pts"), and the trophy button that opens the prize sheet (R$ 2.000 for 1st).
   - Message: the brand can run competitions that push sales. Points hide competitors' R$.
   - Optional enhancement (not in the code): highlight "Você" on the influencer's own row with a purple tint.
5. **Dashboard comparison + forecast.** "MÊS ANTERIOR" against "MÊS ATUAL" with **+12.46%**, plus **"PROSPECÇÃO PRÓX. MÊS"** (average of the last 3 months).
   - Message: the influencer manages their own performance like a seller with a target.
6. **Business tab → brand dashboard, and accepting invites.** Per-brand earnings with coupon chips, then the business dashboard (Este mês / Total / Ticket médio / 30-day area chart). Also the bell, then Solicitações, then ✓, so a new partner is active in 1 tap.
   - Message: onboarding new influencers is frictionless and each brand's results are clear to them.

---

## 7. Reusable assets (absolute paths)

| File | Size | What it is |
|---|---|---|
| `/private/tmp/claude-501/-Volumes-Projects-Roibusiness/a7e51a46-1f23-4561-bdd8-4b40af79841b/scratchpad/influencer-app/src/assets/roinfluencer.png` | 192×192 PNG | **Logo mark**: white "R" with a 4-point sparkle on purple `#6b0078`, square. Used on Login/Signup at 96×96 |
| `/private/tmp/claude-501/-Volumes-Projects-Roibusiness/a7e51a46-1f23-4561-bdd8-4b40af79841b/scratchpad/influencer-app/assets/images/icon.png` | 1024×1024 PNG | Same mark in high resolution. **`splash-icon.png` and `adaptive-icon.png` are byte-identical** to it. Best source for the logo |
| `/private/tmp/claude-501/-Volumes-Projects-Roibusiness/a7e51a46-1f23-4561-bdd8-4b40af79841b/scratchpad/influencer-app/assets/images/favicon.png` | 48×48 | Favicon |
| `/private/tmp/claude-501/-Volumes-Projects-Roibusiness/a7e51a46-1f23-4561-bdd8-4b40af79841b/scratchpad/influencer-app/src/assets/NextCubeInc-logo.png` | 441×470 | NextCube Inc logo (Login footer, 36×36) |
| `/private/tmp/claude-501/-Volumes-Projects-Roibusiness/a7e51a46-1f23-4561-bdd8-4b40af79841b/scratchpad/influencer-app/src/assets/Imagem de perfil.webp` | 1280×1280 | Generic grey person-silhouette placeholder (light bg). Not used in screens; the app uses initials instead |
| `/private/tmp/claude-501/-Volumes-Projects-Roibusiness/a7e51a46-1f23-4561-bdd8-4b40af79841b/scratchpad/influencer-app/assets/fonts/SpaceMono-Regular.ttf` | | Unused font |
| `/Volumes/Projects/GitHub/roinfluencer-app/assets/splash.json` | 512×512 | Lottie splash (v2.1.0). `roi-Animation.json` sits beside it |
| `/private/tmp/claude-501/-Volumes-Projects-Roibusiness/a7e51a46-1f23-4561-bdd8-4b40af79841b/scratchpad/pdf/hp06.png` | 1200×675 | Reference screenshot slide (both phones) for visual QA |

The same images exist in the v2.1.0 copy under `/Volumes/Projects/GitHub/roinfluencer-app/{src/assets,assets/images}`. No business logos are bundled; they come from Supabase storage. In the mockup, use initials avatars or simple generated SVG logos.

---

## 8. Quick build checklist for the mockup agent
- Phone frame about 390×844. Status bar "9:41". Dark UI `#0c0c10`.
- Header capsule with bell (badge) and person on the 4 tab roots. Native-style back header on pushed screens.
- Floating light-glass tab bar `#c8c7cc` with a darker grey selected pill (`#b0afb4`, white icon and label). Labels Dashboard / Business / Vendas / Campanhas.
- Screens to build, in priority order:
  1. S06 Dashboard
  2. S08 Vendas, with its sheet
  3. S12 Ranking and S13 Prêmios
  4. S09 Business and S10 brand dashboard
  5. S14 Solicitações / Notificações
  6. S15 Perfil
  7. S07 Venda sheet
  8. Optional: S02 Login
- Simulated-realtime "Nova venda" button or timer (section 6, item 1). Tier-bar animation.
- Keep every string in pt-BR exactly as quoted above. Fix the obvious code typos: "3 Campanhas" should be dynamic, the venda sheet should use a decimal comma, and "Solicitacoes" should be "Solicitações".
