import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'
import { requireRole } from '@/lib/auth'
import { documentoGeneratoSchema } from '@/lib/validations'
import { ZodError } from 'zod'

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })

    const documenti = await prisma.documenti.findMany({
      where: { aziendaId },
      include: {
        vendita: {
          select: { id: true, data: true, importoTotale: true, tipoCliente: true },
        },
        cliente: { select: { id: true, nome: true, cognome: true, ragioneSociale: true, partitaIva: true } },
      },
      orderBy: [{ anno: 'desc' }, { numero: 'desc' }],
      take: 100,
    })

    return NextResponse.json(documenti)
  } catch {
    return NextResponse.json({ error: 'Errore nel recupero documenti' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const check = await requireRole(['admin', 'editor'], aziendaId)
    if (!check.allowed) return check.response!

    const body = await request.json()
    const parsed = documentoGeneratoSchema.parse(body)

    const vendita = await prisma.vendite.findUnique({
      where: { id: parsed.venditaId },
      include: { cliente: true },
    })
    if (!vendita || vendita.aziendaId !== aziendaId) {
      return NextResponse.json({ error: 'Vendita non trovata' }, { status: 404 })
    }

    const anno = new Date(parsed.data || vendita.data).getFullYear()

    const ultimo = await prisma.documenti.findFirst({
      where: { aziendaId, tipo: parsed.tipo, anno },
      orderBy: { numero: 'desc' },
      select: { numero: true },
    })

    const numero = (ultimo?.numero ?? 0) + 1

    const doc = await prisma.documenti.create({
      data: {
        tipo: parsed.tipo,
        numero,
        anno,
        data: parsed.data ? new Date(parsed.data) : vendita.data,
        venditaId: vendita.id,
        clienteId: vendita.clienteId,
        importoTotale: Number(vendita.importoTotale || 0),
        note: parsed.note ?? null,
        aziendaId,
      },
      include: {
        vendita: {
          select: { id: true, data: true, importoTotale: true, tipoCliente: true },
        },
        cliente: { select: { id: true, nome: true, cognome: true, ragioneSociale: true, partitaIva: true, indirizzo: true, comune: true, provincia: true, cap: true } },
      },
    })

    return NextResponse.json(doc, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    return NextResponse.json({ error: 'Errore nella generazione documento' }, { status: 500 })
  }
}
