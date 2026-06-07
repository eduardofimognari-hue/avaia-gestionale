import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAzienda, withRuoloScrittura } from '@/lib/api-utils'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return withAzienda(async (aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    const id = parseInt(params.id)
    const body = await request.json()
    const item = await prisma.portaInnesti.updateMany({
      where: { id, aziendaId },
      data: { nome: body.nome },
    })
    if (item.count === 0) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
    return NextResponse.json({ ok: true })
  })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  return withAzienda(async (aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    const id = parseInt(params.id)
    await prisma.portaInnesti.deleteMany({ where: { id, aziendaId } })
    return NextResponse.json({ ok: true })
  })
}
