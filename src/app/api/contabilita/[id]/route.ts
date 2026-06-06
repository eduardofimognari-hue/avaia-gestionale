import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAzienda, withRuoloScrittura } from '@/lib/api-utils'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (!id) return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
  return withAzienda(async (aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!

    const existing = await prisma.movimentiCassa.findFirst({ where: { id, aziendaId } })
    if (!existing) return NextResponse.json({ error: 'Movimento non trovato' }, { status: 404 })

    const body = await request.json()
    const updated = await prisma.movimentiCassa.update({
      where: { id },
      data: {
        data: body.data ? new Date(body.data) : undefined,
        tipo: body.tipo ?? undefined,
        tipoMovimento: body.tipoMovimento ?? undefined,
        importo: body.importo ?? undefined,
        luogoId: body.luogoId ?? body.luogoId === null ? null : undefined,
        socioId: body.socioId ?? body.socioId === null ? null : undefined,
        categoria: body.categoria ?? undefined,
        descrizione: body.descrizione ?? undefined,
        stato: body.stato ?? undefined,
      },
      include: {
        cassa: { select: { nome: true } },
        luogo: { select: { id: true, nome: true, tipologia: true } },
        socio: { select: { id: true, nome: true, cognome: true } },
      },
    })
    return NextResponse.json(updated)
  })
}