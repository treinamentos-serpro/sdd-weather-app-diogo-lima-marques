import { useRef, useState } from 'react';
import CurrentWeather from './components/CurrentWeather';
import ForecastList from './components/ForecastList';
import SearchBar from './components/SearchBar';
import EmptyState from './components/states/EmptyState';
import ErrorState from './components/states/ErrorState';
import LoadingState from './components/states/LoadingState';
import UnitToggle from './components/UnitToggle';
import { mockWeatherData } from './mocks/weather';
import type { Unit } from './types/weather';

type AppStatus = 'idle' | 'loading' | 'empty' | 'error' | 'success';

interface AppProps {
  initialStatus?: AppStatus;
}

export default function App({ initialStatus = 'success' }: AppProps) {
  const [status, setStatus] = useState<AppStatus>(initialStatus);
  const [unit, setUnit] = useState<Unit>('celsius');
  const mainRef = useRef<HTMLElement>(null);

  function handleSearch(city: string) {
    const matchesMock =
      city.localeCompare(mockWeatherData.city.name, 'pt-BR', { sensitivity: 'base' }) === 0;
    setStatus(matchesMock ? 'success' : 'empty');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-night-900 via-night-800 to-night-900 [overflow-wrap:anywhere]">
      <a
        href="#weather-content"
        className="sr-only rounded-xl bg-accent-400 p-3 font-semibold text-night-900 focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10"
      >
        Ir para o conteúdo
      </a>
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
        <header className="grid items-center gap-6 border-b border-white/10 py-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:py-8">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="shrink-0 text-4xl text-sun">
              ☀
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">WeatherView</h1>
              <p className="text-sm text-white/70">Seu dia, com mais clareza.</p>
            </div>
          </div>
          <SearchBar onSearch={handleSearch} disabled={status === 'loading'} />
          <div className="justify-self-start lg:justify-self-end">
            <UnitToggle unit={unit} onChange={setUnit} />
          </div>
        </header>

        <main
          ref={mainRef}
          id="weather-content"
          tabIndex={-1}
          className="min-w-0 flex-1 space-y-6 py-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400 sm:py-8"
        >
          <p className="text-sm leading-relaxed text-white/70">
            Demonstração com dados fictícios de {mockWeatherData.city.name}, de 27 a 31/10/2026. A
            busca reconhece apenas essa cidade; nenhuma API é consultada.
          </p>
          {status === 'idle' && (
            <EmptyState
              title="Como está o tempo por aí?"
              hint="Busque São Paulo para explorar o exemplo de clima e previsão."
            />
          )}
          {status === 'loading' && <LoadingState message="Carregando clima e previsão..." />}
          {status === 'empty' && (
            <EmptyState
              title="Nenhuma cidade encontrada."
              hint="Nesta demonstração, busque São Paulo para visualizar os dados de exemplo."
            />
          )}
          {status === 'error' && (
            <ErrorState
              message="Não foi possível carregar os dados meteorológicos. Tente novamente."
              onRetry={() => {
                setStatus('success');
                mainRef.current?.focus();
              }}
            />
          )}
          {status === 'success' && (
            <>
              <CurrentWeather
                city={mockWeatherData.city}
                current={mockWeatherData.current}
                unit={unit}
              />
              <ForecastList
                forecast={mockWeatherData.forecast}
                unit={unit}
                isIncomplete={mockWeatherData.forecastIsIncomplete}
              />
            </>
          )}
          <p role="status" aria-label="Resultado da busca" aria-atomic="true" className="sr-only">
            {status === 'empty' &&
              'Nenhuma cidade encontrada. Nesta demonstração, busque São Paulo.'}
            {status === 'success' && 'Clima e previsão de São Paulo disponíveis.'}
          </p>
        </main>

        <footer className="flex flex-col gap-2 border-t border-white/10 py-6 text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <p>WeatherView · Exemplo para desenvolvimento da UI</p>
          <a
            href="https://open-meteo.com/"
            className="rounded underline underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-400"
          >
            Weather data by Open-Meteo.com
          </a>
        </footer>
      </div>
    </div>
  );
}
