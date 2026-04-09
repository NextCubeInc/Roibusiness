import { getRankingData } from "./actions"
import RankingClient from "./ranking-client"

export default async function RankingPage() {
  const { ranking, campaigns, influencers } = await getRankingData()

  return (
    <RankingClient
      initialRanking={ranking}
      initialCampaigns={campaigns}
      connectedInfluencers={influencers}
    />
  )
}