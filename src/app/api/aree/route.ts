import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getCurrentAziendaId } from '@/lib/azienda-context'

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const items = await prisma.aree.findMany({ where: { attivo: true, aziendaId }, orderBy: { nome: 'asc' } })
    return NextResponse.json(items)
  } catch {
    return NextResponse.json({ error: 'Errore nel caricamento' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const body = await req.json()
    const item = await prisma.aree.create({ data: { nome: body.nome, descrizione: body.descrizione, aziendaId } })
    return NextResponse.json(item, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Errore nella creazione' }, { status: 500 })
  }
}
