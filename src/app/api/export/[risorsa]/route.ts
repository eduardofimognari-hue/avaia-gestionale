import { NextRequest, NextResponse } from 'next/server'
import { withAzienda } from '@/lib/api-utils'
import { toCSV, toJSON } from '@/lib/export/formatters'
import { getVenditeExport, VENDITE_COLUMNS } from '@/lib/export/queries/vendite'
import { getRaccoltaExport, RACCOLTA_COLUMNS } from '@/lib/export/queries/raccolta'
import { getMagazzinoExport, MAGAZZINO_COLUMNS } from '@/lib/export/queries/magazzino'
import { getLavoroExport, LAVORO_COLUMNS } from '@/lib/export/queries/lavoro'
import { getLiquidazioniExport, LIQUIDAZIONI_COLUMNS } from '@/lib/export/queries/liquidazioni'
import { getContabilitaExport, CONTABILITA_COLUMNS } from '@/lib/export/queries/contabilita'
import { getSociExport, SOCI_COLUMNS } from '@/lib/export/queries/soci'
import { getDocumentiExport, DOCUMENTI_COLUMNS } from '@/lib/export/queries/documenti'

type ExportFormat = 'csv' | 'json'

const RISORSE = {
  vendite: { fn: getVenditeExport, columns: VENDITE_COLUMNS, hasDateFilter: true },
  raccolta: { fn: getRaccoltaExport, columns: RACCOLTA_COLUMNS, hasDateFilter: true },
  magazzino: { fn: getMagazzinoExport, columns: MAGAZZINO_COLUMNS, hasDateFilter: true },
  lavoro: { fn: getLavoroExport, columns: LAVORO_COLUMNS, hasDateFilter: true },
  liquidazioni: { fn: getLiquidazioniExport, columns: LIQUIDAZIONI_COLUMNS, hasDateFilter: true },
  contabilita: { fn: getContabilitaExport, columns: CONTABILITA_COLUMNS, hasDateFilter: true },
  soci: { fn: (aziendaId: number) => getSociExport(aziendaId), columns: SOCI_COLUMNS, hasDateFilter: false },
  documenti: { fn: getDocumentiExport, columns: DOCUMENTI_COLUMNS, hasDateFilter: true },
} as const

type RisorsaKey = keyof typeof RISORSE

export async function GET(
  request: NextRequest,
  { params }: { params: { risorsa: string } },
) {
  const risorsa = params.risorsa as RisorsaKey

  if (!(risorsa in RISORSE)) {
    return NextResponse.json(
      { error: `Risorsa non valida. Disponibili: ${Object.keys(RISORSE).join(', ')}` },
      { status: 400 },
    )
  }

  const { searchParams } = new URL(request.url)
  const format = (searchParams.get('format') ?? 'csv') as ExportFormat
  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')
  const from = fromParam ? new Date(fromParam) : undefined
  const to = toParam ? new Date(toParam) : undefined

  if (format !== 'csv' && format !== 'json') {
    return NextResponse.json({ error: 'Formato non valido. Usa: csv, json' }, { status: 400 })
  }

  return withAzienda(async (aziendaId) => {
    const config = RISORSE[risorsa]
    const rows = config.hasDateFilter
      ? await (config.fn as (id: number, from?: Date, to?: Date) => Promise<Record<string, unknown>[]>)(aziendaId, from, to)
      : await config.fn(aziendaId)

    const now = new Date().toISOString().slice(0, 10)
    const filename = `${risorsa}-${now}.${format}`

    if (format === 'json') {
      return new NextResponse(toJSON(rows), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    const csv = toCSV(rows, config.columns)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  })
}
