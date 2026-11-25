# Refact (ريفاكت)

Three AI agents that turn factory waste into a market, and follow the waste until it arrives.

Refact is a proactive industrial symbiosis platform for the Saudi Authority for Industrial Cities and Technology Zones (MODON). It classifies waste before it moves, matches it to a nearby factory that needs the same material, and tracks the trucks that carry it. Nothing reaches a factory until the MODON team approves it.

Built by our team for the aqentX Riyadh hackathon, Smart Cities track, challenges 6 and 7.

**Live demo:** https://refact.khalid-ai.dev

## The problem

- **Challenge 6, wasted exchange opportunities.** A plastics factory pays to get rid of 40 tonnes of HDPE offcuts a month. A pipes factory 4.1 km away buys 35 tonnes of PE granules a month from the market. There is no shared rule that links waste to needs and measures whether the swap is worth it.
- **Challenge 7, hard to monitor waste transport.** A drum of used oil gets logged as "general waste", moved in an unlicensed vehicle and dumped outside approved sites. Today's follow-up is paperwork and periodic inspection, so the mistake is found after the damage.

For scale: 94% of Saudi waste is landfilled today, the national target is to divert 90% from landfill by 2040, and MODON serves more than 7,700 facilities across more than 35 industrial cities.

## The three agents

| Agent | Challenge | What it does |
| --- | --- | --- |
| Classification | 7 | Turns a free-text waste description into a material code and an EWC waste code. Flags records that were classified incorrectly. Sends anything under 70% confidence to a human. |
| Procurement | 6 | Matches waste to another factory's needs, calculates savings, tonnes kept out of landfill and CO₂, and rejects any match that breaks the rules (hazardous materials, licensing, quality grade, factories that did not consent to share data). |
| Tracking | 7 | Checks that waste reached its destination. Follows the route, weights and drone sightings, combines 8 risk signals and ranks cases for the inspection team. |

**Human in the loop:** the MODON team approves every opportunity and every drafted introduction before anything is sent to the factories.

## What the demo shows

Figures below come from the challenge data pack (synthetic data) and the solution deck.

- 7 of MODON's 9 example exchanges are feasible and meet the requirements, worth 288,654 SAR a month, keeping 395 tonnes a month out of landfill and avoiding 415 tonnes of CO₂ a month.
- The best exchange, HDPE plastic, saves 103,863 SAR a month.
- Matching returns the reference answers with 100% Precision@5, against 60% for text similarity alone.
- The riskiest truck, T-5523, stopped for 40 minutes outside approved zones, was seen dumping drums, declared its waste "general" while the agent predicted "hazardous" with 91% confidence, never reached an approved site and was not licensed for hazardous materials.
- 4 of 10 records were riskier than their declared class, and 7 of 12 trips were suspicious.
- At scale the estimate is about 890 million SAR a year, taking roughly 19,000 SAR a month per factory across half of MODON's facilities (3,850).

## The interface

Arabic only and right to left, with three tabs. Written in reading order, from the right:

1. **لوحة التحكم (Dashboard).** Monthly savings, landfill diversion, CO₂ avoided and suspicious trips, a ranked chart of every opportunity, and the top opportunities and riskiest trips.
2. **الوكلاء (Agents).** One card per agent with its status, three numbers and its best findings. This is the landing page.
3. **التتبع (Tracking).** A map of facilities, approved sites and geofences, with each trip on real roads, GPS playback and drone sightings.

## Run it locally

The app lives in [frontend/](frontend/).

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. No API key or `.env` file is needed. Run `npm run build` followed by `npm run preview` to check a production build.

## Stack

React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui on Base UI, React Router, MapLibre GL with OpenStreetMap tiles (OpenFreeMap), and routes from OSRM computed ahead of time. Deployed on Vercel.

## Scope of this repository

This repository holds the frontend demo. It reads a generated data pack ([frontend/src/data/refact-data.json](frontend/src/data/refact-data.json), built by [frontend/scripts/build_data.py](frontend/scripts/build_data.py)), so everything on screen is reproducible without a backend. Setup details, the map pipeline, the design system and a file-by-file guide are in [frontend/README.md](frontend/README.md).

## Roadmap

1. **Round two, 28 to 30 November.** Connect the published demo to the live agents, use the real MOWAN registry (more than a thousand licences), and produce a one-page compliance report plus the top 10 cases.
2. **Field trial after the hackathon.** Run in a real industrial city with the MODON team, trigger the agents automatically on every event, and measure actual savings against the forecast.
3. **Expansion to all cities.** Cover more than 35 cities by adding data rows rather than changing code, link the drone platform and MODON's GIS maps, and open an inter-city waste market.

## Team

| Name | Role |
| --- | --- |
| خالد آل دوسري (Khalid Al Dosari) | AI Engineer |
| محمد الحواس (Mohammed Alhawas) | AI Engineer |
| خالد الدويش (Khalid Aldawish) | AI Product Engineer |
