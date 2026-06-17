import { NextResponse } from 'next/server'
import { withAzienda } from '@/lib/api-utils'
import { getGiacenzeAggregate } from '@/lib/services/magazzino'

export async function GET() {
  return withAzienda(async (aziendaId) => {
    const giacenze = await getGiacenzeAggregate(aziendaId)
    return NextResponse.json({ giacenze })
  })
}
