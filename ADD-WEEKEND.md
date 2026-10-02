# Add a weekend

Weekend Fun reads **`content/weekend.json`** only. Copy the shape from `content/weekend._template.json`, fill the real list, and replace `content/weekend.json`. No React edits.

The page is `/weekend`. Morning Brief stays on `content/today.json`.

## Who does what

**Chika / Diablo, each Thursday**

1. Open `content/weekend._template.json` if you want a blank shape.
2. Edit `content/weekend.json` (this is the file the site loads).
3. Set `weekendRange` for the coming Fri-Sun.
4. Put one object per event in `events`. Order inside a day is the order on the page.
5. Use `"events": []` when the weekend is quiet. The page shows an empty state on purpose.
6. Send the file to Miyuki. Leave every `.tsx` file alone.

**Miyuki, deploy**

1. Replace `content/weekend.json` with the filled file.
2. Commit that change on `main`.
3. Push to GitHub. Vercel project `morning-brief` (team `zaevians-projects`) deploys production from `main`.
4. Check `https://morning-brief-zaevians-projects.vercel.app/weekend`.

A pull request merged into `main` is the same deploy path.

## weekendRange

| Field | Required | What to put |
| --- | --- | --- |
| `label` | yes | Display line, like `Oct 3-5, 2026` |
| `startDate` | no | Friday as `YYYY-MM-DD` |
| `endDate` | no | Sunday as `YYYY-MM-DD` |
| `updatedNote` | no | Short note under the label. Who updated it, or "Thursday drop". |

If `label` is missing, the page falls back to "This weekend".

## Event fields

| Field | Required | What to put |
| --- | --- | --- |
| `id` | recommended | Stable unique key, like `fri-venue-name`. If you omit it, the page makes one. |
| `title` | yes | Event name |
| `day` | yes | Exactly `Fri`, `Sat`, or `Sun` |
| `date` | no | `YYYY-MM-DD` for that day |
| `venue` | yes | Place name |
| `hook` | yes | One short sentence |
| `url` | yes | `http` or `https` link to the real event page. The whole card opens it in a new tab. |
| `imageUrl` | no | `https` image URL, or `null`. Anything else becomes the placeholder. |
| `tags` | no | Short labels. Leave out `sample` on real events. |
| `startTime` | no | Display text, like `8:00 PM` |
| `neighborhood` | no | Area, like `Midtown` |
| `sample` | no | `true` only for placeholders. Omit it, or set `false`, for real events. |

An event is skipped (not shown, and it does not crash the page) when `title`, `day`, `venue`, `hook`, or a usable `url` is missing, or when `day` is not `Fri`, `Sat`, or `Sun`.

A tag of `sample` (any capitalization) also marks the card as a sample.

## Images

- Prefer an `https` URL. `null`, blank, `http`, or a broken link shows the built-in placeholder, so the card still looks finished.
- Common listing CDNs are optimized with `next/image` (Eventbrite / evbuc, Ticketmaster, Ticketweb, AXS, See Tickets, DICE, Bandsintown, Songkick, Resident Advisor, Universe, Meetup, Cloudinary, imgix, Facebook/Instagram CDNs, Google user content, Squarespace, WordPress.com, Wikimedia, Unsplash, Spotify art).
- Any other `https` host still displays, through a normal image tag. A new host does not fail `npm run build`.
- Adding a host to the optimizer is optional and is a code change: edit `src/lib/image-hosts.ts`. Thursday drops do not need that.

## Samples already in the repo

`content/weekend.json` ships with three SAMPLE cards for Fri-Sun Oct 3-5, 2026. Titles start with `SAMPLE`, `sample` is `true`, pictures are `null`, and links point at `example.com` placeholders. Replace the whole `events` array when the real list is ready. Do not leave `sample: true` on a real event.

## Quiet weekend

```json
{
  "weekendRange": {
    "label": "Oct 10-12, 2026",
    "startDate": "2026-10-10",
    "endDate": "2026-10-12",
    "updatedNote": "Thursday drop. Quiet weekend."
  },
  "events": []
}
```

## One real event

```json
{
  "id": "sat-venue-short-name",
  "title": "Band name",
  "day": "Sat",
  "date": "2026-10-11",
  "venue": "Venue name",
  "neighborhood": "Midtown",
  "startTime": "9:00 PM",
  "hook": "Late set, small room, easy yes.",
  "url": "https://example.com/replace-with-the-real-event-page",
  "imageUrl": null,
  "tags": ["live music"],
  "sample": false
}
```

Put that object inside `events`. Use the real event page for `url`. Use a real `https` image or `null`.
