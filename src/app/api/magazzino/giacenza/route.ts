import { NextRequest, NextResponse } from 'next/server'
import { withAzienda } from '@/lib/api-utils'
import { getGiacenzaSingola } from '@/lib/services/magazzino'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const prodottoId = Number(searchParams.get('prodottoId'))
  if (!prodottoId) return NextResponse.json({ giacenza: 0 })

  return withAzienda(async (aziendaId) => {
    const giacenza = await getGiacenzaSingola(aziendaId, prodottoId)
    return NextResponse.json({ giacenza })
  })
}
