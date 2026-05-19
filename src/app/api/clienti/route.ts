import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'

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
    const body = await request.json()
    const { nome, cognome, ragioneSociale, tipo, codiceFiscale, partitaIva, telefono, email, indirizzo, comune, provincia, cap, note } = body

    if (!nome) {
      return NextResponse.json({ error: 'Il campo nome è obbligatorio' }, { status: 400 })
    }

    const cliente = await prisma.clienti.create({
      data: {
        nome, aziendaId,
        cognome: cognome || null,
        ragioneSociale: ragioneSociale || null,
        tipo: tipo || 'Privato',
        codiceFiscale: codiceFiscale || null,
        partitaIva: partitaIva || null,
        telefono: telefono || null,
        email: email || null,
        indirizzo: indirizzo || null,
        comune: comune || null,
        provincia: provincia || null,
        cap: cap || null,
        note: note || null,
      },
    })

    return NextResponse.json(cliente, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Errore nella creazione del cliente' }, { status: 500 })
  }
}
