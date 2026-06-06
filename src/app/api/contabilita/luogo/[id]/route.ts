import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAzienda } from '@/lib/api-utils'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const luogoId = parseInt(params.id)
  if (!luogoId) return NextResponse.json({ error: 'ID luogo non valido' }, { status: 400 })

  return withAzienda(async (aziendaId) => {
    const [luogo, movimenti, casse, movimentiSoci] = await Promise.all([
      prisma.luoghi.findFirst({ where: { id: luogoId, aziendaId } }),
      prisma.movimentiCassa.findMany({
        where: { luogoId, aziendaId },
        include: {
          cassa: { select: { nome: true } },
          socio: { select: { id: true, nome: true, cognome: true } },
        },
        orderBy: { data: 'desc' },
      }),
      prisma.casseInterne.findMany({
        where: { aziendaId },
        include: { movimenti: { select: { tipo: true, importo: true, luogoId: true } } },
      }),
      prisma.movimentiSoci.findMany({
        where: { aziendaId },
        include: { socio: { select: { id: true, nome: true, cognome: true } }, movimentoCassa: { select: { luogoId: true } } },
        orderBy: { data: 'desc' },
      }),
    ])

    if (!luogo) return NextResponse.json({ error: 'Luogo non trovato' }, { status: 404 })

    const saldo = casse.reduce((acc, c) => {
      const movimentiLuogo = c.movimenti.filter(m => m.luogoId === luogoId)
      return acc + movimentiLuogo.reduce((a, m) => m.tipo === 'entrata' ? a + m.importo : a - m.importo, 0)
    }, 0)

    const movimentiSociLuogo = movimentiSoci.filter(m => m.movimentoCassa?.luogoId === luogoId)

    return NextResponse.json({ luogo, saldo, movimenti, movimentiSoci: movimentiSociLuogo })
  })
}
