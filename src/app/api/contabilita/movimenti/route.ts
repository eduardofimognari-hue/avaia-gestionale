import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'

export async function GET(request: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const luogoId = searchParams.get('luogoId')
    const tipoMovimento = searchParams.get('tipoMovimento')
    const tipo = searchParams.get('tipo')
    const da = searchParams.get('da')
    const a = searchParams.get('a')

    const where: any = { aziendaId }
    if (luogoId) where.luogoId = parseInt(luogoId)
    if (tipoMovimento) where.tipoMovimento = tipoMovimento
    if (tipo) where.tipo = tipo
    if (da || a) {
      where.data = {}
      if (da) where.data.gte = new Date(da)
      if (a) where.data.lte = new Date(a)
    }

    const movimenti = await prisma.movimentiCassa.findMany({
      where,
      include: {
        cassa: { select: { nome: true } },
        luogo: { select: { id: true, nome: true, tipo: true } },
        socio: { select: { id: true, nome: true, cognome: true } },
      },
      orderBy: { data: 'desc' },
      take: 200,
    })

    return NextResponse.json(movimenti)
  } catch {
    return NextResponse.json({ error: 'Errore nel recupero movimenti' }, { status: 500 })
  }
}
