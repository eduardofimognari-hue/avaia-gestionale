import { prisma } from '@/lib/db'
import { formatDate, formatNumber, type ColumnDef } from '../formatters'

export const LIQUIDAZIONI_COLUMNS: ColumnDef[] = [
  { key: 'id', label: 'ID' },
  { key: 'data', label: 'Data' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'socio', label: 'Socio' },
  { key: 'periodoDa', label: 'Periodo Da' },
  { key: 'periodoA', label: 'Periodo A' },
  { key: 'totaleCrediti', label: 'Tot. Crediti (€)' },
  { key: 'totaleDebiti', label: 'Tot. Debiti (€)' },
  { key: 'importoNetto', label: 'Importo Netto (€)' },
  { key: 'stato', label: 'Stato' },
  { key: 'dataPagamento', label: 'Data Pagamento' },
  { key: 'note', label: 'Note' },
]

export async function getLiquidazioniExport(
  aziendaId: number,
  from?: Date,
  to?: Date,
): Promise<Record<string, unknown>[]> {
  const liquidazioni = await prisma.liquidazioniSoci.findMany({
    where: {
      aziendaId,
      data: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      },
    },
    include: {
      socio: { select: { nome: true, cognome: true } },
    },
    orderBy: { data: 'desc' },
  })

  return liquidazioni.map((l) => ({
    id: l.id,
    data: formatDate(l.data),
    tipo: l.tipo,
    socio: l.socio ? `${l.socio.nome} ${l.socio.cognome}` : '',
    periodoDa: formatDate(l.periodoDa),
    periodoA: formatDate(l.periodoA),
    totaleCrediti: formatNumber(l.totaleCrediti),
    totaleDebiti: formatNumber(l.totaleDebiti),
    importoNetto: formatNumber(l.importoNetto),
    stato: l.stato,
    dataPagamento: formatDate(l.dataPagamento),
    note: l.note ?? '',
  }))
}
