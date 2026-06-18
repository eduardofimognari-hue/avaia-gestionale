import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { withAzienda } from '@/lib/api-utils'

const SYSTEM_PROMPT = `Sei l'assistente intelligente del gestionale agricolo Avaia.
Hai accesso completo ai dati reali dell'azienda e rispondi SEMPRE in italiano.
Sei preciso, diretto e utile. Quando fai calcoli li mostri chiaramente.
Puoi fare analisi, confronti, suggerimenti strategici basati sui dati reali.
Se una informazione non è presente nei dati, dillo chiaramente invece di inventare.
Formatta le risposte in modo leggibile: usa elenchi, numeri e separatori dove utile.`

async function buildContesto(aziendaId: number): Promise<string> {
  const oggi = new Date()
  const annoCorrente = oggi.getFullYear()

  const [
    azienda,
    movimentiCassa,
    vendite,
    raccolta,
    magazzino,
    clienti,
    debitiAperti,
    soci,
    attrezzature,
    luoghi,
    terreni,
    scenari,
    lavoroSoci,
  ] = await Promise.all([
    prisma.azienda.findUnique({ where: { id: aziendaId } }),

    prisma.movimentiCassa.findMany({
      where: { aziendaId },
      include: { luogo: { select: { nome: true } } },
      orderBy: { data: 'desc' },
    }),

    prisma.vendite.findMany({
      where: { aziendaId },
      include: {
        righe: { include: { prodotto: { select: { nome: true, unitaMisura: true } } } },
        cliente: { select: { nome: true } },
      },
      orderBy: { data: 'desc' },
    }),

    prisma.raccolta.findMany({
      where: { aziendaId },
      include: {
        prodotto: { select: { nome: true, unitaMisura: true } },
        terreno: { select: { nome: true } },
      },
      orderBy: { data: 'desc' },
    }),

    prisma.movimentiInput.findMany({
      where: { aziendaId },
      include: { prodotto: { select: { nome: true, unitaMisura: true } } },
    }),

    prisma.clienti.findMany({
      where: { aziendaId },
      select: { nome: true, tipo: true },
    }),

    prisma.debitiAperti.findMany({
      where: { aziendaId },
      include: {
        cliente: { select: { nome: true } },
        fornitore: { select: { nome: true } },
      },
    }),

    prisma.soci.findMany({
      where: { aziendaId },
      select: { nome: true, cognome: true },
    }),

    prisma.attrezzature.findMany({
      where: { aziendaId },
      select: { nome: true, categoria: true, quantita: true, costoUnitario: true },
    }),

    prisma.luoghi.findMany({
      where: { aziendaId },
      select: { nome: true, tipologia: true, categoria: true },
    }),

    prisma.terreni.findMany({
      where: { aziendaId },
      include: { luogo: { select: { nome: true } } },
    }),

    prisma.scenario.findMany({
      where: { aziendaId },
      include: { obiettivi: true, uscite: true, entrate: true },
    }),

    prisma.lavoroSoci.findMany({
      where: { aziendaId },
      include: {
        socio: { select: { nome: true, cognome: true } },
        area: { select: { nome: true } },
      },
      orderBy: { data: 'desc' },
    }),
  ])

  // ─── aggregazioni movimenti cassa ───
  const movimentiPerAnno: Record<number, { entrate: number; uscite: number; saldo: number }> = {}
  const movimentiPerLuogo: Record<string, { entrate: number; uscite: number }> = {}
  let saldoPagato = 0

  for (const m of movimentiCassa) {
    const anno = new Date(m.data).getFullYear()
    if (!movimentiPerAnno[anno]) movimentiPerAnno[anno] = { entrate: 0, uscite: 0, saldo: 0 }
    if (m.tipo === 'entrata') {
      movimentiPerAnno[anno].entrate += m.importo
      if (m.stato === 'pagato') saldoPagato += m.importo
    } else {
      movimentiPerAnno[anno].uscite += m.importo
      if (m.stato === 'pagato') saldoPagato -= m.importo
    }
    movimentiPerAnno[anno].saldo = movimentiPerAnno[anno].entrate - movimentiPerAnno[anno].uscite

    const luogoNome = m.luogo?.nome ?? 'Non specificato'
    if (!movimentiPerLuogo[luogoNome]) movimentiPerLuogo[luogoNome] = { entrate: 0, uscite: 0 }
    if (m.tipo === 'entrata') movimentiPerLuogo[luogoNome].entrate += m.importo
    else movimentiPerLuogo[luogoNome].uscite += m.importo
  }

  const movimentiDaPagare = movimentiCassa.filter(m => m.stato === 'da_pagare')
  const entrateAttese = movimentiDaPagare.filter(m => m.tipo === 'entrata').reduce((s, m) => s + m.importo, 0)
  const usciteAttese = movimentiDaPagare.filter(m => m.tipo === 'uscita').reduce((s, m) => s + m.importo, 0)

  // ─── aggregazioni vendite ───
  type VenditaProd = { quantita: number; ricavo: number; numVendite: number }
  const venditeProdotto: Record<string, VenditaProd> = {}
  const venditeAnno: Record<number, number> = {}
  for (const v of vendite) {
    const anno = new Date(v.data).getFullYear()
    const totale = v.importoTotale ?? v.righe.reduce((s, r) => s + r.importo, 0)
    venditeAnno[anno] = (venditeAnno[anno] ?? 0) + totale
    for (const r of v.righe) {
      const n = r.prodotto?.nome ?? 'Sconosciuto'
      if (!venditeProdotto[n]) venditeProdotto[n] = { quantita: 0, ricavo: 0, numVendite: 0 }
      venditeProdotto[n].quantita += r.quantita
      venditeProdotto[n].ricavo += r.importo
      venditeProdotto[n].numVendite += 1
    }
  }

  // ─── aggregazioni raccolta ───
  type RaccoltaProd = { quantita: number; unitaMisura: string }
  const raccoltaProdotto: Record<string, RaccoltaProd> = {}
  const raccoltaAnno: Record<number, number> = {}
  const raccoltaTerreno: Record<string, number> = {}
  for (const r of raccolta) {
    const anno = new Date(r.data).getFullYear()
    raccoltaAnno[anno] = (raccoltaAnno[anno] ?? 0) + r.quantita
    const n = r.prodotto?.nome ?? 'Sconosciuto'
    const um = r.prodotto?.unitaMisura ?? ''
    if (!raccoltaProdotto[n]) raccoltaProdotto[n] = { quantita: 0, unitaMisura: um }
    raccoltaProdotto[n].quantita += r.quantita
    const tn = r.terreno?.nome ?? 'Non specificato'
    raccoltaTerreno[tn] = (raccoltaTerreno[tn] ?? 0) + r.quantita
  }

  // ─── magazzino ───
  const giacenzeMap: Record<string, { carico: number; scarico: number; unitaMisura: string }> = {}
  for (const m of magazzino) {
    const n = m.prodotto?.nome ?? 'Sconosciuto'
    const um = m.prodotto?.unitaMisura ?? ''
    if (!giacenzeMap[n]) giacenzeMap[n] = { carico: 0, scarico: 0, unitaMisura: um }
    if (m.tipo === 'carico') giacenzeMap[n].carico += m.quantita
    else giacenzeMap[n].scarico += m.quantita
  }

  const fmt = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
  const fmtN = (n: number, um = '') => `${n.toLocaleString('it-IT', { maximumFractionDigits: 2 })}${um ? ' ' + um : ''}`

  const contesto = `
=== DATA ODIERNA: ${oggi.toLocaleDateString('it-IT')} | ANNO CORRENTE: ${annoCorrente} ===
=== AZIENDA: ${azienda?.nome ?? 'N/D'} ===

━━━ CASSA ━━━
Saldo attuale cassa (solo movimenti pagati): ${fmt(saldoPagato)}
Entrate in attesa di incasso: ${fmt(entrateAttese)}
Uscite in attesa di pagamento: ${fmt(usciteAttese)}

Movimenti cassa per anno:
${Object.entries(movimentiPerAnno).sort(([a], [b]) => Number(b) - Number(a)).map(([anno, v]) =>
  `  ${anno}: Entrate ${fmt(v.entrate)} | Uscite ${fmt(v.uscite)} | Netto ${fmt(v.saldo)}`
).join('\n') || '  Nessun movimento'}

Movimenti cassa per luogo/fondo:
${Object.entries(movimentiPerLuogo).map(([luogo, v]) =>
  `  ${luogo}: Entrate ${fmt(v.entrate)} | Uscite ${fmt(v.uscite)} | Netto ${fmt(v.entrate - v.uscite)}`
).join('\n') || '  Nessun dato per luogo'}

Ultimi 10 movimenti:
${movimentiCassa.slice(0, 10).map(m =>
  `  [${new Date(m.data).toLocaleDateString('it-IT')}] ${m.tipo.toUpperCase()} ${fmt(m.importo)} – ${m.descrizione} (${m.stato})${m.luogo ? ` @ ${m.luogo.nome}` : ''}`
).join('\n') || '  Nessun movimento recente'}

━━━ VENDITE ━━━
Totale vendite per anno:
${Object.entries(venditeAnno).sort(([a], [b]) => Number(b) - Number(a)).map(([anno, tot]) =>
  `  ${anno}: ${fmt(tot)}`
).join('\n') || '  Nessuna vendita'}

Vendite per prodotto (storico completo):
${Object.entries(venditeProdotto).sort(([, a], [, b]) => b.ricavo - a.ricavo).map(([nome, v]) =>
  `  ${nome}: ${fmtN(v.quantita)} venduto, ricavo ${fmt(v.ricavo)} (${v.numVendite} transazioni)`
).join('\n') || '  Nessuna vendita per prodotto'}

━━━ RACCOLTA ━━━
Raccolta per anno:
${Object.entries(raccoltaAnno).sort(([a], [b]) => Number(b) - Number(a)).map(([anno, qt]) =>
  `  ${anno}: ${fmtN(qt)}`
).join('\n') || '  Nessuna raccolta'}

Raccolta per prodotto:
${Object.entries(raccoltaProdotto).map(([nome, v]) =>
  `  ${nome}: ${fmtN(v.quantita, v.unitaMisura)}`
).join('\n') || '  Nessun dato'}

Raccolta per terreno/stacco:
${Object.entries(raccoltaTerreno).map(([terreno, qt]) =>
  `  ${terreno}: ${fmtN(qt)}`
).join('\n') || '  Nessun dato per terreno'}

━━━ MAGAZZINO ━━━
Giacenze attuali:
${Object.entries(giacenzeMap).map(([nome, v]) => {
  const giacenza = v.carico - v.scarico
  return `  ${nome}: ${fmtN(giacenza, v.unitaMisura)} (carico ${fmtN(v.carico)} – scarico ${fmtN(v.scarico)})`
}).join('\n') || '  Nessuna giacenza'}

━━━ CLIENTI ━━━
Clienti registrati: ${clienti.length}
${clienti.map(c => `  ${c.nome} (${c.tipo})`).join('\n') || '  Nessun cliente'}

━━━ DEBITI / CREDITI APERTI ━━━
${debitiAperti.length === 0 ? '  Nessun debito/credito aperto' :
  debitiAperti.map(d => {
    const controparte = d.cliente?.nome ?? d.fornitore?.nome ?? 'N/D'
    return `  ${d.tipo === 'credito' ? 'CREDITO da' : 'DEBITO verso'} ${controparte}: ${fmt(d.importo)} – ${d.descrizione ?? ''} (scadenza: ${d.scadenza ? new Date(d.scadenza).toLocaleDateString('it-IT') : 'N/D'}, stato: ${d.stato})`
  }).join('\n')
}

━━━ SOCI ━━━
${soci.map(s => `  ${s.nome} ${s.cognome}`).join('\n') || '  Nessun socio'}

━━━ LAVORO SOCI (ultimi 20 record) ━━━
${lavoroSoci.slice(0, 20).map(l =>
  `  [${new Date(l.data).toLocaleDateString('it-IT')}] ${l.socio?.nome} ${l.socio?.cognome} – ${l.area?.nome ?? 'N/D'} – ${l.ore}h`
).join('\n') || '  Nessun lavoro registrato'}

━━━ FONDI / LUOGHI ━━━
${luoghi.map(l =>
  `  ${l.nome} (${l.tipologia}, ${l.categoria})`
).join('\n') || '  Nessun luogo'}

━━━ TERRENI / STACCHI PRODUTTIVI ━━━
${terreni.map(t => {
  const tWithLuogo = t as typeof t & { luogo?: { nome: string } }
  return `  ${t.nome} @ ${tWithLuogo.luogo?.nome ?? 'N/D'}: ${t.superficie ? `${t.superficie} ha` : 'superficie N/D'}${t.culturaVarieta ? ` – coltura: ${t.culturaVarieta}` : ''}`
}).join('\n') || '  Nessun terreno'}

━━━ ATTREZZATURE ━━━
${attrezzature.map(a =>
  `  ${a.nome}${a.categoria ? ` (${a.categoria})` : ''} – quantità: ${a.quantita}${a.costoUnitario ? ` – costo unitario: ${fmt(a.costoUnitario)}` : ''}`
).join('\n') || '  Nessuna attrezzatura'}

━━━ SCENARI PREVISIONALI ━━━
${scenari.length === 0 ? '  Nessuno scenario' : scenari.map(s => {
  const totTarget = s.obiettivi.reduce((sum, o) => sum + o.importoTarget, 0)
  return `  Scenario "${s.nome}" (${s.annoInizio}-${s.annoFine}, stato: ${s.stato})
    Uscite nel piano: ${s.uscite.length} voci | Entrate nel piano: ${s.entrate.length} voci
    Obiettivi: ${s.obiettivi.map(o => `${o.nome} (target: ${fmt(o.importoTarget)}, priorità ${o.percentualePriorita}%)`).join(', ') || 'nessuno'}
    Totale target obiettivi: ${fmt(totTarget)}`
}).join('\n')}
`.trim()

  return contesto
}

export async function POST(req: Request) {
  return withAzienda(async (aziendaId) => {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Chiave API Gemini non configurata. Aggiungi GEMINI_API_KEY nel file .env.local e su Vercel.' },
        { status: 503 }
      )
    }

    const body = await req.json()
    const domanda: string = body.domanda ?? ''
    const cronologia: { ruolo: 'user' | 'model'; testo: string }[] = body.cronologia ?? []

    if (!domanda.trim()) {
      return NextResponse.json({ error: 'Domanda vuota' }, { status: 400 })
    }

    const contesto = await buildContesto(aziendaId)

    const contents = [
      { role: 'user', parts: [{ text: `Ecco i dati aggiornati del gestionale:\n\n${contesto}` }] },
      { role: 'model', parts: [{ text: 'Ho ricevuto e analizzato tutti i dati del gestionale. Sono pronto a rispondere alle tue domande.' }] },
      ...cronologia.map(m => ({ role: m.ruolo, parts: [{ text: m.testo }] })),
      { role: 'user', parts: [{ text: domanda }] },
    ]

    const apiKey = process.env.GEMINI_API_KEY
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
        }),
      }
    )

    if (!geminiRes.ok) {
      const errBody = await geminiRes.json().catch(() => ({}))
      const errMsg = (errBody as { error?: { message?: string } })?.error?.message ?? `HTTP ${geminiRes.status}`
      console.error('Gemini API error:', geminiRes.status, errMsg)
      return NextResponse.json({ error: `Errore AI (${geminiRes.status}): ${errMsg}` }, { status: 503 })
    }

    const geminiData = await geminiRes.json() as {
      candidates?: { content?: { parts?: { text?: string }[] } }[]
    }
    const risposta = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    if (!risposta) {
      console.error('Gemini: risposta vuota', JSON.stringify(geminiData))
      return NextResponse.json({ error: 'L\'AI non ha restituito una risposta. Riprova.' }, { status: 503 })
    }

    return NextResponse.json({ risposta })
  })
}
