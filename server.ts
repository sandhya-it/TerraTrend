import express from 'express';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '2mb' }));

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const apiCache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 15 * 60 * 1000;

function getCached<T>(key: string): T | null {
  const entry = apiCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    apiCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T, ttlMs = CACHE_TTL_MS): void {
  if (apiCache.size > 200) {
    const oldestKey = apiCache.keys().next().value;
    if (oldestKey) apiCache.delete(oldestKey);
  }
  apiCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 12000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'TerraTrend-EarthScience-Platform/1.0',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

app.get('/api/health', async (req, res) => {
  const probe = req.query.probe === 'true';
  const services: Record<string, { status: 'online' | 'degraded' | 'unchecked'; latencyMs?: number; detail?: string }> = {
    cmr: { status: 'unchecked' },
    power: { status: 'unchecked' },
    gibs: { status: 'unchecked' },
  };

  if (probe) {
    const checks = [
      {
        key: 'cmr',
        url: 'https://cmr.earthdata.nasa.gov/search/collections.json?page_size=1',
        method: 'HEAD',
      },
      {
        key: 'power',
        url: 'https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M&community=AG&longitude=0&latitude=0&start=2023&end=2023&format=JSON',
        method: 'GET',
      },
      {
        key: 'gibs',
        url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml',
        method: 'HEAD',
      },
    ];

    await Promise.all(
      checks.map(async (c) => {
        const started = Date.now();
        try {
          const resp = await fetchWithTimeout(c.url, { method: c.method || 'HEAD' }, 6000);
          services[c.key] = {
            status: resp.ok ? 'online' : 'degraded',
            latencyMs: Date.now() - started,
            detail: `HTTP ${resp.status}`,
          };
        } catch (err) {
          services[c.key] = {
            status: 'degraded',
            latencyMs: Date.now() - started,
            detail: err instanceof Error ? err.message : 'Network error',
          };
        }
      })
    );
  }

  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    earthdataTokenConfigured: Boolean(process.env.NASA_EARTHDATA_TOKEN),
    services,
  });
});

app.get('/api/nasa/cmr', async (req, res) => {
  const keyword = String(req.query.q || '').trim();
  const scienceKeyword = String(req.query.variable || '').trim();
  const provider = String(req.query.provider || '').trim();
  const pageSize = Math.min(40, Math.max(1, Number(req.query.page_size) || 18));
  const pageNum = Math.max(1, Number(req.query.page_num) || 1);

  const baseUrl = process.env.NASA_CMR_BASE_URL || 'https://cmr.earthdata.nasa.gov/search';
  const params = new URLSearchParams();
  params.set('page_size', String(pageSize));
  params.set('page_num', String(pageNum));
  params.set('has_granules', 'true');
  if (keyword) params.set('keyword', keyword);
  if (scienceKeyword) params.set('science_keywords_h[0][variable_level_1]', scienceKeyword);
  if (provider) params.set('provider', provider);

  const targetUrl = `${baseUrl}/collections.json?${params.toString()}`;
  const cacheKey = `cmr:${targetUrl}`;
  const cached = getCached(cacheKey);
  if (cached) {
    res.json({ ...(cached as Record<string, unknown>), cached: true });
    return;
  }

  try {
    const response = await fetchWithTimeout(targetUrl, {}, 12000);
    if (!response.ok) {
      res.status(502).json({
        ok: false,
        error: `NASA CMR returned HTTP ${response.status}`,
        sourceUrl: targetUrl,
      });
      return;
    }

    const totalHits = Number(response.headers.get('cmr-hits') || '0');
    const json = (await response.json()) as {
      feed?: {
        entry?: Array<{
          id?: string;
          title?: string;
          short_name?: string;
          version_id?: string;
          data_center?: string;
          summary?: string;
          time_start?: string;
          time_end?: string;
          processing_level_id?: string;
          platforms?: string[];
          boxes?: string[];
          links?: Array<{ rel?: string; href?: string; title?: string }>;
          online_access_flag?: boolean;
        }>;
      };
    };

    const entries = (json.feed?.entry || []).map((item) => {
      const level = item.processing_level_id || '';
      let datasetType: 'Satellite Observation' | 'Reanalysis' | 'Model Output' | 'Derived Product' = 'Satellite Observation';
      const titleLower = (item.title || '').toLowerCase();
      if (titleLower.includes('merra') || titleLower.includes('reanalysis') || titleLower.includes('gldas')) {
        datasetType = 'Reanalysis';
      } else if (titleLower.includes('model') || titleLower.includes('forecast') || titleLower.includes('geos')) {
        datasetType = 'Model Output';
      } else if (level.includes('3') || level.includes('4') || titleLower.includes('index') || titleLower.includes('anomaly')) {
        datasetType = 'Derived Product';
      }

      const webLink =
        item.links?.find((l) => l.rel?.includes('documentation') || l.rel?.includes('metadata'))?.href ||
        `https://cmr.earthdata.nasa.gov/search/concepts/${item.id}.html`;

      return {
        id: item.id || item.short_name || Math.random().toString(36).slice(2),
        shortName: item.short_name || 'N/A',
        version: item.version_id || '1',
        name: item.title || item.short_name || 'Untitled NASA Collection',
        provider: item.data_center || 'NASA Earthdata',
        mission: item.platforms?.[0] || item.data_center || 'NASA EOS',
        description: item.summary || 'No abstract provided in CMR metadata.',
        temporalStart: item.time_start ? item.time_start.slice(0, 10) : 'Not specified',
        temporalEnd: item.time_end ? item.time_end.slice(0, 10) : 'Ongoing',
        processingLevel: level || 'Unspecified',
        datasetType,
        spatialBounds: item.boxes?.[0] || '-90 -180 90 180',
        resourceUrl: webLink,
        dataSource: 'NASA Earthdata CMR API',
        directSeriesSupported: false,
      };
    });

    const payload = {
      ok: true,
      source: 'NASA Earthdata CMR',
      sourceUrl: targetUrl,
      totalHits,
      collections: entries,
      retrievedAt: new Date().toISOString(),
    };

    setCached(cacheKey, payload);
    res.json(payload);
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to connect to NASA CMR API',
      sourceUrl: targetUrl,
    });
  }
});

app.get('/api/nasa/power', async (req, res) => {
  const parameter = String(req.query.parameter || 'T2M').trim().toUpperCase();
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  const startYear = Math.max(1981, Math.min(2025, Number(req.query.startYear) || 2000));
  const endYear = Math.max(startYear, Math.min(2025, Number(req.query.endYear) || 2024));
  const community = String(req.query.community || 'AG').toUpperCase();

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    res.status(400).json({ ok: false, error: 'Invalid latitude or longitude coordinates.' });
    return;
  }

  const baseUrl = process.env.NASA_POWER_BASE_URL || 'https://power.larc.nasa.gov/api/temporal';
  const targetUrl = `${baseUrl}/monthly/point?parameters=${encodeURIComponent(
    parameter
  )}&community=${encodeURIComponent(community)}&longitude=${lon.toFixed(4)}&latitude=${lat.toFixed(
    4
  )}&start=${startYear}&end=${endYear}&format=JSON`;

  const cacheKey = `power:${targetUrl}`;
  const cached = getCached(cacheKey);
  if (cached) {
    res.json({ ...(cached as Record<string, unknown>), cached: true });
    return;
  }

  try {
    const response = await fetchWithTimeout(targetUrl, {}, 15000);
    if (!response.ok) {
      const text = await response.text();
      res.status(502).json({
        ok: false,
        error: `NASA POWER API returned HTTP ${response.status}: ${text.slice(0, 180)}`,
        sourceUrl: targetUrl,
      });
      return;
    }

    const json = (await response.json()) as {
      properties?: {
        parameter?: Record<string, Record<string, number>>;
      };
      parameters?: Record<string, { units?: string; longname?: string }>;
      header?: {
        title?: string;
        fill_value?: number;
        range?: { start?: string; end?: string };
      };
      geometry?: { coordinates?: [number, number, number] };
    };

    const rawSeries = json.properties?.parameter?.[parameter];
    if (!rawSeries) {
      res.status(404).json({
        ok: false,
        error: `Parameter ${parameter} was not returned by NASA POWER for this location.`,
        sourceUrl: targetUrl,
      });
      return;
    }

    const fillValue = json.header?.fill_value ?? -999;
    const paramMeta = json.parameters?.[parameter];

    const observations: Array<{ date: string; year: number; month: number | null; value: number | null; isMissing: boolean }> = [];
    const sortedKeys = Object.keys(rawSeries).sort();

    for (const ym of sortedKeys) {
      if (ym.length !== 6) continue;
      const year = Number(ym.slice(0, 4));
      const month = Number(ym.slice(4, 6));
      if (month < 1 || month > 12) continue; // Skip POWER's YYYY13 annual summary key to avoid duplicate weighting
      const rawVal = rawSeries[ym];
      const isMissing = rawVal === null || rawVal === undefined || !Number.isFinite(rawVal) || rawVal <= fillValue + 1;
      observations.push({
        date: `${year}-${String(month).padStart(2, '0')}-01`,
        year,
        month,
        value: isMissing ? null : Number(rawVal.toFixed(4)),
        isMissing,
      });
    }

    const payload = {
      ok: true,
      source: 'NASA POWER (Prediction Of Worldwide Energy Resources)',
      datasetId: `NASA-POWER-${community}-${parameter}`,
      datasetType: 'Reanalysis / Satellite Assimilation (MERRA-2 & CERES)',
      sourceUrl: targetUrl,
      parameter,
      longName: paramMeta?.longname || parameter,
      units: paramMeta?.units || 'native units',
      coordinates: {
        lat: json.geometry?.coordinates?.[1] ?? lat,
        lon: json.geometry?.coordinates?.[0] ?? lon,
        elevationM: json.geometry?.coordinates?.[2] ?? null,
      },
      observations,
      retrievedAt: new Date().toISOString(),
    };

    setCached(cacheKey, payload, 30 * 60 * 1000);
    res.json(payload);
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to connect to NASA POWER API',
      sourceUrl: targetUrl,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TerraTrend server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
