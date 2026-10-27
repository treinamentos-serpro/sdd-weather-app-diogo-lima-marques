import type { Unit } from '../types/weather';
import { convertTemperature } from './temperature';

export function formatForecastDay(date: string, locale: string): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new RangeError(`Data de previsão inválida: ${date}`);
  }

  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

export function formatTemperature(celsius: number, unit: Unit, locale: string): string {
  const temperature = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(convertTemperature(celsius, unit));

  return `${temperature} ${unit === 'fahrenheit' ? '°F' : '°C'}`;
}
