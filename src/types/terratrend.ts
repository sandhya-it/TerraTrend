export type ModuleId =
  | 'overview'
  | 'mission-control'
  | 'explorer'
  | 'variable-studio'
  | 'temporal'
  | 'geospatial'
  | 'significance'
  | 'comparison'
  | 'insights'
  | 'reports'
  | 'settings';

export type DataSourceMode = 'nasa-power' | 'demo' | 'csv';

export type AggregationGranularity = 'monthly' | 'seasonal' | 'annual';

export type SignificanceAlpha = 0.01 | 0.05 | 0.1;

export type MultipleComparisonMethod = 'none' | 'bonferroni' | 'bh-fdr';

export type TrendStatusLabel =
  | 'Statistically significant increasing trend'
  | 'Statistically significant decreasing trend'
  | 'No statistically significant trend'
  | 'Insufficient data';

export type DatasetNature =
  | 'Satellite Observation'
  | 'Reanalysis'
  | 'Model Output'
  | 'Derived Product'
  | 'Uploaded CSV'
  | 'Demonstration Benchmark';

export interface EnvironmentalVariable {
  id: string;
  powerCode: string | null;
  name: string;
  shortName: string;
  unit: string;
  category: 'Atmosphere' | 'Hydrology' | 'Ocean' | 'Biosphere';
  description: string;
  practicalThresholdPerDecade: number;
  intervalScaleWarning?: string;
}

export interface RegionPreset {
  id: string;
  name: string;
  countryOrZone: string;
  lat: number;
  lon: number;
  bounds: [number, number, number, number]; // [south, west, north, east]
  biome: string;
}

export interface TimeSeriesObservation {
  date: string; // YYYY-MM-DD
  year: number;
  month: number | null;
  value: number | null;
  isMissing: boolean;
}

export interface MannKendallResult {
  sStatistic: number;
  varianceS: number;
  zScore: number;
  pValue: number;
  significant: boolean;
  tau: number;
}

export interface SensSlopeResult {
  slopePerYear: number;
  intercept: number;
  ciLowerPerYear: number;
  ciUpperPerYear: number;
}

export interface LinearRegressionResult {
  slopePerYear: number;
  intercept: number;
  rSquared: number;
  standardErrorPerYear: number;
  tStatistic: number;
  pValue: number;
  ciLowerPerYear: number;
  ciUpperPerYear: number;
}

export interface AutocorrelationResult {
  lag1: number;
  durbinWatson: number;
  hasSignificantAutocorrelation: boolean;
}

export interface TrendAnalysisResult {
  id: string;
  createdAt: string;
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
  startDate: string;
  endDate: string;
  totalObservations: number;
  validObservations: number;
  missingCount: number;
  missingPercent: number;
  minValue: number | null;
  maxValue: number | null;
  meanValue: number | null;
  stdDev: number | null;
  absoluteChange: number | null;
  percentChange: number | null;
  percentChangeNote: string | null;
  direction: 'increasing' | 'decreasing' | 'stable' | 'insufficient';
  statusLabel: TrendStatusLabel;
  mannKendall: MannKendallResult | null;
  sensSlope: SensSlopeResult | null;
  linearRegression: LinearRegressionResult | null;
  autocorrelation: AutocorrelationResult | null;
  series: Array<{
    label: string;
    decimalYear: number;
    value: number | null;
    movingAverage: number | null;
    olsFitted: number | null;
    senFitted: number | null;
  }>;
  monthlyClimatology: Array<{
    monthIndex: number;
    monthName: string;
    mean: number | null;
    min: number | null;
    max: number | null;
  }>;
  interpretation: string;
  classificationRationale: string;
  limitations: string[];
  sourceUrl?: string;
}

export interface NasaCatalogDataset {
  id: string;
  shortName: string;
  name: string;
  provider: string;
  mission: string;
  variable: string;
  variableId?: string;
  description: string;
  spatialResolution: string;
  temporalCoverage: string;
  units: string;
  dataSource: string;
  datasetType: DatasetNature;
  availability: 'Live API Integrated' | 'Tile Layer Integrated' | 'Metadata & External Link';
  resourceUrl: string;
  powerParameter?: string;
  gibsLayerId?: string;
}

export interface GibsLayerOption {
  id: string;
  layerId: string;
  title: string;
  mission: string;
  variable: string;
  format: 'jpg' | 'png';
  tileMatrixSet: string;
  defaultDate: string;
  legendMin: string;
  legendMid: string;
  legendMax: string;
  gradientCss: string;
}

export interface AppSettings {
  defaultAlpha: SignificanceAlpha;
  defaultMode: DataSourceMode;
  movingAverageWindow: number;
  minSampleSize: number;
  multipleComparisonMethod: MultipleComparisonMethod;
  showKelvinForTempPercent: boolean;
}
