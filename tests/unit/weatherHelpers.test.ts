import { describe, expect, it } from 'vitest';
import { formatTemperature } from '../../src/lib/format';
import { convertTemperature } from '../../src/lib/temperature';

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
