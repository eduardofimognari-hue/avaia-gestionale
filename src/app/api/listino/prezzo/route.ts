import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'

export async function GET(request: NextRequest) {
  try {
    const aziendaId = await getCurrentAziendaId()
    const { searchParams } = new URL(request.url)
    const prodottoId = Number(searchParams.get('prodottoId'))
    const tipoCliente = searchParams.get('tipoCliente') || 'Privato'
    const formato = searchParams.get('formato') || 'kg'

    if (!prodottoId) {
      return NextResponse.json({ prezzo: 0 })
    }

    const entry = await prisma.listinoPrezzi.findFirst({
      where: {
        prodottoId, tipoCliente, formato, attivo: true,
        ...(aziendaId ? { aziendaId } : {}),
      },
      orderBy: { anno: 'desc' },
    })

    return NextResponse.json({ prezzo: entry?.prezzoBase ?? 0 })
  } catch {
    return NextResponse.json({ prezzo: 0 })
  }
}
