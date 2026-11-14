import { useState } from 'react';
import { TrendStatusIndicator } from '../components/TrendBadge';
import { ENVIRONMENTAL_VARIABLES } from '../lib/nasaCatalog';
import { applyMultipleComparisonCorrection } from '../lib/statistics';
import { MultipleComparisonMethod, SignificanceAlpha, TrendAnalysisResult } from '../types/terratrend';

interface SignificanceLabModuleProps {
  activeAnalysis: TrendAnalysisResult | null;
  allAnalyses: TrendAnalysisResult[];
  alpha: SignificanceAlpha;
  defaultCorrection: MultipleComparisonMethod;
  onChangeAlpha: (alpha: SignificanceAlpha) => void;
}

export function SignificanceLabModule({
  activeAnalysis,
  allAnalyses,
  alpha,
  defaultCorrection,
  onChangeAlpha,
}: SignificanceLabModuleProps) {
  const [correctionMethod, setCorrectionMethod] = useState<MultipleComparisonMethod>(defaultCorrection);

  if (!activeAnalysis) {
    return (
      <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-8 text-center text-sm text-[#8FA8C8]">
        Run or select an analysis to inspect Mann-Kendall, Sen&apos;s Slope, OLS diagnostics, and multiple-comparison
        corrections.
      </div>
    );
  }

  const variableMeta = ENVIRONMENTAL_VARIABLES.find((v) => v.id === activeAnalysis.variableId);
  const decadeChange = activeAnalysis.sensSlope ? Math.abs(activeAnalysis.sensSlope.slopePerYear * 10) : 0;
  const practicalThreshold = variableMeta?.practicalThresholdPerDecade ?? 0.1;
  const isPracticallyMeaningful = decadeChange >= practicalThreshold;

  const testableAnalyses = allAnalyses.filter((a) => a.mannKendall !== null);
  const correctedResults = applyMultipleComparisonCorrection(
    testableAnalyses.map((a) => ({
      id: a.id,
      label: `${a.regionName} (${a.variableId})`,
      pValue: a.mannKendall!.pValue,
    })),
    correctionMethod,
    alpha
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#F4F8FF]">Statistical Significance Lab</h1>
          <p className="text-sm text-[#8FA8C8] mt-0.5">
            {activeAnalysis.variableName} · {activeAnalysis.regionName} ({activeAnalysis.startDate} to{' '}
            {activeAnalysis.endDate})
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#8FA8C8]">Significance α:</span>
          <div className="inline-flex rounded-lg border border-[#193556] bg-[#0B1E36] p-0.5">
            {([0.01, 0.05, 0.1] as SignificanceAlpha[]).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => onChangeAlpha(a)}
                className={`px-2.5 py-1 rounded-md font-mono cursor-pointer ${
                  alpha === a ? 'bg-[#36D9E6] text-[#071426] font-semibold' : 'text-[#8FA8C8]'
                }`}
              >
                {a.toFixed(2)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Verdict & Rationale */}
      <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TrendStatusIndicator status={activeAnalysis.statusLabel} />
          <span className="font-mono text-xs text-[#8FA8C8]">
            Sample n = {activeAnalysis.validObservations} / {activeAnalysis.totalObservations} ({activeAnalysis.missingPercent}%
            missing)
          </span>
        </div>
        <p className="text-sm text-[#F4F8FF] leading-relaxed">{activeAnalysis.classificationRationale}</p>
      </div>

      {/* Three Core Statistical Methods Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Mann-Kendall */}
        <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-5 space-y-3">
          <h2 className="font-display text-base font-semibold text-[#F4F8FF]">Mann-Kendall Non-Parametric Test</h2>
          <p className="text-xs text-[#8FA8C8]">
            Rank-based test for monotonic trend resilient to outliers and non-normal residuals, with tie-adjusted
            variance.
          </p>
          {activeAnalysis.mannKendall ? (
            <dl className="space-y-2 text-xs font-mono pt-2 border-t border-[#193556]">
              <div className="flex justify-between">
                <dt className="text-[#8FA8C8]">Kendall S Statistic</dt>
                <dd className="text-[#F4F8FF]">{activeAnalysis.mannKendall.sStatistic}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#8FA8C8]">Kendall Tau (τ)</dt>
                <dd className="text-[#F4F8FF]">{activeAnalysis.mannKendall.tau.toFixed(4)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#8FA8C8]">Tie-Adjusted Var(S)</dt>
                <dd className="text-[#F4F8FF]">{activeAnalysis.mannKendall.varianceS.toFixed(1)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#8FA8C8]">Z-Score</dt>
                <dd className="text-[#F4F8FF]">{activeAnalysis.mannKendall.zScore.toFixed(4)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#8FA8C8]">Two-Tailed p-value</dt>
                <dd className={activeAnalysis.mannKendall.significant ? 'text-[#39D6A0] font-semibold' : 'text-[#FFB547]'}>
                  {activeAnalysis.mannKendall.pValue.toFixed(6)}
                </dd>
              </div>
            </dl>
          ) : (
            <div className="text-xs text-[#FFB547] pt-2">Withheld due to insufficient observations.</div>
          )}
        </div>

        {/* Sen's Slope */}
        <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-5 space-y-3">
          <h2 className="font-display text-base font-semibold text-[#F4F8FF]">Sen&apos;s Slope Estimator</h2>
          <p className="text-xs text-[#8FA8C8]">
            Median of all pairwise slopes in original physical units per year, paired with Kendall-variance 95% CI.
          </p>
          {activeAnalysis.sensSlope ? (
            <dl className="space-y-2 text-xs font-mono pt-2 border-t border-[#193556]">
              <div className="flex justify-between">
                <dt className="text-[#8FA8C8]">Median Slope</dt>
                <dd className="text-[#36D9E6] font-semibold">
                  {activeAnalysis.sensSlope.slopePerYear >= 0 ? '+' : ''}
                  {activeAnalysis.sensSlope.slopePerYear.toFixed(5)} {activeAnalysis.unit}/yr
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#8FA8C8]">95% CI Lower</dt>
                <dd className="text-[#F4F8FF]">{activeAnalysis.sensSlope.ciLowerPerYear.toFixed(5)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#8FA8C8]">95% CI Upper</dt>
                <dd className="text-[#F4F8FF]">{activeAnalysis.sensSlope.ciUpperPerYear.toFixed(5)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#8FA8C8]">Decadal Rate</dt>
                <dd className="text-[#F4F8FF]">
                  {(activeAnalysis.sensSlope.slopePerYear * 10).toFixed(4)} {activeAnalysis.unit}/decade
                </dd>
              </div>
            </dl>
          ) : (
            <div className="text-xs text-[#FFB547] pt-2">Withheld due to insufficient observations.</div>
          )}
        </div>

        {/* OLS Linear Regression */}
        <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-5 space-y-3">
          <h2 className="font-display text-base font-semibold text-[#F4F8FF]">OLS Linear Regression &amp; Residuals</h2>
          <p className="text-xs text-[#8FA8C8]">
            Parametric least-squares trend slope, goodness-of-fit R², standard error, and lag-1 serial correlation.
          </p>
          {activeAnalysis.linearRegression && activeAnalysis.autocorrelation ? (
            <dl className="space-y-2 text-xs font-mono pt-2 border-t border-[#193556]">
              <div className="flex justify-between">
                <dt className="text-[#8FA8C8]">OLS Slope</dt>
                <dd className="text-[#F4F8FF]">
                  {activeAnalysis.linearRegression.slopePerYear.toFixed(5)} {activeAnalysis.unit}/yr
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#8FA8C8]">R² (Variance Explained)</dt>
                <dd className="text-[#F4F8FF]">{activeAnalysis.linearRegression.rSquared.toFixed(4)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#8FA8C8]">Std. Error / t-Stat</dt>
                <dd className="text-[#F4F8FF]">
                  {activeAnalysis.linearRegression.standardErrorPerYear.toFixed(4)} /{' '}
                  {activeAnalysis.linearRegression.tStatistic.toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#8FA8C8]">Lag-1 Autocorrelation</dt>
                <dd
                  className={
                    activeAnalysis.autocorrelation.hasSignificantAutocorrelation
                      ? 'text-[#FFB547] font-semibold'
                      : 'text-[#39D6A0]'
                  }
                >
                  r₁ = {activeAnalysis.autocorrelation.lag1.toFixed(3)} (DW {activeAnalysis.autocorrelation.durbinWatson.toFixed(2)})
                </dd>
              </div>
            </dl>
          ) : (
            <div className="text-xs text-[#FFB547] pt-2">Withheld due to insufficient observations.</div>
          )}
        </div>
      </div>

      {/* Four Conceptual Distinctions */}
      <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-5 space-y-4">
        <h2 className="font-display text-base font-semibold text-[#F4F8FF]">
          Distinguishing Statistical vs. Practical Significance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-xs">
          <div className="rounded-lg border border-[#193556] bg-[#071426] p-3.5 space-y-1.5">
            <div className="font-semibold text-[#36D9E6]">1. Trend Direction</div>
            <p className="text-[#8FA8C8] leading-relaxed">
              Sign of change ({activeAnalysis.direction}). A non-zero slope indicates direction in the sample, not
              whether it exceeds random noise.
            </p>
          </div>
          <div className="rounded-lg border border-[#193556] bg-[#071426] p-3.5 space-y-1.5">
            <div className="font-semibold text-[#36D9E6]">2. Trend Magnitude</div>
            <p className="text-[#8FA8C8] leading-relaxed">
              Physical rate ({activeAnalysis.sensSlope?.slopePerYear.toFixed(4) ?? '—'} {activeAnalysis.unit}/yr). Large
              samples can make tiny, physically negligible slopes statistically significant.
            </p>
          </div>
          <div className="rounded-lg border border-[#193556] bg-[#071426] p-3.5 space-y-1.5">
            <div className="font-semibold text-[#36D9E6]">3. Statistical Significance</div>
            <p className="text-[#8FA8C8] leading-relaxed">
              Probability p = {activeAnalysis.mannKendall?.pValue.toFixed(4) ?? '—'} of observing a rank shift as
              extreme under a no-trend null hypothesis.
            </p>
          </div>
          <div className="rounded-lg border border-[#193556] bg-[#071426] p-3.5 space-y-1.5">
            <div className="font-semibold text-[#36D9E6]">4. Practical Significance</div>
            <p className="text-[#8FA8C8] leading-relaxed">
              Current decadal shift ({decadeChange.toFixed(3)} {activeAnalysis.unit}/decade) vs. domain benchmark (
              {practicalThreshold} {activeAnalysis.unit}/decade):{' '}
              <strong className="text-[#F4F8FF]">
                {isPracticallyMeaningful ? 'Exceeds practical benchmark' : 'Below practical benchmark'}
              </strong>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Multiple-Comparison Correction Table */}
      <div className="rounded-xl border border-[#193556] bg-[#0B1E36] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-[#F4F8FF]">
              Multiple-Comparison Correction ({testableAnalyses.length} simultaneous tests)
            </h2>
            <p className="text-xs text-[#8FA8C8]">
              Testing multiple regions or variables inflates family-wise false positives. Apply Bonferroni or
              Benjamini-Hochberg (FDR) adjustment below.
            </p>
          </div>

          <select
            value={correctionMethod}
            onChange={(e) => setCorrectionMethod(e.target.value as MultipleComparisonMethod)}
            className="bg-[#071426] border border-[#193556] rounded-lg px-3 py-1.5 text-xs text-[#F4F8FF]"
          >
            <option value="none">Unadjusted (Raw p-value)</option>
            <option value="bonferroni">Bonferroni FWER Correction</option>
            <option value="bh-fdr">Benjamini-Hochberg FDR</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#193556] text-[#8FA8C8]">
                <th className="py-2 pr-4">Study Series</th>
                <th className="py-2 pr-4 text-right">Raw p-value</th>
                <th className="py-2 pr-4 text-right">Adjusted p-value</th>
                <th className="py-2 pr-4">Raw (α={alpha})</th>
                <th className="py-2">Corrected Verdict</th>
              </tr>
            </thead>
            <tbody>
              {correctedResults.map((row) => (
                <tr key={row.id} className="border-b border-[#193556]/60 font-mono">
                  <td className="py-2.5 pr-4 font-sans text-[#F4F8FF]">{row.label}</td>
                  <td className="py-2.5 pr-4 text-right text-[#F4F8FF]">{row.rawPValue.toFixed(5)}</td>
                  <td className="py-2.5 pr-4 text-right text-[#36D9E6]">{row.adjustedPValue.toFixed(5)}</td>
                  <td className="py-2.5 pr-4">
                    <span className={row.significantRaw ? 'text-[#39D6A0]' : 'text-[#8FA8C8]'}>
                      {row.significantRaw ? '● Significant' : '○ Not Sig.'}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span className={row.significantAdjusted ? 'text-[#39D6A0]' : 'text-[#FFB547]'}>
                      {row.significantAdjusted ? '● Retains Significance' : '○ Non-Significant'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
