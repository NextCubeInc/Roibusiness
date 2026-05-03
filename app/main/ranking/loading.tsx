import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function RankingLoading() {
  return (
    <div className="flex flex-col gap-6 p-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-9 w-40 rounded-md" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-32 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <Skeleton className="h-9 w-48 rounded-md" />
        <Skeleton className="h-9 w-36 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
      </div>

      {/* Ranking table */}
      <Card className="overflow-hidden">
        <div className="p-4 flex flex-col gap-3">
          {/* Cabeçalho */}
          <div className="grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-full" />
            ))}
          </div>

          {/* Top 3 — destaque */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="grid grid-cols-5 gap-4 items-center py-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-6 rounded-full shrink-0" />
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          ))}

          {/* Demais posições */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-5 gap-4 items-center py-1">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded shrink-0" />
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-14" />
                </div>
              </div>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </Card>

    </div>
  )
}
