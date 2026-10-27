import type { Unit } from '../types/weather';
import { parseForecastDate } from './date';
import { convertTemperature } from './temperature';

export function formatForecastDay(date: string, locale: string): string {
  const parsed = parseForecastDate(date);
  if (parsed === null) {
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
