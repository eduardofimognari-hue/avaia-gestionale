import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const luoghi = await prisma.luoghi.findMany({
      where: { attivo: true, aziendaId },
      orderBy: { nome: 'asc' },
    })
    return NextResponse.json(luoghi)
  } catch (error) {
    return NextResponse.json({ error: 'Errore nel recupero dei luoghi' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const body = await request.json()
    const { nome, indirizzo, comune, provincia, cap, tipo, note } = body

    if (!nome) {
      return NextResponse.json({ error: 'Il campo nome è obbligatorio' }, { status: 400 })
    }

    const luogo = await prisma.luoghi.create({
      data: {
        nome, aziendaId,
        indirizzo: indirizzo || null,
        comune: comune || null,
        provincia: provincia || null,
        cap: cap || null,
        tipo: tipo || 'fisico',
        note: note || null,
      },
    })

    return NextResponse.json(luogo, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Errore nella creazione del luogo' }, { status: 500 })
  }
}
