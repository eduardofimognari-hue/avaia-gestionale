import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'

export async function GET(request: NextRequest) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ giacenza: 0 })
    const { searchParams } = new URL(request.url)
    const prodottoId = Number(searchParams.get('prodottoId'))

    if (!prodottoId) {
      return NextResponse.json({ giacenza: 0 })
    }

    const carichi = await prisma.movimentiInput.aggregate({
      where: { prodottoId, aziendaId, tipo: { in: ['carico', 'reso'] } },
      _sum: { quantita: true },
    })

    const scarichi = await prisma.movimentiInput.aggregate({
      where: { prodottoId, aziendaId, tipo: { in: ['scarico', 'vendita'] } },
      _sum: { quantita: true },
    })

    const giacenza = (carichi._sum.quantita ?? 0) - (scarichi._sum.quantita ?? 0)
    return NextResponse.json({ giacenza: Math.max(0, giacenza) })
  } catch {
    return NextResponse.json({ giacenza: 0 })
  }
}
