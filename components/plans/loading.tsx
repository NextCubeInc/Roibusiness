import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export default function PlansLoading() {
  return (
    <div className="flex flex-col gap-6 p-4">

      {/* Header */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-4 w-16" />
      </div>

      {/* Cards de plano */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto w-full">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-6 flex flex-col gap-5">
              {/* Nome do plano */}
              <div className="flex flex-col gap-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-6 w-24" />
              </div>

              {/* Preço */}
              <div className="flex items-end gap-1">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-4 w-8 mb-1" />
              </div>

              {/* Features */}
              <div className="flex flex-col gap-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>

              {/* Botão CTA */}
              <Skeleton className="h-10 w-full rounded-md mt-auto" />
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  )
}
