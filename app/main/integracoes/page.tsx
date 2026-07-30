import { getBusinessStores, getInstagramConnection } from "./actions"
import ClientPage from "./integrations"

export default async function IntegracoesPage() {
  const [stores, instagram] = await Promise.all([
    getBusinessStores(),
    getInstagramConnection(),
  ])
  return <ClientPage stores={stores} instagram={instagram} />
}