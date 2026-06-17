import { prisma } from '@/lib/db'
import { formatDate, formatNumber, type ColumnDef } from '../formatters'

export const DOCUMENTI_COLUMNS: ColumnDef[] = [
  { key: 'id', label: 'ID' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'numero', label: 'Numero' },
  { key: 'anno', label: 'Anno' },
  { key: 'data', label: 'Data' },
  { key: 'cliente', label: 'Cliente' },
  { key: 'importoTotale', label: 'Importo (€)' },
  { key: 'stato', label: 'Stato' },
  { key: 'metodoPagamento', label: 'Metodo Pagamento' },
  { key: 'dataPagamento', label: 'Data Pagamento' },
  { key: 'note', label: 'Note' },
]

export async function getDocumentiExport(
  aziendaId: number,
  from?: Date,
  to?: Date,
): Promise<Record<string, unknown>[]> {
  const documenti = await prisma.documenti.findMany({
    where: {
      aziendaId,
      data: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      },
    },
    include: {
      cliente: { select: { nome: true, cognome: true, ragioneSociale: true } },
    },
    orderBy: [{ anno: 'desc' }, { numero: 'desc' }],
  })

  return documenti.map((d) => ({
    id: d.id,
    tipo: d.tipo.toUpperCase(),
    numero: d.numero,
    anno: d.anno,
    data: formatDate(d.data),
    cliente: d.cliente
      ? d.cliente.ragioneSociale || [d.cliente.nome, d.cliente.cognome].filter(Boolean).join(' ')
      : '',
    importoTotale: formatNumber(d.importoTotale),
    stato: d.stato,
    metodoPagamento: d.metodoPagamento ?? '',
    dataPagamento: formatDate(d.dataPagamento),
    note: d.note ?? '',
  }))
}
