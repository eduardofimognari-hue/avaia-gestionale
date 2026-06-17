import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withValidazione, withRuoloScrittura } from '@/lib/api-utils'
import { clientiPatchSchema } from '@/lib/validations'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (!id) return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
  return withValidazione(request, clientiPatchSchema, async (parsed, aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    const existing = await prisma.clienti.findFirst({ where: { id, aziendaId } })
    if (!existing) return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 })
    const updated = await prisma.clienti.update({ where: { id }, data: parsed })
    return NextResponse.json(updated)
  })
}
