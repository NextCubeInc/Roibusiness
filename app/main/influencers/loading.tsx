import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function InfluencersLoading() {
  return (
    <div className="flex flex-col gap-6 p-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>

      {/* Convites pendentes */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-40" />
        <div className="flex gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-48 rounded-full" />
          ))}
        </div>
      </div>

      {/* Tabela de influencers */}
      <Card className="overflow-hidden">
        <div className="p-4 flex flex-col gap-3">
          {/* Cabeçalho */}
          <div className="grid grid-cols-5 gap-4">
            {["Influencer", "Cupons", "Vendas/mês", "Comissão/mês", ""].map((_, i) => (
              <Skeleton key={i} className="h-3 w-full" />
            ))}
          </div>

          {/* Linhas */}
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="grid grid-cols-5 gap-4 items-center py-1">
              {/* Avatar + nome */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              {/* Cupons */}
              <div className="flex gap-1">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              {/* Vendas */}
              <Skeleton className="h-4 w-20" />
              {/* Comissão */}
              <Skeleton className="h-4 w-20" />
              {/* Ações */}
              <div className="flex gap-2 justify-end">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </Card>

    </div>
  )
}
