# Add the daily Fun list

The **Fun** tab (`/fun`) reads **`content/fun.json`** only. Copy the shape from `content/fun._template.json`, fill the real list, and replace `content/fun.json`. No React edits.

`/weekend` permanently redirects (308) to `/fun`, so old links still work. Morning Brief stays on `content/today.json`.

## Daily rhythm (starting Mon Oct 12, 2026, 6:39 AM ET)

| Eastern day | `mode` | `range.start` | `range.end` | Heading on the page |
| --- | --- | --- | --- | --- |
| Monday | `week` | Monday | Thursday | Fun this week |
| Tuesday | `week` | Tuesday | Thursday | Fun this week |
| Wednesday | `week` | Wednesday | Thursday | Fun this week |
| Thursday | `week` | Thursday | Thursday | Fun this week |
| Friday | `weekend` | Friday | Sunday | Fun this weekend |
| Saturday | `weekend` | Saturday | Sunday | Fun this weekend |
| Sunday | `weekend` | Sunday | Sunday | Fun this weekend |

So each morning the range runs from **today** through **Thursday** (Mon-Thu) or through **Sunday** (Fri-Sun). All dates are Eastern calendar dates, `YYYY-MM-DD`.

## Who does what

**Diablo, each morning**

1. Start from `content/fun._template.json` (or the examples below).
2. Set `mode` and `range` for today using the table above.
3. Put one object per event in `events`. Order inside a day is the order on the page.
4. Use `"events": []` when nothing fits. The page shows an empty state on purpose.
5. Send the whole file to Miyuki. Leave every `.tsx` file alone.

**Miyuki, deploy**

1. Replace `content/fun.json` with the filled file and run `npm run build`.
2. Commit on `main` and push.
3. Force a production deploy of Vercel project `morning-brief` (`prj_Rm6jA4EUlQ1jaWLiUsY6jRKiMMm0`, team `zaevians-projects`). A push alone has not always triggered one.
4. Check `https://morning-brief-zaevians-projects.vercel.app/fun`.

## Top-level fields

| Field | Required | What to put |
| --- | --- | --- |
| `mode` | yes | `"week"` (Mon-Thu) or `"weekend"` (Fri-Sun). Drives the heading. |
| `range.start` | yes | First day covered, `YYYY-MM-DD`. Normally today. |
| `range.end` | yes | Last day covered, inclusive. Thursday for `week`, Sunday for `weekend`. At most 6 days after `start`. |
| `range.label` | no | Display line, like `Mon-Thu, Oct 12-15, 2026`. If left out the page builds one (`Oct 12-15, 2026`, or `Sun, Oct 11, 2026` for one day). |
| `updatedNote` | no | Short note under the label. |
| `events` | yes | Array of events. `[]` is fine. |

### How the page uses mode and range

- **The content wins** when `range.start`/`range.end` are valid dates and `range.end` is today or later (Eastern). If `mode` is missing, it is inferred from `range.start` (Mon-Thu = `week`, Fri-Sun = `weekend`).
- **Fallback:** if the range is missing, invalid, longer than 7 days, or already over (a missed drop), the page computes mode and range from Eastern today using the table above. In that case `updatedNote` is hidden, and only events with a `date` inside the computed range still show. If there are none, the page says it is waiting on a fresh list.
- Events with a `date` before Eastern today never show. Days already past drop off the board, while the label stays as written.
- The page re-renders every 30 minutes, so the fallback and the past-event filter keep up with the clock even without a deploy.

## Event fields

| Field | Required | What to put |
| --- | --- | --- |
| `id` | recommended | Stable unique key, like `mon-venue-name-2026-10-12`. If you leave it out, the page makes one. |
| `title` | yes | Event name |
| `day` | yes* | `Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`, or `Sun`. Full names (`Monday`) and any capitalization also work. |
| `date` | strongly recommended | `YYYY-MM-DD`. When present and valid, **it decides the weekday** and overrides `day`. It also lets the page hide the event once it has passed. |
| `venue` | yes | Place name |
| `hook` | yes | One short sentence |
| `url` | yes | `http` or `https` link to the real event page. The whole card opens it in a new tab. |
| `imageUrl` | no | `https` image URL, or `null`. Anything else becomes the placeholder. |
| `tags` | no | Short labels, up to 8. Leave out `sample` on real events. |
| `startTime` | no | Display text, like `8:00 PM` |
| `neighborhood` | no | Area, like `Midtown` |
| `sample` | no | `true` only for placeholders. Omit it, or set `false`, for real events. |

\* `day` may be omitted when `date` is valid.

An event is skipped (not shown, and it does not crash the page) when `title`, `venue`, `hook`, or a usable `url` is missing, or when there is neither a valid `date` nor a valid `day`.

Events are grouped under the day of the range they fall on, in calendar order. An event whose weekday sits outside the range (for example a `Sat` event in a Mon-Thu drop with no `date`) still shows, in its own section after the range.

A tag of `sample` (any capitalization) also marks the card as a sample.

## Images

- Prefer an `https` URL. `null`, blank, `http`, or a broken link shows the built-in placeholder (tinted per weekday), so the card still looks finished.
- Common listing CDNs are optimized with `next/image` (Eventbrite / evbuc, Ticketmaster, Ticketweb, AXS, See Tickets, DICE, Bandsintown, Songkick, Resident Advisor, Universe, Meetup, Cloudinary, imgix, Facebook/Instagram CDNs, Google user content, Squarespace, WordPress.com, Wikimedia, Unsplash, Spotify art).
- Any other `https` host still displays, through a normal image tag. A new host does not fail `npm run build`.
- Adding a host to the optimizer is optional and is a code change in `src/lib/image-hosts.ts`. Daily drops do not need it.

## Full example: a weekday (Monday)

```json
{
  "mode": "week",
  "range": {
    "start": "2026-10-12",
    "end": "2026-10-15",
    "label": "Mon-Thu, Oct 12-15, 2026"
  },
  "updatedNote": "Monday drop from Diablo.",
  "events": [
    {
      "id": "mon-trivia-venue-2026-10-12",
      "title": "Trivia night",
      "day": "Mon",
      "date": "2026-10-12",
      "venue": "Venue name",
      "neighborhood": "Midtown",
      "startTime": "7:30 PM",
      "hook": "Low-key team trivia, easy weeknight win.",
      "url": "https://example.com/replace-with-the-real-event-page",
      "imageUrl": null,
      "tags": ["trivia"],
      "sample": false
    },
    {
      "id": "thu-band-venue-2026-10-15",
      "title": "Band name",
      "day": "Thu",
      "date": "2026-10-15",
      "venue": "Venue name",
      "startTime": "9:00 PM",
      "hook": "Late set, small room, easy yes.",
      "url": "https://example.com/replace-with-the-real-event-page",
      "imageUrl": "https://images.example.com/replace-with-a-real-image.jpg",
      "tags": ["live music"],
      "sample": false
    }
  ]
}
```

## Full example: a weekend day (Friday)

```json
{
  "mode": "weekend",
  "range": {
    "start": "2026-10-16",
    "end": "2026-10-18",
    "label": "Fri-Sun, Oct 16-18, 2026"
  },
  "updatedNote": "Friday drop from Diablo.",
  "events": [
    {
      "id": "fri-band-venue-2026-10-16",
      "title": "Band name",
      "day": "Fri",
      "date": "2026-10-16",
      "venue": "Venue name",
      "neighborhood": "Downtown",
      "startTime": "8:00 PM",
      "hook": "Friday set to kick off the weekend.",
      "url": "https://example.com/replace-with-the-real-event-page",
      "imageUrl": null,
      "tags": ["live music"],
      "sample": false
    },
    {
      "id": "sun-market-2026-10-18",
      "title": "Farmers market",
      "day": "Sun",
      "date": "2026-10-18",
      "venue": "Market name",
      "startTime": "9:00 AM",
      "hook": "Coffee, produce, and a slow Sunday morning.",
      "url": "https://example.com/replace-with-the-real-event-page",
      "imageUrl": null,
      "tags": ["outdoors", "food"],
      "sample": false
    }
  ]
}
```

## Quiet day

```json
{
  "mode": "weekend",
  "range": { "start": "2026-10-11", "end": "2026-10-11", "label": "Sun, Oct 11, 2026" },
  "updatedNote": "Quiet Sunday.",
  "events": []
}
```

## Legacy weekend files

An old-style file with `weekendRange: { label, startDate, endDate }` and no `range` still loads as `mode: "weekend"`, but new drops should use `mode` + `range`.
