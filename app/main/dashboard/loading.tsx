import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 p-4">

      {/* Header */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-muted/50 rounded-lg p-4 flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-28" />
              <div className="flex gap-1">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-6 w-8 rounded-md" />
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">

        {/* Últimas vendas */}
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent className="p-0 px-4 pb-4">
            <div className="flex flex-col gap-3 mt-2">
              {/* Header da tabela */}
              <div className="grid grid-cols-7 gap-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-3 w-full" />
                ))}
              </div>
              {/* Linhas */}
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="grid grid-cols-7 gap-3 items-center">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top influencers */}
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent className="p-0 px-4 pb-4">
            <div className="flex flex-col gap-3 mt-2">
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-3 w-full" />
                ))}
              </div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="flex flex-col gap-1 flex-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-14" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
