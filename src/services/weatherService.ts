export interface Location {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

export interface WeatherData {
  current: {
    temp: number;
    windSpeed: number;
    humidity: number;
    weatherCode: number;
    time: string;
    isDay: boolean;
    apparentTemp: number;
    pressure: number;
  };
  daily: {
    time: string[];
    weatherCode: number[];
    tempMax: number[];
    tempMin: number[];
    uvIndex: number[];
  };
}

export async function searchCities(query: string): Promise<Location[]> {
  if (!query || query.length < 2) return [];
  
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
  );
  const data = await response.json();
  
  return (data.results || []).map((item: any) => ({
    name: item.name,
    latitude: item.latitude,
    longitude: item.longitude,
    country: item.country,
    admin1: item.admin1
  }));
}

export async function getWeatherData(lat: number, lon: number): Promise<WeatherData> {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,surface_pressure&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto`
  );
  const data = await response.json();
  
  return {
    current: {
      temp: data.current.temperature_2m,
      apparentTemp: data.current.apparent_temperature,
      windSpeed: data.current.wind_speed_10m,
      humidity: data.current.relative_humidity_2m,
      pressure: data.current.surface_pressure,
      weatherCode: data.current.weather_code,
      time: data.current.time,
      isDay: data.current.is_day === 1,
    },
    daily: {
      time: data.daily.time,
      weatherCode: data.daily.weather_code,
      tempMax: data.daily.temperature_2m_max,
      tempMin: data.daily.temperature_2m_min,
      uvIndex: data.daily.uv_index_max,
    }
  };
}

export function getWeatherDescription(code: number): { text: string; icon: string } {
  // WMO Weather interpretation codes (WW)
  const map: Record<number, { text: string; icon: string }> = {
    0: { text: "Clear sky", icon: "Sun" },
    1: { text: "Mainly clear", icon: "CloudSun" },
    2: { text: "Partly cloudy", icon: "CloudSun" },
    3: { text: "Overcast", icon: "Cloud" },
    45: { text: "Fog", icon: "CloudFog" },
    48: { text: "Depositing rime fog", icon: "CloudFog" },
    51: { text: "Light drizzle", icon: "CloudDrizzle" },
    53: { text: "Moderate drizzle", icon: "CloudDrizzle" },
    55: { text: "Dense drizzle", icon: "CloudDrizzle" },
    61: { text: "Slight rain", icon: "CloudRain" },
    63: { text: "Moderate rain", icon: "CloudRain" },
    65: { text: "Heavy rain", icon: "CloudRain" },
    71: { text: "Slight snow", icon: "CloudSnow" },
    73: { text: "Moderate snow", icon: "CloudSnow" },
    75: { text: "Heavy snow", icon: "CloudSnow" },
    80: { text: "Slight rain showers", icon: "CloudRain" },
    81: { text: "Moderate rain showers", icon: "CloudRain" },
    82: { text: "Violent rain showers", icon: "CloudRain" },
    95: { text: "Thunderstorm", icon: "CloudLightning" },
    96: { text: "Thunderstorm with slight hail", icon: "CloudLightning" },
    99: { text: "Thunderstorm with heavy hail", icon: "CloudLightning" },
  };
  
  return map[code] || { text: "Unknown", icon: "Cloud" };
}
