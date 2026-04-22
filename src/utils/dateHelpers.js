import {
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  startOfYear, endOfYear,
  isWithinInterval, format, parseISO,
} from 'date-fns';

export function getDateRange(period, customStart, customEnd) {
  const now = new Date();
  switch (period) {
    case 'daily':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'weekly':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'monthly':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'yearly':
      return { start: startOfYear(now), end: endOfYear(now) };
    case 'custom':
      return {
        start: customStart ? startOfDay(new Date(customStart)) : startOfMonth(now),
        end: customEnd ? endOfDay(new Date(customEnd)) : endOfMonth(now),
      };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

export function filterByPeriod(transactions, period, customStart, customEnd) {
  const { start, end } = getDateRange(period, customStart, customEnd);
  return transactions.filter((t) => {
    const d = new Date(t.date);
    return isWithinInterval(d, { start, end });
  });
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr) {
  return format(parseISO(dateStr), 'dd MMM yyyy');
}

export function today() {
  return format(new Date(), 'yyyy-MM-dd');
}
