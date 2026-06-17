import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { withAzienda, withRuoloScrittura } from '@/lib/api-utils'

export async function DELETE(_req: Request, { params }: { params: { id: string; entrataId: string } }) {
  const id = parseInt(params.entrataId)
  return withAzienda(async (aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    await prisma.scenarioEntrata.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  })
}
