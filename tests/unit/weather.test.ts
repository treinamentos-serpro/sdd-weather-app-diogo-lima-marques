import { describe, expect, it } from 'vitest';
import { mockWeatherData } from '../../src/mocks/weather';

describe('mockWeatherData', () => {
  it('associa a cidade e a observação ao mesmo fuso e dia local', () => {
    const { city, timezone, current, forecast } = mockWeatherData;
    const observedAt = new Date(current.observedAt);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(observedAt);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((value) => value.type === type)?.value;

    expect(city.name).toBe('São Paulo');
    expect(city.latitude).toBeGreaterThanOrEqual(-90);
    expect(city.latitude).toBeLessThanOrEqual(90);
    expect(city.longitude).toBeGreaterThanOrEqual(-180);
    expect(city.longitude).toBeLessThanOrEqual(180);
    expect(Number.isFinite(current.temperatureCelsius)).toBe(true);
    expect(forecast[0].date).toBe(`${part('year')}-${part('month')}-${part('day')}`);
  });

  it('contém exatamente cinco dias consecutivos e uma previsão completa', () => {
    const { forecast, forecastIsIncomplete } = mockWeatherData;

    expect(forecast).toHaveLength(5);
    expect(forecastIsIncomplete).toBe(false);
    expect(new Set(forecast.map((day) => day.date)).size).toBe(5);

    for (const [index, day] of forecast.entries()) {
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Date.parse(day.date) - Date.parse(forecast[0].date)).toBe(index * 86_400_000);
      expect(Number.isFinite(day.minCelsius)).toBe(true);
      expect(Number.isFinite(day.maxCelsius)).toBe(true);
      expect(day.minCelsius).toBeLessThanOrEqual(day.maxCelsius);
    }
  });

  it('usa descrições pt-BR coerentes com os códigos WMO de exemplo', () => {
    const conditions = new Map([
      [0, 'Céu limpo'],
      [1, 'Predominantemente limpo'],
      [2, 'Parcialmente nublado'],
      [3, 'Encoberto'],
      [61, 'Chuva leve'],
    ]);

    for (const weather of [mockWeatherData.current, ...mockWeatherData.forecast]) {
      expect(weather.weatherCode).toBeDefined();
      expect(conditions.get(weather.weatherCode ?? -1)).toBe(weather.condition);
      expect(weather.precipitationMm).toBeGreaterThanOrEqual(0);
    }
  });
});
