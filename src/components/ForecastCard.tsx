import { formatForecastDay, formatTemperature } from '../lib/format';
import { getWeatherCondition } from '../lib/weatherCodes';
import type { ForecastDay, Unit } from '../types/weather';

interface ForecastCardProps {
  day: ForecastDay;
  unit: Unit;
}

export default function ForecastCard({ day, unit }: ForecastCardProps) {
  const weather = getWeatherCondition(day.weatherCode);
  const probability = day.precipitationProbabilityPercent;
  const hasProbability =
    probability !== undefined &&
    Number.isFinite(probability) &&
    probability >= 0 &&
    probability <= 100;

  return (
    <article className="h-full min-w-0 rounded-2xl border border-white/10 bg-white/5 p-3 font-sans text-white shadow-glass backdrop-blur-md [overflow-wrap:anywhere] sm:p-4">
      <h3 className="font-semibold">
        <time dateTime={day.date}>{formatForecastDay(day.date, 'pt-BR')}</time>
      </h3>
      {weather && (
        <span aria-hidden="true" className="mt-4 block text-2xl sm:text-3xl xl:text-4xl">
          {weather.icon}
        </span>
      )}
      <p className="mt-3 text-sm text-white/80">
        {weather ? day.condition : 'Condição indisponível'}
      </p>
      <dl className="mt-4 space-y-2">
        <div>
          <dt className="text-sm text-white/70">Máxima</dt>
          <dd className="font-semibold">{formatTemperature(day.maxCelsius, unit, 'pt-BR')}</dd>
        </div>
        <div>
          <dt className="text-sm text-white/70">Mínima</dt>
          <dd>{formatTemperature(day.minCelsius, unit, 'pt-BR')}</dd>
        </div>
        <div>
          <dt className="text-sm text-white/70">Probabilidade de chuva</dt>
          <dd>
            {hasProbability
              ? new Intl.NumberFormat('pt-BR', {
                  style: 'percent',
                  maximumFractionDigits: 1,
                }).format(probability / 100)
              : 'Indisponível'}
          </dd>
        </div>
      </dl>
    </article>
  );
}
