import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAzienda } from '@/lib/api-utils'

export async function GET() {
  return withAzienda(async (aziendaId) => {
    const vendite = await prisma.vendite.findMany({
      where: { aziendaId },
      include: {
        cliente: { select: { id: true, nome: true, cognome: true } },
        righe: { include: { prodotto: { select: { id: true, nome: true, varietaTipologia: true } } } },
        documenti: { select: { tipo: true, numero: true, anno: true, stato: true } },
      },
      orderBy: { data: 'desc' },
      take: 100,
    })
    return NextResponse.json(vendite)
  })
}