import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { withAzienda, withValidazione, withRuoloScrittura } from '@/lib/api-utils'
import { areeSchema } from '@/lib/validations'

export async function GET() {
  return withAzienda(async (aziendaId) => {
    const items = await prisma.aree.findMany({ where: { attivo: true, aziendaId }, orderBy: { nome: 'asc' } })
    return NextResponse.json(items)
  })
}

export async function POST(req: Request) {
  return withValidazione(req, areeSchema, async (parsed, aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    const item = await prisma.aree.create({ data: { nome: parsed.nome, descrizione: parsed.descrizione ?? null, aziendaId } })
    return NextResponse.json(item, { status: 201 })
  })
}
