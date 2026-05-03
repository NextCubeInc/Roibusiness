import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function VendasLoading() {
  return (
    <div className="flex flex-col gap-6 p-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-muted/50 rounded-lg p-4 flex flex-col gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-28" />
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-48 rounded-md" />
        <Skeleton className="h-9 w-36 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>

      {/* Tabela de vendas */}
      <Card className="overflow-hidden">
        <div className="p-4 flex flex-col gap-3">
          {/* Cabeçalho */}
          <div className="grid grid-cols-7 gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-full" />
            ))}
          </div>

          {/* Linhas */}
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="grid grid-cols-7 gap-4 items-center py-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              {/* Influencer com avatar */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </Card>

      {/* Paginação */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>

    </div>
  )
}
