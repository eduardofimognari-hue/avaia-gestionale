'use client'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, Landmark, ShoppingCart, Euro, Receipt, Hammer, Sprout, Warehouse, MapPin, FileText, Shield, LogOut, X, Menu, BarChart3, Wallet, TrendingUp, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { AziendaSwitcher } from './azienda-switcher'

interface SidebarProps { ruolo?: string | null }

type NavItem = { label: string; icon: React.ComponentType<{ className?: string }>; href: string; color: string }

const groups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Generale',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', color: 'text-blue-600' },
      { label: 'Anagrafiche', icon: Users, href: '/anagrafiche', color: 'text-violet-600' },
    ],
  },
  {
    title: 'Contabilità',
    items: [
      { label: 'Movimenti', icon: Landmark, href: '/contabilita', color: 'text-emerald-600' },
      { label: 'Vendite', icon: ShoppingCart, href: '/vendite', color: 'text-sky-600' },
      { label: 'DDT / Fatture', icon: FileText, href: '/documenti', color: 'text-cyan-600' },
      { label: 'Listino Prezzi', icon: Euro, href: '/listino', color: 'text-amber-600' },
      { label: 'Liquidazioni Soci', icon: Receipt, href: '/liquidazioni-soci', color: 'text-rose-600' },
      { label: 'Crediti / Debiti Esterni', icon: Wallet, href: '/crediti-debiti', color: 'text-orange-600' },
      { label: 'Lavoro Soci', icon: Hammer, href: '/lavoro-soci', color: 'text-stone-600' },
    ],
  },
  {
    title: 'Produzione',
    items: [
      { label: 'Terreni', icon: MapPin, href: '/terreni', color: 'text-lime-600' },
      { label: 'Raccolta', icon: Sprout, href: '/raccolta', color: 'text-green-600' },
      { label: 'Magazzino', icon: Warehouse, href: '/magazzino', color: 'text-orange-600' },
    ],
  },
  {
    title: 'Pianificazione',
    items: [
      { label: 'Scenari', icon: TrendingUp, href: '/scenari', color: 'text-indigo-600' },
    ],
  },
  {
    title: 'Grafici e Statistiche',
    items: [
      { label: 'Statistiche', icon: BarChart3, href: '/statistiche', color: 'text-indigo-600' },
    ],
  },
  {
    title: 'Assistente AI',
    items: [
      { label: 'Assistente', icon: Sparkles, href: '/assistente', color: 'text-violet-600' },
    ],
  },
]

const mainItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', color: 'text-blue-600' },
  { label: 'Anagrafiche', icon: Users, href: '/anagrafiche', color: 'text-violet-600' },
  { label: 'Vendite', icon: ShoppingCart, href: '/vendite', color: 'text-sky-600' },
  { label: 'Movimenti', icon: Landmark, href: '/contabilita', color: 'text-emerald-600' },
]

const adminItems: NavItem[] = [{ label: 'Utenti', icon: Shield, href: '/utenti', color: 'text-gray-600' }]

function SidebarContent({ ruolo, pathname, onNavigate }: { ruolo?: string | null; pathname: string; onNavigate?: () => void }) {
  const isAdmin = ruolo === 'admin'

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <>
      <div className="p-5 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 tracking-tight">avaia</h1>
            <p className="text-[11px] text-gray-400 font-medium tracking-wide uppercase">Gestionale</p>
          </div>
        </Link>
        <AziendaSwitcher />
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">{group.title}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <Link key={item.href} href={item.href} onClick={onNavigate}
                  className={cn('flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all',
                    isActive(item.href)
                      ? 'bg-gray-100 text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}>
                  <item.icon className={cn('w-5 h-5', isActive(item.href) ? item.color : 'text-gray-400')} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
        {isAdmin && (
          <div>
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Amministrazione</p>
            <div className="space-y-0.5">
              {adminItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={onNavigate}
                  className={cn('flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all',
                    isActive(item.href)
                      ? 'bg-gray-100 text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}>
                  <item.icon className={cn('w-5 h-5', isActive(item.href) ? item.color : 'text-gray-400')} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
      <div className="p-3 border-t border-gray-100 space-y-1">
        {isAdmin && (
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary-600 bg-primary-50 rounded-lg text-center">Admin</div>
        )}
        <Link href="/api/auth/signout" onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">
          <LogOut className="w-4 h-4" /> Esci
        </Link>
      </div>
    </>
  )
}

export function Sidebar({ ruolo }: SidebarProps) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/80 backdrop-blur-lg border-t safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-1">
          <button onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full rounded-lg text-gray-500 active:text-primary-600 transition-colors">
            <Menu className="w-6 h-6" />
            <span className="text-[10px] font-medium">Menu</span>
          </button>
          {mainItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href}
                className={cn('flex flex-col items-center justify-center gap-0.5 flex-1 h-full rounded-lg transition-colors',
                  active ? 'text-primary-600' : 'text-gray-500'
                )}>
                <item.icon className="w-6 h-6" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 bg-white/90 backdrop-blur-lg border-r shadow-sm flex-col">
        <SidebarContent ruolo={ruolo} pathname={pathname} />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-2xl flex flex-col animate-slide-in">
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-lg">A</span>
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-gray-900 tracking-tight">avaia</h1>
                    <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Gestionale</p>
                  </div>
                </div>
                <button onClick={() => setDrawerOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="mt-2"><AziendaSwitcher /></div>
            </div>
            <SidebarContent ruolo={ruolo} pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:hidden h-16" />
    </>
  )
}