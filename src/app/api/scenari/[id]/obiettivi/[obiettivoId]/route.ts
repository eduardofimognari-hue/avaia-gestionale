import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { withAzienda, withRuoloScrittura } from '@/lib/api-utils'

export async function PATCH(req: Request, { params }: { params: { id: string; obiettivoId: string } }) {
  const id = parseInt(params.obiettivoId)
  return withAzienda(async (aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    const body = await req.json()
    const updated = await prisma.scenarioObiettivo.update({
      where: { id },
      data: {
        ...(body.nome !== undefined && { nome: body.nome }),
        ...(body.tipo !== undefined && { tipo: body.tipo }),
        ...(body.percentuale !== undefined && { percentuale: body.percentuale ? parseFloat(body.percentuale) : null }),
        ...(body.importoFisso !== undefined && { importoFisso: body.importoFisso ? parseFloat(body.importoFisso) : null }),
        ...(body.priorita !== undefined && { priorita: parseInt(body.priorita) }),
        ...(body.note !== undefined && { note: body.note ?? null }),
      },
    })
    return NextResponse.json(updated)
  })
}

export async function DELETE(_req: Request, { params }: { params: { id: string; obiettivoId: string } }) {
  const id = parseInt(params.obiettivoId)
  return withAzienda(async (aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    await prisma.scenarioObiettivo.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  })
}
