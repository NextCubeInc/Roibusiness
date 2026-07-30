"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { CheckCircle2, MessageCircle, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { CancelPlan, CreateLink } from "./actions"
import type { isPlan } from "./actions"

const featureIconColor: Record<string, string> = {
  "basic": "text-muted-foreground",
  "roi-pro": "text-primary",
  "roi-elite": "text-[#C88B00]",
}

export default function PlansPage({planll}: {planll: isPlan | null}) {
  const { IsBasic, IsPro, IsElite } = planll ?? {}
  const { open } = useSidebar()

  async function handleClickBasic() {
    const data = await CreateLink("basic")
    window.open(data.url, "_blank")
  }

  async function handleClickPro() {
    const data = await CreateLink("pro")
    window.open(data.url, "_blank")
  }

  function handleClickElite() {
    window.open("https://wa.me/", "_blank")
  }

  const plans = [
    {
      id: "basic",
      toUp:"basic",
      Onplan: IsBasic,
      label: "Plano",
      name: "Basic",
      nameColor: "text-foreground",
      price: "R$497",
      period: "mês",
      cta: { label: "Assinar", icon: Zap, variant: "outline" as const, featured: false },
      featured: false,
      features: [
        "300 vendas/mês",
        "30 influenciadores",
        "Painel de vendas individual",
      ],
      click: handleClickBasic,
    },
    {
      id: "roi-pro",
      toUp:"pro",
      Onplan: IsPro,
      label: "Plano",
      name: "ROI Pro",
      nameColor: "text-primary",
      price: "R$1.870",
      period: "mês",
      cta: { label: "Assinar", icon: Zap, variant: "default" as const, featured: true },
      featured: true,
      features: [
        "1.500 vendas/mês",
        "100 influenciadores",
        "Notificações Push",
        "2 disparos personalizados/mês",
        "Painel completo",
      ],
      click: handleClickPro,
    },
    {
      id: "roi-elite",
      toUp:"elite",
      Onplan: IsElite,
      label: "Plano",
      name: "ROI Elite",
      nameColor: "text-[#C88B00]",
      price: "Sob consulta",
      period: null,
      cta: { label: "Fale com um atendente", icon: MessageCircle, variant: "outline" as const, featured: false },
      featured: false,
      features: [
        "Tudo do Pro",
        "Benefícios exclusivos",
        "Suporte prioritário",
        "Personalização completa",
      ],
      click: handleClickElite,
    },
  ]
  
  return (
    <div className="flex flex-col gap-6 p-4 min-h-screen">
      {/* HEADER */}
      <div className="flex items-center gap-2">
        {!open && <SidebarTrigger size="lg" />}
        <span className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
          Planos
        </span>
      </div>

      {/* HEADLINE */}
      <div className="flex flex-col items-center gap-2 mt-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Escolha o plano ideal para o seu negócio
        </h1>
        <p className="text-sm text-muted-foreground max-w-md">
          Cupons rastreáveis, relatórios em tempo real e gestão completa de influenciadores.
        </p>
      </div>

      {/* CARDS */}
      <div className="flex flex-wrap items-center justify-center gap-6 mt-4 pb-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "relative transition-transform duration-200 hover:-translate-y-1",
              plan.featured && "-translate-y-2"
            )}
          >
            {plan.featured && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                <span className="bg-primary text-primary-foreground text-[10px] font-semibold tracking-widest uppercase px-3 py-1 rounded-full shadow-md whitespace-nowrap">
                  ✦ Recomendado
                </span>
              </div>
            )}

            <Card
              className={cn(
                "w-72 transition-all duration-200",
                plan.featured
                  ? "border-primary shadow-lg shadow-primary/20 ring-1 ring-primary/30"
                  : "border-border"
              )}
            >
              <CardContent className="flex flex-col gap-5 pt-7 pb-6">
                {/* Logo + Label */}
                <div className="flex flex-col items-center gap-2">
                  <img src="/android-chrome-192x192.png" className="size-10 rounded-lg" />
                  <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                    {plan.label}
                  </span>
                </div>

                {/* Plan name */}
                <div className="text-center">
                  <span className={cn("text-3xl font-bold tracking-tight uppercase", plan.nameColor)}>
                    {plan.name}
                  </span>
                </div>

                {/* Price */}
                <div className="flex flex-col items-center bg-muted/40 rounded-lg py-3 px-4">
                  <div className="flex items-baseline gap-1">
                    <span className={cn(
                      "font-bold tabular-nums",
                      plan.price === "Sob consulta"
                        ? "text-xl text-foreground"
                        : "text-3xl text-foreground"
                    )}>
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-xs text-muted-foreground">/{plan.period}</span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <ul className="flex flex-col gap-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className={cn("size-4 mt-0.5 shrink-0", featureIconColor[plan.id])} />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {planll == null?
                  (
                    <Button 
                      onClick={plan.click} 
                      variant={plan.cta.variant}  
                      className={cn( "w-full mt-2 gap-2 tracking-wide", plan.cta.featured && "bg-primary hover:bg-primary/90 text-primary-foreground" )}
                    > 
                      <plan.cta.icon className="size-3.5" /> 
                      { plan.cta.label }
                    </Button>
                  )
                  :
                  (<>
                  {plan.Onplan?
                  (
                    <Button 
                      onClick={CancelPlan} 
                      variant="destructive"  
                      className={cn( "w-full mt-2 gap-2 tracking-wide", plan.cta.featured && "bg-primary hover:bg-primary/90 text-primary-foreground" )}
                    > 
                      <plan.cta.icon className="size-3.5" /> 
                      Cancelar Plano
                    </Button>
                  )
                  :
                  (
                    <Button 
                      onClick={plan.click} 
                      variant="secondary" 
                      className={cn( "w-full mt-2 gap-2 tracking-wide", plan.cta.featured && "bg-primary hover:bg-primary/90 text-primary-foreground" )}
                    > 
                      <plan.cta.icon className="size-3.5" /> 
                      Upgrade Plan
                    </Button>
                  )

                  }
                  </>)
                }
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}