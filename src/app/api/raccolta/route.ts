import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAzienda, withValidazione, withRuoloScrittura } from '@/lib/api-utils'
import { raccoltaSchema } from '@/lib/validations'

export async function GET() {
  return withAzienda(async (aziendaId) => {
    const [raccolte, totali] = await Promise.all([
      prisma.raccolta.findMany({
        where: { aziendaId },
        include: {
          prodotto: { select: { id: true, nome: true, varietaTipologia: true, unitaMisura: true } },
          luogo: { select: { id: true, nome: true } },
          area: { select: { id: true, nome: true } },
          socio: { select: { id: true, nome: true, cognome: true } },
        },
        orderBy: { data: 'desc' },
        take: 100,
      }),
      prisma.raccolta.groupBy({
        by: ['prodottoId'],
        where: { aziendaId },
        _sum: { quantita: true },
      }),
    ])

    const prodottiIds = totali.map(t => t.prodottoId)
    const prodotti = prodottiIds.length > 0
      ? await prisma.prodotti.findMany({ where: { id: { in: prodottiIds } }, select: { id: true, nome: true, varietaTipologia: true, unitaMisura: true } })
      : []

    return NextResponse.json({ raccolte, totali, prodotti })
  })
}

export async function POST(request: Request) {
  return withValidazione(request, raccoltaSchema, async (parsed, aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    const prodotto = await prisma.prodotti.findFirst({ where: { id: parsed.prodottoId, aziendaId } })
    if (!prodotto) return NextResponse.json({ error: 'Prodotto non trovato' }, { status: 404 })
    const raccolta = await prisma.$transaction(async (tx) => {
      const r = await tx.raccolta.create({
        data: {
          data: new Date(parsed.data), prodottoId: parsed.prodottoId, aziendaId,
          quantita: parsed.quantita, unitaMisura: parsed.unitaMisura ?? 'kg',
          luogoId: parsed.luogoId ?? null, areaId: parsed.areaId ?? null,
          socioId: parsed.socioId ?? null, note: parsed.note ?? null,
        },
        include: {
          prodotto: { select: { id: true, nome: true, varietaTipologia: true } },
          luogo: { select: { id: true, nome: true } },
          area: { select: { id: true, nome: true } },
          socio: { select: { id: true, nome: true, cognome: true } },
        },
      })
      await tx.movimentiInput.create({
        data: {
          data: new Date(parsed.data), prodottoId: parsed.prodottoId, aziendaId,
          tipo: 'carico', quantita: parsed.quantita, unitaMisura: parsed.unitaMisura ?? 'kg',
          note: `Raccolta: ${parsed.note || 'nessuna nota'}`,
        },
      })
      return r
    })
    return NextResponse.json(raccolta, { status: 201 })
  })
}
