import { getBusinessStores } from "./actions"
import ClientPage from "./integrations"

export default async function IntegracoesPage() {
  const stores = await getBusinessStores()
  return <ClientPage stores={stores} />
}