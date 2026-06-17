import { prisma } from '@/lib/db'
import { type ColumnDef } from '../formatters'

export const PRODOTTI_COLUMNS: ColumnDef[] = [
  { key: 'id', label: 'ID' },
  { key: 'codice', label: 'Codice' },
  { key: 'nome', label: 'Nome' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'varietaTipologia', label: 'Varietà / Tipologia' },
  { key: 'categoria', label: 'Categoria' },
  { key: 'unitaMisura', label: 'Unità Misura' },
  { key: 'aliquotaIva', label: 'IVA %' },
  { key: 'attivo', label: 'Attivo' },
  { key: 'note', label: 'Note' },
]

export async function getProdottiExport(aziendaId: number): Promise<Record<string, unknown>[]> {
  const prodotti = await prisma.prodotti.findMany({
    where: { aziendaId },
    orderBy: [{ codice: 'asc' }],
  })

  return prodotti.map((p) => ({
    id: p.id,
    codice: p.codice,
    nome: p.nome,
    tipo: p.tipo,
    varietaTipologia: p.varietaTipologia ?? '',
    categoria: p.categoria ?? '',
    unitaMisura: p.unitaMisura,
    aliquotaIva: p.aliquotaIva,
    attivo: p.attivo ? 'Sì' : 'No',
    note: p.note ?? '',
  }))
}
