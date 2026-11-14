import { useState } from 'react';
import { RefreshCw, ArrowUpRight, Layers, SlidersHorizontal } from 'lucide-react';
import { EarthGeospatialMap } from '../components/EarthGeospatialMap';
import { TrendStatusIndicator } from '../components/TrendBadge';
import { GIBS_LAYERS } from '../lib/nasaCatalog';
import { HealthResponse } from '../lib/nasaClient';
import { ModuleId, TrendAnalysisResult } from '../types/terratrend';

interface MissionControlModuleProps {
  analyses: TrendAnalysisResult[];
  activeAnalysis: TrendAnalysisResult | null;
  catalogCount: number;
  supportedVariablesCount: number;
  serviceHealth: HealthResponse | null;
  isProbingHealth: boolean;
  onProbeHealth: () => void;
  onSelectAnalysis: (id: string) => void;
  onNavigate: (module: ModuleId) => void;
}

export function MissionControlModule({
  analyses,
  activeAnalysis,
  catalogCount,
  supportedVariablesCount,
  serviceHealth,
  isProbingHealth,
  onProbeHealth,
  onSelectAnalysis,
  onNavigate,
}: MissionControlModuleProps) {
  const [selectedGibsId, setSelectedGibsId] = useState<string>('modis-true-color');
  const [gibsEnabled, setGibsEnabled] = useState<boolean>(true);
  const [gibsDate, setGibsDate] = useState<string>('2024-08-15');

  const uniqueRegionsAnalyzed = new Set(analyses.map((a) => a.regionId)).size;
  const significantCount = analyses.filter(
    (a) =>
      a.statusLabel === 'Statistically significant increasing trend' ||
      a.statusLabel === 'Statistically significant decreasing trend'
  ).length;

  return (
    <div className="space-y-6 pb-10">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#F4F8FF]">Mission Control Dashboard</h1>
          <p className="text-sm text-[#8FA8C8] mt-0.5">
            Real-time session telemetry computed strictly from retrieved NASA datasets and analyzed regions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onProbeHealth}
            disabled={isProbingHealth}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#193556] bg-[#0B1E36] text-xs font-medium text-[#F4F8FF] hover:border-[#36D9E6] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProbingHealth ? 'animate-spin' : ''}`} />
            <span>{isProbingHealth ? 'Checking NASA APIs...' : 'Verify NASA Services'}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('variable-studio')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#36D9E6] text-[#071426] text-xs font-semibold hover:bg-[#5ce3ee] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Configure Analysis</span>
          </button>
        </div>
      </div>

      {/* Top Statistics (Actual Retrieved / Computed Counts Only) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-4">
          <div className="text-xs text-[#8FA8C8]">Datasets Cataloged</div>
          <div className="font-mono text-2xl font-semibold text-[#F4F8FF] tabular-nums mt-1">{catalogCount}</div>
          <div className="text-xs text-[#8FA8C8] mt-1">CMR + POWER + GIBS registry</div>
        </div>
        <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-4">
          <div className="text-xs text-[#8FA8C8]">Variables Supported</div>
          <div className="font-mono text-2xl font-semibold text-[#36D9E6] tabular-nums mt-1">
            {supportedVariablesCount}
          </div>
          <div className="text-xs text-[#8FA8C8] mt-1">Atmosphere · Hydrology · Biosphere</div>
        </div>
        <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-4">
          <div className="text-xs text-[#8FA8C8]">Regions Analyzed</div>
          <div className="font-mono text-2xl font-semibold text-[#F4F8FF] tabular-nums mt-1">
            {uniqueRegionsAnalyzed}
          </div>
          <div className="text-xs text-[#8FA8C8] mt-1">{analyses.length} computed run(s) in session</div>
        </div>
        <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-4">
          <div className="text-xs text-[#8FA8C8]">Significant Trends Detected</div>
          <div className="font-mono text-2xl font-semibold text-[#39D6A0] tabular-nums mt-1">
            {significantCount}
          </div>
          <div className="text-xs text-[#8FA8C8] mt-1">Mann-Kendall p &lt; α</div>
        </div>
      </div>

      {/* Main Grid: Interactive Earth Map + Active Context & Service Availability */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 rounded-xl border border-[#193556] bg-[#0B1E36] p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#36D9E6]" />
              <h2 className="font-display text-base font-semibold text-[#F4F8FF]">
                Global Observation &amp; Trend Map
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setGibsEnabled((v) => !v)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  gibsEnabled
                    ? 'bg-[#36D9E6]/15 border-[#36D9E6] text-[#36D9E6]'
                    : 'bg-[#071426] border-[#193556] text-[#8FA8C8]'
                }`}
              >
                {gibsEnabled ? 'NASA GIBS Layer: On' : 'NASA GIBS Layer: Off'}
              </button>

              {gibsEnabled && (
                <>
                  <select
                    aria-label="Select NASA GIBS layer"
                    value={selectedGibsId}
                    onChange={(e) => setSelectedGibsId(e.target.value)}
                    className="bg-[#071426] border border-[#193556] rounded-md px-2.5 py-1.5 text-xs text-[#F4F8FF] focus:outline-none focus:border-[#36D9E6]"
                  >
                    {GIBS_LAYERS.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    aria-label="GIBS imagery date"
                    value={gibsDate}
                    max="2025-12-31"
                    min="2000-03-01"
                    onChange={(e) => setGibsDate(e.target.value)}
                    className="bg-[#071426] border border-[#193556] rounded-md px-2.5 py-1.5 text-xs font-mono text-[#F4F8FF] focus:outline-none focus:border-[#36D9E6]"
                  />
                </>
              )}
            </div>
          </div>

          <EarthGeospatialMap
            analyses={analyses}
            activeAnalysisId={activeAnalysis?.id}
            selectedGibsLayerId={gibsEnabled ? selectedGibsId : null}
            gibsDate={gibsDate}
            heightClass="h-[400px]"
            onSelectRegionPoint={(_lat, _lon, regionId) => {
              if (regionId) {
                const match = analyses.find((a) => a.regionId === regionId);
                if (match) onSelectAnalysis(match.id);
              }
            }}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#8FA8C8] pt-1">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-[#39D6A0] font-mono">▲ Sig. Increasing</span>
              <span className="text-[#F45B69] font-mono">▼ Sig. Decreasing</span>
              <span className="text-[#FFB547] font-mono">△/▽ Non-Significant</span>
              <span className="text-[#36D9E6] font-mono">● Stable</span>
              <span className="text-[#8FA8C8] font-mono">○ Unanalyzed Preset</span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('geospatial')}
              className="text-[#36D9E6] hover:underline cursor-pointer"
            >
              Expand Geospatial Lab →
            </button>
          </div>
        </div>

        {/* Right Column: Active Run Summary + NASA Service Availability */}
        <div className="xl:col-span-4 space-y-4">
          <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-[#F4F8FF]">Active Analysis Focus</h2>
              {activeAnalysis && (
                <button
                  type="button"
                  onClick={() => onNavigate('temporal')}
                  className="text-xs text-[#36D9E6] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Full Chart</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {activeAnalysis ? (
              <div className="space-y-3 text-sm">
                <div className="pb-3 border-b border-[#193556]">
                  <div className="font-medium text-[#F4F8FF]">{activeAnalysis.variableName}</div>
                  <div className="text-xs text-[#8FA8C8] mt-0.5">
                    {activeAnalysis.regionName} · {activeAnalysis.startDate} to {activeAnalysis.endDate}
                  </div>
                  <div className="mt-2">
                    <TrendStatusIndicator status={activeAnalysis.statusLabel} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div>
                    <div className="text-[#8FA8C8] font-sans">Sen&apos;s Slope</div>
                    <div className="text-[#F4F8FF] font-semibold mt-0.5">
                      {activeAnalysis.sensSlope
                        ? `${activeAnalysis.sensSlope.slopePerYear >= 0 ? '+' : ''}${activeAnalysis.sensSlope.slopePerYear.toFixed(4)} ${activeAnalysis.unit}/yr`
                        : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#8FA8C8] font-sans">Mann-Kendall p</div>
                    <div className="text-[#F4F8FF] font-semibold mt-0.5">
                      {activeAnalysis.mannKendall ? activeAnalysis.mannKendall.pValue.toFixed(5) : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#8FA8C8] font-sans">Valid Samples</div>
                    <div className="text-[#F4F8FF] font-semibold mt-0.5">
                      {activeAnalysis.validObservations} / {activeAnalysis.totalObservations}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#8FA8C8] font-sans">Data Mode</div>
                    <div className={`font-semibold mt-0.5 ${activeAnalysis.isDemo ? 'text-[#FFB547]' : 'text-[#39D6A0]'}`}>
                      {activeAnalysis.isDemo ? 'Demo Benchmark' : activeAnalysis.datasetNature}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[#8FA8C8] leading-relaxed pt-2 border-t border-[#193556]">
                  {activeAnalysis.interpretation}
                </p>
              </div>
            ) : (
              <div className="py-6 text-center space-y-3">
                <p className="text-sm text-[#8FA8C8]">
                  No time-series analysis has been executed yet in this session.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('variable-studio')}
                  className="px-4 py-2 rounded-lg bg-[#36D9E6] text-[#071426] text-xs font-semibold cursor-pointer"
                >
                  Select Variable &amp; Region
                </button>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-5 space-y-3">
            <h2 className="font-display text-base font-semibold text-[#F4F8FF]">NASA Service Availability</h2>
            <div className="space-y-2.5 text-xs">
              {[
                { key: 'cmr', name: 'NASA Earthdata CMR', role: 'Metadata & Dataset Search' },
                { key: 'power', name: 'NASA POWER API', role: 'Historical Time Series' },
                { key: 'gibs', name: 'NASA GIBS WMTS', role: 'Satellite Imagery Tiles' },
              ].map((svc) => {
                const info = serviceHealth?.services?.[svc.key];
                const status = info?.status || 'unchecked';
                const statusColor =
                  status === 'online'
                    ? 'text-[#39D6A0]'
                    : status === 'degraded'
                    ? 'text-[#FFB547]'
                    : 'text-[#8FA8C8]';
                const statusText =
                  status === 'online'
                    ? `● Online (${info?.latencyMs ?? '-'} ms)`
                    : status === 'degraded'
                    ? `▲ Unreachable / Limited`
                    : '○ Not probed yet';

                return (
                  <div
                    key={svc.key}
                    className="flex items-center justify-between py-2 border-b last:border-b-0 border-[#193556]"
                  >
                    <div>
                      <div className="text-[#F4F8FF] font-medium">{svc.name}</div>
                      <div className="text-[#8FA8C8]">{svc.role}</div>
                    </div>
                    <div className={`font-mono ${statusColor}`}>{statusText}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Regional Trend Summary & Recent Analyses Table */}
      <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-semibold text-[#F4F8FF]">
              Computed Regional Trend Summary
            </h2>
            <p className="text-xs text-[#8FA8C8]">
              Click any analyzed row to inspect its temporal chart, residuals, and statistical significance lab.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('comparison')}
            className="text-xs text-[#36D9E6] hover:underline cursor-pointer"
          >
            Compare Regions Side-by-Side →
          </button>
        </div>

        {analyses.length === 0 ? (
          <div className="py-8 text-center text-sm text-[#8FA8C8]">
            Run your first analysis in Variable Selection Studio to populate the session ledger.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#193556] text-[#8FA8C8]">
                  <th className="py-2.5 pr-4 font-medium">Region</th>
                  <th className="py-2.5 pr-4 font-medium">Variable</th>
                  <th className="py-2.5 pr-4 font-medium">Provenance</th>
                  <th className="py-2.5 pr-4 font-medium text-right">Sen&apos;s Slope</th>
                  <th className="py-2.5 pr-4 font-medium text-right">MK p-value</th>
                  <th className="py-2.5 font-medium">Classification</th>
                </tr>
              </thead>
              <tbody>
                {analyses.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onSelectAnalysis(item.id)}
                    className={`border-b border-[#193556]/60 cursor-pointer transition-colors hover:bg-[#0F2744] ${
                      activeAnalysis?.id === item.id ? 'bg-[#0F2744]' : ''
                    }`}
                  >
                    <td className="py-3 pr-4 font-medium text-[#F4F8FF]">{item.regionName}</td>
                    <td className="py-3 pr-4 text-[#8FA8C8]">
                      {item.variableName} ({item.granularity})
                    </td>
                    <td className="py-3 pr-4 font-mono">
                      <span className={item.isDemo ? 'text-[#FFB547]' : 'text-[#39D6A0]'}>
                        {item.isDemo ? 'Demo Benchmark' : item.datasetNature}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-mono text-right text-[#F4F8FF] tabular-nums">
                      {item.sensSlope
                        ? `${item.sensSlope.slopePerYear >= 0 ? '+' : ''}${item.sensSlope.slopePerYear.toFixed(4)} ${item.unit}/yr`
                        : '—'}
                    </td>
                    <td className="py-3 pr-4 font-mono text-right text-[#F4F8FF] tabular-nums">
                      {item.mannKendall ? item.mannKendall.pValue.toFixed(4) : '—'}
                    </td>
                    <td className="py-3">
                      <TrendStatusIndicator status={item.statusLabel} compact />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
