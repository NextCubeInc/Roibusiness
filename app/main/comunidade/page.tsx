import { getComunidadeData } from "./actions"
import ComunidadeClient from "./comunidade-client"

export default async function Page() {
  const rows = await getComunidadeData()
  return <ComunidadeClient rows={rows ?? []} />
}
