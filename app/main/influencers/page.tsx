import getInfluencersData, { getPendingInvites } from "./actions"
import ClientPage from "./client-page"

export default async function Page() {
  const [influencers, pendingInvites] = await Promise.all([
    getInfluencersData(),
    getPendingInvites(),
  ])

  return (
    <ClientPage
      influencers={influencers ?? []}
      pendingInvites={pendingInvites ?? []}
    />
  )
}