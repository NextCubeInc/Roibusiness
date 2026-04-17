"use server"

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server"
import { sendRecover } from "./actions";


export default async function resetPassword(){

  
  
  return(
    <div className="flex h-screen w-screen justify-center items-center">
      <Card className="w-full max-w-sm">
        <form action={sendRecover}>
          <Field>
          <CardHeader className=" justify-center">
            <CardTitle>
              Crie Uma Nova Senha
            </CardTitle>
          </CardHeader>
          <CardContent className=" flex flex-col gap-2 ">
            <FieldLabel htmlFor="password">New Password</FieldLabel>
            <Input name="password" type="password" required />
          </CardContent>
          <CardFooter className=" justify-center ">
            <Button type="submit">reset</Button>
          </CardFooter>
          </Field>
        </form>
      </Card>
    </div>
  )
  
}