"use client"

import { useActionState } from "react"
import { submitDeleteRequest, DeleteRequestState } from "./actions"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function DeleteForm({ className, ...props }: React.ComponentProps<"div">) {
  const [state, action, pending] = useActionState<DeleteRequestState, FormData>(
    submitDeleteRequest,
    null
  )

  if (state?.success) {
    return (
      <div className={cn("flex flex-col gap-6 text-center", className)} {...props}>
        <div className="flex flex-col items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-green-100 text-green-600 text-2xl">
            ✓
          </div>
          <h2 className="text-xl font-bold">Solicitação Enviada</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            {state.message}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form action={action}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <a href="https://roinfluencer.com" className="flex flex-col items-center gap-2 font-medium">
              <div className="flex size-8 items-center justify-center rounded-md">
                <img src="/android-chrome-512x512.png" className="size-8" />
              </div>
              <span className="sr-only">ROInfluencer</span>
            </a>
            <h1 className="text-xl font-bold">Solicitar Exclusão de Conta</h1>
            <FieldDescription>
              Preencha os dados abaixo para solicitar a exclusão da sua conta e dados do ROInfluencer.
            </FieldDescription>
          </div>

          <Field>
            <FieldLabel htmlFor="name">Nome</FieldLabel>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Seu nome completo"
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="email@exemplo.com"
              required
            />
          </Field>

          {state?.success === false && (
            <p className="text-sm text-red-500 text-center">{state.message}</p>
          )}

          <Field>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Enviando..." : "Solicitar Exclusão"}
            </Button>
          </Field>

          <FieldDescription className="text-center text-xs text-muted-foreground">
            Após a solicitação, seus dados serão removidos em até 7 dias úteis.
          </FieldDescription>
        </FieldGroup>
      </form>
    </div>
  )
}
