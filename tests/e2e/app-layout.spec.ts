import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
});

for (const { width, columns } of [
  { width: 320, columns: 2 },
  { width: 768, columns: 3 },
  { width: 1440, columns: 5 },
]) {
  test(`layout com mock em ${width}px, sem overflow e com ${columns} colunas`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');

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

test('troca unidade e busca localmente mantendo a preferência, sem API', async ({ page }) => {
  const apiRequests: string[] = [];
  await page.route('https://**/*open-meteo.com/**', (route) => {
    apiRequests.push(route.request().url());
    return route.abort();
  });
  await page.goto('/');
  await page.getByRole('button', { name: '°F', exact: true }).focus();
  await page.keyboard.press('Enter');

  await expect(page.getByText('74,3 °F', { exact: true })).toBeVisible();
  await expect(page.getByRole('main').getByText(/°F$/)).toHaveCount(11);
  await page.getByRole('searchbox').fill('Recife');
  await page.getByRole('searchbox').press('Enter');
  await expect(page.getByRole('heading', { name: 'Nenhuma cidade encontrada.' })).toBeVisible();
  await expect(page.getByRole('list')).toHaveCount(0);
  await page.getByRole('searchbox').fill('sao paulo');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.getByText('74,3 °F', { exact: true })).toBeVisible();
  expect(apiRequests).toEqual([]);
});
