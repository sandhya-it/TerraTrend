import { useState } from 'react';
import { GitCompare } from 'lucide-react';
import { ScientificTimeSeriesChart } from '../components/ScientificTimeSeriesChart';
import { TrendStatusIndicator } from '../components/TrendBadge';
import { ENVIRONMENTAL_VARIABLES, REGION_PRESETS } from '../lib/nasaCatalog';
import { AggregationGranularity, DataSourceMode, TrendAnalysisResult } from '../types/terratrend';

interface RegionalComparisonModuleProps {
  analyses: TrendAnalysisResult[];
  mode: DataSourceMode;
  isLoading: boolean;
  onCompareRegions: (
    variableId: string,
    regionIds: string[],
    startYear: number,
    endYear: number,
    granularity: AggregationGranularity,
    mode: DataSourceMode
  ) => Promise<void>;
}

export function RegionalComparisonModule({
  analyses,
  mode,
  isLoading,
  onCompareRegions,
}: RegionalComparisonModuleProps) {
  const [variableId, setVariableId] = useState<string>('GWETTOP');
  const [regionAId, setRegionAId] = useState<string>('us-southwest');
  const [regionBId, setRegionBId] = useState<string>('northern-plains');
  const [regionCId, setRegionCId] = useState<string>('mediterranean-iberia');
  const [includeThird, setIncludeThird] = useState<boolean>(false);
  const [startYear, setStartYear] = useState<number>(2000);
  const [endYear, setEndYear] = useState<number>(2024);
  const [granularity, setGranularity] = useState<AggregationGranularity>('annual');
  const [compMode, setCompMode] = useState<DataSourceMode>(mode === 'csv' ? 'nasa-power' : mode);

  const selectedIds = includeThird ? [regionAId, regionBId, regionCId] : [regionAId, regionBId];

  const matchedResults = selectedIds
    .map((rId) => analyses.find((a) => a.regionId === rId && a.variableId === variableId))
    .filter((x): x is TrendAnalysisResult => Boolean(x));

  const resA = matchedResults[0] || null;
  const resB = matchedResults[1] || null;

  // Only emit opposite-trend statement when computed slopes actually diverge in sign
  let comparisonSummary = 'Run synchronized regional analysis to generate a data-backed comparison statement.';
  if (resA && resB && resA.sensSlope && resB.sensSlope) {
    const sA = resA.sensSlope.slopePerYear;
    const sB = resB.sensSlope.slopePerYear;
    if (sA > 1e-6 && sB < -1e-6) {
      comparisonSummary = `${resA.regionName} experienced an increasing trend (${sA >= 0 ? '+' : ''}${sA.toFixed(
        4
      )} ${resA.unit}/yr), whereas ${resB.regionName} experienced a decreasing trend (${sB.toFixed(4)} ${
        resB.unit
      }/yr) during the same observation period (${resA.startDate} to ${resA.endDate}).`;
    } else if (sA < -1e-6 && sB > 1e-6) {
      comparisonSummary = `${resB.regionName} experienced an increasing trend (+${sB.toFixed(4)} ${
        resB.unit
      }/yr), whereas ${resA.regionName} experienced a decreasing trend (${sA.toFixed(4)} ${
        resA.unit
      }/yr) during the same observation period (${resA.startDate} to ${resA.endDate}).`;
    } else {
      const sameDir = sA >= 0 && sB >= 0 ? 'increasing' : sA <= 0 && sB <= 0 ? 'decreasing' : 'mixed';
      comparisonSummary = `Both ${resA.regionName} (${sA >= 0 ? '+' : ''}${sA.toFixed(4)} ${resA.unit}/yr) and ${
        resB.regionName
      } (${sB >= 0 ? '+' : ''}${sB.toFixed(4)} ${resB.unit}/yr) exhibit ${sameDir} trajectories across ${
        resA.startDate
      } to ${resA.endDate}.`;
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[#F4F8FF]">Regional Comparison</h1>
        <p className="text-sm text-[#8FA8C8] mt-0.5">
          Compare two or more geographic regions over identical time periods and statistical thresholds to reveal
          spatial divergence.
        </p>
      </div>

      {/* Comparison Selector */}
      <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-[#8FA8C8] mb-1">Environmental Variable</label>
            <select
              value={variableId}
              onChange={(e) => setVariableId(e.target.value)}
              className="w-full bg-[#071426] border border-[#193556] rounded-lg px-3 py-2 text-xs text-[#F4F8FF]"
            >
              {ENVIRONMENTAL_VARIABLES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.unit})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#8FA8C8] mb-1">Region A</label>
            <select
              value={regionAId}
              onChange={(e) => setRegionAId(e.target.value)}
              className="w-full bg-[#071426] border border-[#193556] rounded-lg px-3 py-2 text-xs text-[#F4F8FF]"
            >
              {REGION_PRESETS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#8FA8C8] mb-1">Region B</label>
            <select
              value={regionBId}
              onChange={(e) => setRegionBId(e.target.value)}
              className="w-full bg-[#071426] border border-[#193556] rounded-lg px-3 py-2 text-xs text-[#F4F8FF]"
            >
              {REGION_PRESETS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#8FA8C8] mb-1">Data Mode</label>
            <select
              value={compMode}
              onChange={(e) => setCompMode(e.target.value as DataSourceMode)}
              className="w-full bg-[#071426] border border-[#193556] rounded-lg px-3 py-2 text-xs text-[#F4F8FF]"
            >
              <option value="nasa-power">NASA POWER API (Live)</option>
              <option value="demo">Demonstration Benchmark</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#193556]">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-2 text-[#8FA8C8] cursor-pointer">
              <input
                type="checkbox"
                checked={includeThird}
                onChange={(e) => setIncludeThird(e.target.checked)}
                className="accent-[#36D9E6]"
              />
              <span>Add Region C</span>
            </label>
            {includeThird && (
              <select
                value={regionCId}
                onChange={(e) => setRegionCId(e.target.value)}
                className="bg-[#071426] border border-[#193556] rounded-md px-2.5 py-1 text-xs text-[#F4F8FF]"
              >
                {REGION_PRESETS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            )}
            <span className="text-[#8FA8C8]">Window:</span>
            <input
              type="number"
              min={1981}
              max={2024}
              value={startYear}
              onChange={(e) => setStartYear(Number(e.target.value))}
              className="w-20 bg-[#071426] border border-[#193556] rounded-md px-2 py-1 font-mono text-xs text-[#F4F8FF]"
            />
            <span className="text-[#8FA8C8]">to</span>
            <input
              type="number"
              min={startYear}
              max={2025}
              value={endYear}
              onChange={(e) => setEndYear(Number(e.target.value))}
              className="w-20 bg-[#071426] border border-[#193556] rounded-md px-2 py-1 font-mono text-xs text-[#F4F8FF]"
            />
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as AggregationGranularity)}
              className="bg-[#071426] border border-[#193556] rounded-md px-2.5 py-1 text-xs text-[#F4F8FF]"
            >
              <option value="annual">Annual</option>
              <option value="seasonal">Seasonal</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => onCompareRegions(variableId, selectedIds, startYear, endYear, granularity, compMode)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#36D9E6] text-[#071426] text-xs font-semibold hover:bg-[#5ce3ee] cursor-pointer disabled:opacity-50"
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>{isLoading ? 'Synchronizing...' : 'Run Regional Comparison'}</span>
          </button>
        </div>
      </div>

      {/* Synchronized Chart */}
      {resA ? (
        <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-base font-semibold text-[#F4F8FF]">
              Synchronized Time-Series Overlay
            </h2>
            <span className="font-mono text-xs text-[#8FA8C8]">
              {resA.isDemo ? 'DEMONSTRATION BENCHMARK' : resA.dataSource}
            </span>
          </div>

          <ScientificTimeSeriesChart result={resA} comparisonResult={resB} height={360} />

          <div className="rounded-lg border border-[#36D9E6]/25 bg-[#071426] p-4 space-y-1">
            <div className="text-xs font-mono text-[#36D9E6]">DATA-GROUNDED COMPARISON SUMMARY</div>
            <p className="text-sm text-[#F4F8FF] leading-relaxed">{comparisonSummary}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-8 text-center text-sm text-[#8FA8C8]">
          Click &quot;Run Regional Comparison&quot; to fetch or compute synchronized time series for the selected regions.
        </div>
      )}

      {/* Comparative Matrix */}
      {matchedResults.length > 0 && (
        <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-5 space-y-3">
          <h2 className="font-display text-base font-semibold text-[#F4F8FF]">Comparative Statistical Matrix</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#193556] text-[#8FA8C8]">
                  <th className="py-2 pr-4">Region</th>
                  <th className="py-2 pr-4">Coordinates</th>
                  <th className="py-2 pr-4 text-right">Sen Slope/yr</th>
                  <th className="py-2 pr-4 text-right">Net Δ</th>
                  <th className="py-2 pr-4 text-right">MK p-value</th>
                  <th className="py-2 pr-4 text-right">OLS R²</th>
                  <th className="py-2">Classification</th>
                </tr>
              </thead>
              <tbody>
                {matchedResults.map((r) => (
                  <tr key={r.id} className="border-b border-[#193556]/60 font-mono">
                    <td className="py-2.5 pr-4 font-sans font-medium text-[#F4F8FF]">{r.regionName}</td>
                    <td className="py-2.5 pr-4 text-[#8FA8C8]">
                      {r.lat.toFixed(2)}°, {r.lon.toFixed(2)}°
                    </td>
                    <td className="py-2.5 pr-4 text-right text-[#F4F8FF]">
                      {r.sensSlope
                        ? `${r.sensSlope.slopePerYear >= 0 ? '+' : ''}${r.sensSlope.slopePerYear.toFixed(4)} ${r.unit}`
                        : '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-[#36D9E6]">
                      {r.absoluteChange !== null
                        ? `${r.absoluteChange >= 0 ? '+' : ''}${r.absoluteChange.toFixed(3)} ${r.unit}`
                        : '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-[#F4F8FF]">
                      {r.mannKendall ? r.mannKendall.pValue.toFixed(5) : '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-[#F4F8FF]">
                      {r.linearRegression ? r.linearRegression.rSquared.toFixed(3) : '—'}
                    </td>
                    <td className="py-2.5 font-sans">
                      <TrendStatusIndicator status={r.statusLabel} compact />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
