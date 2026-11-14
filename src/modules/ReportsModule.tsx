import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { TrendStatusIndicator } from '../components/TrendBadge';
import { exportAnalysisCsv, exportAnalysisPdf } from '../lib/reportExport';
import { ModuleId, TrendAnalysisResult } from '../types/terratrend';

interface ReportsModuleProps {
  activeAnalysis: TrendAnalysisResult | null;
  chartImageDataUrl: string | null;
  onNavigate: (module: ModuleId) => void;
}

export function ReportsModule({ activeAnalysis, chartImageDataUrl, onNavigate }: ReportsModuleProps) {
  const [projectTitle, setProjectTitle] = useState<string>('TerraTrend Regional Environmental Change Assessment');
  const [author, setAuthor] = useState<string>('Earth Science Research Team');
  const [notes, setNotes] = useState<string>('');

  if (!activeAnalysis) {
    return (
      <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-10 text-center space-y-4">
        <h1 className="font-display text-xl font-semibold text-[#F4F8FF]">No Analysis Ready for Export</h1>
        <p className="text-sm text-[#8FA8C8]">
          Run an analysis in Variable Selection Studio first so TerraTrend can assemble a reproducible PDF and CSV
          report.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('variable-studio')}
          className="px-4 py-2 rounded-lg bg-[#36D9E6] text-[#071426] text-xs font-semibold cursor-pointer"
        >
          Configure Analysis
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#F4F8FF]">Scientific Report Generator</h1>
          <p className="text-sm text-[#8FA8C8] mt-0.5">
            Export publication-ready PDF briefs and machine-readable CSV archives with full dataset provenance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => exportAnalysisCsv(activeAnalysis, { projectTitle, author, notes })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#36D9E6] text-xs font-semibold text-[#36D9E6] hover:bg-[#36D9E6]/10 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV Data</span>
          </button>

          <button
            type="button"
            onClick={() => exportAnalysisPdf(activeAnalysis, { projectTitle, author, notes }, chartImageDataUrl)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#36D9E6] text-[#071426] text-xs font-semibold hover:bg-[#5ce3ee] cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Download PDF Report</span>
          </button>
        </div>
      </div>

      {/* Metadata Editor */}
      <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[#8FA8C8] mb-1">Project / Report Title</label>
          <input
            type="text"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            className="w-full bg-[#071426] border border-[#193556] rounded-lg px-3 py-2 text-sm text-[#F4F8FF]"
          />
        </div>
        <div>
          <label className="block text-xs text-[#8FA8C8] mb-1">Lead Researcher / Organization</label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="w-full bg-[#071426] border border-[#193556] rounded-lg px-3 py-2 text-sm text-[#F4F8FF]"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-[#8FA8C8] mb-1">Analyst Notes &amp; Contextual Hypothesis</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes included in exported PDF..."
            className="w-full bg-[#071426] border border-[#193556] rounded-lg px-3 py-2 text-sm text-[#F4F8FF]"
          />
        </div>
      </div>

      {/* Live Report Preview */}
      <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-6 space-y-6">
        <div className="border-b border-[#193556] pb-4">
          <div className="text-xs font-mono text-[#36D9E6]">TERRATREND REPORT PREVIEW</div>
          <h2 className="font-display text-xl font-semibold text-[#F4F8FF] mt-1">{projectTitle}</h2>
          <div className="text-xs text-[#8FA8C8] mt-1">
            Prepared by {author || 'Researcher'} · {new Date(activeAnalysis.createdAt).toUTCString()}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-[#8FA8C8]">Variable</div>
            <div className="text-[#F4F8FF] font-medium mt-0.5">
              {activeAnalysis.variableName} ({activeAnalysis.unit})
            </div>
          </div>
          <div>
            <div className="text-[#8FA8C8]">Study Region</div>
            <div className="text-[#F4F8FF] font-medium mt-0.5">
              {activeAnalysis.regionName} ({activeAnalysis.lat.toFixed(2)}°, {activeAnalysis.lon.toFixed(2)}°)
            </div>
          </div>
          <div>
            <div className="text-[#8FA8C8]">Observation Window</div>
            <div className="font-mono text-[#F4F8FF] mt-0.5">
              {activeAnalysis.startDate} to {activeAnalysis.endDate} ({activeAnalysis.granularity})
            </div>
          </div>
          <div>
            <div className="text-[#8FA8C8]">Data Provenance</div>
            <div className={`font-mono mt-0.5 ${activeAnalysis.isDemo ? 'text-[#FFB547]' : 'text-[#39D6A0]'}`}>
              {activeAnalysis.isDemo ? 'Demo Synthetic Benchmark' : activeAnalysis.dataSource}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[#193556] bg-[#071426] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TrendStatusIndicator status={activeAnalysis.statusLabel} />
            <span className="font-mono text-xs text-[#8FA8C8]">α = {activeAnalysis.alpha}</span>
          </div>
          <p className="text-sm text-[#F4F8FF] leading-relaxed">{activeAnalysis.interpretation}</p>
        </div>

        {chartImageDataUrl && (
          <div className="space-y-2">
            <div className="text-xs font-mono text-[#8FA8C8]">ATTACHED TIME-SERIES SNAPSHOT</div>
            <img
              src={chartImageDataUrl}
              alt="Time-series analysis snapshot"
              className="w-full rounded-lg border border-[#193556]"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        <div className="space-y-2">
          <div className="text-xs font-mono text-[#8FA8C8]">ANALYSIS LIMITATIONS &amp; CITATIONS</div>
          <ul className="space-y-1.5 text-xs text-[#8FA8C8] list-disc pl-5">
            {activeAnalysis.limitations.map((lim, i) => (
              <li key={i}>{lim}</li>
            ))}
            {activeAnalysis.sourceUrl && (
              <li className="font-mono text-[#3887FF] break-all">Source Reference: {activeAnalysis.sourceUrl}</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
