import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { mockWeatherData } from '../../src/mocks/weather';
import { getWeather, searchCities, WeatherServiceError } from '../../src/services/weatherService';

vi.mock('../../src/services/weatherService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/services/weatherService')>()),
  searchCities: vi.fn(),
  getWeather: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(searchCities).mockResolvedValue([mockWeatherData.city]);
  vi.mocked(getWeather).mockResolvedValue(mockWeatherData);
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('App integrado ao useWeather', () => {
  it('inicia idle em Celsius sem consultar a API', () => {
    render(<App />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'WeatherView' })).toBeInTheDocument();
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '°C' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'Como está o tempo por aí?' })).toBeInTheDocument();
    expect(within(screen.getByRole('contentinfo')).getByRole('link')).toHaveAttribute(
      'href',
      'https://open-meteo.com/',
    );
    expect(searchCities).not.toHaveBeenCalled();
    expect(getWeather).not.toHaveBeenCalled();
  });

  it('busca e mostra dados reais do serviço, convertendo somente na UI', async () => {
    const user = userEvent.setup();
    const original = JSON.stringify(mockWeatherData);
    render(<App />);
    await user.type(screen.getByRole('searchbox'), '  São Paulo  {Enter}');

    expect(await screen.findByText('23,5 °C')).toBeInTheDocument();
    expect(searchCities).toHaveBeenCalledWith('São Paulo');
    expect(getWeather).toHaveBeenCalledWith(mockWeatherData.city);
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    screen.getByRole('button', { name: '°F' }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('74,3 °F')).toBeInTheDocument();
    expect(within(screen.getByRole('main')).getAllByText(/°F$/)).toHaveLength(11);
    expect(getWeather).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(mockWeatherData)).toBe(original);
    expect(screen.getByRole('status', { name: 'Resultado da busca' })).toHaveTextContent(
      'Clima e previsão de São Paulo disponíveis.',
    );
  });

  it('mostra loading sem dados antigos e bloqueia a busca', async () => {
    vi.mocked(searchCities).mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByRole('searchbox'), 'Cidade{Enter}');

    expect(screen.getByText('Carregando clima e previsão...')).toHaveAttribute('role', 'status');
    expect(screen.getByRole('searchbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeDisabled();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('mostra empty sem consultar forecast', async () => {
    vi.mocked(searchCities).mockResolvedValue([]);
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByRole('searchbox'), 'Inexistente{Enter}');

    expect(
      await screen.findByRole('heading', { name: 'Nenhuma cidade encontrada.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Verifique o nome e tente novamente.')).toBeInTheDocument();
    expect(getWeather).not.toHaveBeenCalled();
  });

  it('ErrorState refaz apenas a operação que falhou, preserva a unidade e move o foco', async () => {
    vi.mocked(getWeather).mockRejectedValueOnce(new WeatherServiceError('Falha de rede.'));
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: '°F' }));
    await user.type(screen.getByRole('searchbox'), 'São Paulo{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha de rede.');
    expect(screen.queryByText('74,3 °F')).not.toBeInTheDocument();
    expect(getWeather).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('74,3 °F')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveFocus();
    expect(searchCities).toHaveBeenCalledTimes(1);
    expect(getWeather).toHaveBeenCalledTimes(2);
  });

  it('permite selecionar outra cidade e preserva a unidade entre buscas e seleções', async () => {
    const recife = { name: 'Recife', latitude: -8.05, longitude: -34.9 };
    vi.mocked(searchCities).mockResolvedValue([mockWeatherData.city, recife]);
    vi.mocked(getWeather).mockImplementation(async (city) => ({ ...mockWeatherData, city }));
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: '°F' }));
    await user.type(screen.getByRole('searchbox'), 'Cidade{Enter}');
    await screen.findByText('74,3 °F');
    await user.click(screen.getByRole('button', { name: 'Recife' }));

    expect(
      await screen.findByRole('region', { name: 'Clima atual em Recife' }),
    ).toBeInTheDocument();
    expect(screen.getByText('74,3 °F')).toBeInTheDocument();
    expect(getWeather).toHaveBeenLastCalledWith(recife);
    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'São Paulo{Enter}');
    expect(
      await screen.findByRole('region', { name: 'Clima atual em São Paulo' }),
    ).toBeInTheDocument();
    expect(screen.getByText('74,3 °F')).toBeInTheDocument();
  });

  it('valida entrada vazia sem chamar a rede', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Informe o nome de uma cidade.');
    expect(screen.getByRole('searchbox')).toHaveFocus();
    expect(searchCities).not.toHaveBeenCalled();
    expect(getWeather).not.toHaveBeenCalled();
  });
});
