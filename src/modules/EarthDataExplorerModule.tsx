import { useEffect, useState } from 'react';
import { ExternalLink, Search, X, ArrowRight, RefreshCw } from 'lucide-react';
import { CURATED_NASA_DATASETS } from '../lib/nasaCatalog';
import { CmrCollection, searchNasaCmr } from '../lib/nasaClient';
import { NasaCatalogDataset } from '../types/terratrend';

interface EarthDataExplorerModuleProps {
  onLoadDatasetIntoStudio: (variableId: string) => void;
  onCmrCountUpdate?: (totalCount: number) => void;
}

export function EarthDataExplorerModule({
  onLoadDatasetIntoStudio,
  onCmrCountUpdate,
}: EarthDataExplorerModuleProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [variableFilter, setVariableFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [missionFilter, setMissionFilter] = useState<string>('all');

  const [cmrResults, setCmrResults] = useState<CmrCollection[]>([]);
  const [cmrHits, setCmrHits] = useState<number | null>(null);
  const [cmrLoading, setCmrLoading] = useState<boolean>(false);
  const [cmrError, setCmrError] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<(NasaCatalogDataset | CmrCollection) | null>(null);

  const runCmrSearch = async (queryText: string) => {
    setCmrLoading(true);
    setCmrError(null);
    try {
      const resp = await searchNasaCmr({
        q: queryText || 'temperature precipitation soil moisture MODIS SMAP GPM',
        pageSize: 12,
      });
      setCmrResults(resp.collections || []);
      setCmrHits(resp.totalHits ?? (resp.collections?.length || 0));
      onCmrCountUpdate?.(CURATED_NASA_DATASETS.length + (resp.collections?.length || 0));
    } catch (err) {
      setCmrError(err instanceof Error ? err.message : 'Unable to reach NASA CMR API.');
    } finally {
      setCmrLoading(false);
    }
  };

  useEffect(() => {
    runCmrSearch('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCurated = CURATED_NASA_DATASETS.filter((ds) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      ds.name.toLowerCase().includes(q) ||
      ds.shortName.toLowerCase().includes(q) ||
      ds.variable.toLowerCase().includes(q) ||
      ds.mission.toLowerCase().includes(q) ||
      ds.description.toLowerCase().includes(q);
    const matchesVar =
      variableFilter === 'all' || ds.variable.toLowerCase().includes(variableFilter.toLowerCase());
    const matchesType = typeFilter === 'all' || ds.datasetType === typeFilter;
    const matchesMission =
      missionFilter === 'all' || ds.mission.toLowerCase().includes(missionFilter.toLowerCase());
    return matchesSearch && matchesVar && matchesType && matchesMission;
  });

  const filteredCmr = cmrResults.filter((c) => {
    const matchesType = typeFilter === 'all' || c.datasetType === typeFilter;
    const matchesMission =
      missionFilter === 'all' ||
      c.mission.toLowerCase().includes(missionFilter.toLowerCase()) ||
      c.provider.toLowerCase().includes(missionFilter.toLowerCase());
    return matchesType && matchesMission;
  });

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[#F4F8FF]">Earth Data Explorer</h1>
        <p className="text-sm text-[#8FA8C8] mt-0.5">
          Discover NASA Earth observation collections via live Common Metadata Repository (CMR) search alongside
          integrated POWER, GIBS, and Giovanni endpoints.
        </p>
      </div>

      {/* Search & Filter Controls */}
      <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-4 space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runCmrSearch(searchQuery);
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8FA8C8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search NASA CMR & catalog (e.g., MODIS, SMAP soil moisture, GPM rainfall, sea surface temperature)..."
              className="w-full bg-[#071426] border border-[#193556] rounded-lg pl-9 pr-3 py-2 text-sm text-[#F4F8FF] placeholder:text-[#8FA8C8]/60 focus:outline-none focus:border-[#36D9E6]"
            />
          </div>
          <button
            type="submit"
            disabled={cmrLoading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#36D9E6] text-[#071426] text-xs font-semibold hover:bg-[#5ce3ee] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cmrLoading ? 'animate-spin' : ''}`} />
            <span>Query NASA CMR</span>
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-[#8FA8C8] mb-1">Variable Filter</label>
            <select
              value={variableFilter}
              onChange={(e) => setVariableFilter(e.target.value)}
              className="w-full bg-[#071426] border border-[#193556] rounded-lg px-3 py-2 text-xs text-[#F4F8FF] focus:outline-none focus:border-[#36D9E6]"
            >
              <option value="all">All Variables</option>
              <option value="Temperature">Temperature / SST / LST</option>
              <option value="Precipitation">Precipitation</option>
              <option value="Soil Moisture">Soil Moisture</option>
              <option value="Vegetation">Vegetation (NDVI / EVI)</option>
              <option value="Sea Level">Sea Level</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#8FA8C8] mb-1">Dataset Nature</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-[#071426] border border-[#193556] rounded-lg px-3 py-2 text-xs text-[#F4F8FF] focus:outline-none focus:border-[#36D9E6]"
            >
              <option value="all">All Types</option>
              <option value="Satellite Observation">Satellite Observation</option>
              <option value="Reanalysis">Reanalysis</option>
              <option value="Model Output">Model Output</option>
              <option value="Derived Product">Derived Product</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#8FA8C8] mb-1">Mission / Center</label>
            <select
              value={missionFilter}
              onChange={(e) => setMissionFilter(e.target.value)}
              className="w-full bg-[#071426] border border-[#193556] rounded-lg px-3 py-2 text-xs text-[#F4F8FF] focus:outline-none focus:border-[#36D9E6]"
            >
              <option value="all">All Missions</option>
              <option value="MODIS">Terra / Aqua MODIS</option>
              <option value="GPM">GPM Precipitation</option>
              <option value="SMAP">SMAP Soil Moisture</option>
              <option value="MERRA-2">MERRA-2 / POWER</option>
              <option value="Jason">TOPEX / Jason / SWOT</option>
            </select>
          </div>
        </div>
      </div>

      {/* Integrated NASA Operational Services */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-[#F4F8FF]">
            Integrated NASA Data &amp; Imagery Services ({filteredCurated.length})
          </h2>
          <span className="text-xs text-[#8FA8C8]">Clearly categorized by observation vs. reanalysis</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCurated.map((ds) => (
            <div
              key={ds.id}
              className="rounded-xl border border-[#193556] bg-[#0B1E36] p-5 flex flex-col justify-between space-y-4 hover:border-[#36D9E6]/50 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-[#8FA8C8]">
                  <span className="font-mono text-[#36D9E6]">{ds.shortName}</span>
                  <span aria-hidden="true">·</span>
                  <span>{ds.datasetType}</span>
                  <span aria-hidden="true">·</span>
                  <span className={ds.availability === 'Live API Integrated' ? 'text-[#39D6A0]' : 'text-[#8FA8C8]'}>
                    {ds.availability}
                  </span>
                </div>

                <h3 className="font-display text-base font-semibold text-[#F4F8FF]">{ds.name}</h3>
                <p className="text-xs text-[#8FA8C8] leading-relaxed">{ds.description}</p>

                <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                  <div>
                    <span className="text-[#8FA8C8]">Mission: </span>
                    <span className="text-[#F4F8FF]">{ds.mission}</span>
                  </div>
                  <div>
                    <span className="text-[#8FA8C8]">Resolution: </span>
                    <span className="font-mono text-[#F4F8FF]">{ds.spatialResolution}</span>
                  </div>
                  <div>
                    <span className="text-[#8FA8C8]">Coverage: </span>
                    <span className="font-mono text-[#F4F8FF]">{ds.temporalCoverage}</span>
                  </div>
                  <div>
                    <span className="text-[#8FA8C8]">Units: </span>
                    <span className="font-mono text-[#F4F8FF]">{ds.units}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#193556]">
                <button
                  type="button"
                  onClick={() => setSelectedDetail(ds)}
                  className="text-xs font-medium text-[#8FA8C8] hover:text-[#F4F8FF] cursor-pointer"
                >
                  Inspect Metadata
                </button>
                <div className="flex items-center gap-3">
                  <a
                    href={ds.resourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#3887FF] hover:underline"
                  >
                    <span>NASA Resource</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  {ds.variableId && (
                    <button
                      type="button"
                      onClick={() => onLoadDatasetIntoStudio(ds.variableId!)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#36D9E6] hover:underline cursor-pointer"
                    >
                      <span>Analyze Variable</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Live NASA CMR Collection Results */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-[#F4F8FF]">
            Live NASA Earthdata CMR Collections
          </h2>
          {cmrHits !== null && !cmrError && (
            <span className="font-mono text-xs text-[#39D6A0]">
              {cmrHits.toLocaleString()} matching collections in NASA CMR
            </span>
          )}
        </div>

        {cmrError ? (
          <div className="rounded-xl border border-[#FFB547]/40 bg-[#0B1E36] p-5 space-y-2">
            <div className="text-sm font-medium text-[#FFB547]">NASA CMR API Currently Unreachable</div>
            <p className="text-xs text-[#8FA8C8]">{cmrError}</p>
            <button
              type="button"
              onClick={() => runCmrSearch(searchQuery)}
              className="px-3 py-1.5 rounded-md border border-[#36D9E6]/40 text-xs text-[#36D9E6] hover:bg-[#36D9E6]/10 cursor-pointer"
            >
              Retry CMR Query
            </button>
          </div>
        ) : cmrLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((idx) => (
              <div key={idx} className="rounded-xl border border-[#193556] bg-[#0B1E36] p-5 h-40 animate-pulse" />
            ))}
          </div>
        ) : filteredCmr.length === 0 ? (
          <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-6 text-center text-sm text-[#8FA8C8]">
            No CMR collections matched the current filters. Try clearing filters or searching another keyword.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCmr.map((col) => (
              <div
                key={col.id}
                className="rounded-xl border border-[#193556] bg-[#0B1E36] p-5 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-[#8FA8C8]">
                    <span className="font-mono text-[#36D9E6]">{col.shortName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{col.provider}</span>
                    <span aria-hidden="true">·</span>
                    <span>{col.datasetType}</span>
                  </div>
                  <h3 className="font-display text-sm font-semibold text-[#F4F8FF] line-clamp-2">{col.name}</h3>
                  <p className="text-xs text-[#8FA8C8] line-clamp-3 leading-relaxed">{col.description}</p>
                  <div className="text-xs font-mono text-[#8FA8C8] pt-1">
                    Temporal: {col.temporalStart} → {col.temporalEnd} · Level {col.processingLevel}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#193556]">
                  <button
                    type="button"
                    onClick={() => setSelectedDetail(col)}
                    className="text-xs text-[#36D9E6] hover:underline cursor-pointer"
                  >
                    Full CMR Metadata
                  </button>
                  <a
                    href={col.resourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#3887FF] hover:underline"
                  >
                    <span>Official Collection</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Dataset Metadata Detail Modal */}
      {selectedDetail && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-2xl w-full rounded-xl border border-[#36D9E6]/35 bg-[#0B1E36] p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-mono text-[#36D9E6]">
                  {selectedDetail.shortName} · {selectedDetail.datasetType}
                </div>
                <h3 className="font-display text-lg font-semibold text-[#F4F8FF] mt-1">{selectedDetail.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="p-1.5 rounded-lg border border-[#193556] text-[#8FA8C8] hover:text-[#F4F8FF] cursor-pointer"
                aria-label="Close metadata modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-[#8FA8C8] leading-relaxed">{selectedDetail.description}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-t border-b border-[#193556] py-4">
              <div>
                <span className="text-[#8FA8C8]">Provider: </span>
                <span className="text-[#F4F8FF]">{selectedDetail.provider}</span>
              </div>
              <div>
                <span className="text-[#8FA8C8]">Mission: </span>
                <span className="text-[#F4F8FF]">{selectedDetail.mission}</span>
              </div>
              <div>
                <span className="text-[#8FA8C8]">Data Source: </span>
                <span className="text-[#F4F8FF]">{selectedDetail.dataSource}</span>
              </div>
              {'temporalCoverage' in selectedDetail ? (
                <>
                  <div>
                    <span className="text-[#8FA8C8]">Temporal Coverage: </span>
                    <span className="font-mono text-[#F4F8FF]">{selectedDetail.temporalCoverage}</span>
                  </div>
                  <div>
                    <span className="text-[#8FA8C8]">Spatial Resolution: </span>
                    <span className="font-mono text-[#F4F8FF]">{selectedDetail.spatialResolution}</span>
                  </div>
                  <div>
                    <span className="text-[#8FA8C8]">Units: </span>
                    <span className="font-mono text-[#F4F8FF]">{selectedDetail.units}</span>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="text-[#8FA8C8]">Temporal Span: </span>
                    <span className="font-mono text-[#F4F8FF]">
                      {selectedDetail.temporalStart} to {selectedDetail.temporalEnd}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8FA8C8]">Spatial Bounds: </span>
                    <span className="font-mono text-[#F4F8FF]">{selectedDetail.spatialBounds}</span>
                  </div>
                  <div>
                    <span className="text-[#8FA8C8]">Processing Level: </span>
                    <span className="font-mono text-[#F4F8FF]">{selectedDetail.processingLevel}</span>
                  </div>
                </>
              )}
            </div>

            <div className="text-xs text-[#8FA8C8] bg-[#071426] border border-[#193556] rounded-lg p-3">
              Note on Direct Processing: Granule files (HDF5/NetCDF4) discovered via NASA CMR often require Earthdata
              Login for raw download. For immediate in-browser statistical time-series trend testing, use integrated{' '}
              <strong className="text-[#F4F8FF]">NASA POWER</strong> variables or upload exported CSV tables in the
              Variable Selection Studio.
            </div>

            <div className="flex justify-end gap-3">
              <a
                href={selectedDetail.resourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#36D9E6] text-[#071426] text-xs font-semibold"
              >
                <span>Open Official NASA Resource</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
