/**
 * Weather Client - Yr.no Integration with Fallback
 * Returns weather-based delay: 0ms (clear) → 120ms (heavy snow)
 */

import axios, { AxiosError } from 'axios';

interface WeatherData {
  properties: {
    timeseries: Array<{
      time: string;
      data: {
        instant: {
          details: {
            weather_code: number;
            wind_speed: number;
            precipitation_rate: number;
          };
        };
      };
    }>;
  };
}

const YR_API = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
const CACHE_TTL = 3600 * 1000; // 1 hour

let cachedWeather: { data: WeatherData | null; time: number } = {
  data: null,
  time: 0,
};

async function fetchWeather(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    const now = Date.now();
    
    // Use cache if fresh
    if (cachedWeather.data && now - cachedWeather.time < CACHE_TTL) {
      return cachedWeather.data;
    }

    const response = await axios.get<WeatherData>(YR_API, {
      params: { lat, lon },
      timeout: 5000,
      headers: { 'User-Agent': 'LobsterMaps/1.0' },
    });

    cachedWeather = { data: response.data, time: now };
    return response.data;
  } catch (error) {
    console.error('Weather fetch failed:', error instanceof AxiosError ? error.message : error);
    // Return null on failure, caller will use default
    return null;
  }
}

export async function getWeatherDelay(lat: number, lon: number): Promise<number> {
  const DEFAULT_DELAY = 0; // No delay if API fails

  try {
    const weather = await fetchWeather(lat, lon);
    
    // Fallback to default if fetch failed
    if (!weather?.properties?.timeseries?.length) {
      return DEFAULT_DELAY;
    }

    const current = weather.properties.timeseries[0];
    if (!current?.data?.instant?.details) {
      return DEFAULT_DELAY;
    }

    const { weather_code, wind_speed, precipitation_rate } = current.data.instant.details;

    // Calculate delay based on conditions
    let delay = 0;

    // Weather code mapping (WMO code)
    if (weather_code >= 71 && weather_code <= 77) {
      // Snow: +60ms base
      delay += 60;
      if (precipitation_rate > 5) delay += 60; // Heavy snow
    } else if (weather_code >= 80 && weather_code <= 82) {
      // Rain: +30ms
      delay += 30;
      if (precipitation_rate > 10) delay += 30; // Heavy rain
    }

    // Wind penalty: +1ms per m/s above 15 m/s
    if (wind_speed > 15) {
      delay += Math.min((wind_speed - 15) * 2, 60);
    }

    return Math.min(delay, 120); // Cap at 120ms
  } catch (error) {
    console.error('Weather delay calculation failed:', error);
    return DEFAULT_DELAY;
  }
}

export default getWeatherDelay;

// Object export for destructuring
export const weatherClient = {
  getDelay: getWeatherDelay,
  getDelayMultiplier: (delay: number) => {
    // Convert ms delay to multiplier (e.g., 1000ms = 1.1x slower)
    return 1 + delay / 10000;
  },
};
