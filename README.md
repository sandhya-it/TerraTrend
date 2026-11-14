# TerraTrend — Intelligent Earth Change Detection & Analysis Platform

TerraTrend is a NASA Mission Control-inspired Earth science intelligence platform built for discovering environmental datasets, quantifying long-term temporal trends, detecting opposite regional trajectories, and evaluating statistical significance.

## Core Scientific Capabilities

1. **Temporal Trend Detection**: Computes tie-corrected **Mann-Kendall** monotonic trend tests ($S$, $\text{Var}(S)$, $Z$, two-tailed $p$-value, Kendall $\tau$), **Sen's Slope** median rate of change with 95% confidence intervals, **OLS Linear Regression** ($R^2$, standard error, $t$-stat), moving averages, seasonal climatology, and lag-1 residual autocorrelation (Durbin-Watson) diagnostics.
2. **Geospatial Regional Comparison**: Interactive **Leaflet** mapping layered with **NASA GIBS WMTS** satellite imagery (MODIS True Color, Land Surface Temperature, GPM IMERG Precipitation, MODIS NDVI) and side-by-side **Opposite Regional Trend Detection** across climate basins.
3. **Statistical Significance Lab**: Separates trend direction, physical magnitude, statistical significance ($\alpha \in \{0.01, 0.05, 0.10\}$), and practical significance, with **Bonferroni** and **Benjamini-Hochberg (FDR)** multiple-comparison corrections.

## NASA Data Service Integrations

- **NASA Earthdata CMR** (`/api/nasa/cmr`): Searches live NASA collections and retrieves official metadata.
- **NASA POWER API** (`/api/nasa/power`): Retrieves historical monthly meteorological and solar time series (`T2M`, `PRECTOTCORR`, `GWETTOP`, `TS`, `RH2M`, `WS10M`, `ALLSKY_SFC_SW_DWN`).
- **NASA GIBS WMTS**: Renders orbital satellite imagery overlays directly on the geospatial map.
- **Demonstration Mode**: Explicitly labeled synthetic benchmark profiles so every module can be verified deterministically offline or in restricted sandboxes.
- **Custom CSV Upload**: Client-side parser and validator with missing-data tracking (`NaN`, `-999`) and NetCDF/HDF5 conversion guidance.

## Project Structure

- `server.ts` — Express server with NASA CMR & POWER proxy routes, TTL response cache, and Vite middleware.
- `src/lib/statistics.ts` — Mann-Kendall, Sen's Slope, OLS regression, autocorrelation, and multiple-comparison math engine.
- `src/lib/nasaCatalog.ts` — Variable registry, regional basin presets, GIBS layers, and curated NASA datasets.
- `src/lib/demoDatasets.ts` — Deterministic labeled Demonstration Benchmark generator.
- `src/lib/csvParser.ts` — Client-side CSV parser & validation engine.
- `src/lib/reportExport.ts` — PDF (`jsPDF`) and CSV scientific report exporters.
- `src/components/` — `EarthGlobeCanvas` (Three.js 3D Earth + orbiting satellite), `EarthGeospatialMap` (Leaflet + GIBS), `ScientificTimeSeriesChart` (Plotly.js).
- `src/modules/` — All 11 functional application modules (`Overview`, `Mission Control`, `Earth Data Explorer`, `Variable Selection`, `Temporal Analysis`, `Geospatial Analysis`, `Significance Lab`, `Regional Comparison`, `Scientific Insights`, `Reports`, `Settings`).

## Local Development & Build

```bash
npm install
npm run dev       # Starts Express + Vite server on port 3000
npm run lint      # Runs TypeScript type-checking (tsc --noEmit)
npm run build     # Builds production client bundle into dist/
npm start         # Serves API routes + production bundle on port 3000
```

## Environment Variables

See `.env.example` for optional NASA endpoint overrides and optional server-side `NASA_EARTHDATA_TOKEN`. No secrets are ever exposed to frontend code.
