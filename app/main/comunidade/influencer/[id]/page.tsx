import { getInfluencerInstagramDetail } from "../../actions"
import DetailClient from "./detail-client"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const detail = await getInfluencerInstagramDetail(id)
  return <DetailClient influencerId={id} initial={detail} />
}
