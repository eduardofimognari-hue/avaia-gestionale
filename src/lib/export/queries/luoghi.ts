import { prisma } from '@/lib/db'
import { type ColumnDef } from '../formatters'

export const LUOGHI_COLUMNS: ColumnDef[] = [
  { key: 'id', label: 'ID' },
  { key: 'nome', label: 'Nome' },
  { key: 'tipologia', label: 'Tipologia' },
  { key: 'categoria', label: 'Categoria' },
  { key: 'usoAziendale', label: 'Uso Aziendale' },
  { key: 'indirizzo', label: 'Indirizzo' },
  { key: 'comune', label: 'Comune' },
  { key: 'provincia', label: 'Provincia' },
  { key: 'cap', label: 'CAP' },
  { key: 'attivo', label: 'Attivo' },
  { key: 'note', label: 'Note' },
]

export async function getLuoghiExport(aziendaId: number): Promise<Record<string, unknown>[]> {
  const luoghi = await prisma.luoghi.findMany({
    where: { aziendaId },
    orderBy: { nome: 'asc' },
  })

  return luoghi.map((l) => ({
    id: l.id,
    nome: l.nome,
    tipologia: l.tipologia,
    categoria: l.categoria,
    usoAziendale: l.usoAziendale ? 'Sì' : 'No',
    indirizzo: l.indirizzo ?? '',
    comune: l.comune ?? '',
    provincia: l.provincia ?? '',
    cap: l.cap ?? '',
    attivo: l.attivo ? 'Sì' : 'No',
    note: l.note ?? '',
  }))
}
