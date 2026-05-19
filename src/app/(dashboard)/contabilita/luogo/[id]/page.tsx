'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { MapPin, Download, ArrowLeft } from 'lucide-react'
import { formatDate, formatEuro } from '@/lib/utils'
import Link from 'next/link'

type Luogo = { id: number; nome: string; tipo: string }
type Movimento = {
  id: number
  data: string
  cassa: { nome: string }
  socio: { id: number; nome: string; cognome: string } | null
  tipo: string
  tipoMovimento: string
  importo: number
  categoria: string | null
  descrizione: string | null
}

const TIPI_MOVIMENTO: Record<string, string> = {
  spesa: 'Spesa', entrata_generica: 'Entrata generica',
  anticipo_socio: 'Anticipo socio', rimborso_socio: 'Rimborso socio',
  anticipo_azienda: 'Anticipo azienda', rimborso_azienda: 'Rimborso azienda',
  stipendio: 'Stipendio', fornitore: 'Fornitore',
  liquidazione: 'Liquidazione', altro: 'Altro',
}

export default function LuogoDetailPage() {
  const params = useParams()
  const luogoId = params.id as string
  const [luogo, setLuogo] = useState<Luogo | null>(null)
  const [movimenti, setMovimenti] = useState<Movimento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [totaleEntrate, setTotaleEntrate] = useState(0)
  const [totaleUscite, setTotaleUscite] = useState(0)
  const printRef = useRef<HTMLDivElement>(null)

  async function fetchData() {
    try {
      setLoading(true)
      const res = await fetch(`/api/contabilita/luogo/${luogoId}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setLuogo(data.luogo)
      setMovimenti(data.movimenti)
      setTotaleEntrate(data.totaleEntrate)
      setTotaleUscite(data.totaleUscite)
    } catch { setError('Errore caricamento dati') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [luogoId])

  function handlePrint() {
    window.print()
  }

  if (loading) return <p className="text-gray-500">Caricamento...</p>
  if (error) return <p className="text-red-600">{error}</p>
  if (!luogo) return <p className="text-gray-500">Luogo non trovato</p>

  const saldo = totaleEntrate - totaleUscite

  return (
    <div>
      {/* Print styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          @page { margin: 15mm; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="no-print">
        <PageHeader
          title={luogo.nome}
          description={`Sottocontabilità - ${luogo.tipo}`}
          action={
            <div className="flex gap-2">
              <Link href="/contabilita">
                <Button variant="secondary"><ArrowLeft className="w-4 h-4 mr-2" />Indietro</Button>
              </Link>
              <Button onClick={handlePrint}><Download className="w-4 h-4 mr-2" />Scarica PDF</Button>
            </div>
          }
        />
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      </div>

      <div ref={printRef}>
        {/* Print header */}
        <div className="print-only mb-6 text-center">
          <h1 className="text-2xl font-bold">{luogo.nome}</h1>
          <p className="text-gray-500">Sottocontabilità - {luogo.tipo}</p>
          <hr className="my-4" />
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Entrate</p>
              <p className="text-2xl font-bold text-green-600">{formatEuro(totaleEntrate)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Uscite</p>
              <p className="text-2xl font-bold text-red-600">{formatEuro(totaleUscite)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Saldo</p>
              <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-primary-600' : 'text-red-600'}`}>
                {formatEuro(saldo)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Movements table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <Thead>
                <Tr>
                  <Th>Data</Th>
                  <Th>Cassa</Th>
                  <Th>Direzione</Th>
                  <Th>Tipo</Th>
                  <Th>Socio</Th>
                  <Th>Importo</Th>
                  <Th>Categoria</Th>
                  <Th>Descrizione</Th>
                </Tr>
              </Thead>
              <Tbody>
                {movimenti.map((m) => (
                  <Tr key={m.id}>
                    <Td>{formatDate(m.data)}</Td>
                    <Td>{m.cassa.nome}</Td>
                    <Td><Badge variant={m.tipo === 'entrata' ? 'success' : 'danger'}>{m.tipo === 'entrata' ? 'Entrata' : 'Uscita'}</Badge></Td>
                    <Td><Badge variant="info" className="text-xs">{TIPI_MOVIMENTO[m.tipoMovimento] || m.tipoMovimento}</Badge></Td>
                    <Td>{m.socio ? `${m.socio.nome} ${m.socio.cognome}` : '-'}</Td>
                    <Td className="font-medium">{formatEuro(m.importo)}</Td>
                    <Td>{m.categoria || '-'}</Td>
                    <Td>{m.descrizione || '-'}</Td>
                  </Tr>
                ))}
                {movimenti.length === 0 && (
                  <Tr><Td colSpan={8} className="text-center text-gray-500 py-8">Nessun movimento per questo luogo</Td></Tr>
                )}
              </Tbody>
            </Table>
          </CardContent>
        </Card>

        {/* Print footer */}
        <div className="print-only mt-8 text-xs text-gray-400 text-center">
          <p>Generato il {new Date().toLocaleDateString('it-IT')} - avaia gestionale</p>
        </div>
      </div>
    </div>
  )
}
