import { NextResponse } from 'next/server'
import { withAzienda, getGiacenzeAggregate } from '@/lib/api-utils'

export async function GET() {
  return withAzienda(async (aziendaId) => {
    const giacenze = await getGiacenzeAggregate(aziendaId)
    return NextResponse.json({ giacenze })
  })
}
