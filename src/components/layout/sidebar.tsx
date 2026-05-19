'use client'
import { cn } from '@/lib/utils'
import { Package, Users, Euro, ShoppingCart, Warehouse, Hammer, PiggyBank, AlertTriangle, LayoutDashboard, LogOut, X, Menu, ArrowLeftRight, Receipt, Shield } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { AziendaSwitcher } from './azienda-switcher'

interface SidebarProps {
  ruolo?: string | null
}

const mainItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Vendite', icon: ShoppingCart, href: '/vendite' },
  { label: 'Anagrafiche', icon: Users, href: '/anagrafiche' },
  { label: 'Listino', icon: Euro, href: '/listino' },
]

const allItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Anagrafiche', icon: Users, href: '/anagrafiche' },
  { label: 'Listino Prezzi', icon: Euro, href: '/listino' },
  { label: 'Vendite', icon: ShoppingCart, href: '/vendite' },
  { label: 'Magazzino', icon: Warehouse, href: '/magazzino' },
  { label: 'Lavoro Soci', icon: Hammer, href: '/lavoro-soci' },
  { label: 'Cassa', icon: PiggyBank, href: '/cassa' },
  { label: 'Crediti / Debiti Soci', icon: ArrowLeftRight, href: '/movimenti-soci' },
  { label: 'Liquidazioni Soci', icon: Receipt, href: '/liquidazioni-soci' },
  { label: 'Debiti Clienti', icon: AlertTriangle, href: '/debiti' },
]

const adminItems = [
  { label: 'Utenti', icon: Shield, href: '/utenti' },
]

export function Sidebar({ ruolo }: SidebarProps) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const isAdmin = ruolo === 'admin'

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const visibleItems = isAdmin ? [...allItems, ...adminItems] : allItems

  return (
    <>
      {/* Bottom nav - mobile */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/80 backdrop-blur-lg border-t safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-1">
          <button onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full rounded-lg text-gray-500 active:text-primary-600 transition-colors">
            <Menu className="w-6 h-6" />
            <span className="text-[10px] font-medium">Menu</span>
          </button>
          {mainItems.map((item) => {
            const active = isActive(item.href)
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

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 bg-white/90 backdrop-blur-lg border-r shadow-sm flex-col">
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
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {visibleItems.map((item) => (
            <Link key={item.href} href={item.href}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive(item.href)
                  ? 'bg-primary-50 text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}>
              <item.icon className={cn('w-5 h-5', isActive(item.href) ? 'text-primary-500' : 'text-gray-400')} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100 space-y-1">
          {isAdmin && (
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary-600 bg-primary-50 rounded-lg text-center">
              Admin
            </div>
          )}
          <Link href="/api/auth/signout" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">
            <LogOut className="w-4 h-4" /> Esci
          </Link>
        </div>
      </aside>

      {/* Mobile drawer */}
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
              <div className="mt-2">
                <AziendaSwitcher />
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
              {visibleItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setDrawerOpen(false)}
                  className={cn('flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all',
                    isActive(item.href)
                      ? 'bg-primary-50 text-primary-700 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50'
                  )}>
                  <item.icon className={cn('w-5 h-5', isActive(item.href) ? 'text-primary-500' : 'text-gray-400')} />
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="p-3 border-t border-gray-100 space-y-1">
              {isAdmin && (
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary-600 bg-primary-50 rounded-lg text-center">
                  Admin
                </div>
              )}
              <Link href="/api/auth/signout" onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                <LogOut className="w-4 h-4" /> Esci
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="lg:hidden h-16" />
    </>
  )
}