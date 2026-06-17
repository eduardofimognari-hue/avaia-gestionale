

# ARCHITECTURE MAP — AVAIA GESTIONALE

## 🧭 COSA FA IL GESTIONALE

Il sistema è una piattaforma gestionale agricola che permette di:

- gestire aziende agricole

- gestire utenti e ruoli

- gestire appezzamenti/campi

- gestire attività operative aziendali

- gestire magazzino (prodotti / input agricoli)

- gestire vendite e movimenti economici

- supportare la gestione amministrativa dell’azienda agricola

Obiettivo: digitalizzare la gestione operativa e amministrativa di un’azienda agricola.

---

## 🧱 STACK TECNOLOGICO

- Next.js (frontend + backend API routes)

- TypeScript

- Prisma ORM

- PostgreSQL (database)

- TailwindCSS (UI)

---

## 🧩 MODULI ATTUALI (REALI O IMPLICITI)

### 👤 1. UTENTI / AUTH

- gestione accesso utenti

- autenticazione

- ruoli (probabilmente admin / user)

---

### 🏢 2. AZIENDE AGRICOLE

- entità principale del sistema

- ogni utente è collegato a una o più aziende

---

### 🌾 3. APPEZZAMENTI / CAMPI

- gestione terreni agricoli

- collegamento a azienda

- base per attività agricole

---

### 📦 4. MAGAZZINO

- gestione prodotti agricoli / input

- movimentazione materiali

- possibile gestione stock

---

### 💰 5. VENDITE / MOVIMENTI ECONOMICI

- registrazione vendite

- gestione entrate/uscite

- base per analisi economica

---

### ⚙️ 6. ATTIVITÀ OPERATIVE

- attività agricole (probabile struttura parziale)

- operazioni sul campo

- log operativi

---

## ⚠️ AREE NON ANCORA CHIARE (DA VERIFICARE)

- irrigazione (non completamente strutturata o separata)

- fertirrigazione (probabile non isolata come modulo)

- automazioni agricole (non ancora presenti come sistema dedicato)

- analisi dati avanzate (non strutturate come modulo separato)

- dashboard decisionale agricola

---

## 🧠 PROBLEMA ARCHITETTURALE ATTUALE

Il sistema è già funzionante ma:

- i moduli non sono completamente separati per dominio

- alcune logiche potrebbero essere mescolate tra UI e backend

- Prisma schema cresce in modo progressivo senza segmentazione forte

- mancano confini netti tra:

  - agronomia

  - gestione operativa

  - gestione economica

---

## 🎯 DIREZIONE FUTURA (NON IMPLEMENTATA ANCORA)

Il sistema dovrebbe evolvere verso:

### 🌿 DOMINI SEPARATI

- Agricoltura (campi, colture, cicli)

- Irrigazione

- Fertilizzazione

- Magazzino

- Economia aziendale

### 🧱 ARCHITETTURA IDEALE

- servizi separati per ogni dominio

- logica business fuori dalla UI

- Prisma organizzato per moduli

---

## 🚀 PRIORITÀ ATTUALE

1. Stabilizzare struttura esistente

2. Separare logica business in services

3. Chiarire dominio irrigazione e fertilizzazione

4. Evitare crescita disordinata del Prisma schema

5. Rendere il sistema modulare e scalabile

