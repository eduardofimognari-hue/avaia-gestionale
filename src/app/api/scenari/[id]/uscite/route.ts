import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { withAzienda, withRuoloScrittura } from '@/lib/api-utils'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const scenarioId = parseInt(params.id)
  return withAzienda(async (aziendaId) => {
    const items = await prisma.scenarioUscita.findMany({
      where: { scenarioId, aziendaId },
      include: {
        luogo: { select: { id: true, nome: true } },
        terreno: { select: { id: true, nome: true } },
      },
      orderBy: [{ anno: 'asc' }, { categoria: 'asc' }],
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
    const item = await prisma.scenarioUscita.create({
      data: {
        scenarioId,
        aziendaId,
        anno: parseInt(body.anno),
        categoria: body.categoria,
        descrizione: body.descrizione,
        importo: parseFloat(body.importo),
        luogoId: body.luogoId ? parseInt(body.luogoId) : null,
        terrenoId: body.terrenoId ? parseInt(body.terrenoId) : null,
        note: body.note ?? null,
      },
    })
    return NextResponse.json(item, { status: 201 })
  })
}
