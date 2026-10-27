import { act, cleanup, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useWeather from '../../src/hooks/useWeather';
import { mockWeatherData } from '../../src/mocks/weather';
import { getWeather, searchCities } from '../../src/services/weatherService';
import type { City, WeatherData } from '../../src/types/weather';

vi.mock('../../src/services/weatherService', () => ({
  searchCities: vi.fn(),
  getWeather: vi.fn(),
}));

const city = mockWeatherData.city;
const otherCity: City = { name: 'Recife', latitude: -8.05, longitude: -34.9 };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.mocked(searchCities).mockResolvedValue([city, otherCity]);
  vi.mocked(getWeather).mockImplementation(async (selected) => ({
    ...mockWeatherData,
    city: selected,
  }));
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('useWeather', () => {
  it('inicia idle, sem rede, e retry sem operação é inofensivo', async () => {
    const { result } = renderHook(useWeather, { wrapper: StrictMode });
    expect(result.current).toMatchObject({
      status: 'idle',
      data: null,
      cities: [],
      error: null,
      query: '',
    });
    await act(() => result.current.retry());
    expect(searchCities).not.toHaveBeenCalled();
    expect(getWeather).not.toHaveBeenCalled();
  });

  it('busca cidades, guarda a query aparada e carrega automaticamente a primeira', async () => {
    const { result } = renderHook(useWeather, { wrapper: StrictMode });
    await act(() => result.current.search('  São Paulo  '));

    expect(result.current).toMatchObject({
      status: 'success',
      query: 'São Paulo',
      cities: [city, otherCity],
      data: mockWeatherData,
      error: null,
    });
    expect(searchCities).toHaveBeenCalledWith('São Paulo');
    expect(getWeather).toHaveBeenCalledExactlyOnceWith(city);
  });

  it('limpa os dados anteriores durante uma nova seleção e preserva as opções', async () => {
    const response = deferred<WeatherData>();
    const { result } = renderHook(useWeather);
    await act(() => result.current.search('São Paulo'));
    vi.mocked(getWeather).mockReturnValueOnce(response.promise);
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.selectCity(otherCity);
    });
    expect(result.current).toMatchObject({
      status: 'loading',
      data: null,
      cities: [city, otherCity],
      error: null,
    });
    await act(async () => {
      response.resolve({ ...mockWeatherData, city: otherCity });
      await pending;
    });
    expect(result.current.data?.city).toEqual(otherCity);
  });

  it('sem resultados limpa dados antigos e não consulta forecast', async () => {
    const { result } = renderHook(useWeather);
    await act(() => result.current.search('São Paulo'));
    vi.mocked(searchCities).mockResolvedValueOnce([]);
    await act(() => result.current.search('Inexistente'));

    expect(result.current).toMatchObject({
      status: 'empty',
      data: null,
      cities: [],
      error: null,
      query: 'Inexistente',
    });
    expect(getWeather).toHaveBeenCalledTimes(1);
  });

  it('entrada vazia invalida busca pendente e solicita um nome sem rede adicional', async () => {
    const response = deferred<City[]>();
    vi.mocked(searchCities).mockReturnValueOnce(response.promise);
    const { result } = renderHook(useWeather);
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.search('Cidade');
    });
    await act(() => result.current.search(' \t '));
    await act(async () => {
      response.resolve([city]);
      await pending;
    });
    expect(result.current).toMatchObject({
      status: 'idle',
      query: '',
      data: null,
      cities: [],
      error: 'Informe o nome de uma cidade.',
    });
    expect(searchCities).toHaveBeenCalledTimes(1);
    expect(getWeather).not.toHaveBeenCalled();
  });

  it('erro de busca não dispara retry automático; retry repete a busca', async () => {
    vi.mocked(searchCities).mockRejectedValueOnce(new Error('Falha de rede.'));
    const { result } = renderHook(useWeather);
    await act(() => result.current.search('São Paulo'));

    expect(result.current).toMatchObject({ status: 'error', error: 'Falha de rede.', data: null });
    expect(searchCities).toHaveBeenCalledTimes(1);
    expect(getWeather).not.toHaveBeenCalled();
    await act(() => result.current.retry());
    expect(searchCities).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('success');
    expect(result.current.error).toBeNull();
  });

  it('erro meteorológico repete somente a última consulta, inclusive após selectCity', async () => {
    const { result } = renderHook(useWeather);
    await act(() => result.current.search('São Paulo'));
    vi.mocked(getWeather).mockRejectedValueOnce(new Error('A requisição demorou demais.'));
    await act(() => result.current.selectCity(otherCity));
    expect(result.current).toMatchObject({
      status: 'error',
      data: null,
      error: 'A requisição demorou demais.',
    });
    await act(() => result.current.retry());
    expect(searchCities).toHaveBeenCalledTimes(1);
    expect(getWeather).toHaveBeenLastCalledWith(otherCity);
    expect(result.current.data?.city).toEqual(otherCity);
  });

  it('retry após falha do carregamento automático não repete o geocoding', async () => {
    vi.mocked(getWeather).mockRejectedValueOnce(new Error('Falha de rede.'));
    const { result } = renderHook(useWeather);
    await act(() => result.current.search('São Paulo'));
    await act(() => result.current.retry());
    expect(searchCities).toHaveBeenCalledTimes(1);
    expect(getWeather).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('success');
  });

  it('retry após resultado vazio repete a consulta', async () => {
    vi.mocked(searchCities).mockResolvedValueOnce([]);
    const { result } = renderHook(useWeather);
    await act(() => result.current.search('Cidade'));
    await act(() => result.current.retry());
    expect(searchCities).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('success');
  });

  it.each([
    'resolve',
    'reject',
  ] as const)('ignora busca anterior tardia (%s), sem sobrescrever dados ou retry', async (outcome) => {
    const old = deferred<City[]>();
    vi.mocked(searchCities).mockReturnValueOnce(old.promise);
    const { result } = renderHook(useWeather);
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.search('Antiga');
    });
    await act(() => result.current.selectCity(otherCity));
    await act(async () => {
      if (outcome === 'resolve') old.resolve([city]);
      else old.reject(new Error('Erro antigo'));
      await pending;
    });
    expect(result.current.status).toBe('success');
    expect(result.current.data?.city).toEqual(otherCity);
    expect(getWeather).toHaveBeenCalledTimes(1);
    await act(() => result.current.retry());
    expect(getWeather).toHaveBeenLastCalledWith(otherCity);
    expect(searchCities).toHaveBeenCalledTimes(1);
  });

  it.each([
    'resolve',
    'reject',
  ] as const)('ignora resposta meteorológica anterior tardia (%s)', async (outcome) => {
    const old = deferred<WeatherData>();
    vi.mocked(getWeather).mockReturnValueOnce(old.promise);
    vi.mocked(searchCities).mockResolvedValueOnce([otherCity]);
    const { result } = renderHook(useWeather);
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.selectCity(city);
    });
    await act(() => result.current.search('Recife'));
    const latest = result.current.data;
    await act(async () => {
      if (outcome === 'resolve') old.resolve(mockWeatherData);
      else old.reject(new Error('Erro antigo'));
      await pending;
    });
    expect(result.current.status).toBe('success');
    expect(result.current.data).toBe(latest);
    expect(result.current.error).toBeNull();
  });

  it('não inicia forecast se a busca terminar depois do unmount', async () => {
    const response = deferred<City[]>();
    vi.mocked(searchCities).mockReturnValueOnce(response.promise);
    const { result, unmount } = renderHook(useWeather);
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.search('Cidade');
    });
    unmount();
    await act(async () => {
      response.resolve([city]);
      await pending;
    });
    expect(getWeather).not.toHaveBeenCalled();
  });

  it('fornece mensagem explícita quando a rejeição não contém Error', async () => {
    vi.mocked(searchCities).mockRejectedValueOnce(null);
    const { result } = renderHook(useWeather);
    await act(() => result.current.search('Cidade'));
    expect(result.current.error).toBe('Não foi possível buscar cidades. Tente novamente.');
  });
});
