import { describe, expect, it } from 'vitest';
import { getForecastStart, parseForecastDate } from '../../src/lib/date';

describe('parseForecastDate', () => {
  it.each(['2028-02-29', '2026-12-31', '2027-01-01'])('aceita data válida %s', (date) => {
    expect(parseForecastDate(date)).toBe(Date.parse(`${date}T00:00:00Z`));
  });

  it.each([
    undefined,
    null,
    0,
    '',
    '2026-02-29',
    '2026-04-31',
    '2026-10-27T00:00:00Z',
  ])('rejeita data ausente ou inválida %j', (date) => {
    expect(parseForecastDate(date)).toBeNull();
  });
});

describe('getForecastStart', () => {
  it.each([
    ['America/Sao_Paulo', '2027-01-01T01:00:00Z', '2026-12-31'],
    ['Asia/Tokyo', '2026-12-31T23:00:00Z', '2027-01-01'],
    ['America/New_York', '2026-03-08T06:59:00Z', '2026-03-08'],
    ['America/New_York', '2026-03-08T07:01:00Z', '2026-03-08'],
    ['UTC', '2028-03-01T00:00:00Z', '2028-03-01'],
  ])('calcula o dia de %s no instante %s', (timezone, now, date) => {
    expect(getForecastStart(timezone, Date.parse(now))).toBe(Date.parse(date));
  });

  it.each([undefined, null, '', 'Fuso/Inválido', '+03:00'])('rejeita fuso %j', (timezone) => {
    expect(getForecastStart(timezone, Date.parse('2026-10-27T17:00:00Z'))).toBeNull();
  });
});
