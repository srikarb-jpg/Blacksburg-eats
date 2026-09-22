# Blacksburg Eats

A responsive restaurant discovery app for the Blacksburg community, implementing the four Must Have features from the supplied backlog: reviews (#5), local restaurant catalog (#6), accounts/authentication (#8), and search (#9), plus the interactive map (#7) requested afterward.

## Run locally

Requires Node.js 24.14 or newer (uses Node's built-in SQLite).

```sh
npm install
npm run dev
```

Open **http://localhost:5173**. For a production build, run `npm run build`, then `npm start`. Both modes serve the frontend and API together. The server binds to localhost by default.

## Demo walkthrough

1. Browse the five local restaurant entries. Search for `Italian`, `Cabo`, or `Gilbert` and try the sort control.
2. Open a restaurant to read reviews and see the average overall score.
3. Choose **Sign in → Try the demo account**, or create an account with an email and password. No external service is needed.
4. Write a review with a 1–5 overall rating. The average score and count update immediately.
5. Use **My reviews** to find your contribution. Edit it, reload to verify persistence, or delete it using the confirmation step.
6. Sign out and sign back into a registered account to demonstrate authentication.

Each demo sign-in creates a fresh isolated demo user; the session survives reloads for seven days. Create a registered account to sign in again after signing out. Seed reviews are fictional and visibly marked **Sample**. User reviews are stored separately from seeded reviews and can only be changed by their author.

## Scope and implementation

- Catalog, restaurant details, case-insensitive search across name/cuisine/location/description, empty states, and sorting.
- Registration, sign-in/out, unique emails, password hashing with scrypt and per-user salts, server-side sessions, HttpOnly/SameSite cookies, origin checks, authentication throttling, and server-side validation.
- One review per account per restaurant; creating again updates that review. Scores are calculated from stored reviews with equal weight and rounded to one decimal.
- SQLite persistence at `data/eats.sqlite`; the database is excluded from git. `DB_PATH` and `PORT` override defaults. Set `COOKIE_SECURE=1` behind HTTPS.
- Accessible native dialog and forms, visible keyboard focus, skip link, live status messages, radio-group ratings, responsive layout, and reduced-motion support.

The original backlog governs release scope, with the map added by explicit follow-up request. Although the problem statement discusses separate category ratings, that feature remains excluded. Restaurant photos, favorites, badges, and tags are also excluded. Cuisine is basic catalog information used for search, not a tagging feature.

## Restaurant map

The catalog includes a Leaflet/OpenStreetMap map. Select a numbered marker with a click, Enter, or Space to open the existing restaurant details and reviews, including a street address and a Google Maps directions link. Search (including street addresses) filters both the map and cards. **Fit restaurants** brings matching locations back into view; **Hide map / Show map** preserves the search. Zoom buttons, touch gestures, and keyboard panning are supported. Scrolling the page does not zoom the map.

Addresses come from the official restaurant sites linked below, including [Our Daily Bread’s locations page](https://www.odbb.com/locations), [Zeppoli’s contact page](https://www.zeppolis.com/contact), and [Wine Lab’s visit page](https://www.winelab.com/visit). Approximate street-address coordinates were obtained from the [US Census geocoder](https://geocoding.geo.census.gov/geocoder/) using `Public_AR_Current` on September 22, 2026, and stored in `restaurant-locations.mjs`. Pins are not surveyed entrances. Updating these records does not alter existing accounts or reviews.

Map tiles require internet access; no API key or live geocoding is needed. If tiles fail, a retry message appears and the restaurant pins, cards, and reviews remain usable. OpenStreetMap attribution remains visible. Tile use follows the [OpenStreetMap tile policy](https://operations.osmfoundation.org/policies/tiles/); tiles are requested only for the current view, with standard browser caching.

This is a local MVP demo, not a full directory of every Blacksburg restaurant. Email ownership/student status is not verified, and password recovery, moderation, and production deployment are outside this must-have demo. Fonts load from Google Fonts with system fallbacks; other app features work without third-party credentials.

## Restaurant sources

Names and brief descriptions were checked against official pages on September 22, 2026. No live prices, hours, or real-world ratings are asserted.

- [Cabo Fish Taco](https://www.cabofishtaco.com/blacksburg/)
- [Gillies](https://gilliesrestaurant.com/)
- [Our Daily Bread](https://www.odbb.com/blacksburg)
- [Zeppoli’s](https://www.zeppolis.com/our-story)
- [Blacksburg Wine Lab](https://www.winelab.com/eat)

## Verification

```sh
npm run build
npm test
```

Playwright uses installed Google Chrome and a separate test database on port 5174. Tests cover search and empty states, registration/sign-in, session persistence, review create/edit/delete, demo access, unauthorized requests, invalid ratings, cross-origin writes, HTML escaping, desktop/mobile overflow, and axe WCAG A/AA scans of the catalog, dialogs, and forms. Screenshots are written to `test-results/`. Automated accessibility checks supplement, rather than replace, manual assistive-technology testing.
