import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAzienda, withValidazione, withRuoloScrittura } from '@/lib/api-utils'
import { magazzinoMovimentoSchema } from '@/lib/validations'

export async function GET() {
  return withAzienda(async (aziendaId) => {
    const movimenti = await prisma.movimentiInput.findMany({
      where: { aziendaId },
      orderBy: { data: 'desc' },
      take: 100,
      include: { prodotto: true },
    })
    return NextResponse.json(movimenti)
  })
}

export async function POST(request: Request) {
  return withValidazione(request, magazzinoMovimentoSchema, async (parsed, aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    const prodotto = await prisma.prodotti.findFirst({ where: { id: parsed.prodottoId, aziendaId } })
    if (!prodotto) return NextResponse.json({ error: 'Prodotto non trovato' }, { status: 404 })
    const movimento = await prisma.movimentiInput.create({
      data: {
        data: new Date(parsed.data), prodottoId: parsed.prodottoId, tipo: parsed.tipo,
        quantita: parsed.quantita, unitaMisura: parsed.unitaMisura, aziendaId,
        note: parsed.note ?? null,
      },
      include: { prodotto: true },
    })
    return NextResponse.json(movimento, { status: 201 })
  })
}
