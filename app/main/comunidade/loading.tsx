import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function ComunidadeLoading() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-4 w-28" />
      </div>

      <div className="flex gap-3">
        <Skeleton className="h-9 w-64 rounded-md" />
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 flex flex-col gap-3">
          <div className="grid grid-cols-4 gap-4">
            {["Influencer", "Seguidores", "Posts", ""].map((_, i) => (
              <Skeleton key={i} className="h-3 w-full" />
            ))}
          </div>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="grid grid-cols-4 gap-4 items-center py-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-10" />
              <div className="flex justify-end"><Skeleton className="h-8 w-16 rounded-md" /></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
