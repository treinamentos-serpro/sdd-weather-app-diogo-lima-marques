import { useEffect, useRef, useState } from 'react';
import CurrentWeather from './components/CurrentWeather';
import ForecastList from './components/ForecastList';
import SearchBar from './components/SearchBar';
import EmptyState from './components/states/EmptyState';
import ErrorState from './components/states/ErrorState';
import LoadingState from './components/states/LoadingState';
import UnitToggle from './components/UnitToggle';
import useWeather from './hooks/useWeather';
import type { Unit } from './types/weather';

export default function App() {
  const { status, data, cities, error, search, selectCity, retry } = useWeather();
  const [unit, setUnit] = useState<Unit>('celsius');
  const mainRef = useRef<HTMLElement>(null);
  const focusResultsAfterSearch = useRef(false);
  const handleSearch = (city: string) => {
    focusResultsAfterSearch.current = true;
    search(city);
  };
  const retryWeather = () => {
    void retry();
    mainRef.current?.focus();
  };

  useEffect(() => {
    if (status === 'loading' || !focusResultsAfterSearch.current) return;
    focusResultsAfterSearch.current = false;
    mainRef.current?.focus();
  }, [status]);

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
          aria-busy={status === 'loading'}
          className="min-w-0 flex-1 space-y-6 py-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400 sm:py-8"
        >
          {status === 'idle' && (
            <EmptyState
              title="Como está o tempo por aí?"
              hint={error ?? 'Informe o nome de uma cidade para consultar o clima e a previsão.'}
            />
          )}
          {status === 'loading' && <LoadingState message="Carregando clima e previsão..." />}
          {status === 'empty' && (
            <EmptyState
              title="Nenhuma cidade encontrada."
              hint="Verifique o nome e tente novamente."
            />
          )}
          {status === 'error' && (
            <ErrorState
              message={
                error ?? 'Não foi possível carregar os dados meteorológicos. Tente novamente.'
              }
              onRetry={retryWeather}
            />
          )}
          {cities.length > 1 && (
            <section aria-label="Cidades encontradas" className="flex flex-wrap gap-3">
              {cities.map((city) => (
                <button
                  key={city.id ?? `${city.name}-${city.latitude}-${city.longitude}`}
                  type="button"
                  disabled={status === 'loading'}
                  aria-pressed={
                    data?.city.latitude === city.latitude && data.city.longitude === city.longitude
                  }
                  onClick={() => void selectCity(city)}
                  className="rounded-xl border border-white/50 bg-white/5 px-4 py-3 text-white transition-colors enabled:hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {[city.name, city.region, city.country].filter(Boolean).join(', ')}
                </button>
              ))}
            </section>
          )}
          {status === 'success' && data && (
            <>
              {data.current ? (
                <CurrentWeather city={data.city} current={data.current} unit={unit} />
              ) : (
                <section aria-label={`Clima atual em ${data.city.name}`}>
                  <h2 className="mb-4 text-2xl font-semibold">Clima atual em {data.city.name}</h2>
                  <ErrorState
                    message="Clima atual indisponível para esta cidade."
                    onRetry={retryWeather}
                  />
                </section>
              )}
              {data.forecast.length > 0 ? (
                <ForecastList
                  forecast={data.forecast}
                  unit={unit}
                  isIncomplete={data.forecastIsIncomplete}
                />
              ) : (
                <ErrorState
                  message="Previsão indisponível para esta cidade."
                  onRetry={retryWeather}
                />
              )}
            </>
          )}
          <p role="status" aria-label="Resultado da busca" aria-atomic="true" className="sr-only">
            {status === 'empty' && 'Nenhuma cidade encontrada. Verifique o nome e tente novamente.'}
            {status === 'success' &&
              data &&
              (data.current && data.forecast.length === 5 && !data.forecastIsIncomplete
                ? `Clima e previsão de ${data.city.name} disponíveis.`
                : `Dados meteorológicos de ${data.city.name} parcialmente disponíveis.`)}
          </p>
        </main>

        <footer className="flex flex-col gap-2 border-t border-white/10 py-6 text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <p>WeatherView · Clima e previsão</p>
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
