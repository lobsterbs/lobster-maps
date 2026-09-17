/**
 * Weather Client - Yr.no / MET Norway Integration
 * Calculates real weather-based routing delays for Vestland/Norway
 * Returns delay in ms: 0ms (clear) → 120ms (heavy snow / storm)
 */

import axios, { AxiosError } from 'axios';

interface WeatherData {
  properties: {
    timeseries: Array<{
      time: string;
      data: {
        instant: {
          details: {
            air_temperature?: number;
            wind_speed?: number;
            relative_humidity?: number;
          };
        };
        next_1_hours?: {
          summary?: {
            symbol_code?: string;
          };
          details?: {
            precipitation_amount?: number;
          };
        };
      };
    }>;
  };
}

const MET_NO_API = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
const CACHE_TTL = 3600 * 1000; // 1 hour

let cachedWeather: { data: WeatherData | null; time: number } = {
  data: null,
  time: 0,
};

function symbolCodeToWmo(symbol: string): number {
  if (!symbol) return 0;
  const s = symbol.toLowerCase();
  if (s.includes('snow')) return 71;
  if (s.includes('heavyrain') || s.includes('thunder')) return 65;
  if (s.includes('rain')) return 61;
  if (s.includes('sleet')) return 68;
  if (s.includes('fog')) return 45;
  return 0;
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    const now = Date.now();
    
    // Use cache if fresh
    if (cachedWeather.data && now - cachedWeather.time < CACHE_TTL) {
      return cachedWeather.data;
    }

    const response = await axios.get<WeatherData>(MET_NO_API, {
      params: { lat, lon },
      timeout: 5000,
      headers: {
        'User-Agent': 'LobsterMaps/2.0 (privacy-first maps; contact@lobstermaps.no)',
      },
    });

    cachedWeather = { data: response.data, time: now };
    return response.data;
  } catch (error) {
    console.error('Weather fetch failed:', error instanceof AxiosError ? error.message : error);
    return null;
  }
}

export async function getWeatherDelay(lat: number, lon: number): Promise<number> {
  const DEFAULT_DELAY = 0;

  try {
    const weather = await fetchWeather(lat, lon);
    
    if (!weather?.properties?.timeseries?.length) {
      return DEFAULT_DELAY;
    }

    const current = weather.properties.timeseries[0];
    const details = current.data?.instant?.details;
    const next1Hour = current.data?.next_1_hours;

    const symbolCode = next1Hour?.summary?.symbol_code || '';
    const weatherCode = symbolCodeToWmo(symbolCode);
    const windSpeed = details?.wind_speed || 0;
    const precipitationAmount = next1Hour?.details?.precipitation_amount || 0;

    let delay = 0;

    // Weather code delay logic
    if (weatherCode >= 71 && weatherCode <= 77) {
      // Snow: base +60ms
      delay += 60;
      if (precipitationAmount > 3) delay += 40; // Heavy snow
    } else if (weatherCode >= 61 && weatherCode <= 68) {
      // Rain / Sleet: base +30ms
      delay += 30;
      if (precipitationAmount > 5) delay += 30; // Heavy rain
    } else if (weatherCode === 45) {
      // Fog: +20ms
      delay += 20;
    }

    // High wind penalty: +2ms per m/s above 12 m/s
    if (windSpeed > 12) {
      delay += Math.min((windSpeed - 12) * 2, 40);
    }

    return Math.min(delay, 120); // Cap at 120ms delay
  } catch (error) {
    console.error('Weather delay calculation failed:', error);
    return DEFAULT_DELAY;
  }
}

export default getWeatherDelay;

export const weatherClient = {
  getDelay: getWeatherDelay,
  getDelayMultiplier: (delay: number) => {
    return 1 + delay / 100; // e.g. 60ms delay = 1.6x multiplier
  },
};
