import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Package, Users, Handshake, Building2, Grid3x3, Wrench, Droplets, TreePine } from 'lucide-react'

const sezioni = [
  { nome: 'Prodotti', href: '/anagrafiche/prodotti', icon: Package, desc: 'Gestione prodotti e varietà' },
  { nome: 'Clienti', href: '/anagrafiche/clienti', icon: Users, desc: 'Anagrafica clienti' },
  { nome: 'Soci', href: '/anagrafiche/soci', icon: Handshake, desc: 'Gestione soci e collaboratori' },
  { nome: 'Attrezzature', href: '/anagrafiche/attrezzature', icon: Wrench, desc: 'Attrezzature, macchinari e materiali' },
  { nome: 'Categorie di Lavoro', href: '/anagrafiche/aree', icon: Grid3x3, desc: 'Agro, Api, Amministrazione, Commerciale, Mista' },
  { nome: 'Luoghi', href: '/anagrafiche/luoghi', icon: Building2, desc: 'Luoghi e sedi' },
  { nome: 'Sistemi di Irrigazione', href: '/anagrafiche/sistemi-irrigazione', icon: Droplets, desc: 'Gestione sistemi irrigui degli stacchi' },
  { nome: 'Porta Innesti', href: '/anagrafiche/porta-innesti', icon: TreePine, desc: 'Porta innesti usati negli stacchi produttivi' },
]

export default function AnagrafichePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Anagrafiche</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sezioni.map((s) => {
          const Icon = s.icon
          return (
            <Link key={s.nome} href={s.href}>
              <Card className="hover:shadow-md hover:border-primary-300 transition-all cursor-pointer h-full">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="rounded-lg bg-primary-50 p-3 text-primary-600">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{s.nome}</h3>
                    <p className="text-sm text-gray-500">{s.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
