"use server"

import { PlanSelect } from "./actions"
import PlansPage from "./plans"


export default async function Page() {
  const plan =  await PlanSelect()
  return(
    <PlansPage planll={plan}/>
  )
  
}