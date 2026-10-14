# Morning Brief

Daily morning briefing for Zae.

## Content

Edit `content/today.json` for the day's greeting, calendar, project move, tip, cruise, and weather coords.

### Optional `extras.ottoman` (Ottoman lesson card)

When present and valid, an **Ottoman lesson** card renders right under the Project move card. If the key is missing or any field is invalid, nothing renders.

| Field | Type | Rule |
| --- | --- | --- |
| `lessonNumber` | integer | 1 or more, and not more than `totalLessons` |
| `totalLessons` | integer | Total lessons in the course |
| `chapterTitle` | string | Non-empty |
| `summary` | string | Non-empty, one or two sentences |
| `link` | string | `http` or `https` URL of the lesson; the card button opens it in a new tab |

```json
"extras": {
  "ottoman": {
    "lessonNumber": 2,
    "totalLessons": 16,
    "chapterTitle": "The long struggle to remake an empire, 1774–1908",
    "summary": "Lesson 2 follows the Ottoman reform era, from the defeats of the late 1700s through the Tanzimat and the constitutional fights up to 1908.",
    "link": "https://ottoman-empire-fall.vercel.app"
  }
}
```

The eyebrow reads `Ottoman lesson <lessonNumber> of <totalLessons>`. The type is `OttomanLesson` in `src/lib/types.ts`.

Daily fun events live in `content/fun.json` and render at `/fun` (the **Fun** tab: "Fun this week" Mon-Thu, "Fun this weekend" Fri-Sun, in Eastern time). `/weekend` permanently redirects to `/fun`. Schema, template (`content/fun._template.json`), examples, and the daily handoff are in [ADD-FUN.md](ADD-FUN.md).

## Local

```bash
npm install
npm run dev
```

## Deploy

Vercel project: `morning-brief` (team zaevians-projects). Public, no SSO.
