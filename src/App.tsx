import { useEffect, useState } from 'react';
import {
  Activity,
  ChevronRight,
  Compass,
  Database,
  FileBarChart2,
  FlaskConical,
  GitCompare,
  Globe,
  Lightbulb,
  LineChart,
  Menu,
  Search,
  Settings,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  CURATED_NASA_DATASETS,
  ENVIRONMENTAL_VARIABLES,
  REGION_PRESETS,
} from './lib/nasaCatalog';
import { executeTrendAnalysis, fetchServiceHealth, HealthResponse } from './lib/nasaClient';
import { analyzeTimeSeries } from './lib/statistics';
import { EarthDataExplorerModule } from './modules/EarthDataExplorerModule';
import { GeospatialAnalysisModule } from './modules/GeospatialAnalysisModule';
import { MissionControlModule } from './modules/MissionControlModule';
import { OverviewModule } from './modules/OverviewModule';
import { RegionalComparisonModule } from './modules/RegionalComparisonModule';
import { ReportsModule } from './modules/ReportsModule';
import { ScientificInsightsModule } from './modules/ScientificInsightsModule';
import { SettingsModule } from './modules/SettingsModule';
import { SignificanceLabModule } from './modules/SignificanceLabModule';
import { TemporalAnalysisModule } from './modules/TemporalAnalysisModule';
import { StudioConfig, VariableSelectionModule } from './modules/VariableSelectionModule';
import {
  AggregationGranularity,
  AppSettings,
  DataSourceMode,
  ModuleId,
  SignificanceAlpha,
  TimeSeriesObservation,
  TrendAnalysisResult,
} from './types/terratrend';

const SETTINGS_STORAGE_KEY = 'terratrend_settings_v1';

const DEFAULT_SETTINGS: AppSettings = {
  defaultAlpha: 0.05,
  defaultMode: 'nasa-power',
  movingAverageWindow: 3,
  minSampleSize: 8,
  multipleComparisonMethod: 'bh-fdr',
  showKelvinForTempPercent: false,
};

interface NavItem {
  id: ModuleId;
  label: string;
  icon: typeof Globe;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: Globe },
  { id: 'mission-control', label: 'Mission Control', icon: Activity },
  { id: 'explorer', label: 'Earth Data Explorer', icon: Database },
  { id: 'variable-studio', label: 'Variable Selection', icon: SlidersHorizontal },
  { id: 'temporal', label: 'Temporal Analysis', icon: LineChart },
  { id: 'geospatial', label: 'Geospatial Analysis', icon: Compass },
  { id: 'significance', label: 'Significance Lab', icon: FlaskConical },
  { id: 'comparison', label: 'Regional Comparison', icon: GitCompare },
  { id: 'insights', label: 'Scientific Insights', icon: Lightbulb },
  { id: 'reports', label: 'Reports', icon: FileBarChart2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // Ignore storage errors
    }
    return DEFAULT_SETTINGS;
  });

  const [activeModule, setActiveModule] = useState<ModuleId>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  const [navSearch, setNavSearch] = useState<string>('');

  const [studioConfig, setStudioConfig] = useState<StudioConfig>({
    mode: settings.defaultMode,
    variableId: 'T2M',
    regionId: 'us-southwest',
    customRegionName: 'U.S. Southwest (Colorado Basin)',
    lat: 35.1,
    lon: -111.6,
    startYear: 2000,
    endYear: 2024,
    granularity: 'annual',
    alpha: settings.defaultAlpha,
  });

  const [analyses, setAnalyses] = useState<TrendAnalysisResult[]>([]);
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);
  const [rawObsCache, setRawObsCache] = useState<
    Record<string, { obs: TimeSeriesObservation[]; meta: { regionId: string; regionName: string; lat: number; lon: number; variableId: string; variableName: string; unit: string; datasetId: string; datasetName: string; dataSource: string; datasetNature: TrendAnalysisResult['datasetNature']; isDemo: boolean; sourceUrl?: string } }>
  >({});

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [catalogCount, setCatalogCount] = useState<number>(CURATED_NASA_DATASETS.length);
  const [serviceHealth, setServiceHealth] = useState<HealthResponse | null>(null);
  const [isProbingHealth, setIsProbingHealth] = useState<boolean>(false);
  const [chartImageDataUrl, setChartImageDataUrl] = useState<string | null>(null);

  const activeAnalysis = analyses.find((a) => a.id === activeAnalysisId) || analyses[0] || null;

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage errors
    }
  }, [settings]);

  const probeServices = async () => {
    setIsProbingHealth(true);
    try {
      const h = await fetchServiceHealth(true);
      setServiceHealth(h);
    } catch {
      // Ignore probe error; UI handles unchecked/degraded honestly
    } finally {
      setIsProbingHealth(false);
    }
  };

  useEffect(() => {
    fetchServiceHealth(false)
      .then((h) => setServiceHealth(h))
      .catch(() => {});
  }, []);

  const recordAnalysisResult = (result: TrendAnalysisResult, rawObservations?: TimeSeriesObservation[]) => {
    setAnalyses((prev) => {
      const filtered = prev.filter(
        (x) =>
          !(
            x.regionId === result.regionId &&
            x.variableId === result.variableId &&
            x.granularity === result.granularity &&
            x.isDemo === result.isDemo
          )
      );
      return [result, ...filtered];
    });
    setActiveAnalysisId(result.id);
    if (rawObservations) {
      setRawObsCache((prev) => ({
        ...prev,
        [result.id]: {
          obs: rawObservations,
          meta: {
            regionId: result.regionId,
            regionName: result.regionName,
            lat: result.lat,
            lon: result.lon,
            variableId: result.variableId,
            variableName: result.variableName,
            unit: result.unit,
            datasetId: result.datasetId,
            datasetName: result.datasetName,
            dataSource: result.dataSource,
            datasetNature: result.datasetNature,
            isDemo: result.isDemo,
            sourceUrl: result.sourceUrl,
          },
        },
      }));
    }
  };

  const handleRunStudioAnalysis = async (csvData?: {
    observations: TimeSeriesObservation[];
    fileName: string;
    unit: string;
    variableName: string;
  }) => {
    setIsRunning(true);
    setRunError(null);
    try {
      const res = await executeTrendAnalysis({
        mode: studioConfig.mode,
        variableId: studioConfig.variableId,
        regionId: studioConfig.regionId,
        customRegionName: studioConfig.customRegionName,
        lat: studioConfig.lat,
        lon: studioConfig.lon,
        startYear: studioConfig.startYear,
        endYear: studioConfig.endYear,
        granularity: studioConfig.granularity,
        alpha: studioConfig.alpha,
        movingAverageWindow: settings.movingAverageWindow,
        minSampleSize: settings.minSampleSize,
        showKelvinForTempPercent: settings.showKelvinForTempPercent,
        csvObservations: csvData?.observations,
        csvMeta: csvData
          ? { fileName: csvData.fileName, unit: csvData.unit, variableName: csvData.variableName }
          : undefined,
      });
      recordAnalysisResult(res, csvData?.observations);
      setActiveModule('temporal');
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Analysis failed. Switch to Demonstration Mode if offline.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleStartDemoBenchmark = async () => {
    setIsRunning(true);
    setRunError(null);
    try {
      const benchmarkConfigs = [
        { variableId: 'GWETTOP', regionId: 'us-southwest' },
        { variableId: 'GWETTOP', regionId: 'northern-plains' },
        { variableId: 'TS', regionId: 'arctic-svalbard' },
        { variableId: 'TS', regionId: 'north-atlantic-subpolar' },
      ];
      const results = await Promise.all(
        benchmarkConfigs.map((cfg) => {
          const preset = REGION_PRESETS.find((r) => r.id === cfg.regionId)!;
          return executeTrendAnalysis({
            mode: 'demo',
            variableId: cfg.variableId,
            regionId: cfg.regionId,
            customRegionName: preset.name,
            lat: preset.lat,
            lon: preset.lon,
            startYear: 2000,
            endYear: 2024,
            granularity: 'annual',
            alpha: settings.defaultAlpha,
            movingAverageWindow: settings.movingAverageWindow,
            minSampleSize: settings.minSampleSize,
            showKelvinForTempPercent: settings.showKelvinForTempPercent,
          });
        })
      );
      setAnalyses((prev) => {
        const nonMatching = prev.filter(
          (p) => !results.some((r) => r.regionId === p.regionId && r.variableId === p.variableId && r.isDemo)
        );
        return [...results, ...nonMatching];
      });
      setActiveAnalysisId(results[0].id);
      setStudioConfig((c) => ({ ...c, mode: 'demo', variableId: 'GWETTOP', regionId: 'us-southwest' }));
      setActiveModule('mission-control');
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunPointQuery = async (lat: number, lon: number, regionId?: string) => {
    setIsRunning(true);
    setRunError(null);
    const preset = regionId ? REGION_PRESETS.find((r) => r.id === regionId) : null;
    const modeToUse = studioConfig.mode === 'csv' ? 'nasa-power' : studioConfig.mode;
    try {
      const res = await executeTrendAnalysis({
        mode: modeToUse,
        variableId: studioConfig.variableId,
        regionId: preset?.id || `pt-${lat.toFixed(2)}-${lon.toFixed(2)}`,
        customRegionName: preset?.name || `Point (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
        lat,
        lon,
        startYear: studioConfig.startYear,
        endYear: studioConfig.endYear,
        granularity: studioConfig.granularity,
        alpha: studioConfig.alpha,
        movingAverageWindow: settings.movingAverageWindow,
        minSampleSize: settings.minSampleSize,
        showKelvinForTempPercent: settings.showKelvinForTempPercent,
      });
      recordAnalysisResult(res);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Point query failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunCompare = async (
    variableId: string,
    regionIds: string[],
    startYear: number,
    endYear: number,
    granularity: AggregationGranularity,
    mode: DataSourceMode
  ) => {
    setIsRunning(true);
    setRunError(null);
    try {
      const results = await Promise.all(
        regionIds.map((rId) => {
          const preset = REGION_PRESETS.find((r) => r.id === rId)!;
          return executeTrendAnalysis({
            mode,
            variableId,
            regionId: preset.id,
            customRegionName: preset.name,
            lat: preset.lat,
            lon: preset.lon,
            startYear,
            endYear,
            granularity,
            alpha: studioConfig.alpha,
            movingAverageWindow: settings.movingAverageWindow,
            minSampleSize: settings.minSampleSize,
            showKelvinForTempPercent: settings.showKelvinForTempPercent,
          });
        })
      );
      setAnalyses((prev) => {
        const filtered = prev.filter(
          (p) =>
            !results.some(
              (r) =>
                r.regionId === p.regionId &&
                r.variableId === p.variableId &&
                r.granularity === p.granularity &&
                r.isDemo === p.isDemo
            )
        );
        return [...results, ...filtered];
      });
      setActiveAnalysisId(results[0].id);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Regional comparison failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleRecomputeAlphaOrWindow = async (nextAlpha: SignificanceAlpha, nextWin: number) => {
    setStudioConfig((c) => ({ ...c, alpha: nextAlpha }));
    setSettings((s) => ({ ...s, movingAverageWindow: nextWin }));
    if (!activeAnalysis) return;

    const cachedRaw = rawObsCache[activeAnalysis.id];
    if (cachedRaw) {
      const updated = analyzeTimeSeries({
        ...cachedRaw.meta,
        id: activeAnalysis.id,
        granularity: activeAnalysis.granularity,
        alpha: nextAlpha,
        movingAverageWindow: nextWin,
        minSampleSize: settings.minSampleSize,
        observations: cachedRaw.obs,
        showKelvinForTempPercent: settings.showKelvinForTempPercent,
      });
      setAnalyses((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      return;
    }

    // Re-execute quickly using cached backend or deterministic demo
    const updated = await executeTrendAnalysis({
      mode: activeAnalysis.isDemo ? 'demo' : 'nasa-power',
      variableId: activeAnalysis.variableId,
      regionId: activeAnalysis.regionId,
      customRegionName: activeAnalysis.regionName,
      lat: activeAnalysis.lat,
      lon: activeAnalysis.lon,
      startYear: Number(activeAnalysis.startDate.slice(0, 4)) || studioConfig.startYear,
      endYear: Number(activeAnalysis.endDate.slice(0, 4)) || studioConfig.endYear,
      granularity: activeAnalysis.granularity,
      alpha: nextAlpha,
      movingAverageWindow: nextWin,
      minSampleSize: settings.minSampleSize,
      showKelvinForTempPercent: settings.showKelvinForTempPercent,
    });
    setAnalyses((prev) => prev.map((a) => (a.id === activeAnalysis.id ? { ...updated, id: activeAnalysis.id } : a)));
  };

  const filteredNavItems = NAV_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(navSearch.trim().toLowerCase())
  );

  const currentNav = NAV_ITEMS.find((n) => n.id === activeModule) || NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-[#071426] text-[#F4F8FF] flex">
      {/* Mobile Sidebar Backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Persistent Left Sidebar Navigation */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[256px] shrink-0 border-r border-[#193556] bg-[#0B1E36] flex flex-col transition-transform duration-200 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-5 h-16 border-b border-[#193556] flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setActiveModule('overview');
              setMobileNavOpen(false);
            }}
            className="font-display text-lg font-bold tracking-tight text-[#F4F8FF] whitespace-nowrap cursor-pointer"
          >
            TerraTrend
          </button>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="lg:hidden p-1.5 rounded-md text-[#8FA8C8] hover:text-[#F4F8FF]"
            aria-label="Close navigation menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 border-b border-[#193556]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8FA8C8] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              placeholder="Filter modules..."
              aria-label="Filter navigation modules"
              className="w-full bg-[#071426] border border-[#193556] rounded-md pl-8 pr-2.5 py-1.5 text-xs text-[#F4F8FF] placeholder:text-[#8FA8C8]/60 focus:outline-none focus:border-[#36D9E6]"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Primary Sidebar Navigation">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const active = activeModule === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveModule(item.id);
                  setMobileNavOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#36D9E6]/15 text-[#36D9E6] border border-[#36D9E6]/35'
                    : 'text-[#8FA8C8] hover:text-[#F4F8FF] hover:bg-[#071426]/60 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#193556] text-[11px] text-[#8FA8C8] space-y-1">
          <div className="flex items-center justify-between">
            <span>Active Source</span>
            <span className={`font-mono ${studioConfig.mode === 'demo' ? 'text-[#FFB547]' : 'text-[#39D6A0]'}`}>
              {studioConfig.mode === 'demo'
                ? 'Demo Mode'
                : studioConfig.mode === 'csv'
                ? 'CSV Upload'
                : 'NASA POWER'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Session Runs</span>
            <span className="font-mono text-[#F4F8FF]">{analyses.length}</span>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Context Bar */}
        <header className="sticky top-0 z-30 h-16 border-b border-[#193556] bg-[#071426]/95 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-[#193556] text-[#F4F8FF]"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#8FA8C8] truncate">
              <button
                type="button"
                onClick={() => setActiveModule('overview')}
                className="hover:text-[#F4F8FF] cursor-pointer"
              >
                TerraTrend
              </button>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[#F4F8FF] font-medium truncate">{currentNav.label}</span>
            </nav>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {activeAnalysis && (
              <span className="hidden md:inline font-mono text-xs text-[#8FA8C8] truncate max-w-[280px]">
                {activeAnalysis.variableId} · {activeAnalysis.regionName}
              </span>
            )}
            <button
              type="button"
              onClick={() => setActiveModule('variable-studio')}
              className="px-3.5 py-2 rounded-lg bg-[#36D9E6] text-[#071426] text-xs font-semibold hover:bg-[#5ce3ee] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              New Analysis
            </button>
          </div>
        </header>

        {/* Active Module Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {activeModule === 'overview' && (
            <OverviewModule onNavigate={setActiveModule} onStartDemoBenchmark={handleStartDemoBenchmark} />
          )}

          {activeModule === 'mission-control' && (
            <MissionControlModule
              analyses={analyses}
              activeAnalysis={activeAnalysis}
              catalogCount={catalogCount}
              supportedVariablesCount={ENVIRONMENTAL_VARIABLES.length}
              serviceHealth={serviceHealth}
              isProbingHealth={isProbingHealth}
              onProbeHealth={probeServices}
              onSelectAnalysis={(id) => setActiveAnalysisId(id)}
              onNavigate={setActiveModule}
            />
          )}

          {activeModule === 'explorer' && (
            <EarthDataExplorerModule
              onLoadDatasetIntoStudio={(varId) => {
                setStudioConfig((c) => ({ ...c, variableId: varId }));
                setActiveModule('variable-studio');
              }}
              onCmrCountUpdate={(count) => setCatalogCount(count)}
            />
          )}

          {activeModule === 'variable-studio' && (
            <VariableSelectionModule
              config={studioConfig}
              onChangeConfig={setStudioConfig}
              isRunning={isRunning}
              errorMsg={runError}
              onRunAnalysis={handleRunStudioAnalysis}
            />
          )}

          {activeModule === 'temporal' && (
            <TemporalAnalysisModule
              result={activeAnalysis}
              alpha={activeAnalysis?.alpha ?? studioConfig.alpha}
              movingAverageWindow={settings.movingAverageWindow}
              onChangeAlpha={(a) => handleRecomputeAlphaOrWindow(a, settings.movingAverageWindow)}
              onChangeMovingAvg={(w) => handleRecomputeAlphaOrWindow(studioConfig.alpha, w)}
              onChartImageCaptured={(url) => setChartImageDataUrl(url)}
              onNavigate={setActiveModule}
            />
          )}

          {activeModule === 'geospatial' && (
            <GeospatialAnalysisModule
              analyses={analyses}
              activeAnalysis={activeAnalysis}
              mode={studioConfig.mode}
              isLoading={isRunning}
              onRunPointQuery={handleRunPointQuery}
              onRunOppositePair={(variableId, regionAId, regionBId, mode) =>
                handleRunCompare(
                  variableId,
                  [regionAId, regionBId],
                  studioConfig.startYear,
                  studioConfig.endYear,
                  studioConfig.granularity,
                  mode
                )
              }
            />
          )}

          {activeModule === 'significance' && (
            <SignificanceLabModule
              activeAnalysis={activeAnalysis}
              allAnalyses={analyses}
              alpha={activeAnalysis?.alpha ?? studioConfig.alpha}
              defaultCorrection={settings.multipleComparisonMethod}
              onChangeAlpha={(a) => handleRecomputeAlphaOrWindow(a, settings.movingAverageWindow)}
            />
          )}

          {activeModule === 'comparison' && (
            <RegionalComparisonModule
              analyses={analyses}
              mode={studioConfig.mode}
              isLoading={isRunning}
              onCompareRegions={handleRunCompare}
            />
          )}

          {activeModule === 'insights' && (
            <ScientificInsightsModule analyses={analyses} activeAnalysis={activeAnalysis} />
          )}

          {activeModule === 'reports' && (
            <ReportsModule
              activeAnalysis={activeAnalysis}
              chartImageDataUrl={chartImageDataUrl}
              onNavigate={setActiveModule}
            />
          )}

          {activeModule === 'settings' && (
            <SettingsModule
              settings={settings}
              onUpdateSettings={(next) => {
                setSettings(next);
                setStudioConfig((c) => ({ ...c, alpha: next.defaultAlpha }));
              }}
              onResetDefaults={() => setSettings(DEFAULT_SETTINGS)}
              onClearAnalyses={() => {
                setAnalyses([]);
                setActiveAnalysisId(null);
              }}
              analysisCount={analyses.length}
            />
          )}
        </main>
      </div>
    </div>
  );
}
