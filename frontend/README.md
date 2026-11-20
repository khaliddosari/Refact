# ريفاكت (frontend demo)

Demo frontend for ريفاكت, a proactive industrial-symbiosis platform: AI agents
match one factory's waste batches with another factory's raw-material needs,
and every match waits for human approval.

The interface is Arabic only and right-to-left. The signed-in user is MODON's
team (فريق مدن): the data pack sends the agents' recommendations to that team
and ranks transport cases for its inspectors.

All figures come from the first challenge data pack (synthetic data):
challenge 06, industrial symbiosis in المدينة الصناعية الثانية بالرياض, and
challenge 07, waste classification and transport violations in المدينة
الصناعية الثانية بالدمام on 18 May 2025.

## Run it

```bash
npm install
cp .env.example .env.local     # only the hidden map pages need the Google Maps key
npm run dev
```

Open http://localhost:5173. To check a production build, run `npm run build`
and then `npm run preview`.

## Google Maps

The two map screens (الترسيات and التتبع, both among the hidden pages for now;
the الوكلاء tab shows no map and needs no key) use Google Maps. They need a
browser key in `frontend/.env.local`:

```
VITE_GOOGLE_MAPS_API_KEY=your-key
```

1. In Google Cloud Console, create a key and enable **Maps JavaScript API** and
   **Routes API** on its project (billing must be on).
2. Restrict the key under *Website restrictions* to the origins you serve from,
   for example `http://localhost:5173/*` and your production domain. A browser
   key is public by design; the restriction is what protects it.
3. Restart `npm run dev`. The key is read at build time, so build with it in
   place before deploying.

In Saudi Arabia, Google's sign-up page may point Maps-only customers to an
authorised reseller (CNTXT, iSolutions, OniGroup, Searce, SoftwareONE); the key
is then created in the same Cloud Console under the billing account they set up.

Without a key the map screens show which variable is missing; the rest of the
app works. Independently of the key, a selected exchange (الترسيات) and a
selected trip (التتبع) carry a «خرائط Google» button that opens the same route
in Google Maps itself, through Google's official URL scheme. `VITE_GOOGLE_MAP_ID` is optional: create a Map ID with a cloud-based
style (for a green and cream basemap) and set it; the default is Google's
`DEMO_MAP_ID`.

**Routes follow real roads.** Every line (an exchange between two factories, a
trip from its facility to its site, the recorded GPS track) is a driving route
from `google.maps.routes.Route.computeRoutes`; the GPS track is snapped to
the roads through its own fixes, and playback moves the vehicle along the
snapped road. If a route cannot be computed (API not enabled, no billing) the
line falls back to a straight segment and the console says why. Routes are
requested once per page visit and kept in memory only; Google's terms do not
allow storing them.

## Stack

React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui (`base-nova`, on Base UI,
with `"rtl": true`), React Router, lucide icons, Google Maps via
`@vis.gl/react-google-maps`.

## Where things live

| Path | What it holds |
| --- | --- |
| `src/lib/nav.ts` | Every page (`PAGES`: path, label, icon) and which of them are header tabs (`NAV_ITEMS`) |
| `src/lib/site.ts` | Team members (footer), the signed-in user, the locale |
| `src/lib/format.ts` | Number, date and unit formatting, and Arabic labels for every code in the data |
| `src/lib/roads.ts` | Road routes (with an in-memory cache), path geometry, snapping a GPS track and playing it back |
| `src/lib/map-colors.ts` | The theme colours as hex, for the map canvas (CSS variables do not resolve there) |
| `src/router.tsx` | One route per page, tab or not; the two map screens load on demand |
| `src/data/` | `refact-data.json` (generated), its types, and lookups |
| `scripts/build_data.py` | Rebuilds `refact-data.json` from the challenge zip (see below) |
| `src/pages/` | One file per page (`agents.tsx` is the one tab; the other six are hidden, see below) |
| `src/components/maps/` | The map, pins, road lines and the two screens' maps (`symbiosis-map`, `tracking-map`) |
| `src/hooks/use-road-routes.ts` | Road routes by id: loading, failed, or ready |
| `src/components/layout/` | Header, tabs, footer, page shell |
| `src/components/brand/` | The logo, its generated artwork (`logo-art.ts`), the LinkedIn glyph |
| `scripts/build_logo.py` | Rebuilds `logo-art.ts` from Thmanyah Serif Display (see below) |
| `src/index.css` | The theme (palette, glass surfaces, fonts) after the CLI-generated block |
| `public/fonts/` | Thmanyah Sans (400, 500, 700), the interface font |

## The tab: الوكلاء

The header has one tab, **الوكلاء** (`/`), with one card per agent. Each card
has its status, three numbers, and the four best findings (three on a phone):

| Card | Data | Numbers | Findings |
| --- | --- | --- | --- |
| وكيل المشتريات | 06 | Feasible opportunities of those considered, monthly savings, tonnes kept out of landfill | The top exchanges: material, from and to which factory, value |
| وكيل التصنيف | 07 | Records, how many are riskier than declared, how many need a human review | The records the agent worries about most: declared class to predicted class, confidence |
| وكيل التتبع | 07 | Trips, suspicious ones, the highest risk score | The riskiest trips: id, the main reason, score |

## The six hidden tabs

The first version had six tabs. They are commented out of `NAV_ITEMS` in
`src/lib/nav.ts`, not deleted: every page and route still works, and a tab
comes back when its line is uncommented. With a single tab the phone bar is not
drawn. The pages are reachable by path:

| Path | Page | Data | What it shows |
| --- | --- | --- | --- |
| `/dashboard` | لوحة التحكم | 06 + 07 | Savings, landfill diversion, CO₂ and suspicious trips, top opportunities, riskiest cases, the three agents and one recommendation traced end to end |
| `/tenders` | المناقصات | 06 | Waste offers and material requests as the factories wrote them, the agent's classification (material, EWC, declared or inferred), and every match it considered |
| `/awards` | الترسيات | 06 | Opportunities ranked by impact, rejected pairs and why, and a map of the exchanges along real roads. Factories are coloured by segment (supplier, receiver, both); selecting an exchange names and pulses its two factories, lights its route with direction arrows, and dims the rest |
| `/inventory` | مخزوني | 07 | Declared waste records against the agent's predicted class and confidence, and disclosure gaps |
| `/operations` | عملياتي | 07 | The ranked inspection list with reasons as chips, and every trip |
| `/tracking` | التتبع | 07 | Trips on the roads between facilities and approved sites (with geofences), the recorded GPS track snapped to the roads with playback, drone sightings. Selecting a trip highlights its facility and site and dims the rest |

## The data

`src/data/refact-data.json` is generated; do not edit it by hand. To rebuild
it from the challenge zip:

```bash
pip install openpyxl
python scripts/build_data.py "path/to/الحزمة الاولى من البيانات للتحديات 1 الى 10.zip"
```

The script keeps only what the screens show, converts the agents' outputs and
the simulators' working into plain JSON, and leaves out the judges' tables
(gold matches, violation labels, reference answers). Factories that did not
consent to data sharing are anonymised there, once: no name, no id, no
location, on any screen.

## Deploy (Cloudflare)

`wrangler.jsonc` serves the built app as static assets with a single-page
fallback, so routes like `/tracking` work on a direct visit.

```bash
npx wrangler login          # once
npm run build && npx wrangler deploy
```

Build with `.env.local` in place so the Maps key is baked in, and add the
deployed origin to the key's website restrictions. A custom domain is attached
in `wrangler.jsonc` (see the comment there) once you own it.

## Design notes

- The look follows the navy-glass house style, moved to forest green on cream:
  translucent glass panels over a fixed green wash, with dark green "forest"
  glass for the header and footer.
- UI text uses Thmanyah Sans. It has no 600 weight, so use `font-medium` or
  `font-bold`, not `font-semibold`.
- The logo (ريفاكت) is Thmanyah Serif Display Black with every optional
  OpenType feature on, converted to outlines so the lockup is flush on every
  side: the mark is exactly as tall as the name's ink. To rebuild it after
  changing the script's proportions:

  ```bash
  pip install uharfbuzz fonttools
  python scripts/build_logo.py
  ```
- Phones (below `md`): when there is more than one tab they move to a fixed
  bottom bar (`components/layout/mobile-tab-bar.tsx`) with short labels from
  `short` in `lib/nav.ts`; with one tab there is no bar. The agent cards stack
  in one column and switch to three side by side from `lg`. In the hidden pages,
  الترسيات switches between list and map below `lg`, and التتبع shows the map
  first with a swipeable trip row. Tables become lists below `sm`, and every
  control is at least 40px tall.
- A grid of cards needs `grid-cols-1` (a `minmax(0, 1fr)` track), not the
  implicit auto track: an auto track grows to the widest unbreakable line in a
  card and overflows a phone.
- Use logical classes (`ms-`, `ps-`, `text-start`, `start-0`), not physical
  ones (`ml-`, `pl-`, `text-left`), so layouts mirror correctly.
- Status uses four tones only (idle, running, done, needs a human); see
  `src/components/status-pill.tsx`.
- Add shadcn components with `npx shadcn@latest add <name>`. Restyle through
  the theme rather than by editing files in `src/components/ui`.
