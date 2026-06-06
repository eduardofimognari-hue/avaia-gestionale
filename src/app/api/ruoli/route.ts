import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAzienda } from '@/lib/api-utils'

export async function GET() {
  return withAzienda(async (aziendaId) => {
    const ruoli = await prisma.ruoli.findMany({ where: { attivo: true, aziendaId }, orderBy: { nome: 'asc' } })
    return NextResponse.json(ruoli)
  })
}
