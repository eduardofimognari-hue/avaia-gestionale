import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { withAzienda, withRuoloScrittura } from '@/lib/api-utils'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const scenarioId = parseInt(params.id)
  return withAzienda(async (aziendaId) => {
    const items = await prisma.scenarioEntrata.findMany({
      where: { scenarioId, aziendaId },
      include: {
        prodotto: { select: { id: true, nome: true, unitaMisura: true } },
        luogo: { select: { id: true, nome: true } },
        terreno: { select: { id: true, nome: true } },
      },
      orderBy: [{ naturaTipo: 'asc' }, { anno: 'asc' }, { tipo: 'asc' }],
    })
    return NextResponse.json(items)
  })
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const scenarioId = parseInt(params.id)
  return withAzienda(async (aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    const body = await req.json()
    const naturaTipo = body.naturaTipo ?? 'stimata'
    const item = await prisma.scenarioEntrata.create({
      data: {
        scenarioId,
        aziendaId,
        naturaTipo,
        anno: naturaTipo === 'ricorrente' ? null : (body.anno ? parseInt(body.anno) : null),
        tipo: body.tipo,
        descrizione: body.descrizione,
        prodottoId: body.prodottoId ? parseInt(body.prodottoId) : null,
        terrenoId: body.terrenoId ? parseInt(body.terrenoId) : null,
        luogoId: body.luogoId ? parseInt(body.luogoId) : null,
        quantitaStimata: body.quantitaStimata ? parseFloat(body.quantitaStimata) : null,
        prezzoStimato: body.prezzoStimato ? parseFloat(body.prezzoStimato) : null,
        importoFisso: body.importoFisso ? parseFloat(body.importoFisso) : null,
        note: body.note ?? null,
      },
    })
    return NextResponse.json(item, { status: 201 })
  })
}
