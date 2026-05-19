'use client'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div ref={ref} className={cn(
        'relative z-50 w-full sm:max-w-lg max-h-[90vh] overflow-auto bg-white shadow-2xl',
        'rounded-t-2xl sm:rounded-xl',
        'p-0 sm:p-0',
        'sm:mx-4',
        className
      )}>
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
