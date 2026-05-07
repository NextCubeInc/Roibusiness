import { DeleteForm } from "./delete-form"

export const metadata = {
  title: "Solicitar Exclusão de Conta | ROInfluencer",
  description: "Solicite a exclusão da sua conta e dados pessoais do ROInfluencer.",
}

export default function DeleteMyAccountPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <DeleteForm />
      </div>
    </div>
  )
}
