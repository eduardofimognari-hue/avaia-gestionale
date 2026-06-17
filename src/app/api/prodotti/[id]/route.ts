import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withValidazione, withRuoloScrittura } from '@/lib/api-utils'
import { prodottiPatchSchema } from '@/lib/validations'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (!id) return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
  return withValidazione(request, prodottiPatchSchema, async (parsed, aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    const existing = await prisma.prodotti.findFirst({ where: { id, aziendaId } })
    if (!existing) return NextResponse.json({ error: 'Prodotto non trovato' }, { status: 404 })
    const updated = await prisma.prodotti.update({ where: { id }, data: parsed })
    return NextResponse.json(updated)
  })
}
