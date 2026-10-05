# Blacksburg Eats

A responsive restaurant discovery app for the Blacksburg community, implementing all ten backlog features: reviews, restaurant catalog, accounts, search, map, category ratings, photos, favorites, achievements, and restaurant tags.

## Run locally

Requires Node.js 24.14 or newer (uses Node's built-in SQLite).

```sh
npm install
npm run dev
```

Open **http://localhost:5173**. For a production build, run `npm run build`, then `npm start`. Both modes serve the frontend and API together. The server binds to localhost by default.

## Demo walkthrough

1. Browse 244 mapped restaurant and cafe listings within 10 miles of Virginia Tech. Search for `Italian`, `Cabo`, or `Gilbert`, sort by distance, and use **Show more restaurants** to browse beyond the first 24 cards.
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

All Must Have, Should Have, and Could Have items are now available by request.

## New feature demo

1. Sign in, then click a restaurant's heart to save it. **Favorites** filters the catalog and map to your saved restaurants. Favorites persist with your account.
2. Choose a **Restaurant tag** to filter the catalog and map. Tags also match text searches. Tags are curated catalog attributes, not user-generated dietary guarantees.
3. Write or edit a review and optionally score **Food quality**, **Service**, and **Atmosphere** from 1–5. The restaurant shows each category's average and count. Overall rating remains a separate assessment. Existing reviews are preserved and missing category ratings are excluded from category averages.
4. Open a restaurant and choose **Add photo**. Upload a JPEG, PNG, or WebP up to 10 MB and provide a description used as accessible alternative text. The browser resizes/re-encodes images before upload; the server accepts supported image signatures up to 1 MB and stores them in SQLite. Each account can add up to ten photos per restaurant. Photos are public; only the author can remove them after confirmation. Galleries start empty until users contribute their own photos.
5. Open **Achievements** to see First bite (1 review), Local explorer (3 restaurants reviewed), Around the Burg (5), Food photographer (1 photo), and Saved a seat (1 favorite). Progress derives from current contributions, so deleting contributions can relock a badge. Achievements never gate features.

Database schema migrations run at startup and preserve existing accounts and reviews. Back up `data/eats.sqlite` along with its SQLite WAL state using a consistent SQLite backup before migrating a deployed database. Photos are stored in the same persistent database.

## Restaurant map

The catalog includes a Leaflet/OpenStreetMap map. Select a numbered marker with a click, Enter, or Space to open the existing restaurant details and reviews, including a street address and a Google Maps directions link. Search (including street addresses) filters both the map and cards. **Fit restaurants** brings matching locations back into view; **Hide map / Show map** preserves the search. Zoom buttons, touch gestures, and keyboard panning are supported. Scrolling the page does not zoom the map.

Addresses come from the official restaurant sites linked below, including [Our Daily Bread’s locations page](https://www.odbb.com/locations), [Zeppoli’s contact page](https://www.zeppolis.com/contact), and [Wine Lab’s visit page](https://www.winelab.com/visit). Approximate street-address coordinates were obtained from the [US Census geocoder](https://geocoding.geo.census.gov/geocoder/) using `Public_AR_Current` on September 22, 2026, and stored in `restaurant-locations.mjs`. Pins are not surveyed entrances. Updating these records does not alter existing accounts or reviews.

Map tiles require internet access; no API key or live geocoding is needed. If tiles fail, a retry message appears and the restaurant pins, cards, and reviews remain usable. OpenStreetMap attribution remains visible. Tile use follows the [OpenStreetMap tile policy](https://operations.osmfoundation.org/policies/tiles/); tiles are requested only for the current view, with standard browser caching.

The broader directory is a snapshot from Overture Maps Places, filtered by straight-line distance from the [Virginia Tech Blacksburg campus coordinates](https://www.facilities.vt.edu/university-building-official/building-code-compliance/building-code-related-design-criteria.html). It includes restaurant and cafe taxonomy categories, but third-party map data can have missing, duplicate, closed, or miscategorized places. Listings and positions should be checked before visiting; the app does not claim live or exhaustive coverage. The five original demo listings keep their IDs and sample reviews. Email ownership/student status is not verified, and password recovery, moderation, and production deployment are outside this demo. Fonts load from Google Fonts with system fallbacks; other app features work without third-party credentials.

To refresh the mapped catalog, run `node scripts/fetch-overture.mjs` followed by `node scripts/prepare-catalog.mjs`. The first script requires network access and the `@duckdb/node-api` development dependency. The generated `restaurant-catalog.json` is committed, so normal app startup does not query Overture. Imported records are inserted with stable IDs and do not overwrite existing account contributions.

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
