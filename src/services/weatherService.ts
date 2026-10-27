import { getWeatherCondition } from '../lib/weatherCodes';
import type { City, CurrentWeather, ForecastDay, WeatherData } from '../types/weather';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const SEARCH_ERROR_MESSAGE = 'Não foi possível buscar cidades. Tente novamente.';
const INCOMPLETE_ERROR_MESSAGE = 'Resposta meteorológica incompleta.';

export class WeatherServiceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'WeatherServiceError';
  }
}

export async function fetchWithTimeout(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new WeatherServiceError(`Falha na requisição (HTTP ${response.status}).`);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof WeatherServiceError) throw error;
    if (isRecord(error) && error.name === 'AbortError') {
      throw new WeatherServiceError('A requisição demorou demais.', { cause: error });
    }
    if (error instanceof SyntaxError) {
      throw new WeatherServiceError('Resposta inválida do serviço.', { cause: error });
    }
    throw new WeatherServiceError('Falha de rede.', { cause: error });
  } finally {
    clearTimeout(timeout);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mapCity(value: unknown): City {
  if (
    !isRecord(value) ||
    typeof value.name !== 'string' ||
    !value.name.trim() ||
    typeof value.latitude !== 'number' ||
    !Number.isFinite(value.latitude) ||
    Math.abs(value.latitude) > 90 ||
    typeof value.longitude !== 'number' ||
    !Number.isFinite(value.longitude) ||
    Math.abs(value.longitude) > 180 ||
    (value.id !== undefined && (typeof value.id !== 'number' || !Number.isFinite(value.id))) ||
    ['admin1', 'country', 'country_code'].some(
      (key) => value[key] !== undefined && typeof value[key] !== 'string',
    )
  ) {
    throw new WeatherServiceError(SEARCH_ERROR_MESSAGE);
  }

  return {
    name: value.name,
    latitude: value.latitude,
    longitude: value.longitude,
    ...(typeof value.id === 'number' ? { id: value.id } : {}),
    ...(typeof value.admin1 === 'string' ? { region: value.admin1 } : {}),
    ...(typeof value.country === 'string' ? { country: value.country } : {}),
    ...(typeof value.country_code === 'string' ? { countryCode: value.country_code } : {}),
  };
}

export async function searchCities(name: string): Promise<City[]> {
  const query = name.trim();
  if (!query) return [];

  const data = await fetchWithTimeout(
    `${GEOCODING_URL}?name=${encodeURIComponent(query)}&count=10&language=pt&format=json`,
  );
  if (!isRecord(data) || data.error) {
    throw new WeatherServiceError(SEARCH_ERROR_MESSAGE);
  }
  if (data.results === undefined) return [];
  if (!Array.isArray(data.results)) {
    throw new WeatherServiceError(SEARCH_ERROR_MESSAGE);
  }

  return data.results.map(mapCity);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function mapCurrent(value: Record<string, unknown>, offset: unknown): CurrentWeather {
  if (
    !isFiniteNumber(value.temperature_2m) ||
    typeof value.time !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value.time) ||
    !isFiniteNumber(offset) ||
    !Number.isInteger(offset) ||
    Math.abs(offset) > 86_400
  ) {
    throw new WeatherServiceError(INCOMPLETE_ERROR_MESSAGE);
  }
  // Open-Meteo retorna o horário local sem offset no próprio campo time.
  const localTime = Date.parse(`${value.time}Z`);
  if (
    !Number.isFinite(localTime) ||
    new Date(localTime).toISOString().slice(0, value.time.length) !== value.time
  ) {
    throw new WeatherServiceError(INCOMPLETE_ERROR_MESSAGE);
  }
  const observedAt = localTime - offset * 1000;
  const weatherCode = isFiniteNumber(value.weather_code) ? value.weather_code : undefined;

  return {
    temperatureCelsius: value.temperature_2m,
    observedAt: new Date(observedAt).toISOString(),
    condition: getWeatherCondition(weatherCode)?.description ?? 'Condição indisponível',
    ...(weatherCode !== undefined ? { weatherCode } : {}),
    ...(isFiniteNumber(value.relative_humidity_2m)
      ? { humidityPercent: value.relative_humidity_2m }
      : {}),
    ...(isFiniteNumber(value.wind_speed_10m) ? { windSpeedKmh: value.wind_speed_10m } : {}),
    ...(isFiniteNumber(value.pressure_msl) ? { pressureHpa: value.pressure_msl } : {}),
    ...(isFiniteNumber(value.precipitation) ? { precipitationMm: value.precipitation } : {}),
  };
}

function mapForecast(daily: Record<string, unknown>): ForecastDay[] {
  const dates = daily.time;
  const minimums = daily.temperature_2m_min;
  const maximums = daily.temperature_2m_max;
  const codes = daily.weather_code;
  if (
    !Array.isArray(dates) ||
    dates.length < 5 ||
    !Array.isArray(minimums) ||
    !Array.isArray(maximums) ||
    !Array.isArray(codes)
  ) {
    throw new WeatherServiceError(INCOMPLETE_ERROR_MESSAGE);
  }

  return dates.slice(0, 5).map((date: unknown, index): ForecastDay => {
    const min: unknown = minimums[index];
    const max: unknown = maximums[index];
    const code: unknown = codes[index];
    const condition = isFiniteNumber(code) ? getWeatherCondition(code) : undefined;
    if (
      typeof date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date ||
      (index > 0 && Date.parse(date) - Date.parse(dates[index - 1]) !== 86_400_000) ||
      !isFiniteNumber(min) ||
      !isFiniteNumber(max) ||
      min > max ||
      !isFiniteNumber(code) ||
      !condition
    ) {
      throw new WeatherServiceError(INCOMPLETE_ERROR_MESSAGE);
    }
    const precipitation: unknown = Array.isArray(daily.precipitation_sum)
      ? daily.precipitation_sum[index]
      : undefined;
    const probability: unknown = Array.isArray(daily.precipitation_probability_max)
      ? daily.precipitation_probability_max[index]
      : undefined;
    return {
      date,
      minCelsius: min,
      maxCelsius: max,
      weatherCode: code,
      condition: condition.description,
      ...(isFiniteNumber(precipitation) ? { precipitationMm: precipitation } : {}),
      ...(isFiniteNumber(probability) ? { precipitationProbabilityPercent: probability } : {}),
    };
  });
}

export async function getWeather(city: City): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
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
  const data = await fetchWithTimeout(`${FORECAST_URL}?${params}`);
  if (
    !isRecord(data) ||
    data.error ||
    !isRecord(data.current) ||
    !isRecord(data.daily) ||
    typeof data.timezone !== 'string'
  ) {
    throw new WeatherServiceError(INCOMPLETE_ERROR_MESSAGE);
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: data.timezone });
  } catch (cause) {
    throw new WeatherServiceError(INCOMPLETE_ERROR_MESSAGE, { cause });
  }

  return {
    city,
    timezone: data.timezone,
    current: mapCurrent(data.current, data.utc_offset_seconds),
    forecast: mapForecast(data.daily),
    forecastIsIncomplete: false,
  };
}
