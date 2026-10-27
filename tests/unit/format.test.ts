import { describe, expect, it } from 'vitest';
import { formatForecastDay, formatTemperature } from '../../src/lib/format';

describe('formatForecastDay', () => {
  it.each([
    ['2026-10-27', 'ter., 27/10/2026'],
    ['2026-10-28', 'qua., 28/10/2026'],
    ['2026-10-29', 'qui., 29/10/2026'],
    ['2026-11-01', 'dom., 01/11/2026'],
    ['2028-02-29', 'ter., 29/02/2028'],
  ])('formata %s com dia da semana e data em pt-BR', (date, expected) => {
    expect(formatForecastDay(date, 'pt-BR')).toBe(expected);
  });

  it('respeita a localidade informada', () => {
    expect(formatForecastDay('2026-10-27', 'en-US')).toBe('Tue, 10/27/2026');
  });

  it.each([
    '',
    'inválido',
    '27/10/2026',
    '2026-1-01',
    '2026-10-27T00:00:00Z',
    '2026-02-29',
    '2026-02-30',
    '2026-13-01',
  ])('rejeita data inválida %j com RangeError', (date) => {
    expect(() => formatForecastDay(date, 'pt-BR')).toThrow(RangeError);
  });
});

describe('formatTemperature', () => {
  it.each([NaN, Infinity, -Infinity])('não exibe temperatura não finita (%s)', (value) => {
    expect(formatTemperature(value, 'celsius', 'pt-BR')).toBe('Indisponível');
    expect(formatTemperature(value, 'fahrenheit', 'pt-BR')).toBe('Indisponível');
  });
});
