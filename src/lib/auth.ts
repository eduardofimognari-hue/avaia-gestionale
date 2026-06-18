import { NextAuthOptions, getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './db'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

export type RuoloUtente = 'admin' | 'editor'

export interface UtenteSessione {
  id: number
  email: string
  nome: string
  ruolo: string
  attivo: boolean
  aziendaId: number
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const utente = await prisma.utente.findUnique({
          where: { email: credentials.email },
          include: { azienda: true },
        })
        if (!utente || !utente.attivo) return null
        const valid = await bcrypt.compare(credentials.password, utente.password)
        if (!valid) return null
        return { id: String(utente.id), email: utente.email, name: utente.nome, ruolo: utente.ruolo, aziendaId: utente.aziendaId }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.aziendaId = user.aziendaId
        token.ruolo = user.ruolo
      }
      return token
    },
    async session({ session, token }) {
      session.aziendaId = token.aziendaId
      session.ruolo = token.ruolo
      return session
    },
    async redirect({ url, baseUrl }) {
      // Dopo il login, non tornare sull'assistente AI — vai alla dashboard
      if (url === `${baseUrl}/assistente`) return `${baseUrl}/dashboard`
      if (url.startsWith(baseUrl)) return url
      return `${baseUrl}/dashboard`
    },
  },
}

export async function getCurrentUser(): Promise<UtenteSessione | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null
  const utente = await prisma.utente.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, nome: true, ruolo: true, attivo: true, aziendaId: true },
  })
  return utente
}

export async function requireRole(ruoli: string[], aziendaId?: number) {
  const utente = await getCurrentUser()
  if (!utente || !utente.attivo) {
    return { allowed: false, response: NextResponse.json({ error: 'Non autorizzato' }, { status: 401 }) }
  }
  if (!ruoli.includes(utente.ruolo)) {
    return { allowed: false, response: NextResponse.json({ error: 'Permessi insufficienti' }, { status: 403 }) }
  }
  if (aziendaId !== undefined && utente.aziendaId !== aziendaId) {
    return { allowed: false, response: NextResponse.json({ error: 'Non autorizzato per questa azienda' }, { status: 403 }) }
  }
  return { allowed: true, response: null as NextResponse | null, utente }
}

export function checkRuoloScrittura(ruolo: string): boolean {
  return ['admin', 'editor'].includes(ruolo)
}
