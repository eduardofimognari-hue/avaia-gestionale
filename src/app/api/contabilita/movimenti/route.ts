import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAzienda } from '@/lib/api-utils'

export async function GET(request: Request) {
  return withAzienda(async (aziendaId) => {
    const { searchParams } = new URL(request.url)
    const where: Record<string, unknown> = { aziendaId }
    const luogoId = searchParams.get('luogoId')
    const tipoMovimento = searchParams.get('tipoMovimento')
    const tipo = searchParams.get('tipo')
    const da = searchParams.get('da')
    const a = searchParams.get('a')

    if (luogoId) {
      const luogoIdNum = parseInt(luogoId)
      if (!isNaN(luogoIdNum)) where.luogoId = luogoIdNum
    }
    if (tipoMovimento) where.tipoMovimento = tipoMovimento
    if (tipo) where.tipo = tipo
    if (da || a) {
      const dataFilter: Record<string, Date> = {}
      if (da) dataFilter.gte = new Date(da)
      if (a) dataFilter.lte = new Date(a)
      where.data = dataFilter
    }

    const movimenti = await prisma.movimentiCassa.findMany({
      where,
      include: {
        cassa: { select: { nome: true } },
        luogo: { select: { id: true, nome: true, tipologia: true } },
        socio: { select: { id: true, nome: true, cognome: true } },
      },
      orderBy: { data: 'desc' },
      take: 200,
    })

    return NextResponse.json(movimenti)
  })
}
