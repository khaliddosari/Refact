# حكيم · Hakeem (frontend demo)

Demo frontend for Hakeem, a proactive industrial-symbiosis platform: AI agents
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
npm run dev
```

Open http://localhost:5173. To check a production build, run `npm run build`
and then `npm run preview`.

## Stack

React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui (`base-nova`, on Base UI,
with `"rtl": true`), React Router, lucide icons, Leaflet (react-leaflet) for the
maps. Map tiles come from OpenStreetMap, so the two map screens need a
connection; everything else works offline.

## Where things live

| Path | What it holds |
| --- | --- |
| `src/lib/nav.ts` | The six header tabs: path, label, icon, page description |
| `src/lib/site.ts` | Team members (footer), the signed-in user, the locale |
| `src/lib/format.ts` | Number, date and unit formatting, and Arabic labels for every code in the data |
| `src/router.tsx` | One route per tab; the two map screens load on demand |
| `src/data/` | `hakeem-data.json` (generated), its types, and lookups |
| `scripts/build_data.py` | Rebuilds `hakeem-data.json` from the challenge zip (see below) |
| `src/pages/` | One file per tab |
| `src/components/maps/` | The shared map, the symbiosis map (الترسيات) and the tracking map (التتبع) |
| `src/components/layout/` | Header, tabs, footer, page shell |
| `src/components/brand/` | The logo lockup, its generated artwork (`logo-art.ts`), the LinkedIn glyph |
| `scripts/build_logo.py` | Rebuilds `logo-art.ts` from Thmanyah Serif Display (see below) |
| `src/index.css` | The theme (palette, glass surfaces, fonts) after the CLI-generated block |
| `public/fonts/` | Thmanyah Sans (400, 500, 700), the interface font |

## What each tab shows

| Tab | Data | What it shows |
| --- | --- | --- |
| لوحة التحكم | 06 + 07 | Savings, landfill diversion, CO₂ and suspicious trips, top opportunities, riskiest cases, the three agents and one recommendation traced end to end |
| المناقصات | 06 | Waste offers and material requests as the factories wrote them, the agent's classification (material, EWC, declared or inferred), and every match it considered |
| الترسيات | 06 | Opportunities ranked by impact, rejected pairs and why, the exchange map, factory cards, past exchanges |
| مخزوني | 07 | Declared waste records against the agent's predicted class and confidence, disclosure gaps, facilities, waste-class rules |
| عملياتي | 07 | The ranked inspection list with visible reasons and actions, how the score is computed, every trip, the compliance report |
| التتبع | 07 | Trips, approved sites with their geofences, the recorded GPS track with playback, drone sightings |

## The data

`src/data/hakeem-data.json` is generated; do not edit it by hand. To rebuild
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

## Design notes

- The look follows the navy-glass house style, moved to forest green on cream:
  translucent glass panels over a fixed green wash, with dark green "forest"
  glass for the header and footer.
- UI text uses Thmanyah Sans. It has no 600 weight, so use `font-medium` or
  `font-bold`, not `font-semibold`.
- The logo text (حكيم / Hakeem) is Thmanyah Serif Display Black with every
  optional OpenType feature on, converted to outlines so the lockup is flush
  on every side: the mark is exactly as tall as the two lines, and "Hakeem"
  is spaced to exactly the width of "حكيم". To rebuild it after changing the
  script's proportions:

  ```bash
  pip install uharfbuzz fonttools
  python scripts/build_logo.py
  ```
- Phones (below `md`): the tabs move to a fixed bottom bar
  (`components/layout/mobile-tab-bar.tsx`) with short labels from `short` in
  `lib/nav.ts`. الترسيات switches between list and map below `lg`; التتبع shows
  the map first with a swipeable trip row. Tables become lists below `sm`, and
  every control is at least 40px tall.
- Use logical classes (`ms-`, `ps-`, `text-start`, `start-0`), not physical
  ones (`ml-`, `pl-`, `text-left`), so layouts mirror correctly.
- Status uses four tones only (idle, running, done, needs a human); see
  `src/components/status-pill.tsx`.
- Add shadcn components with `npx shadcn@latest add <name>`. Restyle through
  the theme rather than by editing files in `src/components/ui`.
