import type { WeatherSnapshot } from "@/lib/weather";

export function WeatherCard({
  place,
  weather,
}: {
  place: string;
  weather: WeatherSnapshot | null;
}) {
  return (
    <section className="card p-5 sm:p-6">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)] mb-2">
        Weather
      </p>
      <h2 className="text-lg font-semibold mb-3">{place}</h2>
      {weather ? (
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-4xl font-semibold tracking-tight">
              {weather.temperature}°F
            </p>
            <p className="text-[var(--muted)] mt-1">{weather.label}</p>
          </div>
          <p className="text-sm text-[var(--muted)]">
            Wind {weather.windspeed} mph
          </p>
        </div>
      ) : (
        <p className="text-[var(--muted)]">Weather unavailable right now.</p>
      )}
    </section>
  );
}
