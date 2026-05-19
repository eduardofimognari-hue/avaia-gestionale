import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })

    const luogoId = parseInt(params.id)
    if (!luogoId) return NextResponse.json({ error: 'Luogo non valido' }, { status: 400 })

    const [luogo, movimenti] = await Promise.all([
      prisma.luoghi.findFirst({ where: { id: luogoId, aziendaId } }),
      prisma.movimentiCassa.findMany({
        where: { aziendaId, luogoId },
        include: {
          cassa: { select: { nome: true } },
          socio: { select: { id: true, nome: true, cognome: true } },
        },
        orderBy: { data: 'desc' },
      }),
    ])

    if (!luogo) return NextResponse.json({ error: 'Luogo non trovato' }, { status: 404 })

    const totaleEntrate = movimenti.filter(m => m.tipo === 'entrata').reduce((a, m) => a + m.importo, 0)
    const totaleUscite = movimenti.filter(m => m.tipo === 'uscita').reduce((a, m) => a + m.importo, 0)

    return NextResponse.json({ luogo, movimenti, totaleEntrate, totaleUscite, saldo: totaleEntrate - totaleUscite })
  } catch {
    return NextResponse.json({ error: 'Errore nel recupero dati luogo' }, { status: 500 })
  }
}
