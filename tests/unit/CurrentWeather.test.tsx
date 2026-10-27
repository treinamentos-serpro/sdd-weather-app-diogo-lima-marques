import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import CurrentWeather from '../../src/components/CurrentWeather';
import { getWeatherCondition } from '../../src/lib/weatherCodes';
import { mockWeatherData } from '../../src/mocks/weather';

afterEach(cleanup);

describe('CurrentWeather', () => {
  const { city, current } = mockWeatherData;

  it('mostra cidade, condição, ícone decorativo e métricas em pt-BR', () => {
    render(<CurrentWeather city={city} current={current} unit="celsius" />);

    expect(screen.getByRole('region', { name: 'Clima atual em São Paulo' })).toBeInTheDocument();
    expect(screen.getByText('São Paulo, Brasil')).toBeInTheDocument();
    expect(screen.getByText('23,5 °C')).toBeInTheDocument();
    expect(screen.getByText(current.condition)).toBeInTheDocument();
    const icon = getWeatherCondition(current.weatherCode)?.icon;
    expect(icon).toBeDefined();
    expect(screen.getByText(icon ?? '')).toHaveAttribute('aria-hidden', 'true');
    for (const [label, value] of [
      ['Umidade', '68 %'],
      ['Vento', '12,6 km/h'],
      ['Precipitação', '0 mm'],
      ['Pressão', '1.014,2 hPa'],
    ]) {
      const term = screen.getByText(label);
      expect(term.tagName).toBe('DT');
      expect(term.nextElementSibling).toHaveTextContent(value);
    }
  });

  it('converte somente a temperatura ao alternar unidade e preserva o dado canônico', () => {
    const { rerender } = render(<CurrentWeather city={city} current={current} unit="fahrenheit" />);

    expect(screen.getByText('74,3 °F')).toBeInTheDocument();
    expect(screen.getByText('12,6 km/h')).toBeInTheDocument();
    rerender(<CurrentWeather city={city} current={current} unit="celsius" />);
    expect(screen.getByText('23,5 °C')).toBeInTheDocument();
    expect(current.temperatureCelsius).toBe(23.5);
  });

  it('não inventa métricas nem contexto de cidade ausentes', () => {
    render(
      <CurrentWeather
        city={{ name: 'Recife', latitude: -8.05, longitude: -34.88 }}
        current={{
          temperatureCelsius: 28,
          condition: 'Céu limpo',
          weatherCode: 0,
          observedAt: current.observedAt,
        }}
        unit="celsius"
      />,
    );

    expect(screen.getAllByText('Indisponível')).toHaveLength(4);
    expect(screen.queryByText('São Paulo, Brasil')).not.toBeInTheDocument();
  });

  it.each([undefined, 999])('comunica condição indisponível para código %s', (weatherCode) => {
    render(<CurrentWeather city={city} current={{ ...current, weatherCode }} unit="celsius" />);

    expect(screen.getByText('Condição indisponível')).toBeInTheDocument();
    expect(screen.getByText('23,5 °C')).toBeInTheDocument();
    expect(screen.queryByText(current.condition)).not.toBeInTheDocument();
  });

  it.each([
    NaN,
    Infinity,
    -Infinity,
  ])('não exibe temperatura inválida (%s)', (temperatureCelsius) => {
    render(
      <CurrentWeather city={city} current={{ ...current, temperatureCelsius }} unit="celsius" />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Clima atual indisponível para esta cidade.',
    );
    expect(screen.queryByText('Umidade')).not.toBeInTheDocument();
  });

  it('mostra métricas não finitas como indisponíveis', () => {
    render(
      <CurrentWeather
        city={city}
        current={{ ...current, humidityPercent: NaN, windSpeedKmh: Infinity }}
        unit="celsius"
      />,
    );

    expect(screen.getAllByText('Indisponível')).toHaveLength(2);
  });

  it('associa cada região ao seu próprio título em múltiplas instâncias', () => {
    render(
      <>
        <CurrentWeather city={city} current={current} unit="celsius" />
        <CurrentWeather city={{ ...city, name: 'Recife' }} current={current} unit="celsius" />
      </>,
    );

    const region = screen.getByRole('region', { name: 'Clima atual em Recife' });
    expect(
      within(region).getByRole('heading', { name: 'Clima atual em Recife' }),
    ).toBeInTheDocument();
  });
});
