import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function ConfigLoading() {
  return (
    <div className="flex flex-col gap-6 p-4">

      {/* Header */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-4 w-28" />
      </div>

      <div className="flex flex-col md:flex-row gap-6">

        {/* Nav lateral */}
        <nav className="flex md:flex-col gap-1 md:w-[180px] shrink-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </nav>

        {/* Conteúdo */}
        <div className="flex-1 flex flex-col gap-6">

          {/* Card de avatar + nome */}
          <Card className="p-6 flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full shrink-0" />
            <div className="flex flex-col gap-2 flex-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-9 w-28 rounded-md" />
          </Card>

          {/* Campos do formulário */}
          <Card className="p-6 flex flex-col gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            ))}
            <Skeleton className="h-10 w-28 rounded-md self-end" />
          </Card>

        </div>
      </div>

    </div>
  )
}
