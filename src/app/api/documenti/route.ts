import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAzienda, withValidazione, withRuoloScrittura } from '@/lib/api-utils'
import { documentoGeneratoSchema } from '@/lib/validations'

export async function GET() {
  return withAzienda(async (aziendaId) => {
    const documenti = await prisma.documenti.findMany({
      where: { aziendaId },
      include: {
        vendita: { select: { id: true, data: true, importoTotale: true, tipoCliente: true } },
        cliente: { select: { id: true, nome: true, cognome: true, ragioneSociale: true, partitaIva: true } },
      },
      orderBy: [{ anno: 'desc' }, { numero: 'desc' }],
      take: 100,
    })
    return NextResponse.json(documenti)
  })
}

export async function POST(request: Request) {
  return withValidazione(request, documentoGeneratoSchema, async (parsed, aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    const vendita = await prisma.vendite.findUnique({ where: { id: parsed.venditaId }, include: { cliente: true } })
    if (!vendita || vendita.aziendaId !== aziendaId) {
      return NextResponse.json({ error: 'Vendita non trovata' }, { status: 404 })
    }
    const anno = new Date(parsed.data || vendita.data).getFullYear()
    const doc = await prisma.$transaction(async (tx) => {
      const ultimo = await tx.documenti.findFirst({
        where: { aziendaId, tipo: parsed.tipo, anno },
        orderBy: { numero: 'desc' },
        select: { numero: true },
      })
      const numero = (ultimo?.numero ?? 0) + 1
      return tx.documenti.create({
        data: {
          tipo: parsed.tipo, numero, anno,
          data: parsed.data ? new Date(parsed.data) : vendita.data,
          venditaId: vendita.id, clienteId: vendita.clienteId,
          importoTotale: Number(vendita.importoTotale || 0),
          note: parsed.note ?? null, aziendaId,
        },
        include: {
          vendita: { select: { id: true, data: true, importoTotale: true, tipoCliente: true } },
          cliente: { select: { id: true, nome: true, cognome: true, ragioneSociale: true, partitaIva: true, indirizzo: true, comune: true, provincia: true, cap: true } },
        },
      })
    })
    return NextResponse.json(doc, { status: 201 })
  })
}
