import { describe, expect, it } from 'vitest';
import { formatTemperature } from '../../src/lib/format';
import { convertTemperature } from '../../src/lib/temperature';

describe('conversão de temperatura', () => {
  it.each([
    [-40, -40],
    [0, 32],
    [18, 64.4],
    [100, 212],
  ])('converte %s °C para %s °F', (celsius, fahrenheit) => {
    expect(convertTemperature(celsius, 'fahrenheit')).toBeCloseTo(fahrenheit);
  });

  it.each([-40, 0, 18.123, 100])('preserva %s °C na unidade Celsius', (celsius) => {
    expect(convertTemperature(celsius, 'celsius')).toBe(celsius);
  });
});

describe('formatação da temperatura', () => {
  it.each([
    [18.123, 'celsius', '18,1 °C'],
    [18.123, 'fahrenheit', '64,6 °F'],
    [-40, 'fahrenheit', '-40,0 °F'],
  ] as const)('arredonda e exibe a unidade em %s °C (%s)', (celsius, unit, expected) => {
    expect(formatTemperature(celsius, unit, 'pt-BR')).toBe(expected);
  });
});
