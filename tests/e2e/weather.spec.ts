import { expect, test } from '@playwright/test';
import { exampleForecastResponse, mockWeatherApi, searchExampleCity } from './weatherFixture';

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await mockWeatherApi(page);
});

test('busca cidade, mostra cinco dias e converte as temperaturas para Fahrenheit', async ({
  page,
}) => {
  await page.goto('/');
  await searchExampleCity(page);

  const current = page.getByRole('region', { name: 'Clima atual em São Paulo' });
  const forecast = page.getByRole('region', { name: 'Previsão de 5 dias' });
  await expect(current.getByRole('heading', { name: 'Clima atual em São Paulo' })).toBeVisible();
  await expect(current.getByText('23,5 °C', { exact: true })).toBeVisible();
  await expect(forecast).toBeVisible();
  await expect(forecast.getByRole('listitem')).toHaveCount(5);
  await expect(forecast.getByRole('heading', { level: 3 })).toHaveText([
    'ter., 27/10/2026',
    'qua., 28/10/2026',
    'qui., 29/10/2026',
    'sex., 30/10/2026',
    'sáb., 31/10/2026',
  ]);

  await page.getByRole('button', { name: '°F', exact: true }).click();

  await expect(page.getByRole('button', { name: '°F', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(current.getByText('74,3 °F', { exact: true })).toBeVisible();
  await expect(forecast.getByRole('definition')).toHaveText([
    '79,5 °F',
    '64,8 °F',
    '10%',
    '82,9 °F',
    '66,4 °F',
    '0%',
    '76,6 °F',
    '65,7 °F',
    '80%',
    '74,5 °F',
    '63,3 °F',
    '20%',
    '78,6 °F',
    '64,4 °F',
    '5%',
  ]);
});

test('valida entrada vazia ou só com espaços sem chamar geocoding', async ({ page }) => {
  const geocodingRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().startsWith('https://geocoding-api.open-meteo.com/')) {
      geocodingRequests.push(request.url());
    }
  });
  await page.goto('/');
  const input = page.getByRole('searchbox', { name: 'Nome da cidade' });

  for (const value of ['', '   ']) {
    await input.fill(value);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('alert')).toHaveText('Informe o nome de uma cidade.');
    await expect(page.getByRole('searchbox')).toBeFocused();
  }

  expect(geocodingRequests).toEqual([]);
});

test('mostra estado vazio quando o geocoding retorna results vazio', async ({ page }) => {
  const forecastRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().startsWith('https://api.open-meteo.com/')) {
      forecastRequests.push(request.url());
    }
  });
  await page.route('https://geocoding-api.open-meteo.com/**', (route) =>
    route.fulfill({ json: { results: [] } }),
  );
  await page.goto('/');
  await page.getByRole('searchbox', { name: 'Nome da cidade' }).fill('Cidade inexistente');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Nenhuma cidade encontrada.' })).toBeVisible();
  await expect(page.getByRole('status', { name: 'Resultado da busca' })).toContainText(
    'Nenhuma cidade encontrada.',
  );
  await expect(page.getByRole('main')).toBeFocused();
  await expect(page.getByRole('region', { name: 'Previsão de 5 dias' })).toHaveCount(0);
  expect(forecastRequests).toEqual([]);
});

test('preserva caracteres especiais como texto e envia a busca codificada', async ({ page }) => {
  const query = `São José-d'Oeste <img src=x onerror=alert(1)>`;
  let requestedName: string | null = null;
  await page.route('https://geocoding-api.open-meteo.com/**', (route) => {
    requestedName = new URL(route.request().url()).searchParams.get('name');
    return route.fulfill({
      json: {
        results: [
          {
            id: 1,
            name: query,
            latitude: -23.55,
            longitude: -46.63,
          },
        ],
      },
    });
  });
  await page.goto('/');
  await page.getByRole('searchbox').fill(` ${query} `);
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();

  await expect(page.getByRole('region', { name: `Clima atual em ${query}` })).toBeVisible();
  expect(requestedName).toBe(query);
  await expect(page.locator('img')).toHaveCount(0);
});

test('volta ao Celsius original e reinicia a unidade após recarregar a página', async ({
  page,
}) => {
  await page.goto('/');
  await searchExampleCity(page);
  const current = page.getByRole('region', { name: 'Clima atual em São Paulo' });
  const forecast = page.getByRole('region', { name: 'Previsão de 5 dias' });
  const original = await forecast.getByRole('definition').allTextContents();
  await page.getByRole('button', { name: '°F', exact: true }).click();
  await expect(current.getByText('74,3 °F', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '°C', exact: true }).click();
  await expect(current.getByText('23,5 °C', { exact: true })).toBeVisible();
  await expect(forecast.getByRole('definition')).toHaveText(original);
  await page.getByRole('button', { name: '°F', exact: true }).click();
  await expect(current.getByText('74,3 °F', { exact: true })).toBeVisible();

  await page.reload();

  await expect(page.getByRole('button', { name: '°C', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('region', { name: 'Clima atual em São Paulo' })).toHaveCount(0);
  await searchExampleCity(page);
  await expect(current.getByText('23,5 °C', { exact: true })).toBeVisible();
});

for (const section of ['current', 'daily'] as const) {
  test(`preserva a seção válida quando ${section} está ausente no forecast`, async ({ page }) => {
    const data: Record<string, unknown> = exampleForecastResponse();
    delete data[section];
    let forecastRequests = 0;
    await page.route('https://api.open-meteo.com/**', async (route) => {
      forecastRequests += 1;
      if (forecastRequests === 1) await route.fulfill({ json: data });
      else await route.fallback();
    });
    await page.goto('/');
    await page.getByRole('searchbox').fill('São Paulo');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();

    await expect(page.getByRole('alert')).toHaveText(
      section === 'current'
        ? 'Clima atual indisponível para esta cidade.'
        : 'Previsão indisponível para esta cidade.',
    );
    if (section === 'current') {
      await expect(page.getByRole('region', { name: 'Previsão de 5 dias' })).toBeVisible();
      await expect(page.getByRole('listitem')).toHaveCount(5);
    } else {
      await expect(page.getByText('23,5 °C', { exact: true })).toBeVisible();
      await expect(page.getByRole('listitem')).toHaveCount(0);
    }
    expect(forecastRequests).toBe(1);
    await page.getByRole('button', { name: 'Tentar novamente' }).click();
    await expect(page.getByText('23,5 °C', { exact: true })).toBeVisible();
    await expect(page.getByRole('listitem')).toHaveCount(5);
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(forecastRequests).toBe(2);
  });
}

test('exibe apenas dias válidos da resposta parcial e mantém o clima atual', async ({ page }) => {
  const data = exampleForecastResponse();
  data.daily.weather_code[1] = 999;
  data.daily.time[3] = data.daily.time[4];
  await page.route('https://api.open-meteo.com/**', (route) => route.fulfill({ json: data }));
  await page.goto('/');
  await searchExampleCity(page);

  await expect(page.getByText('23,5 °C', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Previsão incompleta. Alguns dias estão indisponíveis.'),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Previsão de 5 dias' }).getByRole('heading', { level: 3 }),
  ).toHaveText(['ter., 27/10/2026', 'qui., 29/10/2026']);
  await expect(page.getByRole('listitem')).toHaveCount(2);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('distingue cidades homônimas e consulta as coordenadas da opção selecionada', async ({
  page,
}) => {
  const coordinates: Array<[string | null, string | null]> = [];
  await page.route('https://geocoding-api.open-meteo.com/**', (route) =>
    route.fulfill({
      json: {
        results: [
          {
            id: 1,
            name: 'Santa Maria',
            admin1: 'Rio Grande do Sul',
            country: 'Brasil',
            latitude: -29.68,
            longitude: -53.81,
          },
          {
            id: 2,
            name: 'Santa Maria',
            admin1: 'Califórnia',
            country: 'Estados Unidos',
            latitude: 34.95,
            longitude: -120.44,
          },
        ],
      },
    }),
  );
  await page.route('https://api.open-meteo.com/**', (route) => {
    const params = new URL(route.request().url()).searchParams;
    coordinates.push([params.get('latitude'), params.get('longitude')]);
    const data = exampleForecastResponse();
    const isCalifornia = params.get('latitude') === '34.95';
    return route.fulfill({
      json: {
        ...data,
        timezone: isCalifornia ? 'America/Los_Angeles' : data.timezone,
        utc_offset_seconds: isCalifornia ? -25200 : data.utc_offset_seconds,
        current: {
          ...data.current,
          time: isCalifornia ? '2026-10-27T10:00' : data.current.time,
          temperature_2m: isCalifornia ? 10 : 23.5,
        },
      },
    });
  });
  await page.goto('/');
  await page.getByRole('searchbox').fill('Santa Maria');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  const options = page.getByRole('region', { name: 'Cidades encontradas' });
  await expect(
    options.getByRole('button', { name: 'Santa Maria, Rio Grande do Sul, Brasil', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('23,5 °C', { exact: true })).toBeVisible();
  await options
    .getByRole('button', { name: 'Santa Maria, Califórnia, Estados Unidos', exact: true })
    .click();

  const current = page.getByRole('region', { name: 'Clima atual em Santa Maria' });
  await expect(current.getByText('Califórnia, Estados Unidos', { exact: true })).toBeVisible();
  await expect(current.getByText('10,0 °C', { exact: true })).toBeVisible();
  await expect(current.getByText('23,5 °C', { exact: true })).toHaveCount(0);
  expect(coordinates).toEqual([
    ['-29.68', '-53.81'],
    ['34.95', '-120.44'],
  ]);
});

for (const failure of ['http', 'network', 'json', 'api'] as const) {
  test(`falha de geocoding (${failure}) mostra erro e retry manual recupera a busca`, async ({
    page,
  }) => {
    let searchRequests = 0;
    let forecastRequests = 0;
    page.on('request', (request) => {
      if (request.url().startsWith('https://api.open-meteo.com/')) forecastRequests += 1;
    });
    await page.route('https://geocoding-api.open-meteo.com/**', async (route) => {
      searchRequests += 1;
      if (searchRequests > 1) return route.fallback();
      if (failure === 'network') return route.abort('failed');
      if (failure === 'json') return route.fulfill({ body: '{', contentType: 'application/json' });
      return route.fulfill({
        status: failure === 'http' ? 429 : 200,
        json: { error: true },
      });
    });
    await page.goto('/');
    await page.getByRole('searchbox').fill('São Paulo');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();

    await expect(page.getByRole('alert')).toHaveText(
      'Não foi possível buscar cidades. Tente novamente.',
    );
    await expect(page.getByRole('heading', { name: 'Nenhuma cidade encontrada.' })).toHaveCount(0);
    expect(forecastRequests).toBe(0);
    expect(searchRequests).toBe(1);
    await page.getByRole('button', { name: 'Tentar novamente' }).click();
    await expect(page.getByText('23,5 °C', { exact: true })).toBeVisible();
    expect(searchRequests).toBe(2);
    expect(forecastRequests).toBe(1);
  });
}

for (const failure of ['api', 'json', 'incomplete'] as const) {
  test(`falha meteorológica (${failure}) não exibe dados e retry repete só o forecast`, async ({
    page,
  }) => {
    let searchRequests = 0;
    let forecastRequests = 0;
    page.on('request', (request) => {
      if (request.url().startsWith('https://geocoding-api.open-meteo.com/')) searchRequests += 1;
    });
    await page.route('https://api.open-meteo.com/**', async (route) => {
      forecastRequests += 1;
      if (forecastRequests > 1) return route.fallback();
      if (failure === 'json') return route.fulfill({ body: '{', contentType: 'application/json' });
      return route.fulfill({ json: failure === 'api' ? { error: true } : {} });
    });
    await page.goto('/');
    await page.getByRole('searchbox').fill('São Paulo');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();

    await expect(page.getByRole('alert')).toHaveText(
      'Não foi possível carregar os dados meteorológicos. Tente novamente.',
    );
    await expect(page.getByRole('listitem')).toHaveCount(0);
    await expect(page.getByText('23,5 °C', { exact: true })).toHaveCount(0);
    expect(searchRequests).toBe(1);
    expect(forecastRequests).toBe(1);
    await page.getByRole('button', { name: 'Tentar novamente' }).click();
    await expect(page.getByText('23,5 °C', { exact: true })).toBeVisible();
    await expect(page.getByRole('listitem')).toHaveCount(5);
    expect(searchRequests).toBe(1);
    expect(forecastRequests).toBe(2);
  });
}
