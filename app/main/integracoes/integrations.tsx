"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useState, useTransition } from "react"
import { nuvemShopLink, disconnectStore, type StoreInfo } from "./actions"
import { Loader2, Unplug } from "lucide-react"

interface Props {
  stores: StoreInfo[]
}

export default function ClientPage({ stores: initialStores }: Props) {
  const { open } = useSidebar()
  const [stores, setStores] = useState<StoreInfo[]>(initialStores)
  const [isPending, startTransition] = useTransition()

  function isConnected(type: string) {
    return stores.some(s => s.store_type === type && s.is_synced)
  }

  function handleDisconnect(store_type: string) {
    startTransition(async () => {
      await disconnectStore(store_type)
      setStores(prev =>
        prev.map(s =>
          s.store_type === store_type
            ? { ...s, is_synced: false, store_id: null }
            : s
        )
      )
    })
  }

  const nsConnected = isConnected("NS")

  return (
    <div className="flex flex-col gap-6 p-3">

      {/* Header */}
      <div className="flex items-center gap-2">
        {!open && <SidebarTrigger size="lg" />}
        <span className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
          Integrações
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 items-stretch">

        {/* NuvemShop */}
        <Card className="h-full">
          <form action={nuvemShopLink} className="flex flex-col h-full">
            <Field className="flex flex-col h-full">
              <CardContent className="flex flex-col gap-2 flex-1">
                <div className="flex flex-row gap-3 items-center">
                  <img
                    src="https://files.inhire.app/pages/career/vagasbyintera_nuvemshop-tiendanube-og.png"
                    className="w-auto h-10 object-contain rounded-sm"
                  />
                  <div className="flex flex-col gap-0.5">
                    <CardTitle>NuvemShop</CardTitle>
                    {nsConnected ? (
                      <Badge className="bg-green-600 w-fit">Conectado</Badge>
                    ) : (
                      <Badge variant="outline" className="w-fit">Desconectado</Badge>
                    )}
                  </div>
                </div>
                <CardDescription>
                  Sincronize os pedidos da sua loja{" "}
                  <a href="https://www.nuvemshop.com.br" className="underline text-sidebar-primary">
                    NuvemShop
                  </a>
                </CardDescription>

                {!nsConnected && (
                  <>
                    <FieldLabel>Link da loja</FieldLabel>
                    <Input name="NuvemShop" type="text" required placeholder="exempleloja.lojavirtualnuvem.com.br" />
                    <FieldDescription>exempleloja.lojavirtualnuvem.com.br</FieldDescription>
                  </>
                )}
              </CardContent>

              <CardFooter>
                {nsConnected ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="outline" className="w-full text-destructive hover:text-destructive">
                        {isPending
                          ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          : <Unplug className="h-4 w-4 mr-2" />
                        }
                        Desconectar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Desconectar NuvemShop?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Isso vai remover o token de acesso. Novos pedidos não serão mais sincronizados.
                          Você pode reconectar a qualquer momento.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => handleDisconnect("NS")}
                        >
                          Desconectar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button type="submit" className="w-full" disabled={isPending}>
                    Conectar
                  </Button>
                )}
              </CardFooter>
            </Field>
          </form>
        </Card>

        {/* Pagar.me */}
        <Card className="h-full opacity-60">
          <Field className="flex flex-col h-full">
            <CardContent className="flex flex-col gap-2 flex-1">
              <div className="flex flex-row gap-3 items-center">
                <img
                  src="https://avatars.githubusercontent.com/u/3846050?s=280&v=4"
                  className="w-auto h-10 object-contain rounded-sm"
                />
                <div className="flex flex-col gap-0.5">
                  <CardTitle>Pagar.me</CardTitle>
                  <Badge variant="outline" className="w-fit">Em breve</Badge>
                </div>
              </div>
              <CardDescription>
                Sincronize os pedidos processados pela{" "}
                <a href="https://pagar.me" className="underline text-sidebar-primary">
                  Pagar.me
                </a>
              </CardDescription>
            </CardContent>
            <CardFooter>
              <Button className="w-full" disabled>Conectar</Button>
            </CardFooter>
          </Field>
        </Card>

        {/* Cakto */}
        <Card className="h-full opacity-60">
          <Field className="flex flex-col h-full">
            <CardContent className="flex flex-col gap-2 flex-1">
              <div className="flex flex-row gap-3 items-center">
                <img
                  src="https://play-lh.googleusercontent.com/RrKEVOidYnBOkRFbJdN8D_HQs4D9kvnYOt4rfkGF4wsUCg_K2EGhHpJdg3Owa0QdMjLy"
                  className="w-auto h-10 object-contain rounded-sm"
                />
                <div className="flex flex-col gap-0.5">
                  <CardTitle>Cakto</CardTitle>
                  <Badge variant="outline" className="w-fit">Em breve</Badge>
                </div>
              </div>
              <CardDescription>
                Sincronize os pedidos processados pela{" "}
                <a href="https://cakto.com.br" className="underline text-sidebar-primary">
                  Cakto
                </a>
              </CardDescription>
            </CardContent>
            <CardFooter>
              <Button className="w-full" disabled>Conectar</Button>
            </CardFooter>
          </Field>
        </Card>

      </div>
    </div>
  )
}