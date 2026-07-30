import { getNotificationsData } from "./actions"
import ClientPage from "./client-page"

export default async function Page() {
  const { influencers, groups, history } = await getNotificationsData()

  return (
    <ClientPage
      influencers={influencers}
      groups={groups}
      history={history}
    />
  )
}
