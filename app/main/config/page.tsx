"use server"
import { getBusinessSettings } from "./actions"
import ConfiguracoesClient from "./configuracoes-client"

export default async function ConfiguracoesPage() {
  const settings = await getBusinessSettings()
  return <ConfiguracoesClient settings={settings!} />
}