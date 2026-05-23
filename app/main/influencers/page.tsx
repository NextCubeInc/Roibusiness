import getInfluencersData, { getPendingInvites } from "./actions"
import ClientPage from "./client-page"

export default async function Page() {
  const [data, pendingInvites] = await Promise.all([
    getInfluencersData(),
    getPendingInvites(),
  ])

  return (
    <ClientPage
      influencers={data?.influencers ?? []}
      topInfluencers={data?.topInfluencers ?? []}
      pendingInvites={pendingInvites ?? []}
    />
  )
}