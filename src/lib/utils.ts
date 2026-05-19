import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatEuro(importo: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(importo)
}

export function formatDate(data: Date | string): string {
  return new Intl.DateTimeFormat('it-IT').format(new Date(data))
}

export function formatNumber(n: number, digits = 2): string {
  return new Intl.NumberFormat('it-IT', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n)
}
