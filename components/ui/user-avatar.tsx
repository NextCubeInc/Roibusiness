"use client"

import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"

const BUCKET_URL = process.env.NEXT_PUBLIC_BUCKET_URL ?? ""

/**
 * Gera as iniciais a partir do nome.
 * - "Maria Silva" -> "MS"
 * - "Maria"       -> "MA"
 * - ""/null       -> ""
 */
function getInitials(name?: string | null): string {
  if (!name) return ""
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ""
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export type UserAvatarProps = {
  /** URL completa da imagem. Tem precedência sobre `avatarUrl`. */
  src?: string | null
  /**
   * Caminho do objeto no Storage (ex.: "uuid/avatar.jpg").
   * É concatenado com NEXT_PUBLIC_BUCKET_URL para formar a URL final.
   */
  avatarUrl?: string | null
  /** Nome usado para as iniciais (fallback) e para o alt da imagem. */
  name?: string | null
  /** Tamanho renderizado em px (largura = altura). Padrão: 40. */
  size?: number
  /** Classes extras para o wrapper (ex.: "grayscale"). */
  className?: string
  /** Classes extras para o fallback de iniciais (ex.: "text-[10px]"). */
  fallbackClassName?: string
  /** Raio da borda. Padrão: "full". */
  rounded?: "full" | "lg"
}

/**
 * Avatar baseado no <Image> do Next.js.
 *
 * - Otimização + cache automáticos via CDN do Next (ver remotePatterns em next.config).
 * - Fallback para as iniciais do nome quando a imagem falha ou está ausente.
 *
 * Substitui o trio <Avatar>/<AvatarImage>/<AvatarFallback> (Radix) nos pontos
 * onde a imagem vem do Supabase Storage, para reduzir requisições à origem.
 */
export function UserAvatar({
  src,
  avatarUrl,
  name,
  size = 40,
  className,
  fallbackClassName,
  rounded = "full",
}: UserAvatarProps) {
  const [errored, setErrored] = React.useState(false)

  const resolvedSrc =
    src ?? (avatarUrl ? `${BUCKET_URL}${avatarUrl}` : undefined)
  const showImage = Boolean(resolvedSrc) && !errored
  const radius = rounded === "lg" ? "rounded-lg" : "rounded-full"

  // Reseta o estado de erro quando a fonte muda (ex.: troca de avatar).
  React.useEffect(() => {
    setErrored(false)
  }, [resolvedSrc])

  return (
    <span
      data-slot="user-avatar"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-muted text-muted-foreground select-none",
        radius,
        className
      )}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <Image
          src={resolvedSrc as string}
          alt={name ?? ""}
          width={size}
          height={size}
          className={cn("h-full w-full object-cover", radius)}
          onError={() => setErrored(true)}
        />
      ) : (
        <span
          aria-hidden
          className={cn(
            "flex h-full w-full items-center justify-center text-xs font-medium",
            fallbackClassName
          )}
        >
          {getInitials(name)}
        </span>
      )}
    </span>
  )
}

export default UserAvatar
