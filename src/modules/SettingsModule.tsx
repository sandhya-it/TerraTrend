import { Trash2, RotateCcw } from 'lucide-react';
import {
  AppSettings,
  DataSourceMode,
  MultipleComparisonMethod,
  SignificanceAlpha,
} from '../types/terratrend';

interface SettingsModuleProps {
  settings: AppSettings;
  onUpdateSettings: (next: AppSettings) => void;
  onResetDefaults: () => void;
  onClearAnalyses: () => void;
  analysisCount: number;
}

export function SettingsModule({
  settings,
  onUpdateSettings,
  onResetDefaults,
  onClearAnalyses,
  analysisCount,
}: SettingsModuleProps) {
  return (
    <div className="space-y-6 pb-10 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[#F4F8FF]">Platform Settings</h1>
        <p className="text-sm text-[#8FA8C8] mt-0.5">
          Configure statistical defaults, sample thresholds, and workspace persistence stored locally in your browser.
        </p>
      </div>

      <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-medium text-[#F4F8FF] mb-1">
              Default Significance Threshold (α)
            </label>
            <select
              value={settings.defaultAlpha}
              onChange={(e) =>
                onUpdateSettings({ ...settings, defaultAlpha: Number(e.target.value) as SignificanceAlpha })
              }
              className="w-full bg-[#071426] border border-[#193556] rounded-lg px-3 py-2 text-xs font-mono text-[#F4F8FF]"
            >
              <option value={0.01}>0.01 (99% Confidence)</option>
              <option value={0.05}>0.05 (95% Confidence — Standard)</option>
              <option value={0.1}>0.10 (90% Confidence)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#F4F8FF] mb-1">Default Data Source Mode</label>
            <select
              value={settings.defaultMode}
              onChange={(e) => onUpdateSettings({ ...settings, defaultMode: e.target.value as DataSourceMode })}
              className="w-full bg-[#071426] border border-[#193556] rounded-lg px-3 py-2 text-xs text-[#F4F8FF]"
            >
              <option value="nasa-power">NASA POWER Live API</option>
              <option value="demo">Demonstration Benchmark (Synthetic)</option>
              <option value="csv">CSV Upload</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#F4F8FF] mb-1">
              Default Moving Average Window
            </label>
            <select
              value={settings.movingAverageWindow}
              onChange={(e) => onUpdateSettings({ ...settings, movingAverageWindow: Number(e.target.value) })}
              className="w-full bg-[#071426] border border-[#193556] rounded-lg px-3 py-2 text-xs font-mono text-[#F4F8FF]"
            >
              <option value={3}>3 periods</option>
              <option value={5}>5 periods</option>
              <option value={12}>12 periods</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#F4F8FF] mb-1">
              Minimum Valid Sample Size (n)
            </label>
            <input
              type="number"
              min={5}
              max={30}
              value={settings.minSampleSize}
              onChange={(e) =>
                onUpdateSettings({ ...settings, minSampleSize: Math.max(5, Number(e.target.value) || 8) })
              }
              className="w-full bg-[#071426] border border-[#193556] rounded-lg px-3 py-2 text-xs font-mono text-[#F4F8FF]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#F4F8FF] mb-1">
              Default Multiple-Comparison Correction
            </label>
            <select
              value={settings.multipleComparisonMethod}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  multipleComparisonMethod: e.target.value as MultipleComparisonMethod,
                })
              }
              className="w-full bg-[#071426] border border-[#193556] rounded-lg px-3 py-2 text-xs text-[#F4F8FF]"
            >
              <option value="bh-fdr">Benjamini-Hochberg FDR</option>
              <option value="bonferroni">Bonferroni FWER</option>
              <option value="none">None (Unadjusted)</option>
            </select>
          </div>

          <div className="flex items-center pt-4">
            <label className="flex items-start gap-2.5 text-xs text-[#8FA8C8] cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showKelvinForTempPercent}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, showKelvinForTempPercent: e.target.checked })
                }
                className="mt-0.5 accent-[#36D9E6]"
              />
              <span>
                <strong className="text-[#F4F8FF] block">Compute temperature % change in Kelvin</strong>
                Converts Celsius baselines to thermodynamic Kelvin (+273.15) before reporting percentage change.
              </span>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#193556]">
          <button
            type="button"
            onClick={onResetDefaults}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#193556] text-xs text-[#8FA8C8] hover:text-[#F4F8FF] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Statistical Defaults</span>
          </button>

          <button
            type="button"
            onClick={onClearAnalyses}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#F45B69]/40 text-xs text-[#F45B69] hover:bg-[#F45B69]/10 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Session Analyses ({analysisCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
