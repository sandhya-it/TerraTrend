import { generateDemoTimeSeries } from './demoDatasets';
import { ENVIRONMENTAL_VARIABLES, REGION_PRESETS } from './nasaCatalog';
import { analyzeTimeSeries } from './statistics';
import {
  AggregationGranularity,
  DataSourceMode,
  SignificanceAlpha,
  TimeSeriesObservation,
  TrendAnalysisResult,
} from '../types/terratrend';

export interface PowerApiResponse {
  ok: boolean;
  source: string;
  datasetId: string;
  datasetType: string;
  sourceUrl: string;
  parameter: string;
  longName: string;
  units: string;
  coordinates: { lat: number; lon: number; elevationM: number | null };
  observations: TimeSeriesObservation[];
  retrievedAt: string;
  cached?: boolean;
  error?: string;
}

export interface CmrCollection {
  id: string;
  shortName: string;
  version: string;
  name: string;
  provider: string;
  mission: string;
  description: string;
  temporalStart: string;
  temporalEnd: string;
  processingLevel: string;
  datasetType: 'Satellite Observation' | 'Reanalysis' | 'Model Output' | 'Derived Product';
  spatialBounds: string;
  resourceUrl: string;
  dataSource: string;
  directSeriesSupported: boolean;
}

export interface CmrResponse {
  ok: boolean;
  source?: string;
  sourceUrl?: string;
  totalHits?: number;
  collections?: CmrCollection[];
  retrievedAt?: string;
  cached?: boolean;
  error?: string;
}

export interface HealthResponse {
  ok: boolean;
  timestamp: string;
  earthdataTokenConfigured: boolean;
  services: Record<string, { status: 'online' | 'degraded' | 'unchecked'; latencyMs?: number; detail?: string }>;
}

export async function fetchServiceHealth(probe = true): Promise<HealthResponse> {
  const resp = await fetch(`/api/health?probe=${probe ? 'true' : 'false'}`);
  if (!resp.ok) throw new Error(`Health check HTTP ${resp.status}`);
  return (await resp.json()) as HealthResponse;
}

export async function searchNasaCmr(params: {
  q?: string;
  variable?: string;
  provider?: string;
  pageSize?: number;
}): Promise<CmrResponse> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.variable) qs.set('variable', params.variable);
  if (params.provider) qs.set('provider', params.provider);
  if (params.pageSize) qs.set('page_size', String(params.pageSize));

  const resp = await fetch(`/api/nasa/cmr?${qs.toString()}`);
  const data = (await resp.json()) as CmrResponse;
  if (!resp.ok || !data.ok) {
    throw new Error(data.error || `CMR request failed with HTTP ${resp.status}`);
  }
  return data;
}

export async function fetchNasaPowerSeries(params: {
  parameter: string;
  lat: number;
  lon: number;
  startYear: number;
  endYear: number;
}): Promise<PowerApiResponse> {
  const qs = new URLSearchParams({
    parameter: params.parameter,
    lat: String(params.lat),
    lon: String(params.lon),
    startYear: String(params.startYear),
    endYear: String(params.endYear),
    community: 'AG',
  });
  const resp = await fetch(`/api/nasa/power?${qs.toString()}`);
  const data = (await resp.json()) as PowerApiResponse;
  if (!resp.ok || !data.ok) {
    throw new Error(data.error || `NASA POWER failed with HTTP ${resp.status}`);
  }
  return data;
}

export interface ExecuteAnalysisOptions {
  mode: DataSourceMode;
  variableId: string;
  regionId: string;
  customRegionName?: string;
  lat: number;
  lon: number;
  startYear: number;
  endYear: number;
  granularity: AggregationGranularity;
  alpha: SignificanceAlpha;
  movingAverageWindow: number;
  minSampleSize: number;
  showKelvinForTempPercent?: boolean;
  csvObservations?: TimeSeriesObservation[];
  csvMeta?: { fileName: string; unit: string; variableName?: string };
}

export async function executeTrendAnalysis(opts: ExecuteAnalysisOptions): Promise<TrendAnalysisResult> {
  const variable = ENVIRONMENTAL_VARIABLES.find((v) => v.id === opts.variableId) || ENVIRONMENTAL_VARIABLES[0];
  const preset = REGION_PRESETS.find((r) => r.id === opts.regionId);
  const regionName = opts.customRegionName || preset?.name || `Point (${opts.lat.toFixed(2)}°, ${opts.lon.toFixed(2)}°)`;

  if (opts.mode === 'csv' && opts.csvObservations && opts.csvObservations.length > 0) {
    return analyzeTimeSeries({
      regionId: opts.regionId || 'uploaded-csv',
      regionName,
      lat: opts.lat,
      lon: opts.lon,
      variableId: opts.variableId,
      variableName: opts.csvMeta?.variableName || variable.name,
      unit: opts.csvMeta?.unit || variable.unit,
      datasetId: `CSV-${opts.csvMeta?.fileName || 'upload'}`,
      datasetName: opts.csvMeta?.fileName || 'Uploaded Scientific CSV',
      dataSource: 'User Uploaded CSV Dataset',
      datasetNature: 'Uploaded CSV',
      isDemo: false,
      granularity: opts.granularity,
      alpha: opts.alpha,
      movingAverageWindow: opts.movingAverageWindow,
      minSampleSize: opts.minSampleSize,
      observations: opts.csvObservations,
      showKelvinForTempPercent: opts.showKelvinForTempPercent,
    });
  }

  if (opts.mode === 'nasa-power' && variable.powerCode) {
    const powerResp = await fetchNasaPowerSeries({
      parameter: variable.powerCode,
      lat: opts.lat,
      lon: opts.lon,
      startYear: opts.startYear,
      endYear: opts.endYear,
    });

    return analyzeTimeSeries({
      regionId: opts.regionId,
      regionName,
      lat: powerResp.coordinates.lat,
      lon: powerResp.coordinates.lon,
      variableId: variable.id,
      variableName: variable.name,
      unit: variable.unit,
      datasetId: powerResp.datasetId,
      datasetName: `NASA POWER ${powerResp.longName}`,
      dataSource: powerResp.source,
      datasetNature: 'Reanalysis',
      isDemo: false,
      granularity: opts.granularity,
      alpha: opts.alpha,
      movingAverageWindow: opts.movingAverageWindow,
      minSampleSize: opts.minSampleSize,
      observations: powerResp.observations,
      sourceUrl: powerResp.sourceUrl,
      showKelvinForTempPercent: opts.showKelvinForTempPercent,
    });
  }

  // Demonstration mode (either explicitly chosen or when variable like NDVI has no POWER endpoint)
  const demoObs = generateDemoTimeSeries(variable.id, opts.regionId, opts.startYear, opts.endYear);
  return analyzeTimeSeries({
    regionId: opts.regionId,
    regionName,
    lat: opts.lat,
    lon: opts.lon,
    variableId: variable.id,
    variableName: variable.name,
    unit: variable.unit,
    datasetId: `DEMO-BENCHMARK-${variable.id}`,
    datasetName: `TerraTrend Demonstration Benchmark (${variable.shortName})`,
    dataSource: 'Demonstration Benchmark (Explicitly Labeled Synthetic Series)',
    datasetNature: 'Demonstration Benchmark',
    isDemo: true,
    granularity: opts.granularity,
    alpha: opts.alpha,
    movingAverageWindow: opts.movingAverageWindow,
    minSampleSize: opts.minSampleSize,
    observations: demoObs,
    showKelvinForTempPercent: opts.showKelvinForTempPercent,
  });
}
