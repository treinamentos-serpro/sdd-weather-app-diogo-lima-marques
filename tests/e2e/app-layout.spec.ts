import { expect, test } from '@playwright/test';
import { mockWeatherApi, searchExampleCity } from './weatherFixture';

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await mockWeatherApi(page);
});

for (const { width, columns } of [
  { width: 768, columns: 3 },
  { width: 1440, columns: 5 },
]) {
  test(`layout integrado em ${width}px, sem overflow e com ${columns} colunas`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await searchExampleCity(page);

    await expect(page.getByRole('heading', { level: 1, name: 'WeatherView' })).toBeVisible();
    await expect(page.getByText('23,5 °C', { exact: true })).toBeVisible();
    await expect(page.getByRole('listitem')).toHaveCount(5);
    await expect(page.getByRole('searchbox')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Weather data by Open-Meteo.com' })).toBeVisible();
    const gridColumns = await page
      .getByRole('list')
      .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
    expect(gridColumns).toBe(columns);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expect(
      await page.locator('body').evaluate((body) => getComputedStyle(body).backgroundColor),
    ).toBe('rgb(11, 16, 32)');
    expect(errors).toEqual([]);
  });
}

test('troca unidade e busca mantendo a preferência, sem requisição extra ao converter', async ({
  page,
}) => {
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('open-meteo.com')) apiRequests.push(request.url());
  });
  await page.goto('/');
  await searchExampleCity(page);
  expect(apiRequests).toHaveLength(2);
  await page.getByRole('button', { name: '°F', exact: true }).focus();
  await page.keyboard.press('Enter');

  await expect(page.getByText('74,3 °F', { exact: true })).toBeVisible();
  await expect(page.getByRole('main').getByText(/°F$/)).toHaveCount(11);
  expect(apiRequests).toHaveLength(2);
  await page.getByRole('searchbox').fill('Recife');
  await page.getByRole('searchbox').press('Enter');
  await expect(page.getByRole('heading', { name: 'Nenhuma cidade encontrada.' })).toBeVisible();
  await expect(page.getByRole('list')).toHaveCount(0);
  await page.getByRole('searchbox').fill('sao paulo');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.getByText('74,3 °F', { exact: true })).toBeVisible();
  expect(apiRequests).toHaveLength(5);
});

test('erro de forecast oferece retry sem repetir geocoding', async ({ page }) => {
  let forecastRequests = 0;
  let searchRequests = 0;
  page.on('request', (request) => {
    if (request.url().includes('geocoding-api.open-meteo.com')) searchRequests += 1;
  });
  await page.route('https://api.open-meteo.com/**', async (route) => {
    forecastRequests += 1;
    if (forecastRequests === 1) await route.fulfill({ status: 503, json: {} });
    else await route.fallback();
  });
  await page.goto('/');
  await page.getByRole('searchbox').fill('São Paulo');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Não foi possível carregar os dados meteorológicos. Tente novamente.',
  );
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByText('23,5 °C', { exact: true })).toBeVisible();
  expect(searchRequests).toBe(1);
  expect(forecastRequests).toBe(2);
});
