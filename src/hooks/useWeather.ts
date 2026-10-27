import { useCallback, useEffect, useRef, useState } from 'react';
import { getWeather, searchCities } from '../services/weatherService';
import type { City, WeatherData } from '../types/weather';

type WeatherStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty';
type Operation = { type: 'search'; name: string } | { type: 'weather'; city: City };

interface WeatherState {
  status: WeatherStatus;
  data: WeatherData | null;
  cities: City[];
  error: string | null;
  query: string;
}

const initialState: WeatherState = {
  status: 'idle',
  data: null,
  cities: [],
  error: null,
  query: '',
};

export default function useWeather() {
  const [state, setState] = useState<WeatherState>(initialState);
  const requestId = useRef(0);
  const lastOperation = useRef<Operation | null>(null);

  useEffect(() => {
    return () => {
      requestId.current += 1;
    };
  }, []);

  const execute = useCallback(async (operation: Operation) => {
    const id = ++requestId.current;
    lastOperation.current = operation;

    if (operation.type === 'search' && !operation.name) {
      setState({ ...initialState, error: 'Informe o nome de uma cidade.' });
      return;
    }

    setState((previous) => ({
      ...previous,
      status: 'loading',
      data: null,
      error: null,
      ...(operation.type === 'search' ? { query: operation.name, cities: [] } : {}),
    }));

    let activeOperation = operation;
    try {
      let city: City;
      if (operation.type === 'search') {
        const cities = await searchCities(operation.name);
        if (id !== requestId.current) return;
        if (cities.length === 0) {
          setState((previous) => ({ ...previous, status: 'empty', cities: [] }));
          return;
        }
        setState((previous) => ({ ...previous, cities }));
        city = cities[0];
        activeOperation = { type: 'weather', city };
        lastOperation.current = activeOperation;
      } else {
        city = operation.city;
      }

      const data = await getWeather(city);
      if (id !== requestId.current) return;
      setState((previous) => ({ ...previous, status: 'success', data }));
    } catch {
      if (id !== requestId.current) return;
      const message =
        activeOperation.type === 'search'
          ? 'Não foi possível buscar cidades. Tente novamente.'
          : 'Não foi possível carregar os dados meteorológicos. Tente novamente.';
      setState((previous) => ({
        ...previous,
        status: 'error',
        data: null,
        error: message,
      }));
    }
  }, []);

  const search = useCallback(
    (name: string) => execute({ type: 'search', name: name.trim() }),
    [execute],
  );
  const selectCity = useCallback((city: City) => execute({ type: 'weather', city }), [execute]);
  const retry = useCallback(async () => {
    if (lastOperation.current) await execute(lastOperation.current);
  }, [execute]);

  return { ...state, search, selectCity, retry };
}
