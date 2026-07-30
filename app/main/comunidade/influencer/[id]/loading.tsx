import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function DetailLoading() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <Skeleton className="h-8 w-32 rounded-md" />
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4 flex flex-col gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
          </Card>
        ))}
      </div>
      <Skeleton className="h-4 w-24" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className={`w-full rounded-lg ${i % 2 ? "h-64" : "h-44"}`} />
        ))}
      </div>
    </div>
  )
}
