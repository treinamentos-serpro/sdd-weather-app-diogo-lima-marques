import { describe, expect, it } from 'vitest';
import { getWeatherCondition } from '../../src/lib/weatherCodes';

describe('getWeatherCondition', () => {
  it.each([
    [0, 'Céu limpo', '☀️'],
    [1, 'Predominantemente limpo', '🌤️'],
    [2, 'Parcialmente nublado', '⛅'],
    [3, 'Encoberto', '☁️'],
    [45, 'Nevoeiro', '🌫️'],
    [48, 'Nevoeiro com geada', '🌫️'],
    [51, 'Garoa leve', '🌦️'],
    [53, 'Garoa moderada', '🌦️'],
    [55, 'Garoa intensa', '🌧️'],
    [56, 'Garoa congelante leve', '🌧️'],
    [57, 'Garoa congelante intensa', '🌧️'],
    [61, 'Chuva leve', '🌧️'],
    [63, 'Chuva moderada', '🌧️'],
    [65, 'Chuva intensa', '🌧️'],
    [66, 'Chuva congelante leve', '🌧️'],
    [67, 'Chuva congelante intensa', '🌧️'],
    [71, 'Neve leve', '🌨️'],
    [73, 'Neve moderada', '🌨️'],
    [75, 'Neve intensa', '🌨️'],
    [77, 'Grãos de neve', '🌨️'],
    [80, 'Pancadas de chuva leves', '🌦️'],
    [81, 'Pancadas de chuva moderadas', '🌧️'],
    [82, 'Pancadas de chuva violentas', '🌧️'],
    [85, 'Pancadas de neve leves', '🌨️'],
    [86, 'Pancadas de neve intensas', '🌨️'],
    [95, 'Trovoada', '⛈️'],
    [96, 'Trovoada com granizo leve', '⛈️'],
    [99, 'Trovoada com granizo intenso', '⛈️'],
  ] as const)('mapeia o código %s para %s e seu ícone', (code, description, icon) => {
    expect(getWeatherCondition(code)).toEqual({ description, icon });
  });

  it.each([
    undefined,
    -1,
    4,
    999,
    NaN,
  ])('retorna undefined para código ausente ou desconhecido: %s', (code) => {
    expect(getWeatherCondition(code)).toBeUndefined();
  });
});
