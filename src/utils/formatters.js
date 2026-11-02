import dayjs from 'dayjs'

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export function formatMoney(amount) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return '—'
  }
  return inrFormatter.format(Number(amount))
}

export function formatTableDate(value) {
  if (!value) return '—'
  const parsed = dayjs(value)
  if (!parsed.isValid()) return String(value)
  return parsed.format('DD MMM HH:mm')
}

export function formatTimelineDate(value) {
  if (!value) return '—'
  const parsed = dayjs(value)
  if (!parsed.isValid()) return String(value)
  return parsed.format('D MMM')
}

export function formatTimeNow() {
  return dayjs().format('HH:mm')
}
