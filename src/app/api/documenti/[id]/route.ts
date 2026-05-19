import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })

    const id = parseInt(params.id)
    if (!id) return NextResponse.json({ error: 'ID non valido' }, { status: 400 })

    const doc = await prisma.documenti.findFirst({
      where: { id, aziendaId },
      include: {
        vendita: {
          include: {
            cliente: { select: { id: true, nome: true, cognome: true, ragioneSociale: true, partitaIva: true, codiceFiscale: true, indirizzo: true, comune: true, provincia: true, cap: true } },
            righe: {
              include: { prodotto: { select: { id: true, nome: true, varietaTipologia: true } } },
            },
          },
        },
        cliente: { select: { id: true, nome: true, cognome: true, ragioneSociale: true, partitaIva: true, codiceFiscale: true, indirizzo: true, comune: true, provincia: true, cap: true } },
      },
    })

    if (!doc) return NextResponse.json({ error: 'Documento non trovato' }, { status: 404 })

    return NextResponse.json(doc)
  } catch {
    return NextResponse.json({ error: 'Errore nel recupero documento' }, { status: 500 })
  }
}
