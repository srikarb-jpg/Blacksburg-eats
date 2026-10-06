# Blacksburg Eats

Blacksburg Eats helps Virginia Tech students and other local diners discover places to eat, compare community reviews, and share their own experiences. It combines a searchable restaurant catalog with a map, ratings, photos, favorites, and simple account features.

**Repository:** [github.com/srikarb-jpg/Blacksburg-eats](https://github.com/srikarb-jpg/Blacksburg-eats)

## Team

| Team member | Email |
| --- | --- |
| Srikar Burugula | srikarb@vt.edu|
| Kayden Moraes | **Email needed before submission** |
| Siddharth Dhar | **Email needed before submission** |
| Anvit Koppella | **Email needed before submission** |


## The problem and our solution

Students who are new to Blacksburg may know they want a nearby meal but not which place fits their tastes or plans. A single overall star score can also hide whether diners liked the food, service, or atmosphere. Blacksburg Eats focuses on the Virginia Tech area and lets people search local listings, inspect them on a map, and read written reviews with optional ratings for those three categories.

The app is a **working project prototype**, not a verified directory or a claim that its ratings are more accurate than those on established platforms. Anyone can create an account; the app does not verify Virginia Tech enrollment or a restaurant visit.

## What the app can do

The original backlog grouped the work by priority. All ten feature areas are represented in the app:

| Priority | Features |
| --- | --- |
| Must have | Restaurant catalog, search, user accounts, written reviews and overall ratings |
| Should have | Interactive map, food/service/atmosphere ratings, restaurant photos |
| Could have | Favorites, achievement badges, restaurant tags |

You can search by restaurant name, cuisine, address, or tag; sort by name, rating, or distance from Virginia Tech; and select a card or map pin to see details and reviews. The map clusters nearby pins when many places are visible. The catalog currently contains **244 mapped listings within 10 straight-line miles** of the Virginia Tech Blacksburg campus. The first 24 cards appear immediately; **Show more restaurants** reveals the rest.

After signing in, you can write one review per restaurant and later edit or delete it. The overall score and optional category scores are separate. You can also save favorites, add a described photo, and track badges based on your contributions. Five original demo restaurants have fictional reviews clearly marked **Sample**. Newer listings start without reviews.

## Run it on your computer

You need:

- [Node.js 24.14 or newer](https://nodejs.org/) and npm. The server uses Node's built-in SQLite support.
- A modern web browser and an internet connection for the OpenStreetMap background tiles. The cards and review features still work if tiles fail.

From the repository folder, run:

```sh
npm ci
npm run dev
```

Open **http://localhost:5173** in your browser. `localhost` means the app is running on your own computer; this command does not publish it to the internet. Stop the server with **Ctrl+C**.

For a compiled build that still runs locally:

```sh
npm run build
npm start
```

The Node server serves both the frontend and `/api` routes, so you do not need a separate API service, database installation, map key, or `.env` file. On first run, the server creates `data/eats.sqlite` and inserts the catalog and labeled sample reviews. The `data/` directory is ignored by Git, so local accounts, reviews, favorites, and photos stay on that computer unless its database is backed up and moved.

### Configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | HTTP port | `5173` |
| `DB_PATH` | SQLite database file | `data/eats.sqlite` |
| `COOKIE_SECURE` | Set to `1` when serving behind HTTPS | Unset |

For example, in PowerShell: `$env:PORT=5180; npm run dev`. The current server binds to `127.0.0.1`; public hosting requires a separate deployment and HTTPS configuration.

## A quick demo

1. Search for `Italian`, choose **Nearest Virginia Tech**, and select a restaurant card or map pin.
2. Read the reviews and optional food, service, and atmosphere scores. Use **Get directions** for its mapped location.
3. Select **Sign in → Try the demo account**. No email is needed for a fresh demo session.
4. Write a review, give an overall rating, and optionally add category scores and a photo.
5. Save the restaurant as a favorite, use the **Favorites** filter, then open **My reviews** to edit or delete your review.

Each demo sign-in creates a new demo account. Its data remains in the local SQLite database until that database is removed. Registered users can sign out and sign back in with their email and password.

## How it is built

- **Frontend:** HTML, CSS, and JavaScript bundled by [Vite](https://vite.dev/). The layout adapts to desktop and mobile screens.
- **Backend:** A Node.js HTTP server in `server.mjs` handles the JSON API, accounts, sessions, reviews, favorites, photos, and static files.
- **Database:** SQLite stores app data in `data/eats.sqlite`. Passwords are protected with salted `scrypt` hashes; sessions use HttpOnly, SameSite cookies.
- **Map:** [Leaflet](https://leafletjs.com/) with marker clustering and [OpenStreetMap](https://www.openstreetmap.org/copyright) tiles. A marker opens the same details as a restaurant card.
- **Restaurant data:** The five original demo entries have curated information and approximate geocoded positions. Additional entries come from a committed [Overture Maps Places](https://docs.overturemaps.org/guides/places/) snapshot. The app does not download the whole catalog at startup.

The interface includes labeled forms, visible keyboard focus, a skip link, status messages, and keyboard-accessible restaurant pins. These design choices improve accessibility, but automated checks alone do not certify full WCAG compliance.

### Project layout

```text
index.html                    Page structure
src/                          Frontend logic and styles
server.mjs                    HTTP server and core API
features.mjs                  Favorites, photos, tags, and achievements API
restaurant-catalog.json       Imported restaurant snapshot
restaurant-locations.mjs      Original curated locations
scripts/                      Catalog refresh scripts
tests/                        Browser and API tests
data/                         Local SQLite database (created at runtime; ignored by Git)
```

To refresh the mapped snapshot, run `node scripts/fetch-overture.mjs` and then `node scripts/prepare-catalog.mjs`. That task needs internet access and the development dependency `@duckdb/node-api`. It is **not** required to run or demo the committed app. Imported place IDs remain stable so refreshing the catalog does not replace existing user contributions.

## Test the project

```sh
npm run build
npm test
```

The tests use Playwright and Google Chrome. If Chrome is not installed, install it before running `npm test`. Playwright starts the app on port `5174` with a separate test database. Tests cover search, reviews, accounts, validation, favorites, photos, map interaction, mobile layout, and selected accessibility rules with axe-core. Test screenshots go to `test-results/`, which is ignored by Git. Manual keyboard and screen-reader testing is still worthwhile.

## Known limitations and future work

The [GitHub issue tracker](https://github.com/srikarb-jpg/Blacksburg-eats/issues) is the place to record and prioritize bugs and future features. Good initial issues for this project are:

1. **Verify and refresh restaurant listings:** Map data may omit places or include closed, duplicate, or miscategorized businesses. Names, addresses, and locations should be checked before visiting.
2. **Verify community contributions:** Accounts do not prove student status or a restaurant visit, and there is no moderation or abuse-reporting workflow.
3. **Add budget and discovery details:** The original requirements survey showed interest in student discounts, price/value, portion size, and “best for” tags. These are not fully implemented.
4. **Conduct a usability study:** The project has automated browser and accessibility checks, but no documented participant-based study of the finished app.
5. **Prepare public deployment:** The current server is local-only. Internet hosting needs HTTPS, persistent backups, operational monitoring, and a deployment configuration.

These are proposed issue topics; they are not links to issues that have already been filed. See the [final report](Blacksburg_Eats_Final_Report.docx) for the original problem, survey findings, design decisions, and fuller discussion of limitations.

## Data and attribution

Restaurant positions are approximate; a pin is not necessarily a surveyed entrance. The ten-mile boundary is a straight-line radius from the [Virginia Tech Blacksburg campus coordinates](https://www.facilities.vt.edu/university-building-official/building-code-compliance/building-code-related-design-criteria.html), not a driving distance. The larger directory is a dated Overture snapshot and cannot guarantee complete or current coverage. The map uses OpenStreetMap tiles with on-map attribution. No live menu prices, opening hours, or imported third-party ratings are supplied by the app.

The five original demo restaurants were checked against their sites: [Cabo Fish Taco](https://www.cabofishtaco.com/blacksburg/), [Gillies](https://gilliesrestaurant.com/), [Our Daily Bread](https://www.odbb.com/blacksburg), [Zeppoli's](https://www.zeppolis.com/our-story), and [Blacksburg Wine Lab](https://www.winelab.com/eat).
