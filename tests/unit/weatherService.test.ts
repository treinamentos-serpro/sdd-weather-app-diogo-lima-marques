import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchWithTimeout,
  getWeather,
  searchCities,
  WeatherServiceError,
} from '../../src/services/weatherService';
import type { City } from '../../src/types/weather';

const cityResult = {
  id: 3448439,
  name: 'São Paulo',
  latitude: -23.5475,
  longitude: -46.6361,
  admin1: 'São Paulo',
  country: 'Brasil',
  country_code: 'BR',
};

function mockResponse(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(Response.json(body, { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('searchCities', () => {
  it.each(['', '   ', '\t\n'])('não chama a rede para entrada vazia %j', async (name) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(searchCities(name)).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('codifica o nome aparado e envia os parâmetros de geocodificação', async () => {
    const fetchMock = mockResponse({});
    const name = "São José-d'Oeste & região";

    await searchCities(`  ${name}  `);

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=10&language=pt&format=json`,
      { signal: expect.any(AbortSignal) },
    );
  });

  it('mapeia todos os resultados para City sem inventar campos opcionais', async () => {
    mockResponse({
      results: [cityResult, { name: 'Outra cidade', latitude: 0, longitude: 0, population: 123 }],
    });

    await expect(searchCities('São Paulo')).resolves.toEqual([
      {
        id: 3448439,
        name: 'São Paulo',
        latitude: -23.5475,
        longitude: -46.6361,
        region: 'São Paulo',
        country: 'Brasil',
        countryCode: 'BR',
      },
      { name: 'Outra cidade', latitude: 0, longitude: 0 },
    ]);
  });

  it.each([{}, { results: [] }])('retorna lista vazia para resposta válida %j', async (body) => {
    mockResponse(body);

    await expect(searchCities('Cidade')).resolves.toEqual([]);
  });

  it.each([400, 429, 500])('lança WeatherServiceError para HTTP %i', async (status) => {
    const json = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status, json }));

    await expect(searchCities('Cidade')).rejects.toBeInstanceOf(WeatherServiceError);
    expect(json).not.toHaveBeenCalled();
  });

  it.each([
    null,
    [],
    { error: true, reason: 'Falha' },
    { results: null },
    { results: {} },
    { results: [null] },
    { results: [{ ...cityResult, latitude: '23' }] },
    { results: [{ ...cityResult, longitude: 181 }] },
    { results: [{ ...cityResult, name: '' }] },
    { results: [{ ...cityResult, country: 123 }] },
  ])('não trata resposta inválida como busca sem resultados: %j', async (body) => {
    mockResponse(body);

    await expect(searchCities('Cidade')).rejects.toBeInstanceOf(WeatherServiceError);
  });

  it('preserva a causa de falhas de rede', async () => {
    const cause = new TypeError('Falha de rede');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(cause));

    await expect(searchCities('Cidade')).rejects.toMatchObject({
      name: 'WeatherServiceError',
      message: 'Falha de rede.',
      cause,
    });
  });

  it('lança WeatherServiceError para JSON inválido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{')));

    await expect(searchCities('Cidade')).rejects.toBeInstanceOf(WeatherServiceError);
  });

  it('aborta a requisição após dez segundos e libera o timer', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, { signal }: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            signal?.addEventListener('abort', () => reject(signal.reason));
          }),
      ),
    );

    const result = expect(searchCities('Cidade')).rejects.toBeInstanceOf(WeatherServiceError);
    await vi.advanceTimersByTimeAsync(10_000);
    await result;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('libera o timer quando a requisição termina antes do timeout', async () => {
    vi.useFakeTimers();
    mockResponse({});

    await searchCities('Cidade');

    expect(vi.getTimerCount()).toBe(0);
  });
});

const city: City = { name: 'São Paulo', latitude: -23.5475, longitude: -46.6361 };

function forecastResponse() {
  return {
    timezone: 'America/Sao_Paulo',
    utc_offset_seconds: -10800,
    current: {
      time: '2026-10-27T14:00',
      temperature_2m: 22.5,
      weather_code: 3,
      relative_humidity_2m: 72,
      wind_speed_10m: 12.6,
      pressure_msl: 1014.2,
      precipitation: 0,
    },
    daily: {
      time: ['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31'],
      temperature_2m_min: [15, 16, 17, 18, 19],
      temperature_2m_max: [25, 26, 27, 28, 29],
      weather_code: [0, 1, 2, 3, 61],
      precipitation_sum: [0, 0.1, 0.2, 0.3, 4.7],
      precipitation_probability_max: [0, 10, 20, 30, 80],
    },
  };
}

describe('getWeather', () => {
  it('consulta current e daily juntos nas coordenadas da cidade e nas unidades canônicas', async () => {
    const fetchMock = mockResponse(forecastResponse());

    await getWeather(city);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(`${url.origin}${url.pathname}`).toBe('https://api.open-meteo.com/v1/forecast');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      latitude: '-23.5475',
      longitude: '-46.6361',
      current:
        'temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,pressure_msl,precipitation',
      daily:
        'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max',
      temperature_unit: 'celsius',
      wind_speed_unit: 'kmh',
      precipitation_unit: 'mm',
      timezone: 'auto',
      forecast_days: '5',
    });
  });

  it('mapeia current e associa os arrays de daily pelo índice em exatamente cinco dias', async () => {
    mockResponse(forecastResponse());

    const result = await getWeather(city);

    expect(result.city).toBe(city);
    expect(result.timezone).toBe('America/Sao_Paulo');
    expect(result.forecastIsIncomplete).toBe(false);
    expect(result.current).toEqual({
      observedAt: '2026-10-27T17:00:00.000Z',
      temperatureCelsius: 22.5,
      weatherCode: 3,
      condition: 'Encoberto',
      humidityPercent: 72,
      windSpeedKmh: 12.6,
      pressureHpa: 1014.2,
      precipitationMm: 0,
    });
    expect(result.forecast).toEqual(
      [
        'Céu limpo',
        'Predominantemente limpo',
        'Parcialmente nublado',
        'Encoberto',
        'Chuva leve',
      ].map((condition, index) => ({
        date: forecastResponse().daily.time[index],
        minCelsius: 15 + index,
        maxCelsius: 25 + index,
        weatherCode: [0, 1, 2, 3, 61][index],
        condition,
        precipitationMm: [0, 0.1, 0.2, 0.3, 4.7][index],
        precipitationProbabilityPercent: [0, 10, 20, 30, 80][index],
      })),
    );
    expect(result.forecast).toHaveLength(5);
  });

  it('limita a cinco dias mesmo quando a API retorna mais itens', async () => {
    const data = forecastResponse();
    data.daily.time.push('2026-11-01');
    data.daily.temperature_2m_min.push(20);
    data.daily.temperature_2m_max.push(30);
    data.daily.weather_code.push(0);
    mockResponse(data);

    expect((await getWeather(city)).forecast).toHaveLength(5);
  });

  it('não inventa medições opcionais e usa fallback para código atual desconhecido', async () => {
    const data = forecastResponse();
    mockResponse({
      ...data,
      current: { time: data.current.time, temperature_2m: 0, weather_code: 999 },
      daily: {
        time: data.daily.time,
        temperature_2m_min: data.daily.temperature_2m_min,
        temperature_2m_max: data.daily.temperature_2m_max,
        weather_code: data.daily.weather_code,
      },
    });

    const result = await getWeather(city);

    expect(result.current).toEqual({
      observedAt: '2026-10-27T17:00:00.000Z',
      temperatureCelsius: 0,
      weatherCode: 999,
      condition: 'Condição indisponível',
    });
    expect(result.forecast[0]).not.toHaveProperty('precipitationMm');
    expect(result.forecast[0]).not.toHaveProperty('precipitationProbabilityPercent');
  });

  it.each(['current', 'daily'])('rejeita resposta sem %s', async (section) => {
    const data: Record<string, unknown> = forecastResponse();
    delete data[section];
    mockResponse(data);

    await expect(getWeather(city)).rejects.toMatchObject({
      name: 'WeatherServiceError',
      message: 'Resposta meteorológica incompleta.',
    });
  });

  it.each([
    { current: null },
    { daily: null },
    { current: {} },
    { daily: {} },
    { timezone: 'Fuso/Inválido' },
    { utc_offset_seconds: null },
    { current: { time: 'inválido', temperature_2m: 20 } },
    { current: { time: '2026-02-30T14:00', temperature_2m: 20 } },
    { current: { time: '2026-10-27T14:00', temperature_2m: null } },
    { daily: { ...forecastResponse().daily, time: ['2026-10-27'] } },
    { daily: { ...forecastResponse().daily, temperature_2m_min: [15] } },
    { daily: { ...forecastResponse().daily, weather_code: [999, 1, 2, 3, 61] } },
    { daily: { ...forecastResponse().daily, temperature_2m_max: [0, 26, 27, 28, 29] } },
    { daily: { ...forecastResponse().daily, time: Array(5).fill('2026-10-27') } },
    { error: true },
  ])('rejeita resposta incompleta ou inválida: %j', async (override) => {
    mockResponse({ ...forecastResponse(), ...override });

    await expect(getWeather(city)).rejects.toBeInstanceOf(WeatherServiceError);
  });

  it('rejeita falha HTTP em vez de mapear os dados', async () => {
    mockResponse(forecastResponse(), 503);

    await expect(getWeather(city)).rejects.toBeInstanceOf(WeatherServiceError);
  });
});

describe('fetchWithTimeout', () => {
  it.each([
    searchCities.bind(null, 'Cidade'),
    getWeather.bind(null, city),
  ])('usa a mensagem de rede em ambas as operações', async (operation) => {
    const cause = new TypeError('Offline');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(cause));

    await expect(operation()).rejects.toMatchObject({
      name: 'WeatherServiceError',
      message: 'Falha de rede.',
      cause,
    });
  });

  it.each([
    searchCities.bind(null, 'Cidade'),
    getWeather.bind(null, city),
  ])('usa a mensagem de timeout em ambas as operações', async (operation) => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, { signal }: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            signal?.addEventListener('abort', () => reject(signal.reason));
          }),
      ),
    );

    const result = expect(operation()).rejects.toMatchObject({
      name: 'WeatherServiceError',
      message: 'A requisição demorou demais.',
    });
    await vi.advanceTimersByTimeAsync(9_999);
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    await result;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('converte AbortError em WeatherServiceError preservando a causa', async () => {
    const cause = new DOMException('Aborted', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(cause));

    await expect(fetchWithTimeout('https://example.test')).rejects.toMatchObject({
      name: 'WeatherServiceError',
      message: 'A requisição demorou demais.',
      cause,
    });
  });

  it('mantém o timeout ativo durante a leitura do corpo', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, { signal }: RequestInit) => ({
        ok: true,
        json: () =>
          new Promise((_resolve, reject) => {
            signal?.addEventListener('abort', () => reject(signal.reason));
          }),
      })),
    );

    const result = expect(fetchWithTimeout('https://example.test')).rejects.toThrow(
      'A requisição demorou demais.',
    );
    await vi.advanceTimersByTimeAsync(10_000);
    await result;
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['network', 'http', 'json', 'success'])('libera o timer após %s', async (scenario) => {
    vi.useFakeTimers();
    if (scenario === 'network') {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Offline')));
    } else if (scenario === 'json') {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{')));
    } else {
      mockResponse({}, scenario === 'http' ? 500 : 200);
    }

    const result = fetchWithTimeout('https://example.test');
    if (scenario === 'success') {
      await expect(result).resolves.toEqual({});
    } else {
      await expect(result).rejects.toMatchObject({
        name: 'WeatherServiceError',
        message:
          scenario === 'network'
            ? 'Falha de rede.'
            : scenario === 'json'
              ? 'Resposta inválida do serviço.'
              : 'Falha na requisição (HTTP 500).',
      });
    }
    expect(vi.getTimerCount()).toBe(0);
  });
});
