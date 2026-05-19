import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'
import { requireRole } from '@/lib/auth'
import { clientiSchema } from '@/lib/validations'
import { ZodError } from 'zod'

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const clienti = await prisma.clienti.findMany({
      where: { attivo: true, aziendaId },
      orderBy: { nome: 'asc' },
    })
    return NextResponse.json(clienti)
  } catch (error) {
    return NextResponse.json({ error: 'Errore nel recupero dei clienti' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const check = await requireRole(['admin', 'editor'], aziendaId)
    if (!check.allowed) return check.response!

    const body = await request.json()
    const parsed = clientiSchema.parse(body)

    const cliente = await prisma.clienti.create({
      data: {
        nome: parsed.nome, aziendaId,
        cognome: parsed.cognome || null,
        ragioneSociale: parsed.ragioneSociale || null,
        tipo: parsed.tipo || 'Privato',
        codiceFiscale: parsed.codiceFiscale || null,
        partitaIva: parsed.partitaIva || null,
        telefono: parsed.telefono || null,
        email: parsed.email || null,
        indirizzo: parsed.indirizzo || null,
        comune: parsed.comune || null,
        provincia: parsed.provincia || null,
        cap: parsed.cap || null,
        note: parsed.note || null,
      },
    })

    return NextResponse.json(cliente, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    return NextResponse.json({ error: 'Errore nella creazione del cliente' }, { status: 500 })
  }
}
