'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Download, ArrowLeft, FileText, FileSpreadsheet, CheckCircle } from 'lucide-react'
import { formatDate, formatEuro } from '@/lib/utils'
import Link from 'next/link'

type ClienteInfo = {
  id: number; nome: string; cognome: string | null; ragioneSociale: string | null
  partitaIva: string | null; codiceFiscale: string | null
  indirizzo: string | null; comune: string | null; provincia: string | null; cap: string | null
}

type RigaVendita = {
  id: number
  prodotto: { id: number; nome: string; varietaTipologia: string | null; aliquotaIva: number }
  formato: string | null; quantita: number; prezzoUnitario: number; importo: number
}

type Documento = {
  id: number; tipo: string; numero: number; anno: number; data: string; stato: string
  importoTotale: number; note: string | null
  dataPagamentoPrevista: string | null; dataPagamento: string | null; metodoPagamento: string | null
  vendita: {
    id: number; data: string; importoTotale: number | null; tipoCliente: string
    cliente: ClienteInfo | null
    righe: RigaVendita[]
  } | null
  cliente: ClienteInfo | null
}

export default function DocumentoDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [doc, setDoc] = useState<Documento | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [saving, setSaving] = useState(false)
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

  async function handleDownloadPdf() {
    if (!printRef.current) return
    setGeneratingPdf(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')
      const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
      const imgData = canvas.toDataURL('image/png')
      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      const pdf = new jsPDF('p', 'mm', 'a4')
      let heightLeft = imgHeight
      let position = 0
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pdf.internal.pageSize.getHeight()
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pdf.internal.pageSize.getHeight()
      }
      const tipoLabel = doc?.tipo === 'ddt' ? 'DDT' : 'Fattura'
      pdf.save(`${tipoLabel}-${doc?.numero}-${doc?.anno}.pdf`)
    } catch {
      setError('Errore generazione PDF')
    } finally { setGeneratingPdf(false) }
  }

  async function handlePay() {
    if (!doc || !confirm(`Confermi il pagamento della fattura ${doc.numero}/${doc.anno}?`)) return
    setSaving(true)
    try {
      const res = await fetch(`/api/documenti/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ azione: 'paga', dataPagamento: new Date().toISOString(), metodoPagamento: doc.metodoPagamento || 'bonifico' }),
      })
      if (!res.ok) throw new Error()
      await fetchData()
    } catch { setError('Errore durante la registrazione del pagamento') }
    finally { setSaving(false) }
  }

  if (loading) return <p className="text-gray-500">Caricamento...</p>
  if (error) return <p className="text-red-600">{error}</p>
  if (!doc) return <p className="text-gray-500">Documento non trovato</p>

  const isDdt = doc.tipo === 'ddt'
  const titolo = isDdt ? 'Documento di Trasporto' : 'Fattura'
  const titoloBreve = isDdt ? 'DDT' : 'FT'
  const cliente = doc.cliente || doc.vendita?.cliente

  const righe = doc.vendita?.righe || []
  const imponibile = righe.reduce((sum, r) => sum + r.importo, 0)
  const ivaGroups = righe.reduce((acc: Record<number, { imponibile: number; iva: number }>, r) => {
    const al = r.prodotto.aliquotaIva || 22
    if (!acc[al]) acc[al] = { imponibile: 0, iva: 0 }
    acc[al].imponibile += r.importo
    acc[al].iva += r.importo * al / 100
    return acc
  }, {})
  const ivaPerAliquota = Object.entries(ivaGroups).map(([al, g]) => ({ aliquota: Number(al), imponibile: g.imponibile, iva: g.iva }))
  const totaleIva = ivaPerAliquota.reduce((s, g) => s + g.iva, 0)
  const totaleDoc = imponibile + totaleIva

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title={`${titoloBreve} ${doc.numero}/${doc.anno}`}
          description={formatDate(doc.data)}
          action={
            <div className="flex gap-2">
              <Link href="/documenti">
                <Button variant="secondary"><ArrowLeft className="w-4 h-4 mr-2" />Indietro</Button>
              </Link>
              {!isDdt && doc.stato !== 'completato' && (
                <Button onClick={handlePay} disabled={saving} variant="secondary">
                  <CheckCircle className="w-4 h-4 mr-2" />{saving ? 'Registrazione...' : 'Segna come pagata'}
                </Button>
              )}
              <Button onClick={handleDownloadPdf} disabled={generatingPdf}>
                <Download className="w-4 h-4 mr-2" />{generatingPdf ? 'Generazione...' : 'Scarica PDF'}
              </Button>
            </div>
          }
        />
        <div className="flex gap-2 mb-4 flex-wrap">
          <Badge variant={doc.stato === 'bozza' ? 'warning' : doc.stato === 'emesso' ? 'info' : 'success'}>
            {doc.stato === 'bozza' ? 'Bozza - Da confermare' : doc.stato === 'emesso' ? isDdt ? 'Confermato' : 'Emessa' : 'Completato'}
          </Badge>
          {!isDdt && doc.dataPagamentoPrevista && (
            <Badge variant={doc.dataPagamento ? 'success' : 'warning'}>
              {doc.dataPagamento ? `Pagata il ${formatDate(doc.dataPagamento)}` : `Scadenza: ${formatDate(doc.dataPagamentoPrevista)}`}
            </Badge>
          )}
          {!isDdt && doc.metodoPagamento && (
            <Badge variant="default">Metodo: {doc.metodoPagamento}</Badge>
          )}
        </div>
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      </div>

      <div ref={printRef} className="bg-white rounded-xl border p-6 sm:p-10 max-w-4xl mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
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

        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cliente</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-semibold text-gray-900">
              {cliente?.ragioneSociale || `${cliente?.nome || ''} ${cliente?.cognome || ''}`}
            </p>
            {cliente?.indirizzo && <p className="text-sm text-gray-600">{cliente.indirizzo}</p>}
            {cliente?.comune && (
              <p className="text-sm text-gray-600">{cliente.comune}{cliente.provincia ? ` (${cliente.provincia})` : ''}{cliente.cap ? ` ${cliente.cap}` : ''}</p>
            )}
            {cliente?.partitaIva && <p className="text-sm text-gray-600">P.IVA: {cliente.partitaIva}</p>}
            {cliente?.codiceFiscale && <p className="text-sm text-gray-600">CF: {cliente.codiceFiscale}</p>}
            {!cliente && <p className="text-sm text-gray-500">Cliente generico</p>}
          </div>
        </div>

        {righe.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Dettaglio</h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-300 text-left">
                  <th className="py-2 font-medium text-gray-500 w-[35%]">Prodotto</th>
                  <th className="py-2 font-medium text-gray-500 w-[15%]">Formato</th>
                  <th className="py-2 font-medium text-gray-500 text-right w-[12%]">Qtà</th>
                  <th className="py-2 font-medium text-gray-500 text-right w-[15%]">Prezzo</th>
                  <th className="py-2 font-medium text-gray-500 text-right w-[13%]">Importo</th>
                  <th className="py-2 font-medium text-gray-500 text-right w-[10%]">IVA%</th>
                </tr>
              </thead>
              <tbody>
                {righe.map((r) => (
                  <tr key={r.id} className="border-b border-gray-200">
                    <td className="py-2">{r.prodotto.nome}{r.prodotto.varietaTipologia ? ` (${r.prodotto.varietaTipologia})` : ''}</td>
                    <td className="py-2">{r.formato || '-'}</td>
                    <td className="py-2 text-right">{r.quantita}</td>
                    <td className="py-2 text-right">{formatEuro(r.prezzoUnitario)}</td>
                    <td className="py-2 text-right font-medium">{formatEuro(r.importo)}</td>
                    <td className="py-2 text-right">{r.prodotto.aliquotaIva || 22}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Riepilogo IVA e Totale */}
        <div className="flex justify-end mb-6">
          <div className="w-72">
            <div className="flex justify-between py-2 border-b border-gray-300">
              <span className="text-sm text-gray-600">Imponibile</span>
              <span className="font-medium">{formatEuro(imponibile)}</span>
            </div>
            {ivaPerAliquota.map(g => (
              <div key={g.aliquota} className="flex justify-between py-1.5 border-b border-gray-200 text-sm">
                <span className="text-gray-600">IVA {g.aliquota}%</span>
                <span className="font-medium">{formatEuro(g.iva)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 border-b-2 border-gray-900 text-lg">
              <span className="font-bold text-gray-900">Totale {titoloBreve}</span>
              <span className="font-bold text-gray-900">{formatEuro(totaleDoc)}</span>
            </div>
          </div>
        </div>

        {!isDdt && (
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Informazioni pagamento</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">Metodo:</span> <span className="font-medium">{doc.metodoPagamento || 'Non specificato'}</span></div>
              {doc.dataPagamentoPrevista && <div><span className="text-gray-500">Scadenza:</span> <span className="font-medium">{formatDate(doc.dataPagamentoPrevista)}</span></div>}
              {doc.dataPagamento && <div><span className="text-gray-500">Pagata il:</span> <span className="font-medium text-green-700">{formatDate(doc.dataPagamento)}</span></div>}
              {!doc.dataPagamento && doc.dataPagamentoPrevista && (
                <div><span className="text-gray-500">Stato:</span> <span className="font-medium text-amber-600">In attesa di pagamento</span></div>
              )}
            </div>
          </div>
        )}

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
            {doc.stato === 'bozza' && <p className="text-amber-600 mt-1 font-semibold">BOZZA - Documento non ancora confermato</p>}
            {doc.stato === 'emesso' && <p className="text-green-600 mt-1 font-semibold">CONFERMATO - In attesa di emissione fattura</p>}
          </div>
        )}

        <div className="mt-8 text-xs text-gray-400 text-center border-t pt-4">
          <p>Generato il {new Date().toLocaleDateString('it-IT')} - avaia gestionale</p>
        </div>
      </div>
    </div>
  )
}