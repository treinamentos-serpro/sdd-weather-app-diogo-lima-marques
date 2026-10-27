export type Unit = 'celsius' | 'fahrenheit';

export interface City {
  id?: number;
  name: string;
  latitude: number;
  longitude: number;
  region?: string;
  country?: string;
  countryCode?: string;
}

export interface CurrentWeather {
  temperatureCelsius: number;
  condition: string;
  weatherCode?: number;
  humidityPercent?: number;
  windSpeedKmh?: number;
  pressureHpa?: number;
  precipitationMm?: number;
  observedAt: string;
}

export interface ForecastDay {
  date: string;
  minCelsius: number;
  maxCelsius: number;
  condition: string;
  weatherCode: number;
  precipitationMm?: number;
  precipitationProbabilityPercent?: number;
}

export interface WeatherData {
  city: City;
  timezone: string | null;
  current: CurrentWeather | null;
  forecast: ForecastDay[];
  forecastIsIncomplete: boolean;
}
