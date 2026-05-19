import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getCurrentAziendaId } from '@/lib/azienda-context'
import { requireRole } from '@/lib/auth'
import { areeSchema } from '@/lib/validations'
import { ZodError } from 'zod'

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
    const check = await requireRole(['admin', 'editor'], aziendaId)
    if (!check.allowed) return check.response!

    const body = await req.json()
    const parsed = areeSchema.parse(body)
    const item = await prisma.aree.create({ data: { nome: parsed.nome, descrizione: parsed.descrizione ?? null, aziendaId } })
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    return NextResponse.json({ error: 'Errore nella creazione' }, { status: 500 })
  }
}
