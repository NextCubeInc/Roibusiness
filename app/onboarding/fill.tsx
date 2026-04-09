"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import type { formfillProfile } from "@/lib/types"

export default function ClientPageFill({ actionFill }: formfillProfile) {
  const [preview, setPreview] = useState<string | null>(null)
  const [name, setName] = useState("")

  // cleanup
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  function getInitials() {
    if (!name) return "??"
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
  }

  async function cropToSquare(file: File): Promise<File> {
    const img = document.createElement("img")
    const url = URL.createObjectURL(file)

    img.src = url

    await new Promise((resolve) => {
      img.onload = resolve
    })

    const size = Math.min(img.width, img.height)

    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size

    const ctx = canvas.getContext("2d")!

    // crop central
    ctx.drawImage(
      img,
      (img.width - size) / 2,
      (img.height - size) / 2,
      size,
      size,
      0,
      0,
      size,
      size
    )

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) return
        const croppedFile = new File([blob], file.name, {
          type: "image/jpeg",
        })
        resolve(croppedFile)
      }, "image/jpeg", 0.9)
    })
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // crop antes de mostrar
    const cropped = await cropToSquare(file)

    const url = URL.createObjectURL(cropped)
    setPreview(url)
  }

  return (
    <div className="w-screen h-screen flex justify-center items-center">
      <form action={actionFill}>
        <Card size="default">
          <Field>
            <CardHeader>
              <CardTitle className="text-2xl">
                Preencha seu Perfil
              </CardTitle>
            </CardHeader>

            <Separator />

            <CardContent className="flex flex-col justify-center gap-6">
              
              {/* Avatar */}
              <div className="flex flex-row items-center gap-4">
                <div className="flex h-24 w-24 rounded-full bg-primary items-center justify-center overflow-hidden">
                  {preview ? (
                    <img
                      src={preview}
                      alt="preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-bold text-lg">
                      {getInitials()}
                    </span>
                  )}
                </div>

                <Input
                  type="file"
                  name="avatar"
                  accept="image/*"
                  className="w-sm"
                  onChange={handleImageChange}
                />
              </div>

              {/* Nome + Instagram */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Name</FieldLabel>
                  <Input
                    name="name"
                    required
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div>
                  <FieldLabel>Instagram</FieldLabel>
                  <Input name="instagram" required />
                </div>

              </div>

              {/* Telefone + site */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Telefone</FieldLabel>
                  <Input name="phone" type="tel" required />
                </div>

                <div>
                  <FieldLabel>Site</FieldLabel>
                  <Input name="url" required />
                </div>
              </div>
            </CardContent>

            <CardFooter>
              <Button type="submit">Salvar Alterações</Button>
            </CardFooter>
          </Field>
        </Card>
      </form>
    </div>
  )
}