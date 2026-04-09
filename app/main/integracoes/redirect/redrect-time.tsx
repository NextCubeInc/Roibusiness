"use client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export function RedirectTimer({ to, seconds = 3 }: { to: string; seconds?: number }) {
  const router = useRouter()
  const [count, setCount] = useState(seconds)

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          router.push("/main/integrations")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return <span className="text-white">{count}s</span>
}
