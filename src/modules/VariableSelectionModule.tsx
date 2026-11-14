import { useRef, useState } from 'react';
import { FileSpreadsheet, Play, Upload, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ParsedCsvDataset, parseScientificCsv, SAMPLE_EARTH_CSV } from '../lib/csvParser';
import { ENVIRONMENTAL_VARIABLES, REGION_PRESETS } from '../lib/nasaCatalog';
import {
  AggregationGranularity,
  DataSourceMode,
  SignificanceAlpha,
  TimeSeriesObservation,
} from '../types/terratrend';

export interface StudioConfig {
  mode: DataSourceMode;
  variableId: string;
  regionId: string;
  customRegionName: string;
  lat: number;
  lon: number;
  startYear: number;
  endYear: number;
  granularity: AggregationGranularity;
  alpha: SignificanceAlpha;
}

interface VariableSelectionModuleProps {
  config: StudioConfig;
  onChangeConfig: (next: StudioConfig) => void;
  isRunning: boolean;
  errorMsg: string | null;
  onRunAnalysis: (csvData?: {
    observations: TimeSeriesObservation[];
    fileName: string;
    unit: string;
    variableName: string;
  }) => void;
}

export function VariableSelectionModule({
  config,
  onChangeConfig,
  isRunning,
  errorMsg,
  onRunAnalysis,
}: VariableSelectionModuleProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [geoMode, setGeoMode] = useState<'preset' | 'custom'>('preset');
  const [parsedCsv, setParsedCsv] = useState<ParsedCsvDataset | null>(null);
  const [csvUnitOverride, setCsvUnitOverride] = useState<string>('°C');

  const selectedVariable =
    ENVIRONMENTAL_VARIABLES.find((v) => v.id === config.variableId) || ENVIRONMENTAL_VARIABLES[0];
  const selectedPreset = REGION_PRESETS.find((r) => r.id === config.regionId);

  const handleFileUpload = async (file: File) => {
    const text = await file.text();
    const parsed = parseScientificCsv(text, file.name);
    setParsedCsv(parsed);
    if (parsed.detectedUnit && parsed.detectedUnit !== 'units') {
      setCsvUnitOverride(parsed.detectedUnit);
    }
    if (parsed.avgLat !== null && parsed.avgLon !== null) {
      onChangeConfig({
        ...config,
        mode: 'csv',
        lat: parsed.avgLat,
        lon: parsed.avgLon,
        customRegionName: file.name.replace(/\.[^/.]+$/, ''),
      });
    } else {
      onChangeConfig({ ...config, mode: 'csv' });
    }
  };

  const loadSampleCsv = () => {
    const parsed = parseScientificCsv(SAMPLE_EARTH_CSV, 'arizona_plateau_sample.csv');
    setParsedCsv(parsed);
    setCsvUnitOverride('°C');
    onChangeConfig({
      ...config,
      mode: 'csv',
      variableId: 'T2M',
      regionId: 'us-southwest',
      customRegionName: 'Arizona Plateau Sample (CSV)',
      lat: 35.1,
      lon: -111.6,
    });
  };

  const reparseCsvColumns = (dateCol: string, valueCol: string) => {
    if (!parsedCsv) return;
    const rawHeader = parsedCsv.headers.join(',');
    const rawRows = parsedCsv.rows.map((r) => parsedCsv.headers.map((h) => r[h] ?? '').join(','));
    const next = parseScientificCsv([rawHeader, ...rawRows].join('\n'), parsedCsv.fileName, {
      dateColumn: dateCol,
      valueColumn: valueCol,
      unit: csvUnitOverride,
    });
    setParsedCsv(next);
  };

  const powerUnavailableForVar = config.mode === 'nasa-power' && !selectedVariable.powerCode;

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[#F4F8FF]">Variable Selection Studio</h1>
        <p className="text-sm text-[#8FA8C8] mt-0.5">
          Configure environmental variable, geographical target, temporal aggregation, and data provenance before
          running statistical trend inference.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Configuration Column */}
        <div className="xl:col-span-8 space-y-6">
          {/* 1. Data Source Mode */}
          <section className="rounded-xl border border-[#193556] bg-[#0B1E36] p-5 space-y-4">
            <h2 className="font-display text-base font-semibold text-[#F4F8FF]">01. Data Source &amp; Provenance</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'nasa-power' as DataSourceMode,
                  title: 'NASA POWER API (Live)',
                  sub: 'MERRA-2 & CERES historical monthly series (1981–present)',
                },
                {
                  id: 'demo' as DataSourceMode,
                  title: 'Demonstration Mode',
                  sub: 'Explicitly labeled synthetic benchmark for instant exploration',
                },
                {
                  id: 'csv' as DataSourceMode,
                  title: 'Upload CSV Dataset',
                  sub: 'Client-side validation of date, lat/lon, and measurements',
                },
              ].map((src) => {
                const active = config.mode === src.id;
                return (
                  <button
                    key={src.id}
                    type="button"
                    onClick={() => onChangeConfig({ ...config, mode: src.id })}
                    className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
                      active
                        ? 'border-[#36D9E6] bg-[#36D9E6]/10'
                        : 'border-[#193556] bg-[#071426]/70 hover:border-[#3887FF]/50'
                    }`}
                  >
                    <div className={`text-xs font-semibold ${active ? 'text-[#36D9E6]' : 'text-[#F4F8FF]'}`}>
                      {src.title}
                    </div>
                    <div className="text-xs text-[#8FA8C8] mt-1 leading-relaxed">{src.sub}</div>
                  </button>
                );
              })}
            </div>

            {config.mode === 'csv' && (
              <div className="pt-2 space-y-4 border-t border-[#193556]">
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt,.tsv,.nc,.nc4,.hdf,.h5"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#36D9E6] text-xs font-semibold text-[#36D9E6] hover:bg-[#36D9E6]/10 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Select CSV File</span>
                  </button>
                  <button
                    type="button"
                    onClick={loadSampleCsv}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#193556] bg-[#071426] text-xs text-[#F4F8FF] hover:border-[#36D9E6] cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#39D6A0]" />
                    <span>Load Sample CSV</span>
                  </button>
                </div>

                <div className="rounded-lg border border-[#193556] bg-[#071426] p-3 text-xs text-[#8FA8C8]">
                  <strong className="text-[#F4F8FF]">NetCDF / HDF5 Notice:</strong> Binary NASA Earthdata granules (
                  <span className="font-mono">.nc</span>, <span className="font-mono">.h5</span>) require server-side
                  C bindings not supported in serverless browser MVP. Convert to CSV beforehand using{' '}
                  <span className="font-mono text-[#36D9E6]">xarray</span> (
                  <span className="font-mono">ds.to_dataframe().to_csv(...)</span>) or NASA Panoply.
                </div>

                {parsedCsv && (
                  <div className="space-y-3 rounded-lg border border-[#193556] bg-[#071426] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-mono text-[#F4F8FF]">{parsedCsv.fileName}</span>
                      <span className="font-mono text-[#39D6A0]">
                        {parsedCsv.validRows} valid · {parsedCsv.missingRows} missing/invalid
                      </span>
                    </div>

                    {parsedCsv.errors.map((err, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-[#F45B69]">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{err}</span>
                      </div>
                    ))}
                    {parsedCsv.warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-[#FFB547]">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{w}</span>
                      </div>
                    ))}

                    {parsedCsv.headers.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div>
                          <label className="block text-xs text-[#8FA8C8] mb-1">Date Column</label>
                          <select
                            value={parsedCsv.dateColumn}
                            onChange={(e) => reparseCsvColumns(e.target.value, parsedCsv.valueColumn)}
                            className="w-full bg-[#0B1E36] border border-[#193556] rounded-md px-2.5 py-1.5 text-xs text-[#F4F8FF]"
                          >
                            {parsedCsv.headers.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-[#8FA8C8] mb-1">Measurement Column</label>
                          <select
                            value={parsedCsv.valueColumn}
                            onChange={(e) => reparseCsvColumns(parsedCsv.dateColumn, e.target.value)}
                            className="w-full bg-[#0B1E36] border border-[#193556] rounded-md px-2.5 py-1.5 text-xs text-[#F4F8FF]"
                          >
                            {parsedCsv.headers.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-[#8FA8C8] mb-1">Measurement Unit</label>
                          <input
                            type="text"
                            value={csvUnitOverride}
                            onChange={(e) => setCsvUnitOverride(e.target.value)}
                            className="w-full bg-[#0B1E36] border border-[#193556] rounded-md px-2.5 py-1.5 text-xs font-mono text-[#F4F8FF]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 2. Environmental Variable */}
          <section className="rounded-xl border border-[#193556] bg-[#0B1E36] p-5 space-y-4">
            <h2 className="font-display text-base font-semibold text-[#F4F8FF]">02. Environmental Variable</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {ENVIRONMENTAL_VARIABLES.map((v) => {
                const active = config.variableId === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onChangeConfig({ ...config, variableId: v.id })}
                    className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                      active
                        ? 'border-[#36D9E6] bg-[#36D9E6]/10'
                        : 'border-[#193556] bg-[#071426]/60 hover:border-[#3887FF]/50'
                    }`}
                  >
                    <div className="text-[11px] font-mono text-[#8FA8C8]">{v.category}</div>
                    <div className={`text-xs font-semibold mt-0.5 ${active ? 'text-[#36D9E6]' : 'text-[#F4F8FF]'}`}>
                      {v.shortName}
                    </div>
                    <div className="text-[11px] font-mono text-[#8FA8C8] mt-1">{v.unit}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[#8FA8C8]">{selectedVariable.description}</p>
            {powerUnavailableForVar && (
              <div className="rounded-lg border border-[#FFB547]/40 bg-[#FFB547]/10 p-3 text-xs text-[#FFB547]">
                {selectedVariable.name} is not served by the NASA POWER point endpoint. Running this variable will
                automatically use the explicitly labeled Demonstration Benchmark unless you switch to CSV upload.
              </div>
            )}
          </section>

          {/* 3. Geography & Time Period */}
          <section className="rounded-xl border border-[#193556] bg-[#0B1E36] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold text-[#F4F8FF]">
                03. Geographical Selection &amp; Observation Window
              </h2>
              <div className="inline-flex rounded-lg border border-[#193556] bg-[#071426] p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setGeoMode('preset')}
                  className={`px-3 py-1 rounded-md cursor-pointer ${
                    geoMode === 'preset' ? 'bg-[#36D9E6] text-[#071426] font-semibold' : 'text-[#8FA8C8]'
                  }`}
                >
                  Study Basins
                </button>
                <button
                  type="button"
                  onClick={() => setGeoMode('custom')}
                  className={`px-3 py-1 rounded-md cursor-pointer ${
                    geoMode === 'custom' ? 'bg-[#36D9E6] text-[#071426] font-semibold' : 'text-[#8FA8C8]'
                  }`}
                >
                  Custom Lat/Lon
                </button>
              </div>
            </div>

            {geoMode === 'preset' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#8FA8C8] mb-1">Region / Climate Zone</label>
                  <select
                    value={config.regionId}
                    onChange={(e) => {
                      const preset = REGION_PRESETS.find((r) => r.id === e.target.value);
                      if (preset) {
                        onChangeConfig({
                          ...config,
                          regionId: preset.id,
                          customRegionName: preset.name,
                          lat: preset.lat,
                          lon: preset.lon,
                        });
                      }
                    }}
                    className="w-full bg-[#071426] border border-[#193556] rounded-lg px-3 py-2 text-xs text-[#F4F8FF] focus:outline-none focus:border-[#36D9E6]"
                  >
                    {REGION_PRESETS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.countryOrZone})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rounded-lg border border-[#193556] bg-[#071426] px-3 py-2 text-xs flex flex-col justify-center">
                  <span className="text-[#8FA8C8]">Selected Centroid &amp; Biome</span>
                  <span className="font-mono text-[#F4F8FF] mt-0.5">
                    {config.lat.toFixed(2)}°, {config.lon.toFixed(2)}° · {selectedPreset?.biome || 'Custom'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-[#8FA8C8] mb-1">Region Label</label>
                  <input
                    type="text"
                    value={config.customRegionName}
                    onChange={(e) =>
                      onChangeConfig({ ...config, regionId: 'custom-point', customRegionName: e.target.value })
                    }
                    className="w-full bg-[#071426] border border-[#193556] rounded-lg px-3 py-2 text-xs text-[#F4F8FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#8FA8C8] mb-1">Latitude (-90 to 90)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={-90}
                    max={90}
                    value={config.lat}
                    onChange={(e) =>
                      onChangeConfig({ ...config, regionId: 'custom-point', lat: Number(e.target.value) })
                    }
                    className="w-full bg-[#071426] border border-[#193556] rounded-lg px-3 py-2 text-xs font-mono text-[#F4F8FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#8FA8C8] mb-1">Longitude (-180 to 180)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={-180}
                    max={180}
                    value={config.lon}
                    onChange={(e) =>
                      onChangeConfig({ ...config, regionId: 'custom-point', lon: Number(e.target.value) })
                    }
                    className="w-full bg-[#071426] border border-[#193556] rounded-lg px-3 py-2 text-xs font-mono text-[#F4F8FF]"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#193556]">
              <div>
                <label className="block text-xs text-[#8FA8C8] mb-1">Start Year</label>
                <input
                  type="number"
                  min={1981}
                  max={2024}
                  value={config.startYear}
                  onChange={(e) => onChangeConfig({ ...config, startYear: Number(e.target.value) })}
                  className="w-full bg-[#071426] border border-[#193556] rounded-lg px-3 py-2 text-xs font-mono text-[#F4F8FF]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8FA8C8] mb-1">End Year</label>
                <input
                  type="number"
                  min={config.startYear}
                  max={2025}
                  value={config.endYear}
                  onChange={(e) => onChangeConfig({ ...config, endYear: Number(e.target.value) })}
                  className="w-full bg-[#071426] border border-[#193556] rounded-lg px-3 py-2 text-xs font-mono text-[#F4F8FF]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8FA8C8] mb-1">Temporal Aggregation</label>
                <select
                  value={config.granularity}
                  onChange={(e) =>
                    onChangeConfig({ ...config, granularity: e.target.value as AggregationGranularity })
                  }
                  className="w-full bg-[#071426] border border-[#193556] rounded-lg px-3 py-2 text-xs text-[#F4F8FF]"
                >
                  <option value="annual">Annual Mean</option>
                  <option value="seasonal">Seasonal (DJF/MAM/JJA/SON)</option>
                  <option value="monthly">Monthly Series</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#8FA8C8] mb-1">Significance α</label>
                <select
                  value={config.alpha}
                  onChange={(e) =>
                    onChangeConfig({ ...config, alpha: Number(e.target.value) as SignificanceAlpha })
                  }
                  className="w-full bg-[#071426] border border-[#193556] rounded-lg px-3 py-2 text-xs font-mono text-[#F4F8FF]"
                >
                  <option value={0.01}>0.01 (99%)</option>
                  <option value={0.05}>0.05 (95%)</option>
                  <option value={0.1}>0.10 (90%)</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        {/* Right Configuration Summary & Launch */}
        <div className="xl:col-span-4 space-y-4">
          <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-5 space-y-4 sticky top-4">
            <h2 className="font-display text-base font-semibold text-[#F4F8FF]">Configuration Summary</h2>

            <dl className="space-y-2.5 text-xs">
              <div className="flex justify-between gap-3 py-1.5 border-b border-[#193556]">
                <dt className="text-[#8FA8C8]">Variable</dt>
                <dd className="font-medium text-[#F4F8FF] text-right">{selectedVariable.name}</dd>
              </div>
              <div className="flex justify-between gap-3 py-1.5 border-b border-[#193556]">
                <dt className="text-[#8FA8C8]">Measurement Unit</dt>
                <dd className="font-mono text-[#36D9E6]">{config.mode === 'csv' ? csvUnitOverride : selectedVariable.unit}</dd>
              </div>
              <div className="flex justify-between gap-3 py-1.5 border-b border-[#193556]">
                <dt className="text-[#8FA8C8]">Target Region</dt>
                <dd className="font-medium text-[#F4F8FF] text-right">{config.customRegionName || selectedPreset?.name}</dd>
              </div>
              <div className="flex justify-between gap-3 py-1.5 border-b border-[#193556]">
                <dt className="text-[#8FA8C8]">Coordinates</dt>
                <dd className="font-mono text-[#F4F8FF]">
                  {config.lat.toFixed(2)}°, {config.lon.toFixed(2)}°
                </dd>
              </div>
              <div className="flex justify-between gap-3 py-1.5 border-b border-[#193556]">
                <dt className="text-[#8FA8C8]">Window &amp; Step</dt>
                <dd className="font-mono text-[#F4F8FF]">
                  {config.startYear}–{config.endYear} · {config.granularity}
                </dd>
              </div>
              <div className="flex justify-between gap-3 py-1.5 border-b border-[#193556]">
                <dt className="text-[#8FA8C8]">Statistical Suite</dt>
                <dd className="font-mono text-[#F4F8FF]">MK + Sen + OLS (α={config.alpha})</dd>
              </div>
              <div className="flex justify-between gap-3 py-1.5">
                <dt className="text-[#8FA8C8]">Data Mode</dt>
                <dd className={`font-mono font-semibold ${config.mode === 'demo' ? 'text-[#FFB547]' : 'text-[#39D6A0]'}`}>
                  {config.mode === 'nasa-power'
                    ? 'NASA POWER Live'
                    : config.mode === 'csv'
                    ? 'Uploaded CSV'
                    : 'Demo Benchmark'}
                </dd>
              </div>
            </dl>

            {errorMsg && (
              <div className="rounded-lg border border-[#F45B69]/40 bg-[#F45B69]/10 p-3 text-xs text-[#F45B69]">
                {errorMsg}
              </div>
            )}

            <button
              type="button"
              disabled={
                isRunning ||
                (config.mode === 'csv' && (!parsedCsv || parsedCsv.errors.length > 0 || parsedCsv.validRows === 0))
              }
              onClick={() => {
                if (config.mode === 'csv' && parsedCsv) {
                  onRunAnalysis({
                    observations: parsedCsv.observations,
                    fileName: parsedCsv.fileName,
                    unit: csvUnitOverride || parsedCsv.detectedUnit,
                    variableName: parsedCsv.valueColumn,
                  });
                } else {
                  onRunAnalysis();
                }
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#36D9E6] text-[#071426] text-sm font-semibold hover:bg-[#5ce3ee] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              <span>{isRunning ? 'Retrieving & Computing...' : 'Run Trend Analysis'}</span>
            </button>

            {config.mode === 'csv' && parsedCsv && parsedCsv.errors.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-[#39D6A0]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>CSV validated ({parsedCsv.validRows} observations ready)</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
