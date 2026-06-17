export type ColumnDef = {
  key: string
  label: string
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return ''
  return value.toFixed(decimals).replace('.', ',')
}

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes(';')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function toCSV(rows: Record<string, unknown>[], columns: ColumnDef[]): string {
  const header = columns.map((c) => escapeCSV(c.label)).join(';')
  const body = rows.map((row) =>
    columns.map((c) => escapeCSV(row[c.key])).join(';')
  ).join('\n')
  return `﻿${header}\n${body}`
}

export function toJSON(rows: Record<string, unknown>[]): string {
  return JSON.stringify(rows, null, 2)
}
