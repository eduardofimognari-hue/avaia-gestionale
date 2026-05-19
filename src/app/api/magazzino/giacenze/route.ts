import { NextResponse } from 'next/server'
import { getCurrentAziendaId } from '@/lib/azienda-context'
import { getGiacenzeAggregate } from '@/lib/api-utils'

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ giacenze: [] })
    const giacenze = await getGiacenzeAggregate(aziendaId)
    return NextResponse.json({ giacenze })
  } catch {
    return NextResponse.json({ giacenze: [] })
  }
}
