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
    const updated = await prisma.prodotti.update({ where: { id }, data: body })
    return NextResponse.json(updated)
  })
}