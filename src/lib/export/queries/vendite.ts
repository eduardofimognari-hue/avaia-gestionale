import { prisma } from '@/lib/db'
import { formatDate, formatNumber, type ColumnDef } from '../formatters'

export const VENDITE_COLUMNS: ColumnDef[] = [
  { key: 'id', label: 'ID Vendita' },
  { key: 'data', label: 'Data' },
  { key: 'cliente', label: 'Cliente' },
  { key: 'tipoCliente', label: 'Tipo Cliente' },
  { key: 'prodotto', label: 'Prodotto' },
  { key: 'formato', label: 'Formato' },
  { key: 'quantita', label: 'Quantità' },
  { key: 'prezzoUnitario', label: 'Prezzo Unitario (€)' },
  { key: 'importoRiga', label: 'Importo Riga (€)' },
  { key: 'importoTotaleVendita', label: 'Totale Vendita (€)' },
  { key: 'statoPagamento', label: 'Stato Pagamento' },
  { key: 'statoFattura', label: 'Stato Fattura' },
  { key: 'metodoPagamento', label: 'Metodo Pagamento' },
  { key: 'luogo', label: 'Luogo' },
  { key: 'nota', label: 'Note' },
]

export async function getVenditeExport(
  aziendaId: number,
  from?: Date,
  to?: Date,
): Promise<Record<string, unknown>[]> {
  const vendite = await prisma.vendite.findMany({
    where: {
      aziendaId,
      data: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      },
    },
    include: {
      cliente: { select: { nome: true, cognome: true, ragioneSociale: true } },
      luogo: { select: { nome: true } },
      righe: {
        include: {
          prodotto: { select: { nome: true, varietaTipologia: true } },
        },
      },
    },
    orderBy: { data: 'desc' },
  })

  const rows: Record<string, unknown>[] = []

  for (const v of vendite) {
    const clienteNome = v.cliente
      ? [v.cliente.ragioneSociale || [v.cliente.nome, v.cliente.cognome].filter(Boolean).join(' ')].join('')
      : v.tipoCliente

    for (const r of v.righe) {
      const prodottoNome = [r.prodotto.nome, r.prodotto.varietaTipologia].filter(Boolean).join(' - ')
      rows.push({
        id: v.id,
        data: formatDate(v.data),
        cliente: clienteNome,
        tipoCliente: v.tipoCliente,
        prodotto: prodottoNome,
        formato: r.formato ?? '',
        quantita: formatNumber(r.quantita, 3),
        prezzoUnitario: formatNumber(r.prezzoUnitario),
        importoRiga: formatNumber(r.importo),
        importoTotaleVendita: formatNumber(v.importoTotale),
        statoPagamento: v.statoPagamento,
        statoFattura: v.statoFattura,
        metodoPagamento: v.metodoPagamento ?? '',
        luogo: v.luogo?.nome ?? '',
        nota: v.nota ?? '',
      })
    }
  }

  return rows
}
