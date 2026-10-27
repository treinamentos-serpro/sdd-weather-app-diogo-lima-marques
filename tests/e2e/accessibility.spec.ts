import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await page.goto('/');
});

test('ordem de Tab, skip link e foco visível no destino', async ({ page }) => {
  const skipLink = page.getByRole('link', { name: 'Ir para o conteúdo' });
  await page.keyboard.press('Tab');
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeInViewport();
  await page.keyboard.press('Enter');
  const main = page.getByRole('main');
  await expect(main).toBeFocused();
  expect(
    await main.evaluate((element) => {
      const style = getComputedStyle(element);
      return style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) >= 2;
    }),
  ).toBe(true);

  await page.goto('/');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('searchbox', { name: 'Nome da cidade' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Buscar', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: '°C', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: '°F', exact: true })).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: '°F', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('erro de entrada recebe foco e resultados atualizam a região de anúncio', async ({ page }) => {
  const input = page.getByRole('searchbox');
  const announcement = page.getByRole('status', { name: 'Resultado da busca' });
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(input).toHaveAccessibleDescription('Informe o nome de uma cidade.');
  await input.fill('Recife');
  await input.press('Enter');
  await expect(announcement).toContainText('Nenhuma cidade encontrada.');
  await expect(input).toBeFocused();
  await input.fill('São Paulo');
  await input.press('Enter');
  await expect(announcement).toHaveText('Clima e previsão de São Paulo disponíveis.');
  await expect(input).toBeFocused();
});

for (const width of [320, 375, 640, 768, 1024, 1440]) {
  test(`texto a 200% e conteúdo longo não transbordam em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
      const heading = document.querySelector('main h2');
      if (!heading) throw new Error('Título do clima atual não encontrado.');
      heading.textContent = `Clima atual em ${'CidadeMuitoLonga'.repeat(5)}`;
      for (const metric of document.querySelectorAll('main section:first-of-type dd')) {
        metric.textContent = 'Indisponível';
      }
    });

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const overflows = await page
      .locator('main')
      .evaluate((main) =>
        [main, ...main.querySelectorAll('*')]
          .filter(
            (element) =>
              getComputedStyle(element).clip !== 'rect(0px, 0px, 0px, 0px)' &&
              element.clientWidth > 0 &&
              element.scrollWidth > element.clientWidth + 1,
          )
          .map((element) => element.tagName),
      );
    expect(overflows).toEqual([]);
    await expect(page.getByRole('button', { name: 'Buscar', exact: true })).toBeVisible();
    await expect(page.getByRole('listitem')).toHaveCount(5);
  });
}

test('contraste de texto, borda do input e indicador de foco atende aos limiares AA', async ({
  page,
}) => {
  const input = page.getByRole('searchbox');
  await input.focus();
  const ratios = await input.evaluate((element) => {
    type Color = number[];
    const parse = (css: string): Color => {
      const channels = css.match(/[\d.]+/g)?.map(Number);
      if (!channels || channels.length < 3) throw new Error(`Cor não suportada: ${css}`);
      return channels;
    };
    const blend = (foreground: Color, background: Color): Color =>
      foreground
        .slice(0, 3)
        .map(
          (channel, index) =>
            channel * (foreground[3] ?? 1) + background[index] * (1 - (foreground[3] ?? 1)),
        );
    const luminance = (color: Color): number =>
      color.slice(0, 3).reduce((total, channel, index) => {
        const value = channel / 255;
        const linear = value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        return total + linear * [0.2126, 0.7152, 0.0722][index];
      }, 0);
    const contrast = (a: Color, b: Color): number => {
      const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (values[0] + 0.05) / (values[1] + 0.05);
    };
    const background = (target: Element | null): Color => {
      const ancestors: Element[] = [];
      for (let node = target; node; node = node.parentElement) ancestors.unshift(node);
      // O tom mais claro do gradiente dá o cenário conservador para os fundos translúcidos.
      return ancestors.reduce(
        (color, node) => blend(parse(getComputedStyle(node).backgroundColor), color),
        [17, 22, 42],
      );
    };
    const style = getComputedStyle(element);
    const inputBackground = background(element);
    const surrounding = background(element.parentElement);
    const border = blend(parse(style.borderTopColor), inputBackground);
    const focus = blend(parse(style.outlineColor), surrounding);
    const textRatios = [...document.querySelectorAll('body *')]
      .filter(
        (node) =>
          [...node.childNodes].some(
            (child) => child.nodeType === Node.TEXT_NODE && child.textContent?.trim(),
          ) &&
          node.getAttribute('aria-hidden') !== 'true' &&
          node.getClientRects().length > 0,
      )
      .map((node) => {
        const bg = background(node);
        return {
          text: node.textContent?.slice(0, 50),
          ratio: contrast(blend(parse(getComputedStyle(node).color), bg), bg),
        };
      });
    return {
      text: textRatios,
      inputText: contrast(blend(parse(style.color), inputBackground), inputBackground),
      placeholder: contrast(
        blend(parse(getComputedStyle(element, '::placeholder').color), inputBackground),
        inputBackground,
      ),
      borderInside: contrast(border, inputBackground),
      borderOutside: contrast(border, surrounding),
      focus: contrast(focus, surrounding),
    };
  });

  for (const { text, ratio } of ratios.text) expect(ratio, text).toBeGreaterThanOrEqual(4.5);
  expect(ratios.inputText).toBeGreaterThanOrEqual(4.5);
  expect(ratios.placeholder).toBeGreaterThanOrEqual(4.5);
  expect(ratios.borderInside).toBeGreaterThanOrEqual(3);
  expect(ratios.borderOutside).toBeGreaterThanOrEqual(3);
  expect(ratios.focus).toBeGreaterThanOrEqual(3);
});
