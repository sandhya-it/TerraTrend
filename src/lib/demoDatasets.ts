import { TimeSeriesObservation } from '../types/terratrend';

interface DemoProfile {
  baseline: number;
  slopePerYear: number;
  seasonalAmp: number;
  seasonalPhaseMonth: number; // month index (0-11) of peak
  noiseStd: number;
  minClamp?: number;
  maxClamp?: number;
}

/**
 * Deterministic pseudo-random generator (Mulberry32) so demo analyses
 * produce reproducible scientific outputs across runs and comparisons.
 */
function createSeededRng(seedStr: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussianFromRng(rng: () => number): number {
  const u1 = Math.max(1e-7, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

const DEMO_PROFILES: Record<string, Record<string, DemoProfile>> = {
  T2M: {
    'us-southwest': { baseline: 14.2, slopePerYear: 0.048, seasonalAmp: 10.5, seasonalPhaseMonth: 6, noiseStd: 0.65 },
    'northern-plains': { baseline: 6.4, slopePerYear: 0.036, seasonalAmp: 14.2, seasonalPhaseMonth: 6, noiseStd: 0.85 },
    'arctic-svalbard': { baseline: -5.8, slopePerYear: 0.095, seasonalAmp: 9.8, seasonalPhaseMonth: 6, noiseStd: 1.05 },
    'north-atlantic-subpolar': { baseline: 7.4, slopePerYear: -0.028, seasonalAmp: 3.4, seasonalPhaseMonth: 7, noiseStd: 0.42 },
    'amazon-arc': { baseline: 25.8, slopePerYear: 0.034, seasonalAmp: 1.4, seasonalPhaseMonth: 8, noiseStd: 0.35 },
    'sahel-central': { baseline: 28.4, slopePerYear: 0.039, seasonalAmp: 4.8, seasonalPhaseMonth: 4, noiseStd: 0.55 },
    'mediterranean-iberia': { baseline: 15.6, slopePerYear: 0.052, seasonalAmp: 8.6, seasonalPhaseMonth: 6, noiseStd: 0.6 },
    'indus-gangetic': { baseline: 24.9, slopePerYear: 0.029, seasonalAmp: 7.9, seasonalPhaseMonth: 5, noiseStd: 0.55 },
    'murray-darling': { baseline: 17.5, slopePerYear: 0.033, seasonalAmp: 6.8, seasonalPhaseMonth: 0, noiseStd: 0.62 },
    'boreal-canada': { baseline: -1.8, slopePerYear: 0.058, seasonalAmp: 15.0, seasonalPhaseMonth: 6, noiseStd: 0.9 },
  },
  TS: {
    'arctic-svalbard': { baseline: -6.4, slopePerYear: 0.104, seasonalAmp: 10.2, seasonalPhaseMonth: 6, noiseStd: 1.05 },
    'north-atlantic-subpolar': { baseline: 7.9, slopePerYear: -0.034, seasonalAmp: 3.1, seasonalPhaseMonth: 7, noiseStd: 0.38 },
    'us-southwest': { baseline: 16.5, slopePerYear: 0.054, seasonalAmp: 12.0, seasonalPhaseMonth: 6, noiseStd: 0.7 },
    'mediterranean-iberia': { baseline: 17.8, slopePerYear: 0.057, seasonalAmp: 9.2, seasonalPhaseMonth: 6, noiseStd: 0.65 },
  },
  GWETTOP: {
    'us-southwest': { baseline: 0.36, slopePerYear: -0.0038, seasonalAmp: 0.06, seasonalPhaseMonth: 1, noiseStd: 0.022, minClamp: 0.05, maxClamp: 0.95 },
    'northern-plains': { baseline: 0.52, slopePerYear: 0.0029, seasonalAmp: 0.08, seasonalPhaseMonth: 4, noiseStd: 0.026, minClamp: 0.1, maxClamp: 0.98 },
    'mediterranean-iberia': { baseline: 0.42, slopePerYear: -0.0031, seasonalAmp: 0.11, seasonalPhaseMonth: 1, noiseStd: 0.024, minClamp: 0.05, maxClamp: 0.95 },
    'sahel-central': { baseline: 0.29, slopePerYear: 0.0022, seasonalAmp: 0.13, seasonalPhaseMonth: 7, noiseStd: 0.028, minClamp: 0.04, maxClamp: 0.92 },
    'amazon-arc': { baseline: 0.72, slopePerYear: -0.0026, seasonalAmp: 0.09, seasonalPhaseMonth: 2, noiseStd: 0.025, minClamp: 0.2, maxClamp: 0.98 },
    'murray-darling': { baseline: 0.38, slopePerYear: -0.0008, seasonalAmp: 0.07, seasonalPhaseMonth: 6, noiseStd: 0.035, minClamp: 0.05, maxClamp: 0.95 },
  },
  PRECTOTCORR: {
    'sahel-central': { baseline: 1.65, slopePerYear: 0.024, seasonalAmp: 1.9, seasonalPhaseMonth: 7, noiseStd: 0.24, minClamp: 0 },
    'mediterranean-iberia': { baseline: 1.58, slopePerYear: -0.021, seasonalAmp: 0.95, seasonalPhaseMonth: 10, noiseStd: 0.22, minClamp: 0 },
    'northern-plains': { baseline: 1.48, slopePerYear: 0.018, seasonalAmp: 0.85, seasonalPhaseMonth: 5, noiseStd: 0.2, minClamp: 0 },
    'us-southwest': { baseline: 0.95, slopePerYear: -0.014, seasonalAmp: 0.48, seasonalPhaseMonth: 7, noiseStd: 0.16, minClamp: 0 },
    'indus-gangetic': { baseline: 3.1, slopePerYear: 0.005, seasonalAmp: 3.4, seasonalPhaseMonth: 6, noiseStd: 0.42, minClamp: 0 },
  },
  NDVI: {
    'boreal-canada': { baseline: 0.46, slopePerYear: 0.0032, seasonalAmp: 0.24, seasonalPhaseMonth: 6, noiseStd: 0.02, minClamp: -0.1, maxClamp: 0.95 },
    'amazon-arc': { baseline: 0.82, slopePerYear: -0.0036, seasonalAmp: 0.04, seasonalPhaseMonth: 3, noiseStd: 0.016, minClamp: 0.1, maxClamp: 0.95 },
    'sahel-central': { baseline: 0.28, slopePerYear: 0.0024, seasonalAmp: 0.14, seasonalPhaseMonth: 8, noiseStd: 0.022, minClamp: 0.05, maxClamp: 0.85 },
    'us-southwest': { baseline: 0.24, slopePerYear: -0.0019, seasonalAmp: 0.06, seasonalPhaseMonth: 7, noiseStd: 0.018, minClamp: 0.05, maxClamp: 0.8 },
  },
  RH2M: {
    'us-southwest': { baseline: 42, slopePerYear: -0.18, seasonalAmp: 10, seasonalPhaseMonth: 0, noiseStd: 2.1, minClamp: 10, maxClamp: 95 },
    'indus-gangetic': { baseline: 62, slopePerYear: 0.15, seasonalAmp: 18, seasonalPhaseMonth: 7, noiseStd: 2.4, minClamp: 15, maxClamp: 98 },
  },
  WS10M: {
    'northern-plains': { baseline: 4.8, slopePerYear: -0.012, seasonalAmp: 0.8, seasonalPhaseMonth: 3, noiseStd: 0.25, minClamp: 0.5 },
    'north-atlantic-subpolar': { baseline: 8.6, slopePerYear: 0.021, seasonalAmp: 1.9, seasonalPhaseMonth: 0, noiseStd: 0.35, minClamp: 1.0 },
  },
  ALLSKY_SFC_SW_DWN: {
    'mediterranean-iberia': { baseline: 4.9, slopePerYear: 0.016, seasonalAmp: 2.3, seasonalPhaseMonth: 5, noiseStd: 0.18, minClamp: 0.5 },
    'indus-gangetic': { baseline: 5.1, slopePerYear: -0.019, seasonalAmp: 1.4, seasonalPhaseMonth: 4, noiseStd: 0.21, minClamp: 0.5 },
  },
};

export function generateDemoTimeSeries(
  variableId: string,
  regionId: string,
  startYear: number,
  endYear: number
): TimeSeriesObservation[] {
  const varProfiles = DEMO_PROFILES[variableId] || DEMO_PROFILES.T2M;
  const fallbackProfile: DemoProfile = varProfiles[regionId] || {
    baseline: variableId === 'PRECTOTCORR' ? 2.1 : variableId === 'GWETTOP' ? 0.45 : variableId === 'NDVI' ? 0.48 : 15.0,
    slopePerYear: regionId.includes('north') || regionId.includes('arctic') ? 0.032 : -0.008,
    seasonalAmp: variableId === 'GWETTOP' ? 0.08 : variableId === 'NDVI' ? 0.12 : 5.5,
    seasonalPhaseMonth: 6,
    noiseStd: variableId === 'GWETTOP' || variableId === 'NDVI' ? 0.025 : 0.65,
    minClamp: variableId === 'PRECTOTCORR' ? 0 : variableId === 'GWETTOP' ? 0.04 : undefined,
    maxClamp: variableId === 'GWETTOP' ? 0.96 : variableId === 'NDVI' ? 0.95 : undefined,
  };

  const rng = createSeededRng(`${variableId}:${regionId}`);
  const observations: TimeSeriesObservation[] = [];

  for (let year = startYear; year <= endYear; year++) {
    for (let month = 1; month <= 12; month++) {
      const tOffset = year - startYear + (month - 1) / 12;
      const seasonal =
        fallbackProfile.seasonalAmp * Math.cos(((2 * Math.PI) / 12) * (month - 1 - fallbackProfile.seasonalPhaseMonth));
      const noise = gaussianFromRng(rng) * fallbackProfile.noiseStd;

      // Realistic ~2% random sensor dropout in demo mode so missing-data handling is demonstrable
      const isMissing = rng() < 0.02;
      let val = fallbackProfile.baseline + fallbackProfile.slopePerYear * tOffset + seasonal + noise;
      if (fallbackProfile.minClamp !== undefined) val = Math.max(fallbackProfile.minClamp, val);
      if (fallbackProfile.maxClamp !== undefined) val = Math.min(fallbackProfile.maxClamp, val);

      observations.push({
        date: `${year}-${String(month).padStart(2, '0')}-01`,
        year,
        month,
        value: isMissing ? null : Number(val.toFixed(4)),
        isMissing,
      });
    }
  }

  return observations;
}
