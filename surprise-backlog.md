# Morning Brief Surprise Backlog (ranked)
Rule: every surprise uses real, sourced data; never invented. C = new site component needed; T = content only (once the Surprise slot exists, most become T).
Slot: `surprise` key in today.json, rendered by a new SurpriseCard (see spec sent to Miyuki).

| # | Idea | Real data source | Type |
|---|------|------------------|------|
| 1 | Surprise card slot (kind/title/body/image/audio/link/source) + first surprise | n/a (infrastructure) | C |
| 2 | Russian word of the day with native audio and cruise-useful phrase | Forvo/Wiktionary audio (Commons), Lesson Library | T (audio via slot) |
| 3 | Golden hour tonight for Grad Arena shoots (exact golden-hour window + best spot) | sunrise-sunset.org / Open-Meteo, lat/lon Tallahassee | T, later C live calc |
| 4 | NASA Astronomy Picture of the Day with one-line why-it's-cool | api.nasa.gov/planetary/apod | T |
| 5 | Moon phase + "look up tonight" (ISS pass, planets visible) | USNO API, Heavens-Above / NASA Spot the Station | T |
| 6 | Cruise port preview: one real fact/photo per day for each port, counting down | Carnival itinerary for FM3V62 + Wikipedia/Wikimedia | T |
| 7 | Supplement and study streak ring (days in a row) | Calendar events / Zae check-ins | C |
| 8 | On this day: one anime / music / tech history moment | Wikipedia On This Day API (onthisday feed) | T |
| 9 | Anime drop alert: new episode of a show Zae follows airs today | AniList GraphQL airingSchedule | T |
| 10 | Tonight's best local show pulled from /fun, with walk/drive time | content/fun.json + Google Maps link | T |
| 11 | A+ flashcard of the day (tap to reveal) tied to current Core 1 lesson | A+ Academy content | C (flip) |
| 12 | Diablo's personal note: one-sentence handwritten-style note referencing a real calendar item | Google Calendar | T |
| 13 | Spanish/Russian "say it aboard" phrase matched to the day's cruise countdown | Lesson Library | T |
| 14 | Grad Arena win of the day (new review, ranking move, impressions) | Rem pulse, Search Console | T |
| 15 | Weather-smart outfit / hydration nudge when heat index > 90 | Open-Meteo apparent temperature | T |
| 16 | Weekly "you did this" recap on Sundays (lessons done, events, wins) | Calendar, Lesson Library commits, agents' logs | T |
| 17 | Birthday / anniversary reminders for people in calendar | Google Calendar | T |
| 18 | Tiny fun fact tied to Tallahassee or FSU/FAMU history | Wikipedia, cited link | T |
| 19 | Ocean/sea-state preview for cruise days (Gulf / Caribbean) | NOAA NDBC buoys, Open-Meteo marine | T |
| 20 | Countdown visual: ship path progress bar Tallahassee to port | cruise dates | C |
| 21 | Song of the day from an artist playing Tallahassee this week (embed) | fun.json + Spotify/YouTube embed | T (embed via slot link) |
| 22 | Hidden easter egg: tap Diablo's signature for a persona voice line | static | C |
| 23 | Free things today in Tallahassee (museum free days, park events) | Visit Tallahassee, city calendars | T |
| 24 | Monthly "life highlight reel" collage of past surprises | archived today.json history | C |

Rotation guide: Mon word+audio, Tue golden hour, Wed APOD, Thu anime/on-this-day, Fri tonight's show, Sat port preview, Sun recap. Override with anything time-sensitive (ISS pass, birthday, review win).
