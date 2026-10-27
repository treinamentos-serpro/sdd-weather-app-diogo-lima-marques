import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import ForecastCard from '../../src/components/ForecastCard';
import ForecastList from '../../src/components/ForecastList';
import { formatForecastDay } from '../../src/lib/format';
import { mockWeatherData } from '../../src/mocks/weather';

afterEach(cleanup);

describe('ForecastCard', () => {
  const day = mockWeatherData.forecast[0];

  it('mostra data local, condição, ícone decorativo e temperaturas em Celsius', () => {
    render(<ForecastCard day={day} unit="celsius" />);

    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveTextContent('27/10/2026');
    expect(heading.querySelector('time')).toHaveAttribute('dateTime', day.date);
    expect(screen.getByText('⛅')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText(day.condition)).toBeInTheDocument();
    expect(screen.getByText('Máxima').nextElementSibling).toHaveTextContent('26,4 °C');
    expect(screen.getByText('Mínima').nextElementSibling).toHaveTextContent('18,2 °C');
    expect(screen.getByText('Probabilidade de chuva').nextElementSibling).toHaveTextContent('10%');
  });

  it('converte máxima e mínima ao mudar a unidade sem alterar os dados', () => {
    const { rerender } = render(<ForecastCard day={day} unit="fahrenheit" />);

    expect(screen.getByText('79,5 °F')).toBeInTheDocument();
    expect(screen.getByText('64,8 °F')).toBeInTheDocument();
    rerender(<ForecastCard day={day} unit="celsius" />);
    expect(screen.getByText('26,4 °C')).toBeInTheDocument();
    expect(day.maxCelsius).toBe(26.4);
    expect(day.minCelsius).toBe(18.2);
  });

  it.each([0, 100, 25.5])('exibe probabilidade válida %s', (probability) => {
    render(
      <ForecastCard
        day={{ ...day, precipitationProbabilityPercent: probability }}
        unit="celsius"
      />,
    );

    expect(screen.getByText('Probabilidade de chuva').nextElementSibling).toHaveTextContent(
      `${String(probability).replace('.', ',')}%`,
    );
  });

  it.each([
    undefined,
    NaN,
    Infinity,
    -1,
    101,
  ])('não inventa probabilidade para %s', (probability) => {
    render(
      <ForecastCard
        day={{ ...day, precipitationMm: 10, precipitationProbabilityPercent: probability }}
        unit="celsius"
      />,
    );

    expect(screen.getByText('Probabilidade de chuva').nextElementSibling).toHaveTextContent(
      'Indisponível',
    );
  });

  it('comunica condição desconhecida sem ícone incorreto', () => {
    render(<ForecastCard day={{ ...day, weatherCode: 999 }} unit="celsius" />);

    expect(screen.getByText('Condição indisponível')).toBeInTheDocument();
    expect(screen.queryByText('⛅')).not.toBeInTheDocument();
  });
});

describe('ForecastList', () => {
  it('ordena cinco dias sem alterar a entrada e usa o grid responsivo especificado', () => {
    const forecast = [...mockWeatherData.forecast].reverse();
    const original = forecast.map((day) => day.date);
    render(<ForecastList forecast={forecast} unit="celsius" />);

    expect(screen.getByRole('region', { name: 'Previsão de 5 dias' })).toBeInTheDocument();
    expect(screen.getByRole('list')).toHaveClass('grid-cols-2', 'sm:grid-cols-3', 'lg:grid-cols-5');
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(5);
    items.forEach((item, index) => {
      expect(within(item).getByRole('heading')).toHaveTextContent(`${27 + index}/10/2026`);
    });
    expect(forecast.map((day) => day.date)).toEqual(original);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('mostra apenas os dias recebidos e o aviso de previsão incompleta', () => {
    render(<ForecastList forecast={mockWeatherData.forecast.slice(0, 2)} unit="fahrenheit" />);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Previsão incompleta. Alguns dias estão indisponíveis.',
    );
    expect(screen.getByText('79,5 °F')).toBeInTheDocument();
  });

  it('respeita o indicador explícito de previsão incompleta', () => {
    render(<ForecastList forecast={mockWeatherData.forecast} unit="celsius" isIncomplete />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('mostra estado vazio sem inventar dias', () => {
    render(<ForecastList forecast={[]} unit="celsius" />);

    expect(screen.getByRole('heading')).toHaveTextContent(
      'Previsão indisponível para esta cidade.',
    );
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});

describe('formatForecastDay', () => {
  it('preserva a data local sem aplicar deslocamentos de fuso', () => {
    expect(formatForecastDay('2026-10-27', 'pt-BR')).toBe('ter., 27/10/2026');
    expect(formatForecastDay('2028-02-29', 'pt-BR')).toContain('29/02/2028');
    expect(formatForecastDay('2026-12-31', 'pt-BR')).toContain('31/12/2026');
    expect(formatForecastDay('2027-01-01', 'pt-BR')).toContain('01/01/2027');
  });

  it.each([
    '',
    '2026-02-29',
    '2026-04-31',
    '2026-13-01',
    '27/10/2026',
  ])('rejeita data inválida %s explicitamente', (date) => {
    expect(() => formatForecastDay(date, 'pt-BR')).toThrow(RangeError);
  });
});
