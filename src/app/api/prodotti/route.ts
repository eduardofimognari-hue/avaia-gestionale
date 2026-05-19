import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const prodotti = await prisma.prodotti.findMany({
      where: { attivo: true, aziendaId },
      orderBy: { nome: 'asc' },
    })
    return NextResponse.json(prodotti)
  } catch (error) {
    return NextResponse.json({ error: 'Errore nel recupero dei prodotti' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const body = await request.json()
    const { nome, varietaTipologia, categoria, unitaMisura, note } = body

    if (!nome) {
      return NextResponse.json({ error: 'Il campo nome è obbligatorio' }, { status: 400 })
    }

    const maxId = await prisma.prodotti.aggregate({ _max: { id: true } })
    const nextId = (maxId._max.id ?? 0) + 1
    const codice = `PROD-${nextId.toString().padStart(4, '0')}`

    const prodotto = await prisma.prodotti.create({
      data: {
        codice, nome, aziendaId,
        varietaTipologia: varietaTipologia ?? null,
        categoria: categoria ?? null,
        unitaMisura: unitaMisura ?? 'kg',
        note: note ?? null,
      },
    })

    return NextResponse.json(prodotto, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Errore nella creazione del prodotto' }, { status: 500 })
  }
}
