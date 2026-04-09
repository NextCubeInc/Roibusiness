
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Check, X } from "lucide-react"
import { RedirectTimer } from "./redrect-time"

export default async function test({
  searchParams,
}:{
  searchParams: Promise<{status?: string}>
}){

  const { status } = await searchParams
  const isSuccess = status === "true" // converte pra boolean

  return(
    <div className="flex p-3 justify-center items-center h-full w-full">
      <Card size="default" className="w-full max-w-sm">
        <CardHeader className=" justify-center items-center">
          {isSuccess? 
            <Check className="size-8 text-green-400"/>
          :
            <X className="size-8 text-destructive"/>
          }
        </CardHeader>
        <CardContent className="flex justify-center items-center">
          <CardDescription>
            Voce sera redirecionado em: <RedirectTimer to="/main/integracoes" seconds={15} />
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  )
}