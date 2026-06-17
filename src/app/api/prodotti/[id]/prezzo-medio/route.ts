import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { withAzienda } from '@/lib/api-utils'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const prodottoId = parseInt(params.id)
  return withAzienda(async (aziendaId) => {
    const result = await prisma.righeVendita.aggregate({
      where: { prodottoId, vendita: { aziendaId } },
      _avg: { prezzoUnitario: true },
      _count: { _all: true },
    })
    return NextResponse.json({
      prezzoMedio: result._avg.prezzoUnitario,
      numVendite: result._count._all,
    })
  })
}
