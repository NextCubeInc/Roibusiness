import InfluencersPage from "./actions"
import ClientPage from "./client-page"

export default async function Page() {
  const influencers = await InfluencersPage()
  return <ClientPage influencers={influencers ?? []} />
}