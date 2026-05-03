import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

export default function IntegracoesLoading() {
  return (
    <div className="flex flex-col gap-6 p-4">

      {/* Header */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Cards de integração */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-5 flex flex-col gap-4">
              {/* Logo + badge */}
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              {/* Descrição */}
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
              {/* Campo de input */}
              <Skeleton className="h-9 w-full rounded-md" />
            </CardContent>
            <CardFooter className="px-5 pb-5 pt-0">
              <Skeleton className="h-9 w-full rounded-md" />
            </CardFooter>
          </Card>
        ))}
      </div>

    </div>
  )
}
