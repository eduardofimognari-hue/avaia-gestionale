import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAzienda, withValidazione, withRuoloScrittura } from '@/lib/api-utils'
import { prodottiSchema } from '@/lib/validations'

export async function GET() {
  return withAzienda(async (aziendaId) => {
    const prodotti = await prisma.prodotti.findMany({ where: { attivo: true, aziendaId }, orderBy: { nome: 'asc' } })
    return NextResponse.json(prodotti)
  })
}

export async function POST(request: Request) {
  return withValidazione(request, prodottiSchema, async (parsed, aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    const count = await prisma.prodotti.count({ where: { aziendaId } })
    const codice = `PROD-${(count + 1).toString().padStart(4, '0')}`
    const prodotto = await prisma.prodotti.create({ data: { codice, ...parsed, aziendaId } })
    return NextResponse.json(prodotto, { status: 201 })
  })
}
