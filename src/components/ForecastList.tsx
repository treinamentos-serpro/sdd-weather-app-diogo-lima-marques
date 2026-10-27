import { useId } from 'react';
import type { ForecastDay, Unit } from '../types/weather';
import ForecastCard from './ForecastCard';
import EmptyState from './states/EmptyState';

interface ForecastListProps {
  forecast: ForecastDay[];
  unit: Unit;
  isIncomplete?: boolean;
}

export default function ForecastList({ forecast, unit, isIncomplete = false }: ForecastListProps) {
  const headingId = useId();

  if (forecast.length === 0) {
    return (
      <EmptyState
        title="Previsão indisponível para esta cidade."
        hint="Selecione outra cidade ou tente consultar novamente."
      />
    );
  }

  const days = [...forecast].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <section aria-labelledby={headingId} className="font-sans text-white">
      <h2 id={headingId} className="mb-4 text-2xl font-semibold">
        Previsão de 5 dias
      </h2>
      {(isIncomplete || forecast.length < 5) && (
        <p role="status" className="mb-4 text-white/80">
          Previsão incompleta. Alguns dias estão indisponíveis.
        </p>
      )}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {days.map((day) => (
          <li key={day.date} className="min-w-0">
            <ForecastCard day={day} unit={unit} />
          </li>
        ))}
      </ul>
    </section>
  );
}
