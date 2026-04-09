export type BusinessProfile = {
  name: string | null
  email: string | null
  avatar_url: string | null
  phone: string | null
  instagram: string | null
  site: string | null
}

export type formfillProfile = {
  actionFill: (formData: FormData) => Promise<any>
}

// mock test
export interface Influencer {
  id: string;
  name: string;
  instagram: string;
  avatarInitial: string;
  avatarColor: string;
  cupom: string;
  vendasMes: number;
  comissao: number;
  comissaoPercent: number;
}

export interface Order {
  id: string;
  date: Date;
  pedidoId: string;
  influencerId: string;
  influencerName: string;
  influencerInitial: string;
  influencerColor: string;
  cupom: string;
  plataforma: "Nuvemshop" | "Shopify";
  valor: number;
  comissao: number;
}

export interface Campaign {
  id: string;
  name: string;
  status: "Ativa" | "Encerrada" | "Rascunho";
  startDate: Date;
  endDate: Date;
  prizes: string[];
  ranking: { position: number; influencerId: string; name: string; initial: string; color: string; vendas: number; comissao: number }[];
}

export interface PendingRequest {
  id: string;
  name: string;
  instagram: string;
  avatarInitial: string;
  avatarColor: string;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  initials: string;
  color: string;
  connected: boolean;
}

const colors = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316", "#84cc16"];

export const influencers: Influencer[] = [
  { id: "1", name: "Camila Ferreira", instagram: "@camilafer", avatarInitial: "CF", avatarColor: colors[0], cupom: "CAMILA10", vendasMes: 18450, comissao: 1845, comissaoPercent: 10 },
  { id: "2", name: "Lucas Mendes", instagram: "@lucasm", avatarInitial: "LM", avatarColor: colors[1], cupom: "LUCAS15", vendasMes: 15200, comissao: 2280, comissaoPercent: 15 },
  { id: "3", name: "Beatriz Santos", instagram: "@biasantos", avatarInitial: "BS", avatarColor: colors[2], cupom: "BIA20", vendasMes: 12800, comissao: 1920, comissaoPercent: 15 },
  { id: "4", name: "Rafael Costa", instagram: "@rafacosta", avatarInitial: "RC", avatarColor: colors[3], cupom: "RAFA10", vendasMes: 11300, comissao: 1130, comissaoPercent: 10 },
  { id: "5", name: "Juliana Alves", instagram: "@jualves", avatarInitial: "JA", avatarColor: colors[4], cupom: "JU15", vendasMes: 9870, comissao: 1480, comissaoPercent: 15 },
  { id: "6", name: "Thiago Ribeiro", instagram: "@thiagor", avatarInitial: "TR", avatarColor: colors[5], cupom: "THIAGO10", vendasMes: 8450, comissao: 845, comissaoPercent: 10 },
  { id: "7", name: "Mariana Oliveira", instagram: "@marioli", avatarInitial: "MO", avatarColor: colors[6], cupom: "MARI20", vendasMes: 7200, comissao: 1440, comissaoPercent: 20 },
  { id: "8", name: "Pedro Nascimento", instagram: "@pedron", avatarInitial: "PN", avatarColor: colors[7], cupom: "PEDRO10", vendasMes: 5930, comissao: 593, comissaoPercent: 10 },
  { id: "9", name: "Ana Clara Lima", instagram: "@anaclara", avatarInitial: "AC", avatarColor: colors[8], cupom: "ANA15", vendasMes: 4200, comissao: 630, comissaoPercent: 15 },
  { id: "10", name: "Gabriel Souza", instagram: "@gabsouza", avatarInitial: "GS", avatarColor: colors[9], cupom: "GABI10", vendasMes: 3800, comissao: 380, comissaoPercent: 10 },
];

function genOrders(): Order[] {
  const platforms: ("Nuvemshop" | "Shopify")[] = ["Nuvemshop", "Shopify"];
  const orders: Order[] = [];
  for (let i = 0; i < 20; i++) {
    const inf = influencers[i % influencers.length];
    const valor = Math.round(120 + Math.random() * 380);
    orders.push({
      id: String(i + 1),
      date: new Date(2025, 2, 22 - i, 14 - i % 12, (i * 17) % 60),
      pedidoId: `#${(54230 - i * 13).toString()}`,
      influencerId: inf.id,
      influencerName: inf.name,
      influencerInitial: inf.avatarInitial,
      influencerColor: inf.avatarColor,
      cupom: inf.cupom,
      plataforma: platforms[i % 2],
      valor,
      comissao: Math.round(valor * (inf.comissaoPercent / 100)),
    });
  }
  return orders;
}

export const orders = genOrders();

export const campaigns: Campaign[] = [
  {
    id: "1",
    name: "Verão 2025",
    status: "Ativa",
    startDate: new Date(2025, 0, 15),
    endDate: new Date(2025, 3, 15),
    prizes: ["1º lugar — R$ 500,00 em créditos", "2º–3º lugar — Frete grátis por 30 dias"],
    ranking: influencers.slice(0, 5).map((inf, i) => ({ position: i + 1, influencerId: inf.id, name: inf.name, initial: inf.avatarInitial, color: inf.avatarColor, vendas: inf.vendasMes, comissao: inf.comissao })),
  },
  {
    id: "2",
    name: "Black Friday 2024",
    status: "Encerrada",
    startDate: new Date(2024, 10, 20),
    endDate: new Date(2024, 11, 5),
    prizes: ["1º lugar — R$ 1.000,00 em créditos", "2º lugar — Kit de produtos exclusivo"],
    ranking: influencers.slice(2, 7).map((inf, i) => ({ position: i + 1, influencerId: inf.id, name: inf.name, initial: inf.avatarInitial, color: inf.avatarColor, vendas: Math.round(inf.vendasMes * 1.3), comissao: Math.round(inf.comissao * 1.3) })),
  },
  {
    id: "3",
    name: "Lançamento Coleção Outono",
    status: "Rascunho",
    startDate: new Date(2025, 3, 1),
    endDate: new Date(2025, 5, 30),
    prizes: ["1º lugar — Viagem para São Paulo", "2º–5º lugar — Vale-presente de R$ 200,00"],
    ranking: influencers.slice(4, 9).map((inf, i) => ({ position: i + 1, influencerId: inf.id, name: inf.name, initial: inf.avatarInitial, color: inf.avatarColor, vendas: Math.round(inf.vendasMes * 0.7), comissao: Math.round(inf.comissao * 0.7) })),
  },
];

export const pendingRequests: PendingRequest[] = [
  { id: "r1", name: "Fernanda Guimarães", instagram: "@fernandagui", avatarInitial: "FG", avatarColor: "#e11d48" },
  { id: "r2", name: "Diego Martins", instagram: "@diegomartins", avatarInitial: "DM", avatarColor: "#0891b2" },
  { id: "r3", name: "Isabela Rocha", instagram: "@isabelar", avatarInitial: "IR", avatarColor: "#7c3aed" },
];

export const integrations: Integration[] = [
  { id: "1", name: "Nuvemshop", description: "Sincronize pedidos da sua loja Nuvemshop", initials: "NS", color: "#2563eb", connected: true },
  { id: "2", name: "Shopify", description: "Integre com sua loja Shopify", initials: "SP", color: "#16a34a", connected: false },
  { id: "3", name: "WooCommerce", description: "Conecte sua loja WordPress", initials: "WC", color: "#7c3aed", connected: false },
  { id: "4", name: "Hotmart", description: "Sincronize vendas de produtos digitais", initials: "HM", color: "#ea580c", connected: false },
];

export const kpis = {
  comissaoTotal: 12840,
  comissaoChange: 12,
  vendasGeradas: 94200,
  vendasChange: 8,
  roiGeral: 634,
  roiChange: 3,
  ticketMedio: 187,
  ticketChange: 0,
  influencersAtivos: 24,
  influencersChange: 2,
};

export function genChartData(days: number) {
  const data = [];
  for (let i = days; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    data.push({
      date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      vendas: Math.round(1800 + Math.random() * 3200),
    });
  }
  return data;
}

export function genMonthlyData(months: number) {
  const data = [];
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    data.push({
      month: monthNames[m.getMonth()],
      comissao: Math.round(8000 + Math.random() * 6000),
      vendas: Math.round(60000 + Math.random() * 40000),
    });
  }
  return data;
}

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
