"use client"
import { sendRecover } from "@/app/actions/recoverPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function recoverPassword(){
  
  return(
    <div className="flex h-screen w-screen justify-center items-center">
      <Card className="w-full max-w-sm">
        <form action={sendRecover}>
          <Field>
          <CardHeader className=" justify-center">
            <CardTitle>
              Recupere Sua Senha!
            </CardTitle>
          </CardHeader>
          <CardContent className=" flex flex-col gap-2 ">
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input name="email" type="email" required placeholder="m@exemple.com" />
            <FieldDescription>verifique o span</FieldDescription>
          </CardContent>
          <CardFooter className=" justify-center ">
            <Button type="submit">Enviar recuperação</Button>
          </CardFooter>
          </Field>
        </form>
      </Card>
    </div>
  )
  
}