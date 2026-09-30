export type WeatherSnapshot = {
  temperature: number;
  weatherCode: number;
  windspeed: number;
  label: string;
};

const WMO: Record<number, string> = {
  0: "Clear",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Foggy",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy showers",
  95: "Thunderstorm",
};

export function weatherLabel(code: number): string {
  return WMO[code] ?? "Weather";
}

export async function fetchTallahasseeWeather(
  lat: number,
  lon: number
): Promise<WeatherSnapshot | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=America%2FNew_York`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return null;
    const data = await res.json();
    const current = data.current_weather;
    if (!current) return null;
    return {
      temperature: Math.round(current.temperature),
      weatherCode: current.weathercode,
      windspeed: Math.round(current.windspeed),
      label: weatherLabel(current.weathercode),
    };
  } catch {
    return null;
  }
}
