import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { withAzienda, withRuoloScrittura } from '@/lib/api-utils'

export async function GET() {
  return withAzienda(async (aziendaId) => {
    const items = await prisma.scenario.findMany({
      where: { aziendaId },
      include: {
        _count: { select: { uscite: true, entrate: true, obiettivi: true } },
      },
      orderBy: { creatoIl: 'desc' },
    })
    return NextResponse.json(items)
  })
}

export async function POST(req: Request) {
  return withAzienda(async (aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    const body = await req.json()
    const item = await prisma.scenario.create({
      data: {
        nome: body.nome,
        descrizione: body.descrizione ?? null,
        annoInizio: parseInt(body.annoInizio),
        annoFine: parseInt(body.annoFine),
        stato: body.stato ?? 'bozza',
        aziendaId,
      },
    })
    return NextResponse.json(item, { status: 201 })
  })
}
