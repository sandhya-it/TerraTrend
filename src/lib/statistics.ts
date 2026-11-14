import {
  AggregationGranularity,
  AutocorrelationResult,
  DatasetNature,
  LinearRegressionResult,
  MannKendallResult,
  MultipleComparisonMethod,
  SensSlopeResult,
  SignificanceAlpha,
  TimeSeriesObservation,
  TrendAnalysisResult,
  TrendStatusLabel,
} from '../types/terratrend';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Standard normal CDF via Abramowitz & Stegun 7.1.26 erf approximation
 */
export function normalCdf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * absX);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const erf = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-absX * absX);
  return 0.5 * (1 + sign * erf);
}

/**
 * Inverse standard normal quantile (Peter J. Acklam approximation)
 */
export function normalQuantile(p: number): number {
  if (p <= 0 || p >= 1) return p < 0.5 ? -Infinity : Infinity;
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(
    (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

/**
 * Approximate critical t-value (Wilson-Hilferty / Cornish-Fisher) for df >= 2
 */
export function tQuantile95(df: number): number {
  if (df <= 1) return 12.706;
  const z = 1.95996398454;
  const g1 = (z * z * z + z) / 4;
  const g2 = (5 * Math.pow(z, 5) + 16 * z * z * z + 3 * z) / 96;
  return z + g1 / df + g2 / (df * df);
}

function median(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Aggregate raw monthly/daily observations into monthly, seasonal, or annual series
 * while preserving exact missing-data counts.
 */
export function aggregateObservations(
  observations: TimeSeriesObservation[],
  granularity: AggregationGranularity
): {
  points: Array<{ label: string; decimalYear: number; value: number | null }>;
  totalSlots: number;
  missingSlots: number;
} {
  if (granularity === 'monthly') {
    const sorted = [...observations].sort((a, b) => a.date.localeCompare(b.date));
    const points = sorted.map((obs) => {
      const m = obs.month ?? (Number(obs.date.slice(5, 7)) || 1);
      const decYear = obs.year + (m - 0.5) / 12;
      return {
        label: obs.date.slice(0, 7),
        decimalYear: Number(decYear.toFixed(4)),
        value: obs.isMissing ? null : obs.value,
      };
    });
    const missingSlots = points.filter((p) => p.value === null).length;
    return { points, totalSlots: points.length, missingSlots };
  }

  if (granularity === 'annual') {
    const byYear = new Map<number, number[]>();
    const allYears = new Set<number>();
    for (const obs of observations) {
      allYears.add(obs.year);
      if (!obs.isMissing && obs.value !== null && Number.isFinite(obs.value)) {
        const arr = byYear.get(obs.year) || [];
        arr.push(obs.value);
        byYear.set(obs.year, arr);
      }
    }
    const years = Array.from(allYears).sort((a, b) => a - b);
    const points = years.map((yr) => {
      const vals = byYear.get(yr) || [];
      return {
        label: String(yr),
        decimalYear: yr + 0.5,
        value: vals.length > 0 ? Number((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(4)) : null,
      };
    });
    const missingSlots = points.filter((p) => p.value === null).length;
    return { points, totalSlots: points.length, missingSlots };
  }

  // Seasonal: DJF, MAM, JJA, SON
  const seasonOrder: Record<string, { idx: number; offset: number }> = {
    DJF: { idx: 0, offset: 0.08 },
    MAM: { idx: 1, offset: 0.33 },
    JJA: { idx: 2, offset: 0.58 },
    SON: { idx: 3, offset: 0.83 },
  };
  const buckets = new Map<string, { year: number; season: string; vals: number[] }>();

  for (const obs of observations) {
    const m = obs.month ?? (Number(obs.date.slice(5, 7)) || 1);
    let season = 'DJF';
    let sYear = obs.year;
    if (m === 12) {
      season = 'DJF';
      sYear = obs.year + 1;
    } else if (m <= 2) {
      season = 'DJF';
    } else if (m <= 5) {
      season = 'MAM';
    } else if (m <= 8) {
      season = 'JJA';
    } else {
      season = 'SON';
    }
    const key = `${sYear}-${season}`;
    const existing = buckets.get(key) || { year: sYear, season, vals: [] };
    if (!obs.isMissing && obs.value !== null && Number.isFinite(obs.value)) {
      existing.vals.push(obs.value);
    }
    buckets.set(key, existing);
  }

  const sortedBuckets = Array.from(buckets.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return seasonOrder[a.season].idx - seasonOrder[b.season].idx;
  });

  const points = sortedBuckets.map((b) => ({
    label: `${b.year} ${b.season}`,
    decimalYear: Number((b.year + seasonOrder[b.season].offset).toFixed(4)),
    value: b.vals.length > 0 ? Number((b.vals.reduce((s, v) => s + v, 0) / b.vals.length).toFixed(4)) : null,
  }));
  const missingSlots = points.filter((p) => p.value === null).length;
  return { points, totalSlots: points.length, missingSlots };
}

export function computeMannKendall(values: number[], alpha: SignificanceAlpha): MannKendallResult {
  const n = values.length;
  let s = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const diff = values[j] - values[i];
      if (diff > 1e-12) s += 1;
      else if (diff < -1e-12) s -= 1;
    }
  }

  // Tie correction
  const counts = new Map<number, number>();
  for (const v of values) {
    const key = Number(v.toFixed(8));
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  let tieTerm = 0;
  for (const t of counts.values()) {
    if (t > 1) tieTerm += t * (t - 1) * (2 * t + 5);
  }

  const varianceS = Math.max(1e-9, (n * (n - 1) * (2 * n + 5) - tieTerm) / 18);
  const stdS = Math.sqrt(varianceS);
  let zScore = 0;
  if (s > 0) zScore = (s - 1) / stdS;
  else if (s < 0) zScore = (s + 1) / stdS;

  const pValue = Math.min(1, Math.max(0, 2 * (1 - normalCdf(Math.abs(zScore)))));
  const totalPairs = (n * (n - 1)) / 2;
  const tau = totalPairs > 0 ? s / totalPairs : 0;

  return {
    sStatistic: s,
    varianceS: Number(varianceS.toFixed(4)),
    zScore: Number(zScore.toFixed(4)),
    pValue: Number(pValue.toFixed(6)),
    significant: pValue < alpha,
    tau: Number(tau.toFixed(4)),
  };
}

export function computeSensSlope(times: number[], values: number[], varianceS: number): SensSlopeResult {
  const n = values.length;
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const dt = times[j] - times[i];
      if (dt > 1e-9) {
        slopes.push((values[j] - values[i]) / dt);
      }
    }
  }
  slopes.sort((a, b) => a - b);
  const slopePerYear = median(slopes);

  const residuals = values.map((y, idx) => y - slopePerYear * times[idx]).sort((a, b) => a - b);
  const intercept = median(residuals);

  // 95% confidence interval via Kendall variance
  const z95 = 1.95996398454;
  const cAlpha = z95 * Math.sqrt(varianceS);
  const mCount = slopes.length;
  const m1Idx = Math.max(0, Math.min(mCount - 1, Math.floor((mCount - cAlpha) / 2)));
  const m2Idx = Math.max(0, Math.min(mCount - 1, Math.ceil((mCount + cAlpha) / 2)));

  return {
    slopePerYear: Number(slopePerYear.toFixed(6)),
    intercept: Number(intercept.toFixed(6)),
    ciLowerPerYear: Number((slopes[m1Idx] ?? slopePerYear).toFixed(6)),
    ciUpperPerYear: Number((slopes[m2Idx] ?? slopePerYear).toFixed(6)),
  };
}

export function computeLinearRegression(times: number[], values: number[]): LinearRegressionResult {
  const n = values.length;
  const meanX = times.reduce((s, x) => s + x, 0) / n;
  const meanY = values.reduce((s, y) => s + y, 0) / n;

  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = times[i] - meanX;
    const dy = values[i] - meanY;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }

  const slope = sxx > 1e-12 ? sxy / sxx : 0;
  const intercept = meanY - slope * meanX;

  let sse = 0;
  for (let i = 0; i < n; i++) {
    const err = values[i] - (slope * times[i] + intercept);
    sse += err * err;
  }

  const rSquared = syy > 1e-12 ? Math.max(0, Math.min(1, 1 - sse / syy)) : 0;
  const df = Math.max(1, n - 2);
  const residualVariance = sse / df;
  const standardError = sxx > 1e-12 ? Math.sqrt(residualVariance / sxx) : 0;
  const tStat = standardError > 1e-12 ? slope / standardError : 0;
  const pValue = standardError > 1e-12 ? Math.min(1, Math.max(0, 2 * (1 - normalCdf(Math.abs(tStat))))) : 1;
  const tCrit = tQuantile95(df);

  return {
    slopePerYear: Number(slope.toFixed(6)),
    intercept: Number(intercept.toFixed(6)),
    rSquared: Number(rSquared.toFixed(4)),
    standardErrorPerYear: Number(standardError.toFixed(6)),
    tStatistic: Number(tStat.toFixed(4)),
    pValue: Number(pValue.toFixed(6)),
    ciLowerPerYear: Number((slope - tCrit * standardError).toFixed(6)),
    ciUpperPerYear: Number((slope + tCrit * standardError).toFixed(6)),
  };
}

export function computeAutocorrelation(values: number[], fitted: number[]): AutocorrelationResult {
  const residuals = values.map((v, i) => v - fitted[i]);
  const n = residuals.length;
  if (n < 4) {
    return { lag1: 0, durbinWatson: 2, hasSignificantAutocorrelation: false };
  }
  const meanR = residuals.reduce((s, r) => s + r, 0) / n;
  let num = 0;
  let den = 0;
  let dwNum = 0;
  for (let i = 0; i < n; i++) {
    const d = residuals[i] - meanR;
    den += d * d;
    if (i > 0) {
      num += (residuals[i] - meanR) * (residuals[i - 1] - meanR);
      const diff = residuals[i] - residuals[i - 1];
      dwNum += diff * diff;
    }
  }
  const lag1 = den > 1e-12 ? num / den : 0;
  const durbinWatson = den > 1e-12 ? dwNum / den : 2;
  const threshold = 1.96 / Math.sqrt(n);

  return {
    lag1: Number(lag1.toFixed(4)),
    durbinWatson: Number(durbinWatson.toFixed(4)),
    hasSignificantAutocorrelation: Math.abs(lag1) > Math.max(0.25, threshold),
  };
}

export function computeMovingAverage(values: Array<number | null>, windowSize: number): Array<number | null> {
  const half = Math.floor(windowSize / 2);
  return values.map((v, idx) => {
    if (v === null) return null;
    const start = Math.max(0, idx - half);
    const end = Math.min(values.length - 1, idx + half);
    let sum = 0;
    let count = 0;
    for (let k = start; k <= end; k++) {
      const val = values[k];
      if (val !== null) {
        sum += val;
        count += 1;
      }
    }
    return count > 0 ? Number((sum / count).toFixed(4)) : null;
  });
}

export interface AnalyzeInput {
  id?: string;
  regionId: string;
  regionName: string;
  lat: number;
  lon: number;
  variableId: string;
  variableName: string;
  unit: string;
  datasetId: string;
  datasetName: string;
  dataSource: string;
  datasetNature: DatasetNature;
  isDemo: boolean;
  granularity: AggregationGranularity;
  alpha: SignificanceAlpha;
  movingAverageWindow: number;
  minSampleSize: number;
  observations: TimeSeriesObservation[];
  sourceUrl?: string;
  showKelvinForTempPercent?: boolean;
}

export function analyzeTimeSeries(input: AnalyzeInput): TrendAnalysisResult {
  const { points, totalSlots, missingSlots } = aggregateObservations(input.observations, input.granularity);
  const validPoints = points.filter((p): p is { label: string; decimalYear: number; value: number } => p.value !== null);
  const validCount = validPoints.length;
  const missingPercent = totalSlots > 0 ? Number(((missingSlots / totalSlots) * 100).toFixed(2)) : 0;

  const monthlyBuckets: number[][] = Array.from({ length: 12 }, () => []);
  for (const obs of input.observations) {
    if (!obs.isMissing && obs.value !== null && obs.month && obs.month >= 1 && obs.month <= 12) {
      monthlyBuckets[obs.month - 1].push(obs.value);
    }
  }
  const monthlyClimatology = monthlyBuckets.map((arr, idx) => ({
    monthIndex: idx + 1,
    monthName: MONTH_NAMES[idx],
    mean: arr.length > 0 ? Number((arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(3)) : null,
    min: arr.length > 0 ? Number(Math.min(...arr).toFixed(3)) : null,
    max: arr.length > 0 ? Number(Math.max(...arr).toFixed(3)) : null,
  }));

  const movingAvg = computeMovingAverage(
    points.map((p) => p.value),
    Math.max(3, input.movingAverageWindow)
  );

  const startDate = points[0]?.label || '';
  const endDate = points[points.length - 1]?.label || '';

  if (validCount < input.minSampleSize) {
    return {
      id: input.id || `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      regionId: input.regionId,
      regionName: input.regionName,
      lat: input.lat,
      lon: input.lon,
      variableId: input.variableId,
      variableName: input.variableName,
      unit: input.unit,
      datasetId: input.datasetId,
      datasetName: input.datasetName,
      dataSource: input.dataSource,
      datasetNature: input.datasetNature,
      isDemo: input.isDemo,
      granularity: input.granularity,
      alpha: input.alpha,
      startDate,
      endDate,
      totalObservations: totalSlots,
      validObservations: validCount,
      missingCount: missingSlots,
      missingPercent,
      minValue: validCount > 0 ? Math.min(...validPoints.map((v) => v.value)) : null,
      maxValue: validCount > 0 ? Math.max(...validPoints.map((v) => v.value)) : null,
      meanValue: validCount > 0 ? Number((validPoints.reduce((s, v) => s + v.value, 0) / validCount).toFixed(4)) : null,
      stdDev: null,
      absoluteChange: null,
      percentChange: null,
      percentChangeNote: 'Insufficient valid observations for reliable trend estimation.',
      direction: 'insufficient',
      statusLabel: 'Insufficient data',
      mannKendall: null,
      sensSlope: null,
      linearRegression: null,
      autocorrelation: null,
      series: points.map((p, i) => ({
        ...p,
        movingAverage: movingAvg[i],
        olsFitted: null,
        senFitted: null,
      })),
      monthlyClimatology,
      interpretation: `${input.variableName} in ${input.regionName} contains ${validCount} valid observations (minimum required: ${input.minSampleSize}). Statistical trend classification is withheld as Insufficient Data.`,
      classificationRationale: `Valid sample size n = ${validCount} is below the configured minimum threshold (${input.minSampleSize}) required for asymptotic Mann-Kendall and Sen's slope inference.`,
      limitations: [
        `Insufficient temporal coverage (n = ${validCount} < ${input.minSampleSize}).`,
        'Expand the observation window or switch to monthly aggregation if annual sample count is too small.',
      ],
      sourceUrl: input.sourceUrl,
    };
  }

  const values = validPoints.map((p) => p.value);
  const times = validPoints.map((p) => p.decimalYear);
  const meanVal = values.reduce((s, v) => s + v, 0) / validCount;
  const variance = values.reduce((s, v) => s + Math.pow(v - meanVal, 2), 0) / Math.max(1, validCount - 1);
  const stdDev = Math.sqrt(variance);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  const mk = computeMannKendall(values, input.alpha);
  const sen = computeSensSlope(times, values, mk.varianceS);
  const ols = computeLinearRegression(times, values);
  const fittedVals = times.map((t) => ols.slopePerYear * t + ols.intercept);
  const autocorr = computeAutocorrelation(values, fittedVals);

  const timeSpanYears = Math.max(0.0833, times[times.length - 1] - times[0]);
  const absoluteChange = Number((sen.slopePerYear * timeSpanYears).toFixed(4));

  // Percentage change guard for interval scales (°C) or near-zero baselines
  let percentChange: number | null = null;
  let percentChangeNote: string | null = null;
  const startBaseline = sen.slopePerYear * times[0] + sen.intercept;
  const isCelsius = input.unit.includes('°C') || input.unit === 'C';

  if (isCelsius && !input.showKelvinForTempPercent) {
    percentChange = null;
    percentChangeNote = 'Percentage change omitted for Celsius interval scale (0 °C is arbitrary); see absolute Δ in °C.';
  } else if (isCelsius && input.showKelvinForTempPercent) {
    const startKelvin = startBaseline + 273.15;
    percentChange = startKelvin > 0 ? Number(((absoluteChange / startKelvin) * 100).toFixed(2)) : null;
    percentChangeNote = 'Computed on absolute Kelvin thermodynamic scale (baseline + 273.15 K).';
  } else if (Math.abs(startBaseline) < 1e-4) {
    percentChange = null;
    percentChangeNote = 'Percentage change omitted because baseline value is near zero.';
  } else {
    percentChange = Number(((absoluteChange / Math.abs(startBaseline)) * 100).toFixed(2));
  }

  let statusLabel: TrendStatusLabel = 'No statistically significant trend';
  let direction: 'increasing' | 'decreasing' | 'stable' = 'stable';

  if (mk.significant) {
    if (sen.slopePerYear > 0 || mk.sStatistic > 0) {
      statusLabel = 'Statistically significant increasing trend';
      direction = 'increasing';
    } else if (sen.slopePerYear < 0 || mk.sStatistic < 0) {
      statusLabel = 'Statistically significant decreasing trend';
      direction = 'decreasing';
    }
  } else {
    if (Math.abs(sen.slopePerYear) < 1e-6) direction = 'stable';
    else direction = sen.slopePerYear > 0 ? 'increasing' : 'decreasing';
  }

  const slopeFormatted = `${sen.slopePerYear >= 0 ? '+' : ''}${sen.slopePerYear.toFixed(4)}`;
  const absFormatted = `${absoluteChange >= 0 ? '+' : ''}${absoluteChange.toFixed(3)}`;
  const pFormatted = mk.pValue < 0.0001 ? '< 0.0001' : mk.pValue.toFixed(4);
  const dirWord = sen.slopePerYear > 1e-6 ? 'an increasing' : sen.slopePerYear < -1e-6 ? 'a decreasing' : 'a stable';

  const interpretation = `${input.variableName} in ${input.regionName} shows ${dirWord} trend during ${startDate} to ${endDate}. The estimated Sen's slope is ${slopeFormatted} ${input.unit}/year (total change ${absFormatted} ${input.unit}). The Mann-Kendall test reports S = ${mk.sStatistic}, Z = ${mk.zScore.toFixed(2)}, and p = ${pFormatted}. At the selected significance threshold (α = ${input.alpha}), the trend is ${
    mk.significant ? 'statistically significant' : 'not statistically significant'
  }.${
    autocorr.hasSignificantAutocorrelation
      ? ` Note: positive lag-1 residual autocorrelation (r₁ = ${autocorr.lag1.toFixed(2)}) is present, which can narrow unadjusted p-values.`
      : ''
  }`;

  const classificationRationale = mk.significant
    ? `Classified as "${statusLabel}" because the two-tailed Mann-Kendall p-value (${pFormatted}) is below α = ${input.alpha} and the monotonic direction (${
        direction === 'increasing' ? 'positive' : 'negative'
      }, Z = ${mk.zScore.toFixed(2)}) aligns with Sen's median slope (${slopeFormatted} ${input.unit}/yr).`
    : `Classified as "No statistically significant trend" because the Mann-Kendall p-value (${pFormatted}) is greater than or equal to α = ${input.alpha}. Even though the point estimate of slope is ${slopeFormatted} ${input.unit}/yr, natural interannual/seasonal variability cannot be ruled out at this confidence level.`;

  const limitations: string[] = [
    'Monotonic trend detection (Mann-Kendall & Sen) does not imply physical causation without mechanistic attribution.',
  ];
  if (missingPercent > 0) {
    limitations.push(`${missingCountText(missingSlots, totalSlots, missingPercent)} excluded without artificial gap-filling.`);
  }
  if (autocorr.hasSignificantAutocorrelation) {
    limitations.push(
      `Significant lag-1 serial autocorrelation detected (r₁ = ${autocorr.lag1.toFixed(2)}, DW = ${autocorr.durbinWatson.toFixed(
        2
      )}); seasonal or monthly persistence may inflate apparent significance.`
    );
  }
  if (input.granularity === 'monthly') {
    limitations.push('Monthly series preserve seasonal cycles; compare against Annual aggregation to separate seasonal amplitude from interannual drift.');
  }
  if (input.isDemo) {
    limitations.push('DEMONSTRATION DATA: Computed from synthetic benchmark profile for platform verification, not live satellite measurements.');
  }

  return {
    id: input.id || `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    regionId: input.regionId,
    regionName: input.regionName,
    lat: input.lat,
    lon: input.lon,
    variableId: input.variableId,
    variableName: input.variableName,
    unit: input.unit,
    datasetId: input.datasetId,
    datasetName: input.datasetName,
    dataSource: input.dataSource,
    datasetNature: input.datasetNature,
    isDemo: input.isDemo,
    granularity: input.granularity,
    alpha: input.alpha,
    startDate,
    endDate,
    totalObservations: totalSlots,
    validObservations: validCount,
    missingCount: missingSlots,
    missingPercent,
    minValue: Number(minVal.toFixed(4)),
    maxValue: Number(maxVal.toFixed(4)),
    meanValue: Number(meanVal.toFixed(4)),
    stdDev: Number(stdDev.toFixed(4)),
    absoluteChange,
    percentChange,
    percentChangeNote,
    direction,
    statusLabel,
    mannKendall: mk,
    sensSlope: sen,
    linearRegression: ols,
    autocorrelation: autocorr,
    series: points.map((p, i) => ({
      ...p,
      movingAverage: movingAvg[i],
      olsFitted: Number((ols.slopePerYear * p.decimalYear + ols.intercept).toFixed(4)),
      senFitted: Number((sen.slopePerYear * p.decimalYear + sen.intercept).toFixed(4)),
    })),
    monthlyClimatology,
    interpretation,
    classificationRationale,
    limitations,
    sourceUrl: input.sourceUrl,
  };
}

function missingCountText(missing: number, total: number, pct: number): string {
  return `${missing} of ${total} observations (${pct}%) were missing and`;
}

export interface MultipleComparisonItem {
  id: string;
  label: string;
  rawPValue: number;
  adjustedPValue: number;
  significantRaw: boolean;
  significantAdjusted: boolean;
}

export function applyMultipleComparisonCorrection(
  items: Array<{ id: string; label: string; pValue: number }>,
  method: MultipleComparisonMethod,
  alpha: SignificanceAlpha
): MultipleComparisonItem[] {
  const m = items.length;
  if (m === 0) return [];

  if (method === 'none') {
    return items.map((item) => ({
      id: item.id,
      label: item.label,
      rawPValue: item.pValue,
      adjustedPValue: item.pValue,
      significantRaw: item.pValue < alpha,
      significantAdjusted: item.pValue < alpha,
    }));
  }

  if (method === 'bonferroni') {
    return items.map((item) => {
      const adj = Math.min(1, item.pValue * m);
      return {
        id: item.id,
        label: item.label,
        rawPValue: item.pValue,
        adjustedPValue: Number(adj.toFixed(6)),
        significantRaw: item.pValue < alpha,
        significantAdjusted: adj < alpha,
      };
    });
  }

  // Benjamini-Hochberg FDR
  const indexed = items.map((item, idx) => ({ ...item, originalIdx: idx })).sort((a, b) => a.pValue - b.pValue);
  const adjusted = new Array<number>(m);
  let runningMin = 1;
  for (let rank = m; rank >= 1; rank--) {
    const rawP = indexed[rank - 1].pValue;
    const bh = Math.min(1, (rawP * m) / rank);
    runningMin = Math.min(runningMin, bh);
    adjusted[indexed[rank - 1].originalIdx] = Number(runningMin.toFixed(6));
  }

  return items.map((item, idx) => ({
    id: item.id,
    label: item.label,
    rawPValue: item.pValue,
    adjustedPValue: adjusted[idx],
    significantRaw: item.pValue < alpha,
    significantAdjusted: adjusted[idx] < alpha,
  }));
}
