"use client"

import React, { useState, useEffect, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { getPaymentFees, savePaymentFees } from "./actions"

const METHODS = [
  { id: "pix",                      label: "PIX" },
  { id: "credit_card_1x",           label: "Crédito 1x" },
  { id: "credit_card_installments", label: "Crédito +1x" },
  { id: "boleto",                   label: "Boleto" },
  { id: "debit_card",               label: "Débito" },
  { id: "other",                    label: "Outros" },
] as const

type MethodId = (typeof METHODS)[number]["id"]
type Rates = Record<MethodId, string>

const EMPTY: Rates = {
  pix: "", credit_card_1x: "", credit_card_installments: "",
  boleto: "", debit_card: "", other: "",
}

function toNum(v: string) { return parseFloat(v.replace(",", ".")) || 0 }

/** Líquido de R$100 aplicando taxa base + taxa "outros" (composta) */
function calcNet(base: number, other = 0) {
  const net = 100 * (1 - base / 100) * (1 - other / 100)
  return net.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function DialogDemo() {
  const [open, setOpen]   = useState(false)
  const [rates, setRates] = useState<Rates>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getPaymentFees().then((data) => {
      if (data) {
        setRates({
          pix:                      String(data.pix),
          credit_card_1x:           String(data.credit_card_1x),
          credit_card_installments: String(data.credit_card_installments),
          boleto:                   String(data.boleto),
          debit_card:               String(data.debit_card),
          other:                    String(data.other),
        })
      }
      setLoading(false)
    })
  }, [open])

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    startTransition(async () => {
      const result = await savePaymentFees({
        pix:                      toNum(rates.pix),
        credit_card_1x:           toNum(rates.credit_card_1x),
        credit_card_installments: toNum(rates.credit_card_installments),
        boleto:                   toNum(rates.boleto),
        debit_card:               toNum(rates.debit_card),
        other:                    toNum(rates.other),
      })
      if (result.success) setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">Configurar</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Taxas por meio de pagamento</DialogTitle>
            <DialogDescription>
              Configure as taxas cobradas pela sua plataforma de pagamento.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Taxa Outros — destaque principal */}
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor="other" className="text-sm font-semibold">Taxa base (Outros)</Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Incide sobre todas as taxas abaixo</p>
                  </div>
                  <Input
                    id="other"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="0,00"
                    value={rates.other}
                    onChange={(e) => setRates((prev) => ({ ...prev, other: e.target.value }))}
                    className="h-9 text-center w-24 font-semibold border-primary/40 focus-visible:ring-primary/40"
                  />
                  <span className="text-sm tabular-nums text-muted-foreground w-16 text-right">
                    −{toNum(rates.other).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%
                  </span>
                </div>

                {/* Demais métodos */}
                <div className="grid grid-cols-3 items-center gap-x-4 gap-y-3">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Método</span>
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground text-center">Taxa %</span>
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground text-right">/ R$ 100</span>

                  {METHODS.filter((m) => m.id !== "other").map((m) => (
                    <React.Fragment key={m.id}>
                      <Label htmlFor={m.id} className="text-sm font-medium">{m.label}</Label>
                      <Input
                        id={m.id}
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="0,00"
                        value={rates[m.id]}
                        onChange={(e) => setRates((prev) => ({ ...prev, [m.id]: e.target.value }))}
                        className="h-8 text-center"
                      />
                      <span className="text-sm text-right tabular-nums text-muted-foreground">
                        {calcNet(toNum(rates[m.id]), toNum(rates.other))}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={isPending || loading}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
