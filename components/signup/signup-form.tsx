"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { signUpAction } from "@/app/actions/auth"
import Link from "next/link"

export function SignUpForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form action={signUpAction}>
        <FieldGroup>
          {/* Header */}
          <div className="flex flex-col items-center gap-2 text-center">
            <a
              href="https://roinfluencer.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex size-8 items-center justify-center rounded-md text-primary-foreground">
                <img
                  src="/android-chrome-512x512.png"
                  alt="ROInfluencer logo"
                  className="size-8"
                />
              </div>
              <span className="sr-only">ROInfluencer</span>
            </a>

            <h1 className="text-xl font-bold">
              Crie sua conta Business
            </h1>

            <FieldDescription>
              Já tem conta? <Link href="/auth/signin" className="underline underline-offset-4">
                Login
              </Link>
            </FieldDescription>
          </div>

          {/* Email */}
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="m@example.com"
              required
            />
          </Field>

          {/* Password */}
          <Field>
            <FieldLabel htmlFor="password">Senha</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              required
            />
          </Field>

          {/* Submit */}
          <Field>
            <Button type="submit" className="w-full">
              Criar conta
            </Button>
          </Field>
        </FieldGroup>
      </form>

      {/* Footer */}
      <FieldDescription className="flex items-center justify-center">
        <a
          href="https://nextcubeinc.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-row gap-2 justify-center items-center"
        >
          <img
            src="/NextCubeInc.png"
            alt="NextCubeInc logo"
            className="size-8"
          />
          NextCubeInc
        </a>
      </FieldDescription>
    </div>
  )
}