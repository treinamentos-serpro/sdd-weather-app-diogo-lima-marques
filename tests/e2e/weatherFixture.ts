import type { Page } from '@playwright/test';
import { mockWeatherData } from '../../src/mocks/weather';

export function exampleForecastResponse() {
  const { current, forecast, timezone } = mockWeatherData;
  return {
    timezone,
    utc_offset_seconds: -10800,
    current: {
      time: '2026-10-27T14:00',
      temperature_2m: current.temperatureCelsius,
      weather_code: current.weatherCode,
      relative_humidity_2m: current.humidityPercent,
      wind_speed_10m: current.windSpeedKmh,
      pressure_msl: current.pressureHpa,
      precipitation: current.precipitationMm,
    },
    daily: {
      time: forecast.map((day) => day.date),
      temperature_2m_min: forecast.map((day) => day.minCelsius),
      temperature_2m_max: forecast.map((day) => day.maxCelsius),
      weather_code: forecast.map((day) => day.weatherCode),
      precipitation_sum: forecast.map((day) => day.precipitationMm),
      precipitation_probability_max: forecast.map((day) => day.precipitationProbabilityPercent),
    },
  };
}

export async function mockWeatherApi(page: Page) {
  await page.clock.setFixedTime(new Date('2026-10-27T17:00:00Z'));
  const { city } = mockWeatherData;
  await page.route('https://geocoding-api.open-meteo.com/**', (route) => {
    const name = new URL(route.request().url()).searchParams.get('name');
    return route.fulfill({
      json: {
        results:
          name === 'Recife'
            ? []
            : [
                {
                  ...city,
                  admin1: city.region,
                  country_code: city.countryCode,
                },
              ],
      },
    });
  });
  await page.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({
      json: exampleForecastResponse(),
    }),
  );
}

export async function searchExampleCity(page: Page) {
  await page.getByRole('searchbox').fill('São Paulo');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await page.getByRole('region', { name: 'Clima atual em São Paulo' }).waitFor();
}
