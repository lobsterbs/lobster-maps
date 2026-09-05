// Weather integration: Yr.no (Norwegian Meteorological Institute)
// Free API, no auth needed, high accuracy for Norway

export interface WeatherData {
  temperature: number; // Celsius
  windSpeed: number; // m/s
  precipitation: number; // mm
  condition: 'clear' | 'rain' | 'snow' | 'fog' | 'wind' | 'extreme';
  visibility: number; // meters
  confidence: number; // 0-1, how confident is this forecast
}

export class WeatherClient {
  private cache: Map<string, { data: WeatherData; time: number }> = new Map();
  private cacheExpiry = 600000; // 10 minutes

  /**
   * Get current weather for a location
   * Uses Yr.no JSON API (no auth required)
   */
  async getWeather(lat: number, lng: number): Promise<WeatherData | null> {
    const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.time < this.cacheExpiry) {
      return cached.data;
    }

    try {
      // Yr.no API endpoint (free, no key needed)
      const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lng}`;

      const response = await fetch(url, {
        headers: { 'User-Agent': 'LobsterMaps/1.0' },
      });

      if (!response.ok) {
        console.warn(`Yr.no error: ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      const currentWeather = this.parseYrForecast(data);

      // Cache result
      this.cache.set(cacheKey, {
        data: currentWeather,
        time: Date.now(),
      });

      return currentWeather;
    } catch (err) {
      console.error('Weather fetch error:', err);
      return null;
    }
  }

  /**
   * Get delay multiplier for weather conditions
   * E.g., rain adds 10-20% delay, snow adds 30-50%
   */
  getDelayMultiplier(weather: WeatherData | null): number {
    if (!weather) return 1.0;

    let multiplier = 1.0;

    // Temperature effects
    if (weather.temperature < -5) {
      multiplier *= 1.15; // Ice risk
    } else if (weather.temperature < 0) {
      multiplier *= 1.08; // Cold, slippery
    }

    // Precipitation effects
    if (weather.condition === 'snow') {
      multiplier *= 1.4; // Major delay
    } else if (weather.condition === 'rain') {
      multiplier *= 1.15; // Moderate delay
    }

    // Wind effects (>10 m/s is significant)
    if (weather.windSpeed > 15) {
      multiplier *= 1.1;
    }

    // Visibility (fog, heavy snow)
    if (weather.visibility < 500) {
      multiplier *= 1.2;
    }

    // Extreme weather
    if (weather.condition === 'extreme') {
      multiplier = 2.0; // Double time or avoid completely
    }

    return Math.min(multiplier, 2.5); // Cap at 2.5x
  }

  private parseYrForecast(data: any): WeatherData {
    // Extract current weather from Yr.no compact format
    // Yr returns timeseries, take the first (most current)
    const current = data.properties?.timeseries?.[0]?.data?.instant?.details || {};
    const next1h = data.properties?.timeseries?.[0]?.data?.next_1_hours?.details || {};

    const temp = current.air_temperature ?? 15;
    const wind = current.wind_speed ?? 0;
    const precip = next1h.precipitation_amount ?? 0;
    const code = data.properties?.timeseries?.[0]?.data?.next_1_hours?.summary?.symbol_code || '';

    // Map Yr.no symbol codes to conditions
    let condition: WeatherData['condition'] = 'clear';
    if (code.includes('rain')) condition = 'rain';
    if (code.includes('snow')) condition = 'snow';
    if (code.includes('fog')) condition = 'fog';
    if (code.includes('thunderstorm')) condition = 'extreme';
    if (wind > 15) condition = 'wind';

    return {
      temperature: temp,
      windSpeed: wind,
      precipitation: precip,
      condition,
      visibility: this.estimateVisibility(code, temp),
      confidence: 0.95, // Yr.no is very accurate
    };
  }

  private estimateVisibility(code: string, temp: number): number {
    if (code.includes('fog')) return 200;
    if (code.includes('snow') && temp < -10) return 500;
    if (code.includes('heavy_rain')) return 1000;
    return 10000; // Good visibility
  }
}

export const weatherClient = new WeatherClient();
