"use server"
import { SignInForm } from "@/app/auth/signin/signin-form"

export default async function ServerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const { error, message } = await searchParams

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignInForm error={error} message={message} />
      </div>
    </div>
  )
}
