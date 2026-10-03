# Date Me

Swipe right on date ideas, not people. A phone-first web app with no server and no build step; it runs as plain files on GitHub Pages.

## Files

| File | What it does |
|---|---|
| `index.html` | The page and every screen |
| `css/style.css` | Look and feel (light and dark) |
| `js/ideas.js` | The built-in library of 252 tagged date ideas across 12 interests (key guide at the top) |
| `js/engine.js` | Idea sources, filtering, scoring, "why it fits" reasons |
| `js/location.js` | City/zip lookup, nearby features scan, weather, busy-server fallback |
| `js/spots.js` | Real named places near you (nearest bowling alley, trailhead, sushi...) per idea |
| `js/ai.js` | ✨ AI planner: sends quiz answers (never the name) + area to the date-me-ai worker, gets 5 custom ideas back |
| `js/shop.js` | "Get the kit" (Amazon), "Book it" (GetYourGuide), "Find tickets" (Ticketmaster) buttons; affiliate IDs go in `AFFILIATE` at the top |
| `js/store.js` | Profiles, saved ideas and AI ideas in localStorage |
| `js/app.js` | Quiz, swipe deck, saved list, spin, filters, people |
| `tests/engine-test.js` | `node tests/engine-test.js`: headless checks of the engine |
| `tests/seed.html` | Loads a sample profile for screenshots (`?view=deck|saved|spin|filters|people|idea`) |

## Free services it calls (no keys)

- **OpenStreetMap Nominatim**: turns a city or zip into a map point
- **Overpass**: counts lakes, peaks, trails, beaches, rivers, hot springs and ski areas nearby, and finds the nearest real spot for each card. The public servers are often busy, so the app tries backups and caches answers for a week.
- **Open-Meteo**: today's weather and elevation

## AI planner

The ✨ button calls a Cloudflare Worker (`../date-me-ai`, live at date-me-ai.52bulls.workers.dev) that holds the Claude API key as a secret and asks Claude (with web search) for five ideas. Daily caps: 8 plans per phone, 100 overall (`wrangler.jsonc` vars). Set the key with `SET-DATEME-AI-KEY.bat`; redeploy with `DEPLOY-DATEME-AI.bat`. Practice mode with no cost: set localStorage `dateme:aimock` to `1`.

## Adding more idea sources

Register another source in its own file and add a `<script>` tag after `ideas.js`. The format is documented at the top of `js/engine.js`. Any idea that carries a `place: { name, url }` shows a 📍 link on its card. If a source fails or times out, the others keep working.

## Deploying

Push the folder to a GitHub repo and turn on Pages (main branch, root). There's nothing to build.
