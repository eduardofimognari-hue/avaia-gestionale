import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAzienda, withRuoloScrittura } from '@/lib/api-utils'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (!id) return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
  return withAzienda(async (aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    const body = await request.json()
    const existing = await prisma.terreni.findFirst({ where: { id, aziendaId } })
    if (!existing) return NextResponse.json({ error: 'Terreno non trovato' }, { status: 404 })
    const updated = await prisma.terreni.update({
      where: { id },
      data: {
        nome: body.nome ?? undefined,
        superficie: body.superficie !== undefined ? body.superficie : undefined,
        unitaMisura: body.unitaMisura ?? undefined,
        indirizzo: body.indirizzo !== undefined ? body.indirizzo : undefined,
        comune: body.comune !== undefined ? body.comune : undefined,
        provincia: body.provincia !== undefined ? body.provincia : undefined,
        cap: body.cap !== undefined ? body.cap : undefined,
        latitudine: body.latitudine !== undefined ? body.latitudine : undefined,
        longitudine: body.longitudine !== undefined ? body.longitudine : undefined,
        googleMapsUrl: body.googleMapsUrl !== undefined ? body.googleMapsUrl : undefined,
        confine: body.confine !== undefined ? body.confine : undefined,
        prodottiIds: body.prodottiIds !== undefined ? body.prodottiIds : undefined,
        luogoId: body.luogoId !== undefined ? (body.luogoId ?? null) : undefined,
        note: body.note !== undefined ? body.note : undefined,
        attivo: body.attivo !== undefined ? body.attivo : undefined,
      },
    })
    return NextResponse.json(updated)
  })
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (!id) return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
  return withAzienda(async (aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    const existing = await prisma.terreni.findFirst({ where: { id, aziendaId } })
    if (!existing) return NextResponse.json({ error: 'Terreno non trovato' }, { status: 404 })
    await prisma.terreni.update({ where: { id }, data: { attivo: false } })
    return NextResponse.json({ success: true })
  })
}
