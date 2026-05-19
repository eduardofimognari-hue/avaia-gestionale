import { cn } from '@/lib/utils'
import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'

export function TableContainer({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('table-wrap', className)} {...props}><table className="w-full text-sm">{children}</table></div>
}

export function Table({ className, children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return <div className="table-wrap"><table className={cn('w-full text-sm', className)} {...props}>{children}</table></div>
}

export function Thead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('bg-gray-50 border-b', className)} {...props} />
}

export function Tbody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y', className)} {...props} />
}

export function Tr({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('hover:bg-gray-50 transition-colors', className)} {...props} />
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableHeaderCellElement>) {
  return <th className={cn('px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap', className)} {...props} />
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableDataCellElement>) {
  return <td className={cn('px-4 py-3 whitespace-nowrap', className)} {...props} />
}
