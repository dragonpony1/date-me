# Date Me

Swipe right on date ideas, not people. A phone-first web app with no server and no build step; it runs as plain files on GitHub Pages.

## Files

| File | What it does |
|---|---|
| `index.html` | The page and every screen |
| `css/style.css` | Look and feel (light and dark) |
| `js/ideas.js` | The built-in library of 195 tagged date ideas (key guide at the top) |
| `js/engine.js` | Idea sources, filtering, scoring, "why it fits" reasons |
| `js/location.js` | City/zip lookup, nearby features scan, weather |
| `js/store.js` | Profiles and saved ideas in localStorage |
| `js/app.js` | Quiz, swipe deck, saved list, spin, filters, people |
| `tests/engine-test.js` | `node tests/engine-test.js`: headless checks of the engine |
| `tests/seed.html` | Loads a sample profile for screenshots (`?view=deck|saved|spin|filters|people|idea`) |

## Free services it calls (no keys)

- **OpenStreetMap Nominatim**: turns a city or zip into a map point
- **Overpass**: counts lakes, peaks, trails, beaches, rivers, hot springs and ski areas nearby
- **Open-Meteo**: today's weather and elevation

## Adding real places or AI ideas later

Register another source in its own file and add a `<script>` tag after `ideas.js`. The format is documented at the top of `js/engine.js`. Any idea that carries a `place: { name, url }` shows a 📍 link on its card. If a source fails or times out, the others keep working.

## Deploying

Push the folder to a GitHub repo and turn on Pages (main branch, root). There's nothing to build.
