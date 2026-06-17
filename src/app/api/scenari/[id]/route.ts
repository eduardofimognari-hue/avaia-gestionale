import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { withAzienda, withRuoloScrittura } from '@/lib/api-utils'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  return withAzienda(async (aziendaId) => {
    const item = await prisma.scenario.findFirst({ where: { id, aziendaId } })
    if (!item) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
    return NextResponse.json(item)
  })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  return withAzienda(async (aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    const body = await req.json()
    const updated = await prisma.scenario.update({
      where: { id },
      data: {
        ...(body.nome !== undefined && { nome: body.nome }),
        ...(body.descrizione !== undefined && { descrizione: body.descrizione ?? null }),
        ...(body.annoInizio !== undefined && { annoInizio: parseInt(body.annoInizio) }),
        ...(body.annoFine !== undefined && { annoFine: parseInt(body.annoFine) }),
        ...(body.stato !== undefined && { stato: body.stato }),
      },
    })
    return NextResponse.json(updated)
  })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  return withAzienda(async (aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    await prisma.scenario.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  })
}
