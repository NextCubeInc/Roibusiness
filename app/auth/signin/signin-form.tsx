"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { signInAction } from "@/app/actions/auth"
import Link from "next/link"

export function SignInForm({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form action={signInAction}> {/* Passa a Server Action aqui */}
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <a href="https://roinfluencer.com" className="flex flex-col items-center gap-2 font-medium">
              <div className="flex size-8 items-center justify-center rounded-md text-primary-foreground">
                <img src="/android-chrome-512x512.png" className="size-8"/>
              </div>
              <span className="sr-only">ROInfluencer</span>
            </a>
            <h1 className="text-xl font-bold">Bem Vindo Ao Roibusiness</h1>
            <FieldDescription>
              Nao tem conta? <Link href="/auth/signup">Cadastra-se</Link>
            </FieldDescription>
          </div>

          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input id="email" name="email" type="email" placeholder="m@example.com" required />
          </Field>

          <Field>
            <div className="flex flex-row justify-between">
              <FieldLabel htmlFor="password">Senha</FieldLabel>
              <FieldLabel>
                <Link href="/auth/recover" className=" hover:underline ">
                  Esqueceu Sua Senha?
                </Link>
              </FieldLabel>
            </div>
            <Input id="password" name="password" type="password" required />
          </Field>

          <Field>
            <Button type="submit" className="w-full">
              Login
            </Button>
          </Field>
        </FieldGroup>
      </form>
      <FieldDescription className="flex items-center justify-center">
        <label htmlFor="NextCubeInc">
          <Link href="https://nextcubeinc.com" className="flex flex-row gap-2 justify-center items-center">
            <img src="/NextCubeInc.png" className="size-8"/>
            NextCubeInc
          </Link>
        </label>
      </FieldDescription>
    </div>
  )
}
