'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { Download, ArrowLeft, FileText, FileSpreadsheet } from 'lucide-react'
import { formatDate, formatEuro } from '@/lib/utils'
import Link from 'next/link'

type ClienteInfo = {
  id: number; nome: string; cognome: string | null; ragioneSociale: string | null
  partitaIva: string | null; codiceFiscale: string | null
  indirizzo: string | null; comune: string | null; provincia: string | null; cap: string | null
}

type Documento = {
  id: number
  tipo: string
  numero: number
  anno: number
  data: string
  importoTotale: number
  note: string | null
  vendita: {
    id: number
    data: string
    importoTotale: number | null
    tipoCliente: string
    cliente: ClienteInfo | null
    righe: {
      id: number
      prodotto: { id: number; nome: string; varietaTipologia: string | null }
      formato: string | null
      quantita: number
      prezzoUnitario: number
      importo: number
    }[]
  } | null
  cliente: ClienteInfo | null
}

export default function DocumentoDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [doc, setDoc] = useState<Documento | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const printRef = useRef<HTMLDivElement>(null)

  async function fetchData() {
    try {
      setLoading(true)
      const res = await fetch(`/api/documenti/${id}`)
      if (!res.ok) throw new Error()
      setDoc(await res.json())
    } catch { setError('Errore caricamento documento') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [id])

  function handlePrint() {
    window.print()
  }

  if (loading) return <p className="text-gray-500">Caricamento...</p>
  if (error) return <p className="text-red-600">{error}</p>
  if (!doc) return <p className="text-gray-500">Documento non trovato</p>

  const isDdt = doc.tipo === 'ddt'
  const titolo = isDdt ? 'DDT' : 'Fattura'
  const cliente = doc.cliente || doc.vendita?.cliente

  return (
    <div>
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
          title={`${titolo} ${doc.numero}/${doc.anno}`}
          description={formatDate(doc.data)}
          action={
            <div className="flex gap-2">
              <Link href="/documenti">
                <Button variant="secondary"><ArrowLeft className="w-4 h-4 mr-2" />Indietro</Button>
              </Link>
              <Button onClick={handlePrint}><Download className="w-4 h-4 mr-2" />Scarica PDF</Button>
            </div>
          }
        />
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      </div>

      <div ref={printRef} className="bg-white rounded-xl border p-6 sm:p-10 max-w-4xl mx-auto">
        {/* Intestazione */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{titolo}</h1>
            <p className="text-sm text-gray-500">N. {doc.numero}/{doc.anno}</p>
            <p className="text-sm text-gray-500">Data: {formatDate(doc.data)}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary-600">avaia</div>
            <p className="text-xs text-gray-400">Gestionale</p>
          </div>
        </div>

        <hr className="mb-6" />

        {/* Cliente */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cliente</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-semibold text-gray-900">
              {cliente?.ragioneSociale || `${cliente?.nome || ''} ${cliente?.cognome || ''}`}
            </p>
            {cliente?.indirizzo && <p className="text-sm text-gray-600">{cliente.indirizzo}</p>}
            {cliente?.comune && (
              <p className="text-sm text-gray-600">
                {cliente.comune}{cliente.provincia ? ` (${cliente.provincia})` : ''}{cliente.cap ? ` ${cliente.cap}` : ''}
              </p>
            )}
            {cliente?.partitaIva && <p className="text-sm text-gray-600">P.IVA: {cliente.partitaIva}</p>}
            {cliente?.codiceFiscale && <p className="text-sm text-gray-600">CF: {cliente.codiceFiscale}</p>}
            {!cliente && <p className="text-sm text-gray-500">Cliente generico</p>}
          </div>
        </div>

        {/* Dettaglio righe */}
        {doc.vendita?.righe && doc.vendita.righe.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Dettaglio</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 font-medium text-gray-500">Prodotto</th>
                  <th className="py-2 font-medium text-gray-500">Formato</th>
                  <th className="py-2 font-medium text-gray-500 text-right">Qtà</th>
                  <th className="py-2 font-medium text-gray-500 text-right">Prezzo</th>
                  <th className="py-2 font-medium text-gray-500 text-right">Importo</th>
                </tr>
              </thead>
              <tbody>
                {doc.vendita.righe.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="py-2">{r.prodotto.nome}{r.prodotto.varietaTipologia ? ` (${r.prodotto.varietaTipologia})` : ''}</td>
                    <td className="py-2">{r.formato || '-'}</td>
                    <td className="py-2 text-right">{r.quantita}</td>
                    <td className="py-2 text-right">{formatEuro(r.prezzoUnitario)}</td>
                    <td className="py-2 text-right font-medium">{formatEuro(r.importo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totale */}
        <div className="flex justify-end mb-6">
          <div className="w-64">
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm text-gray-600">Imponibile</span>
              <span className="font-medium">{formatEuro(doc.importoTotale)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm text-gray-600">IVA (0%)</span>
              <span className="font-medium">{formatEuro(0)}</span>
            </div>
            <div className="flex justify-between py-2 text-lg">
              <span className="font-bold text-gray-900">Totale {titolo}</span>
              <span className="font-bold text-gray-900">{formatEuro(doc.importoTotale)}</span>
            </div>
          </div>
        </div>

        {/* Note */}
        {doc.note && (
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 font-medium">Note</p>
            <p className="text-sm text-gray-700">{doc.note}</p>
          </div>
        )}

        {isDdt && (
          <div className="text-xs text-gray-400 border-t pt-4 mt-6">
            <p>Documento di Trasporto ai sensi del DPR 472/96</p>
            <p>Causale: Vendita merce</p>
          </div>
        )}

        <div className="print-only mt-8 text-xs text-gray-400 text-center">
          <p>Generato il {new Date().toLocaleDateString('it-IT')} - avaia gestionale</p>
        </div>
      </div>
    </div>
  )
}
