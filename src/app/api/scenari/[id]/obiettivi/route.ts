import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { withAzienda, withRuoloScrittura } from '@/lib/api-utils'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const scenarioId = parseInt(params.id)
  return withAzienda(async (aziendaId) => {
    const items = await prisma.scenarioObiettivo.findMany({
      where: { scenarioId, aziendaId },
      orderBy: { percentualePriorita: 'desc' },
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
    const item = await prisma.scenarioObiettivo.create({
      data: {
        scenarioId,
        aziendaId,
        nome: body.nome,
        categoria: body.categoria ?? 'altro',
        percentualePriorita: body.percentualePriorita ? parseFloat(body.percentualePriorita) : 0,
        importoTarget: body.importoTarget ? parseFloat(body.importoTarget) : 0,
        note: body.note ?? null,
      },
    })
    return NextResponse.json(item, { status: 201 })
  })
}
