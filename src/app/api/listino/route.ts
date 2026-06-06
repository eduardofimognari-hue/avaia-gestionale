import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAzienda, withValidazione, withRuoloScrittura } from '@/lib/api-utils'
import { listinoSchema } from '@/lib/validations'

export async function GET() {
  return withAzienda(async (aziendaId) => {
    const listino = await prisma.listinoPrezzi.findMany({
      where: { aziendaId },
      orderBy: { anno: 'desc' },
      include: { prodotto: true },
    })
    return NextResponse.json(listino)
  })
}

export async function POST(request: Request) {
  return withValidazione(request, listinoSchema, async (parsed, aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    const entry = await prisma.listinoPrezzi.create({
      data: {
        anno: parsed.anno, prodottoId: parsed.prodottoId, tipoCliente: parsed.tipoCliente,
        formato: parsed.formato, unitaMisura: parsed.unitaMisura, prezzoBase: parsed.prezzoBase, aziendaId,
        dataInizio: parsed.dataInizio ? new Date(parsed.dataInizio) : null,
        dataFine: parsed.dataFine ? new Date(parsed.dataFine) : null,
        note: parsed.note ?? null,
      },
      include: { prodotto: true },
    })
    return NextResponse.json(entry, { status: 201 })
  })
}
