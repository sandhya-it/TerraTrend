import { ArrowRight, Compass, Database, Globe2, LineChart, ShieldCheck } from 'lucide-react';
import { EarthGlobeCanvas } from '../components/EarthGlobeCanvas';
import { ModuleId } from '../types/terratrend';

interface OverviewModuleProps {
  onNavigate: (module: ModuleId) => void;
  onStartDemoBenchmark: () => void;
}

const FEATURES = [
  {
    icon: Globe2,
    title: 'Global Environmental Monitoring',
    description:
      'Discover and inspect NASA Earthdata CMR collections, GIBS satellite imagery layers, and NASA POWER meteorological time series across global coordinates.',
  },
  {
    icon: LineChart,
    title: 'Temporal Trend Detection',
    description:
      'Quantify historical trajectories using non-parametric Sen slope estimators, moving averages, and Ordinary Least Squares regression with confidence intervals.',
  },
  {
    icon: Compass,
    title: 'Geospatial Change Analysis',
    description:
      'Contrast opposing regional trends side-by-side—revealing where precipitation, soil moisture, or surface temperature diverges across basins.',
  },
  {
    icon: ShieldCheck,
    title: 'Statistical Significance Testing',
    description:
      'Evaluate monotonic significance with tie-corrected Mann-Kendall tests, autocorrelation diagnostics, and multiple-comparison FDR adjustments.',
  },
];

const CORE_QUESTIONS = [
  {
    num: '01.',
    question: 'What is changing?',
    detail:
      'Track air temperature, precipitation, surface soil moisture, skin/sea surface temperature, humidity, wind speed, solar irradiance, and vegetation indices.',
  },
  {
    num: '02.',
    question: 'Where is it changing?',
    detail:
      'Pinpoint basin, biome, or custom lat/lon coordinates on interactive geospatial maps layered with NASA GIBS satellite reflectance and thermal products.',
  },
  {
    num: '03.',
    question: 'How much is it changing?',
    detail:
      'Measure rates of change in original physical units per year alongside 95% confidence bounds, seasonal cycles, and cumulative net delta.',
  },
  {
    num: '04.',
    question: 'Is the observed change statistically significant?',
    detail:
      'Separate genuine monotonic trends from interannual noise using exact Mann-Kendall p-values, sample sufficiency rules, and serial autocorrelation checks.',
  },
];

export function OverviewModule({ onNavigate, onStartDemoBenchmark }: OverviewModuleProps) {
  return (
    <div className="space-y-12 pb-12">
      {/* Full-viewport Hero with 3D Interactive Globe */}
      <section className="relative rounded-xl border border-[#193556] bg-[#0B1E36] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-6 p-6 sm:p-10 lg:p-12 flex flex-col justify-center space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#36D9E6] tracking-wide">
              <span>TERRATREND</span>
              <span aria-hidden="true" className="text-[#8FA8C8]">·</span>
              <span className="text-[#8FA8C8]">NASA Earth Science Intelligence</span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.85rem] font-bold leading-[1.12] tracking-tight text-[#F4F8FF]">
              Discover the Change. Understand the Planet.
            </h1>

            <p className="text-base text-[#8FA8C8] leading-relaxed max-w-xl">
              An intelligent Earth science platform that transforms satellite observations and scientific datasets into
              reproducible environmental change insights—measuring magnitude, regional divergence, and statistical
              significance.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('variable-studio')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#36D9E6] text-[#071426] font-semibold text-sm hover:bg-[#5ce3ee] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Launch Analysis</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('explorer')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#3887FF]/50 bg-[#071426]/60 text-[#F4F8FF] font-medium text-sm hover:border-[#36D9E6] hover:text-[#36D9E6] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Database className="w-4 h-4" />
                <span>Explore Earth Data</span>
              </button>

              <button
                type="button"
                onClick={onStartDemoBenchmark}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-[#8FA8C8] hover:text-[#F4F8FF] underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Load Demonstration Benchmark
              </button>
            </div>

            <div className="pt-4 border-t border-[#193556] grid grid-cols-3 gap-4 text-xs">
              <div>
                <div className="text-[#8FA8C8]">Data Services</div>
                <div className="font-mono text-[#F4F8FF] font-medium mt-0.5">CMR · GIBS · POWER</div>
              </div>
              <div>
                <div className="text-[#8FA8C8]">Trend Estimators</div>
                <div className="font-mono text-[#F4F8FF] font-medium mt-0.5">Mann-Kendall · Sen</div>
              </div>
              <div>
                <div className="text-[#8FA8C8]">Custom Data</div>
                <div className="font-mono text-[#F4F8FF] font-medium mt-0.5">CSV Validation</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 relative bg-[#06101E] border-t lg:border-t-0 lg:border-l border-[#193556] min-h-[380px] lg:min-h-[520px] flex flex-col">
            <div className="flex-1">
              <EarthGlobeCanvas />
            </div>
            <div className="px-4 py-2.5 border-t border-[#193556] bg-[#071426] flex items-center justify-between text-xs text-[#8FA8C8]">
              <span>Drag to rotate globe · Scroll to inspect orbital swath</span>
              <span className="font-mono text-[#36D9E6]">Inclination 34° · LEO Simulation</span>
            </div>
          </div>
        </div>
      </section>

      {/* Four Feature Highlights */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[#F4F8FF]">Platform Capabilities</h2>
            <p className="text-sm text-[#8FA8C8] mt-1">
              End-to-end scientific workflow from NASA metadata discovery to reproducible statistical testing.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('mission-control')}
            className="text-sm text-[#36D9E6] hover:underline whitespace-nowrap shrink-0 cursor-pointer text-left"
          >
            Open Mission Control →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="rounded-xl border border-[#193556] bg-[#0B1E36] p-5 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-3">
                  <div className="w-9 h-9 rounded-lg border border-[#36D9E6]/25 bg-[#071426] flex items-center justify-center text-[#36D9E6]">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="font-display text-base font-semibold text-[#F4F8FF]">{feat.title}</h3>
                  <p className="text-sm text-[#8FA8C8] leading-relaxed">{feat.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Four Core Scientific Questions */}
      <section className="rounded-xl border border-[#193556] bg-[#0B1E36] p-6 sm:p-8 space-y-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-semibold text-[#F4F8FF]">
            Four Core Scientific Questions
          </h2>
          <p className="text-sm text-[#8FA8C8] mt-1">
            Every TerraTrend workspace module is structured to answer these empirical Earth-system questions without
            unverified extrapolation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {CORE_QUESTIONS.map((q) => (
            <div key={q.num} className="border-t border-[#193556] pt-4 space-y-2">
              <div className="flex items-baseline gap-2.5">
                <span className="font-mono text-sm font-semibold text-[#36D9E6]">{q.num}</span>
                <h3 className="font-display text-lg font-semibold text-[#F4F8FF]">{q.question}</h3>
              </div>
              <p className="text-sm text-[#8FA8C8] leading-relaxed">{q.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
