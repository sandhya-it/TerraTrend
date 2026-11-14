import { useState } from 'react';
import { ArrowLeftRight, Layers, MapPin } from 'lucide-react';
import { EarthGeospatialMap } from '../components/EarthGeospatialMap';
import { TrendStatusIndicator } from '../components/TrendBadge';
import {
  ENVIRONMENTAL_VARIABLES,
  GIBS_LAYERS,
  OPPOSITE_TREND_PAIRS,
  REGION_PRESETS,
} from '../lib/nasaCatalog';
import { DataSourceMode, TrendAnalysisResult } from '../types/terratrend';

interface GeospatialAnalysisModuleProps {
  analyses: TrendAnalysisResult[];
  activeAnalysis: TrendAnalysisResult | null;
  mode: DataSourceMode;
  isLoading: boolean;
  onRunPointQuery: (lat: number, lon: number, regionId?: string) => void;
  onRunOppositePair: (variableId: string, regionAId: string, regionBId: string, mode: DataSourceMode) => void;
}

export function GeospatialAnalysisModule({
  analyses,
  activeAnalysis,
  mode,
  isLoading,
  onRunPointQuery,
  onRunOppositePair,
}: GeospatialAnalysisModuleProps) {
  const [selectedGibsLayerId, setSelectedGibsLayerId] = useState<string>('modis-lst-day');
  const [gibsEnabled, setGibsEnabled] = useState<boolean>(true);
  const [gibsDate, setGibsDate] = useState<string>('2024-08-15');
  const [gibsOpacity, setGibsOpacity] = useState<number>(0.65);
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lon: number; regionId?: string } | null>(null);

  const [selectedPairId, setSelectedPairId] = useState<string>(OPPOSITE_TREND_PAIRS[0].id);
  const activePair = OPPOSITE_TREND_PAIRS.find((p) => p.id === selectedPairId) || OPPOSITE_TREND_PAIRS[0];
  const activeGibs = GIBS_LAYERS.find((g) => g.id === selectedGibsLayerId) || GIBS_LAYERS[0];

  const pairVariable = ENVIRONMENTAL_VARIABLES.find((v) => v.id === activePair.variableId);
  const regionAInfo = REGION_PRESETS.find((r) => r.id === activePair.regionAId);
  const regionBInfo = REGION_PRESETS.find((r) => r.id === activePair.regionBId);

  const resultA = analyses.find(
    (a) => a.regionId === activePair.regionAId && a.variableId === activePair.variableId
  );
  const resultB = analyses.find(
    (a) => a.regionId === activePair.regionBId && a.variableId === activePair.variableId
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#F4F8FF]">Geospatial Change Detection</h1>
          <p className="text-sm text-[#8FA8C8] mt-0.5">
            Explore NASA GIBS orbital imagery overlays, click any global coordinate to compute live trend statistics,
            and inspect opposing regional trajectories.
          </p>
        </div>
      </div>

      {/* Interactive Map & GIBS Controls */}
      <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#36D9E6]" />
            <span className="text-sm font-semibold text-[#F4F8FF]">Interactive Earth Layer Controls</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <button
              type="button"
              onClick={() => setGibsEnabled((v) => !v)}
              className={`px-3 py-1.5 rounded-md border font-medium cursor-pointer ${
                gibsEnabled
                  ? 'border-[#36D9E6] bg-[#36D9E6]/15 text-[#36D9E6]'
                  : 'border-[#193556] bg-[#071426] text-[#8FA8C8]'
              }`}
            >
              {gibsEnabled ? 'GIBS Satellite Layer: Active' : 'GIBS Satellite Layer: Off'}
            </button>

            {gibsEnabled && (
              <>
                <select
                  value={selectedGibsLayerId}
                  onChange={(e) => setSelectedGibsLayerId(e.target.value)}
                  className="bg-[#071426] border border-[#193556] rounded-md px-2.5 py-1.5 text-xs text-[#F4F8FF]"
                >
                  {GIBS_LAYERS.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={gibsDate}
                  min="2000-03-01"
                  max="2025-12-31"
                  onChange={(e) => setGibsDate(e.target.value)}
                  className="bg-[#071426] border border-[#193556] rounded-md px-2.5 py-1.5 text-xs font-mono text-[#F4F8FF]"
                />
                <label className="flex items-center gap-2 text-[#8FA8C8]">
                  <span>Opacity</span>
                  <input
                    type="range"
                    min={0.15}
                    max={1}
                    step={0.05}
                    value={gibsOpacity}
                    onChange={(e) => setGibsOpacity(Number(e.target.value))}
                    className="w-20 accent-[#36D9E6]"
                  />
                </label>
              </>
            )}
          </div>
        </div>

        <EarthGeospatialMap
          analyses={analyses}
          activeAnalysisId={activeAnalysis?.id}
          selectedGibsLayerId={gibsEnabled ? selectedGibsLayerId : null}
          gibsDate={gibsDate}
          gibsOpacity={gibsOpacity}
          heightClass="h-[460px]"
          onSelectRegionPoint={(lat, lon, regionId) => setClickedCoords({ lat, lon, regionId })}
        />

        {/* Map Legend & Point Query Action Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2 border-t border-[#193556] items-center">
          <div className="lg:col-span-7 space-y-2">
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              <span className="text-[#39D6A0]">▲ Sig. Increasing</span>
              <span className="text-[#F45B69]">▼ Sig. Decreasing</span>
              <span className="text-[#FFB547]">△/▽ Non-Significant</span>
              <span className="text-[#36D9E6]">● Stable</span>
              <span className="text-[#8FA8C8]">◌ Insufficient Data</span>
            </div>
            {gibsEnabled && (
              <div className="flex items-center gap-3 text-[11px] text-[#8FA8C8]">
                <span className="font-mono text-[#F4F8FF]">{activeGibs.mission}:</span>
                <span>{activeGibs.legendMin}</span>
                <div className="h-2 w-32 rounded-sm" style={{ background: activeGibs.gradientCss }} />
                <span>{activeGibs.legendMax}</span>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 flex flex-wrap items-center justify-end gap-2.5">
            {clickedCoords ? (
              <>
                <span className="font-mono text-xs text-[#36D9E6] inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {clickedCoords.lat.toFixed(2)}°, {clickedCoords.lon.toFixed(2)}°
                </span>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => onRunPointQuery(clickedCoords.lat, clickedCoords.lon, clickedCoords.regionId)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#36D9E6] text-[#071426] text-xs font-semibold hover:bg-[#5ce3ee] cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? 'Analyzing Point...' : 'Analyze Selected Point'}
                </button>
              </>
            ) : (
              <span className="text-xs text-[#8FA8C8]">Click anywhere on the map to query coordinates</span>
            )}
          </div>
        </div>
      </div>

      {/* Opposite Regional Trend Detection Spotlight */}
      <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#36D9E6]">
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>OPPOSITE REGIONAL TREND DETECTION</span>
            </div>
            <h2 className="font-display text-lg font-semibold text-[#F4F8FF] mt-1">{activePair.title}</h2>
            <p className="text-xs text-[#8FA8C8] mt-0.5">{activePair.hypothesis}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={selectedPairId}
              onChange={(e) => setSelectedPairId(e.target.value)}
              className="bg-[#071426] border border-[#193556] rounded-lg px-3 py-2 text-xs text-[#F4F8FF]"
            >
              {OPPOSITE_TREND_PAIRS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={isLoading}
              onClick={() =>
                onRunOppositePair(
                  activePair.variableId,
                  activePair.regionAId,
                  activePair.regionBId,
                  mode === 'csv' ? 'nasa-power' : mode
                )
              }
              className="px-4 py-2 rounded-lg bg-[#36D9E6] text-[#071426] text-xs font-semibold hover:bg-[#5ce3ee] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Computing Pair...' : `Run ${pairVariable?.shortName} Divergence Test`}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Region A', preset: regionAInfo, res: resultA },
            { label: 'Region B', preset: regionBInfo, res: resultB },
          ].map(({ label, preset, res }) => (
            <div key={label} className="rounded-lg border border-[#193556] bg-[#071426] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-[#8FA8C8]">
                <span>{label}</span>
                <span className="font-mono">
                  {preset?.lat.toFixed(2)}°, {preset?.lon.toFixed(2)}°
                </span>
              </div>
              <div className="font-display text-base font-semibold text-[#F4F8FF]">
                {preset?.name}
              </div>

              {res ? (
                <div className="space-y-2.5 pt-2 border-t border-[#193556]">
                  <TrendStatusIndicator status={res.statusLabel} />
                  <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                    <div>
                      <div className="text-[#8FA8C8] font-sans">Sen Slope/yr</div>
                      <div className="text-[#F4F8FF] font-semibold mt-0.5">
                        {res.sensSlope
                          ? `${res.sensSlope.slopePerYear >= 0 ? '+' : ''}${res.sensSlope.slopePerYear.toFixed(4)} ${res.unit}`
                          : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#8FA8C8] font-sans">p-value</div>
                      <div className="text-[#F4F8FF] font-semibold mt-0.5">
                        {res.mannKendall ? res.mannKendall.pValue.toFixed(4) : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#8FA8C8] font-sans">Data Mode</div>
                      <div className={`font-semibold mt-0.5 ${res.isDemo ? 'text-[#FFB547]' : 'text-[#39D6A0]'}`}>
                        {res.isDemo ? 'Demo' : 'NASA POWER'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[#8FA8C8] pt-2 border-t border-[#193556]">
                  Not yet computed for this pair. Click &quot;Run Divergence Test&quot; above to compute real metrics.
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
