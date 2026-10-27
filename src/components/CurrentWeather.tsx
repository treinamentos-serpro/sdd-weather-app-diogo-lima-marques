import { useId } from 'react';
import { formatTemperature } from '../lib/format';
import { getWeatherCondition } from '../lib/weatherCodes';
import type { City, CurrentWeather as CurrentWeatherData, Unit } from '../types/weather';

interface CurrentWeatherProps {
  city: City;
  current: CurrentWeatherData;
  unit: Unit;
}

const metricFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

export default function CurrentWeather({ city, current, unit }: CurrentWeatherProps) {
  const headingId = useId();
  const weather = getWeatherCondition(current.weatherCode);
  const metrics = [
    { label: 'Umidade', value: current.humidityPercent, suffix: '%' },
    { label: 'Vento', value: current.windSpeedKmh, suffix: 'km/h' },
    { label: 'Precipitação', value: current.precipitationMm, suffix: 'mm' },
    { label: 'Pressão', value: current.pressureHpa, suffix: 'hPa' },
  ];

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-2xl border border-white/10 bg-white/5 p-6 font-sans text-white shadow-glass backdrop-blur-md sm:p-8"
    >
      <h2 id={headingId} className="text-2xl font-semibold">
        Clima atual em {city.name}
      </h2>
      {(city.region || city.country) && (
        <p className="mt-1 text-white/70">
          {[city.region, city.country].filter(Boolean).join(', ')}
        </p>
      )}
      {!Number.isFinite(current.temperatureCelsius) ? (
        <p role="status" className="mt-6">
          Clima atual indisponível para esta cidade.
        </p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            {weather && (
              <span aria-hidden="true" className="text-6xl sm:text-7xl">
                {weather.icon}
              </span>
            )}
            <p className="text-5xl font-semibold tracking-tight sm:text-7xl">
              {formatTemperature(current.temperatureCelsius, unit, 'pt-BR')}
            </p>
          </div>
          <p className="mt-3 text-lg">{weather ? current.condition : 'Condição indisponível'}</p>
          <dl className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {metrics.map(({ label, value, suffix }) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <dt className="text-sm text-white/70">{label}</dt>
                <dd className="mt-1 text-lg font-medium">
                  {value !== undefined && Number.isFinite(value)
                    ? `${metricFormatter.format(value)} ${suffix}`
                    : 'Indisponível'}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}
