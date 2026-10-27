import { describe, expect, it } from 'vitest';
import { formatTemperature } from '../../src/lib/format';
import { convertTemperature } from '../../src/lib/temperature';
import { getWeatherCondition } from '../../src/lib/weatherCodes';

describe('temperatura', () => {
  it.each([
    [-40, -40],
    [0, 32],
    [18, 64.4],
    [100, 212],
  ])('converte %s °C para %s °F', (celsius, fahrenheit) => {
    expect(convertTemperature(celsius, 'fahrenheit')).toBeCloseTo(fahrenheit);
    expect(convertTemperature(celsius, 'celsius')).toBe(celsius);
  });

  it('não arredonda antes da apresentação', () => {
    expect(convertTemperature(18.123, 'fahrenheit')).toBeCloseTo(64.6214);
    expect(convertTemperature(18.123, 'celsius')).toBe(18.123);
    expect(formatTemperature(18.123, 'fahrenheit', 'pt-BR')).toBe('64,6 °F');
    expect(formatTemperature(18, 'celsius', 'pt-BR')).toBe('18,0 °C');
    expect(formatTemperature(-2.5, 'celsius', 'pt-BR')).toBe('-2,5 °C');
    expect(formatTemperature(18, 'celsius', 'en-US')).toBe('18.0 °C');
  });
});

describe('códigos WMO', () => {
  it.each([
    0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86,
    95, 96, 99,
  ])('mapeia código %s para descrição e ícone', (code) => {
    expect(getWeatherCondition(code)?.description).toBeTruthy();
    expect(getWeatherCondition(code)?.icon).toBeTruthy();
  });

  it.each([undefined, -1, 4, 999, NaN])('não inventa condição para código %s', (code) => {
    expect(getWeatherCondition(code)).toBeUndefined();
  });
});
