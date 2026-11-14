import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ScientificTimeSeriesChart } from '../components/ScientificTimeSeriesChart';
import { TrendStatusIndicator } from '../components/TrendBadge';
import { ModuleId, SignificanceAlpha, TrendAnalysisResult } from '../types/terratrend';

interface TemporalAnalysisModuleProps {
  result: TrendAnalysisResult | null;
  alpha: SignificanceAlpha;
  movingAverageWindow: number;
  onChangeAlpha: (alpha: SignificanceAlpha) => void;
  onChangeMovingAvg: (win: number) => void;
  onChartImageCaptured: (dataUrl: string) => void;
  onNavigate: (module: ModuleId) => void;
}

export function TemporalAnalysisModule({
  result,
  alpha,
  movingAverageWindow,
  onChangeAlpha,
  onChangeMovingAvg,
  onChartImageCaptured,
  onNavigate,
}: TemporalAnalysisModuleProps) {
  if (!result) {
    return (
      <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-10 text-center space-y-4">
        <h1 className="font-display text-xl font-semibold text-[#F4F8FF]">No Active Time Series Selected</h1>
        <p className="text-sm text-[#8FA8C8] max-w-md mx-auto">
          Select an environmental variable and study region in Variable Selection Studio to run temporal trend
          analysis.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('variable-studio')}
          className="px-4 py-2 rounded-lg bg-[#36D9E6] text-[#071426] text-xs font-semibold cursor-pointer"
        >
          Open Variable Selection Studio
        </button>
      </div>
    );
  }

  const climatologyData = result.monthlyClimatology.filter((m) => m.mean !== null);

  return (
    <div className="space-y-6 pb-10">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#8FA8C8]">
            <span className={result.isDemo ? 'text-[#FFB547]' : 'text-[#39D6A0]'}>
              {result.isDemo ? 'DEMONSTRATION BENCHMARK' : result.datasetNature.toUpperCase()}
            </span>
            <span aria-hidden="true">·</span>
            <span>{result.datasetId}</span>
            <span aria-hidden="true">·</span>
            <span>
              {result.lat.toFixed(2)}°, {result.lon.toFixed(2)}°
            </span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-[#F4F8FF] mt-1">
            Temporal Trend Analyzer: {result.variableName}
          </h1>
          <p className="text-sm text-[#8FA8C8]">
            {result.regionName} ({result.startDate} to {result.endDate} · {result.granularity} aggregation)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#8FA8C8]">α Threshold:</span>
            <div className="inline-flex rounded-lg border border-[#193556] bg-[#0B1E36] p-0.5">
              {([0.01, 0.05, 0.1] as SignificanceAlpha[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => onChangeAlpha(a)}
                  className={`px-2.5 py-1 rounded-md font-mono cursor-pointer ${
                    alpha === a ? 'bg-[#36D9E6] text-[#071426] font-semibold' : 'text-[#8FA8C8] hover:text-[#F4F8FF]'
                  }`}
                >
                  {a.toFixed(2)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#8FA8C8]">Moving Avg:</span>
            <select
              value={movingAverageWindow}
              onChange={(e) => onChangeMovingAvg(Number(e.target.value))}
              className="bg-[#0B1E36] border border-[#193556] rounded-lg px-2.5 py-1.5 font-mono text-xs text-[#F4F8FF]"
            >
              <option value={3}>3-period</option>
              <option value={5}>5-period</option>
              <option value={12}>12-period</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistical Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-4">
          <div className="text-xs text-[#8FA8C8]">Sen&apos;s Slope Rate</div>
          <div className="font-mono text-lg font-semibold text-[#F4F8FF] tabular-nums mt-1">
            {result.sensSlope
              ? `${result.sensSlope.slopePerYear >= 0 ? '+' : ''}${result.sensSlope.slopePerYear.toFixed(4)}`
              : 'N/A'}
          </div>
          <div className="text-[11px] font-mono text-[#8FA8C8]">{result.unit}/year</div>
        </div>

        <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-4">
          <div className="text-xs text-[#8FA8C8]">Net Change (Span)</div>
          <div className="font-mono text-lg font-semibold text-[#36D9E6] tabular-nums mt-1">
            {result.absoluteChange !== null
              ? `${result.absoluteChange >= 0 ? '+' : ''}${result.absoluteChange.toFixed(3)}`
              : 'N/A'}
          </div>
          <div className="text-[11px] font-mono text-[#8FA8C8]">
            {result.percentChange !== null ? `${result.percentChange >= 0 ? '+' : ''}${result.percentChange}%` : result.unit}
          </div>
        </div>

        <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-4">
          <div className="text-xs text-[#8FA8C8]">Mann-Kendall p</div>
          <div className="font-mono text-lg font-semibold text-[#F4F8FF] tabular-nums mt-1">
            {result.mannKendall ? result.mannKendall.pValue.toFixed(5) : 'N/A'}
          </div>
          <div className="text-[11px] font-mono text-[#8FA8C8]">
            Z = {result.mannKendall ? result.mannKendall.zScore.toFixed(2) : '—'}
          </div>
        </div>

        <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-4">
          <div className="text-xs text-[#8FA8C8]">OLS R² &amp; Slope</div>
          <div className="font-mono text-lg font-semibold text-[#F4F8FF] tabular-nums mt-1">
            {result.linearRegression ? result.linearRegression.rSquared.toFixed(3) : 'N/A'}
          </div>
          <div className="text-[11px] font-mono text-[#8FA8C8]">
            {result.linearRegression ? `${result.linearRegression.slopePerYear.toFixed(4)} ${result.unit}/yr` : '—'}
          </div>
        </div>

        <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-4">
          <div className="text-xs text-[#8FA8C8]">Min / Max Range</div>
          <div className="font-mono text-sm font-semibold text-[#F4F8FF] tabular-nums mt-1.5">
            {result.minValue !== null && result.maxValue !== null
              ? `${result.minValue.toFixed(2)} – ${result.maxValue.toFixed(2)}`
              : 'N/A'}
          </div>
          <div className="text-[11px] font-mono text-[#8FA8C8]">
            Mean {result.meanValue?.toFixed(2) ?? '—'} {result.unit}
          </div>
        </div>

        <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-4">
          <div className="text-xs text-[#8FA8C8]">Sample Completeness</div>
          <div className="font-mono text-lg font-semibold text-[#F4F8FF] tabular-nums mt-1">
            {result.validObservations}/{result.totalObservations}
          </div>
          <div className="text-[11px] font-mono text-[#8FA8C8]">{result.missingPercent}% missing</div>
        </div>
      </div>

      {/* Main Plotly Scientific Chart + Interpretation */}
      <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TrendStatusIndicator status={result.statusLabel} />
          {result.sensSlope && (
            <div className="text-xs font-mono text-[#8FA8C8]">
              Sen 95% CI: [{result.sensSlope.ciLowerPerYear.toFixed(4)}, {result.sensSlope.ciUpperPerYear.toFixed(4)}]{' '}
              {result.unit}/yr
            </div>
          )}
        </div>

        <ScientificTimeSeriesChart result={result} onImageReady={onChartImageCaptured} />

        {/* Scientific Interpretation Panel */}
        <div className="border-t border-[#193556] pt-4 space-y-2">
          <div className="text-xs font-mono text-[#36D9E6]">COMPUTED SCIENTIFIC INTERPRETATION</div>
          <p className="text-sm text-[#F4F8FF] leading-relaxed">{result.interpretation}</p>
          {result.percentChangeNote && (
            <p className="text-xs text-[#8FA8C8]">{result.percentChangeNote}</p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <div className="text-xs text-[#8FA8C8]">
              {result.autocorrelation?.hasSignificantAutocorrelation
                ? `▲ Autocorrelation Alert: Lag-1 r₁ = ${result.autocorrelation.lag1.toFixed(3)} (DW = ${result.autocorrelation.durbinWatson.toFixed(2)})`
                : `● Residual Autocorrelation: Lag-1 r₁ = ${result.autocorrelation?.lag1.toFixed(3) ?? '0.000'}`}
            </div>
            <button
              type="button"
              onClick={() => onNavigate('significance')}
              className="text-xs text-[#36D9E6] hover:underline cursor-pointer"
            >
              Inspect Full Diagnostics in Significance Lab →
            </button>
          </div>
        </div>
      </div>

      {/* Monthly / Seasonal Climatology Profile */}
      {climatologyData.length > 0 && (
        <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-5 space-y-3">
          <div>
            <h2 className="font-display text-base font-semibold text-[#F4F8FF]">
              Seasonal Cycle &amp; Monthly Climatology
            </h2>
            <p className="text-xs text-[#8FA8C8]">
              Multi-year monthly average across the observation period ({result.unit}) to distinguish seasonal
              amplitude from long-term drift.
            </p>
          </div>

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={climatologyData} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
                <CartesianGrid stroke="rgba(54,217,230,0.08)" vertical={false} />
                <XAxis dataKey="monthName" stroke="#8FA8C8" fontSize={11} />
                <YAxis stroke="#8FA8C8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#071426',
                    borderColor: '#36D9E6',
                    fontSize: '12px',
                    color: '#F4F8FF',
                  }}
                />
                <Bar dataKey="mean" name={`Mean (${result.unit})`} fill="#36D9E6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
