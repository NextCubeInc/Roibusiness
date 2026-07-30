import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function NotificacoesLoading() {
  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Tabs */}
      <Skeleton className="h-9 w-56 rounded-md" />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Form */}
        <div className="flex flex-col gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4 flex flex-col gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-9 w-full rounded-md" />
            </Card>
          ))}
        </div>

        {/* Preview */}
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-40 w-full rounded-[28px]" />
        </div>
      </div>
    </div>
  )
}
