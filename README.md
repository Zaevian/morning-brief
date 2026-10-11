# Morning Brief

Daily morning briefing for Zae.

## Content

Edit `content/today.json` for the day's greeting, calendar, project move, tip, cruise, and weather coords.

Daily fun events live in `content/fun.json` and render at `/fun` (the **Fun** tab: "Fun this week" Mon-Thu, "Fun this weekend" Fri-Sun, in Eastern time). `/weekend` permanently redirects to `/fun`. Schema, template (`content/fun._template.json`), examples, and the daily handoff are in [ADD-FUN.md](ADD-FUN.md).

## Local

```bash
npm install
npm run dev
```

## Deploy

Vercel project: `morning-brief` (team zaevians-projects). Public, no SSO.
